import SwiftUI
import UniformTypeIdentifiers

struct HomeView: View {
    let documents: [LibraryDocumentSummary]
    let libraryFailure: Bool
    let conflicts: [LibraryConflict]
    let syncState: IOSSyncState
    let openDocument: (URL) -> Void
    let openLibraryDocument: (String) -> Void
    let setArchived: (String, Bool) -> Void
    let loginSync: (String, String, String) -> Void
    let logoutSync: () -> Void
    let enqueueSync: (String) -> Void
    let syncNow: () -> Void
    let deleteDocument: (String, String) -> Void
    let restoreDocument: (String, String) -> Void
    let resolveConflict: (String, String) -> Void
    let exportConflictVersion: (String) async -> URL?
    let retryLibrary: () -> Void
    @State private var showsImporter = false
    @State private var importerFailure = false
    @State private var section: LibrarySection = .recent
    @State private var query = ""
    @State private var pendingDelete: PendingDelete?
    @State private var syncExpanded = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(Strings.appName)
                        .font(.largeTitle.bold())
                    Text(Strings.appTagline)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Button {
                    showsImporter = true
                } label: {
                    Label(Strings.openDocument, systemImage: "doc.badge.plus")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .accessibilityIdentifier("molan.home.open-document")

                DisclosureGroup(isExpanded: $syncExpanded) {
                    SyncPanel(
                        state: syncState,
                        login: loginSync,
                        logout: logoutSync,
                        syncNow: syncNow
                    )
                    .padding(.top, 12)
                } label: {
                    HStack {
                        Label(Strings.syncTitle, systemImage: "arrow.triangle.2.circlepath")
                            .font(.headline)
                        Spacer()
                        Text(syncStatusTitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(16)
                .background(MolanTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16))
                .accessibilityIdentifier("molan.home.sync-disclosure")

                if !conflicts.isEmpty {
                    ConflictPanel(
                        conflicts: conflicts,
                        resolve: resolveConflict,
                        exportVersion: exportConflictVersion
                    )
                }

                Picker(Strings.librarySection, selection: $section) {
                    ForEach(LibrarySection.allCases) { value in Text(value.title).tag(value) }
                }
                .pickerStyle(.segmented)

                TextField(Strings.searchLibrary, text: $query)
                    .textFieldStyle(.roundedBorder)

                if libraryFailure {
                    ContentUnavailableView {
                        Label(Strings.libraryLoadFailed, systemImage: "exclamationmark.triangle")
                    } actions: {
                        Button(Strings.retry, action: retryLibrary)
                    }
                } else if filteredDocuments.isEmpty {
                    ContentUnavailableView {
                        Label(Strings.emptyHomeTitle, systemImage: "tray")
                    } description: {
                        Text(section == .archived ? Strings.noArchivedDocuments : Strings.emptyHomeMessage)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(MolanTheme.cardBackground, in: RoundedRectangle(cornerRadius: 20))
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredDocuments) { document in
                            VStack(alignment: .leading, spacing: 10) {
                                Button { openLibraryDocument(document.id) } label: {
                                    HStack(spacing: 12) {
                                        Image(systemName: icon(for: document.format))
                                            .font(.title2)
                                            .frame(width: 36)
                                        VStack(alignment: .leading, spacing: 5) {
                                            Text(document.title).font(.headline).foregroundStyle(.primary).lineLimit(2)
                                            Text(String(format: Strings.libraryMetadata, document.format.uppercased(), document.sizeBytes))
                                                .font(.caption).foregroundStyle(.secondary)
                                            if document.kind == "ai_result", let sourceTitle = document.sourceTitle {
                                                Text(String(format: Strings.aiResultSource, sourceTitle))
                                                    .font(.caption2)
                                                    .foregroundStyle(.secondary)
                                            }
                                            if document.kind == "ai_result", document.isStale {
                                                Text(Strings.aiResultStale)
                                                    .font(.caption2)
                                                    .foregroundStyle(.red)
                                            }
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                                    }
                                }
                                .buttonStyle(.plain)
                                .disabled(document.state == "deleted")

                                HStack {
                                    Label(stateTitle(document.state), systemImage: stateIcon(document.state))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    if document.state == "deleted" {
                                        Button(Strings.restoreCurrentDevice) { restoreDocument(document.id, "current_device") }
                                            .buttonStyle(.bordered).controlSize(.small)
                                        Button(Strings.restoreCloud) { restoreDocument(document.id, "cloud") }
                                            .buttonStyle(.bordered).controlSize(.small)
                                    } else if document.kind == "ai_result", let sourceID = document.sourceDocumentID {
                                        Button(Strings.openSource) { openLibraryDocument(sourceID) }
                                            .buttonStyle(.bordered)
                                            .controlSize(.small)
                                        Button(Strings.deleteResult, role: .destructive) {
                                            pendingDelete = PendingDelete(documentID: document.id, scope: "current_device")
                                        }
                                        .buttonStyle(.bordered)
                                        .controlSize(.small)
                                    } else if let latestResult = latestResult(for: document.id) {
                                        Button(Strings.openLatestResult) { openLibraryDocument(latestResult.id) }
                                            .buttonStyle(.bordered)
                                            .controlSize(.small)
                                    } else if document.state != "archived" {
                                        Button(Strings.syncToComputer) { enqueueSync(document.id) }
                                            .buttonStyle(.bordered)
                                            .controlSize(.small)
                                            .disabled(!canQueueSync || document.state == "sync_pending")
                                    }
                                    if document.state != "deleted" && document.kind != "ai_result" {
                                        Menu(Strings.deleteScope) {
                                            Button(Strings.deleteCurrentDevice) {
                                                pendingDelete = PendingDelete(documentID: document.id, scope: "current_device")
                                            }
                                            Button(Strings.deleteCloud) {
                                                pendingDelete = PendingDelete(documentID: document.id, scope: "cloud")
                                            }
                                            Button(Strings.deleteAllDevices, role: .destructive) {
                                                pendingDelete = PendingDelete(documentID: document.id, scope: "all_devices")
                                            }
                                        }
                                        .controlSize(.small)
                                    }
                                }
                            }
                            .padding(14)
                            .background(MolanTheme.cardBackground, in: RoundedRectangle(cornerRadius: 16))
                            .contextMenu {
                                Button(document.state == "archived" ? Strings.restoreFromArchive : Strings.archiveDocument) {
                                    setArchived(document.id, document.state != "archived")
                                }
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: 640, alignment: .leading)
            .padding(24)
        }
        .background(MolanTheme.pageBackground)
        .navigationTitle(Strings.homeTitle)
        .fileImporter(
            isPresented: $showsImporter,
            allowedContentTypes: supportedTypes,
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first { openDocument(url) }
            case .failure:
                importerFailure = true
            }
        }
        .alert(Strings.documentOpenFailed, isPresented: $importerFailure) {
            Button(Strings.close, role: .cancel) {}
        } message: {
            Text(Strings.permissionError)
        }
        .confirmationDialog(
            Strings.deleteConfirmTitle,
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            presenting: pendingDelete
        ) { pending in
            Button(Strings.deleteConfirm, role: .destructive) {
                deleteDocument(pending.documentID, pending.scope)
                pendingDelete = nil
            }
            Button(Strings.cancel, role: .cancel) { pendingDelete = nil }
        } message: { pending in
            Text(deleteExplanation(pending.scope))
        }
    }

    private var supportedTypes: [UTType] {
        var types: [UTType] = [.plainText, .json]
        if let markdown = UTType(filenameExtension: "md") { types.append(markdown) }
        return types
    }

    private var filteredDocuments: [LibraryDocumentSummary] {
        documents.filter { document in
            let sectionMatches = section == .recent ||
                (section == .collected && document.state != "archived" && document.state != "deleted") ||
                (section == .archived && document.state == "archived")
            let queryMatches = query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                document.title.localizedCaseInsensitiveContains(query)
            return sectionMatches && queryMatches
        }
    }

    private func icon(for format: String) -> String {
        switch format {
        case "markdown": "doc.richtext"
        case "json": "curlybraces"
        default: "doc.text"
        }
    }

    private var canQueueSync: Bool {
        if case .loggedIn(_, _) = syncState { return true }
        return false
    }

    private var syncStatusTitle: String {
        if case .loggedIn(_, _) = syncState { return Strings.syncConnected }
        return Strings.syncNotConnected
    }

    private func stateTitle(_ state: String) -> String {
        switch state {
        case "ai_result": Strings.aiResult
        case "archived": Strings.archived
        case "sync_pending": Strings.syncPending
        case "synced": Strings.synced
        case "conflict": Strings.syncConflict
        case "failed": Strings.syncStateFailed
        case "deleted": Strings.deleted
        default: Strings.localOnly
        }
    }

    private func stateIcon(_ state: String) -> String {
        switch state {
        case "sync_pending": "clock.arrow.circlepath"
        case "synced": "checkmark.icloud"
        case "conflict": "exclamationmark.arrow.trianglehead.2.clockwise.rotate.90"
        case "failed": "exclamationmark.icloud"
        case "deleted": "trash"
        default: "iphone"
        }
    }

    private func latestResult(for documentID: String) -> LibraryDocumentSummary? {
        documents.first { $0.kind == "ai_result" && $0.sourceDocumentID == documentID }
    }
}

private struct PendingDelete: Identifiable {
    let documentID: String
    let scope: String
    var id: String { documentID + scope }
}

private struct ConflictPanel: View {
    let conflicts: [LibraryConflict]
    let resolve: (String, String) -> Void
    let exportVersion: (String) async -> URL?
    @State private var activityURL: URL?

    var body: some View {
        GroupBox(Strings.conflictTitle) {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(conflicts) { conflict in
                    Text(conflict.documentID).font(.caption)
                    HStack {
                        Button(Strings.exportLocalVersion) { beginExport(conflict.localVersionID) }
                        Button(Strings.exportRemoteVersion) { beginExport(conflict.remoteVersionID) }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    HStack {
                        Button(Strings.keepLocal) { resolve(conflict.id, "keep_local") }
                        Button(Strings.keepRemote) { resolve(conflict.id, "keep_remote") }
                        Button(Strings.keepBoth) { resolve(conflict.id, "save_copy") }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .sheet(isPresented: Binding(
            get: { activityURL != nil },
            set: { if !$0 { activityURL = nil } }
        )) {
            if let activityURL { ActivityView(items: [activityURL]) }
        }
    }

    private func beginExport(_ versionID: String) {
        Task { activityURL = await exportVersion(versionID) }
    }
}

private func deleteExplanation(_ scope: String) -> String {
    switch scope {
    case "current_device": Strings.deleteCurrentDeviceExplanation
    case "cloud": Strings.deleteCloudExplanation
    default: Strings.deleteAllDevicesExplanation
    }
}

private struct SyncPanel: View {
    let state: IOSSyncState
    let login: (String, String, String) -> Void
    let logout: () -> Void
    let syncNow: () -> Void
    @State private var serverURL = "http://localhost:43120"
    @State private var phone = ""
    @State private var code = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Strings.syncPrivacyNotice)
                .font(.caption)
                .foregroundStyle(.secondary)
            switch state {
            case .loggedOut, .failed:
                TextField(Strings.syncServer, text: $serverURL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField(Strings.syncPhone, text: $phone)
                    .keyboardType(.phonePad)
                SecureField(Strings.syncCode, text: $code)
                    .keyboardType(.numberPad)
                Button(Strings.syncLogin) { login(serverURL, phone, code) }
                    .buttonStyle(.borderedProminent)
                    .disabled(serverURL.isEmpty || phone.isEmpty || code.isEmpty)
                if case .failed(let failure) = state {
                    Text(failureMessage(failure))
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            case .loggingIn:
                ProgressView(Strings.syncLoggingIn)
            case .loggedIn(let deviceID, let notice):
                Text(String(format: Strings.syncLoggedIn, deviceID))
                    .font(.caption)
                    .lineLimit(1)
                if let notice {
                    Text(notice == .queued ? Strings.syncQueued : Strings.syncRunning)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                HStack {
                    Button(Strings.syncNow, action: syncNow).buttonStyle(.borderedProminent)
                    Button(Strings.syncLogout, role: .destructive, action: logout).buttonStyle(.bordered)
                }
            }
        }
        .textFieldStyle(.roundedBorder)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func failureMessage(_ failure: IOSSyncFailure) -> String {
        switch failure {
        case .login: Strings.syncLoginFailed
        case .loginRequired: Strings.syncRequired
        case .queue: Strings.syncFailed
        }
    }
}

private enum LibrarySection: String, CaseIterable, Identifiable {
    case recent
    case collected
    case archived

    var id: Self { self }
    var title: String {
        switch self {
        case .recent: Strings.recentDocuments
        case .collected: Strings.collectedDocuments
        case .archived: Strings.archivedDocuments
        }
    }
}
