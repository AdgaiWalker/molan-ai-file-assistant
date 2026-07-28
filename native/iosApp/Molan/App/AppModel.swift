import Foundation
import MolanShared
import Observation

private enum SharedBootstrapError: Error {
    case invalidBaseline
}

enum BootstrapState: Equatable {
    case ready
    case failed(AppFailure)
}

@MainActor
@Observable
final class AppModel {
    private let bootstrap: () throws -> Void
    private let documentRepository: DocumentRepository
    private let libraryRepository: LibraryRepository
    private let sessionStore: ReaderSessionStore
    private let syncCoordinator: SyncCoordinator
    private var documentRequestID = UUID()
    private var lastDocumentURL: URL?
    private var lastDisplayName: String?
    private(set) var bootstrapState: BootstrapState
    private(set) var documentState: DocumentState = .idle
    private(set) var libraryDocuments: [LibraryDocumentSummary] = []
    private(set) var libraryFailure = false
    private(set) var conflicts: [LibraryConflict] = []
    private(set) var syncState: IOSSyncState = .loggedOut

    init(bootstrap: @escaping () throws -> Void = {
        guard SharedContractEngine().verifyBaseline() else {
            throw SharedBootstrapError.invalidBaseline
        }
    }, documentRepository: DocumentRepository = DocumentRepository(), libraryRepository: LibraryRepository = LibraryRepository(), sessionStore: ReaderSessionStore = ReaderSessionStore()) {
        self.bootstrap = bootstrap
        self.documentRepository = documentRepository
        self.libraryRepository = libraryRepository
        self.sessionStore = sessionStore
        self.syncCoordinator = SyncCoordinator(library: libraryRepository)
        self.bootstrapState = Self.runBootstrap(bootstrap)
    }

    func retryBootstrap() {
        bootstrapState = Self.runBootstrap(bootstrap)
    }

    func openDocument(_ url: URL) {
        lastDocumentURL = url
        lastDisplayName = nil
        documentRequestID = UUID()
        let requestID = documentRequestID
        documentState = .loading
        Task {
            do {
                let document = try await documentRepository.open(url)
                guard requestID == documentRequestID else { return }
                try? await sessionStore.saveExternal(url: url, displayName: nil)
                guard requestID == documentRequestID else { return }
                documentState = .ready(document)
            } catch let failure as DocumentOpenFailure {
                guard requestID == documentRequestID else { return }
                documentState = .failed(failure)
            } catch let error as CocoaError {
                guard requestID == documentRequestID else { return }
                documentState = .failed(Self.map(error))
            } catch {
                guard requestID == documentRequestID else { return }
                documentState = .failed(.unknown)
            }
        }
    }

    func openLibraryDocument(_ documentID: String) {
        documentRequestID = UUID()
        let requestID = documentRequestID
        documentState = .loading
        Task {
            do {
                let primaryRequest = try await libraryRepository.openRequest(documentID: documentID)
                let fallbackRequest: LibraryOpenRequest? = if primaryRequest == nil {
                    try await libraryRepository.aiResultOpenRequest(resultID: documentID)
                } else {
                    nil
                }
                let request = primaryRequest ?? fallbackRequest
                guard let request else {
                    throw DocumentOpenFailure.sourceMissing
                }
                lastDocumentURL = request.url
                lastDisplayName = request.displayName
                let document = try await documentRepository.open(request.url, displayName: request.displayName)
                guard requestID == documentRequestID else { return }
                try? await sessionStore.saveLibrary(documentID: documentID)
                guard requestID == documentRequestID else { return }
                documentState = .ready(document)
            } catch let failure as DocumentOpenFailure {
                guard requestID == documentRequestID else { return }
                documentState = .failed(failure)
            } catch {
                guard requestID == documentRequestID else { return }
                documentState = .failed(.unknown)
            }
        }
    }

    func restoreDocumentSession() async -> Bool {
        guard documentState == .idle else { return true }
        do {
            guard let session = try await sessionStore.load() else { return false }
            switch session.kind {
            case .libraryDocument:
                openLibraryDocument(session.value)
                return true
            case .externalBookmark:
                guard let url = try await sessionStore.resolveURL(session) else { return false }
                lastDocumentURL = url
                lastDisplayName = session.displayName
                documentRequestID = UUID()
                let requestID = documentRequestID
                documentState = .loading
                Task {
                    do {
                        let document = try await documentRepository.open(url, displayName: session.displayName)
                        guard requestID == documentRequestID else { return }
                        documentState = .ready(document)
                    } catch let failure as DocumentOpenFailure {
                        guard requestID == documentRequestID else { return }
                        documentState = .failed(failure)
                    } catch {
                        guard requestID == documentRequestID else { return }
                        documentState = .failed(.sourceMissing)
                    }
                }
                return true
            }
        } catch {
            return false
        }
    }

    func retryDocument() {
        guard let lastDocumentURL else { return }
        let displayName = lastDisplayName
        documentRequestID = UUID()
        let requestID = documentRequestID
        documentState = .loading
        Task {
            do {
                let document = try await documentRepository.open(lastDocumentURL, displayName: displayName)
                guard requestID == documentRequestID else { return }
                documentState = .ready(document)
            } catch let failure as DocumentOpenFailure {
                guard requestID == documentRequestID else { return }
                documentState = .failed(failure)
            } catch {
                guard requestID == documentRequestID else { return }
                documentState = .failed(.unknown)
            }
        }
    }

    func collect(_ document: OpenDocument) async throws -> CollectionOutcome {
        let outcome = try await libraryRepository.collect(document)
        await refreshLibrary()
        return outcome
    }

    func refreshLibrary() async {
        do {
            libraryDocuments = try await libraryRepository.documents()
            conflicts = try await libraryRepository.conflicts()
            libraryFailure = false
        } catch {
            libraryFailure = true
        }
    }

    func restoreSyncState() async {
        syncState = await syncCoordinator.savedState()
    }

    func loginSync(serverURL: String, phone: String, code: String) {
        syncState = .loggingIn
        Task {
            do {
                let session = try await syncCoordinator.login(serverURL: serverURL, phone: phone, code: code)
                syncState = .loggedIn(deviceID: session.deviceID, notice: nil)
            } catch {
                syncState = .failed(.login)
            }
        }
    }

    func logoutSync() {
        Task {
            do {
                try await syncCoordinator.logout()
                syncState = .loggedOut
            } catch {
                syncState = .failed(.login)
            }
        }
    }

    func enqueueSync(_ documentID: String) {
        Task {
            do {
                try await syncCoordinator.enqueue(documentID: documentID)
                if case .loggedIn(let deviceID, _) = syncState {
                    syncState = .loggedIn(deviceID: deviceID, notice: .queued)
                }
                await refreshLibrary()
            } catch {
                syncState = .failed(.queue)
            }
        }
    }

    func syncNow() {
        guard case .loggedIn(let deviceID, _) = syncState else { return }
        syncState = .loggedIn(deviceID: deviceID, notice: .syncing)
        Task {
            do {
                try await syncCoordinator.sync()
                syncState = .loggedIn(deviceID: deviceID, notice: nil)
                await refreshLibrary()
            } catch {
                syncState = .failed(.queue)
            }
        }
    }

    func deleteDocument(_ documentID: String, scope: String) {
        Task {
            do {
                try await syncCoordinator.deleteDocument(documentID: documentID, scope: scope)
                await refreshLibrary()
            } catch {
                syncState = .failed(.queue)
            }
        }
    }

    func restoreDeletedDocument(_ documentID: String, scope: String) {
        Task {
            do {
                try await syncCoordinator.restoreDocument(documentID: documentID, scope: scope)
                await refreshLibrary()
            } catch {
                syncState = .failed(.queue)
            }
        }
    }

    func resolveConflict(_ id: String, resolution: String) {
        Task {
            do {
                try await syncCoordinator.resolveConflict(id: id, resolution: resolution)
                await refreshLibrary()
            } catch {
                syncState = .failed(.queue)
            }
        }
    }

    func prepareConflictVersionExport(_ versionID: String) async -> URL? {
        do {
            guard let item = try await libraryRepository.conflictVersionExport(versionID: versionID) else { return nil }
            let stem = URL(fileURLWithPath: item.title).deletingPathExtension().lastPathComponent
            let fileName = "\(stem.isEmpty ? Strings.appName : stem)-\(item.versionID.suffix(8)).\(fileExtension(item.format))"
            return try await Task.detached(priority: .userInitiated) {
                try FileArtifactRepository().shareArtifact(fileURL: item.fileURL, fileName: fileName)
            }.value
        } catch {
            return nil
        }
    }

    func setArchived(_ documentID: String, archived: Bool) {
        Task {
            do {
                try await libraryRepository.setArchived(documentID: documentID, archived: archived)
                await refreshLibrary()
            } catch {
                libraryFailure = true
            }
        }
    }

    func clearDocument() {
        documentRequestID = UUID()
        lastDocumentURL = nil
        lastDisplayName = nil
        documentState = .idle
        Task { try? await sessionStore.clear() }
    }

    private static func map(_ error: CocoaError) -> DocumentOpenFailure {
        switch error.code {
        case .fileReadNoPermission:
            return .permissionDenied
        case .fileNoSuchFile, .fileReadNoSuchFile:
            return .sourceMissing
        default:
            return .unknown
        }
    }

    private func fileExtension(_ format: String) -> String {
        switch format {
        case "markdown": "md"
        case "text": "txt"
        default: format
        }
    }

    private static func runBootstrap(_ operation: () throws -> Void) -> BootstrapState {
        do {
            try operation()
            return .ready
        } catch {
            return .failed(
                AppFailure(
                    title: Strings.bootstrapFailureTitle,
                    message: Strings.bootstrapFailureMessage,
                    recoveryTitle: Strings.retry
                )
            )
        }
    }
}
