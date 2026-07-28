import Foundation
import MolanShared
import Security

actor LibraryRepository {
    func collect(_ document: OpenDocument) throws -> CollectionOutcome {
        var snapshot = try loadSnapshot()
        let now = timestamp()
        let sourceKey = document.sourceURL.absoluteString
        let existingIndex = snapshot.documents.firstIndex(where: { $0.sourceKey == sourceKey })
        let existing = existingIndex.map { snapshot.documents[$0] }
        let currentVersion = existing.flatMap { document in
            snapshot.versions.first(where: { $0.id == document.currentVersionId })
        }
        let plan = decideCollectionPlan(
            documentExists: existing != nil,
            currentContentHash: currentVersion?.contentHash,
            incomingContentHash: document.contentHash
        )
        if plan == .duplicate { return .duplicate(existing!.id) }

        let objectHash = document.contentHash.replacingOccurrences(of: "sha256:", with: "")
        let objectIndex = snapshot.fileObjects.firstIndex(where: { $0.contentHash == document.contentHash })
        let object: StoredFileObject
        var createdObjectURL: URL?
        if let objectIndex {
            object = snapshot.fileObjects[objectIndex]
        } else {
            let extensionName = safeExtension(document.displayName)
            let relativePath = "objects/\(objectHash).\(extensionName)"
            object = StoredFileObject(
                id: try newID(prefix: "obj_"),
                contentHash: document.contentHash,
                sizeBytes: document.originalData.count,
                relativePath: relativePath,
                createdAt: now
            )
            let objectURL = libraryDirectory.appending(path: relativePath)
            try FileManager.default.createDirectory(at: objectURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            if !FileManager.default.fileExists(atPath: objectURL.path) {
                try document.originalData.write(to: objectURL, options: [.atomic, .completeFileProtection])
                createdObjectURL = objectURL
            }
            snapshot.fileObjects.append(object)
        }

        do {
            let documentID: String
            if let existing { documentID = existing.id }
            else { documentID = try newID(prefix: "doc_") }
            let versionID = try newID(prefix: "ver_")
            let sourceDeviceID = try deviceID(snapshot: &snapshot)
            snapshot.versions.append(StoredVersion(
                id: versionID,
                documentId: documentID,
                sourceDeviceId: sourceDeviceID,
                originalFormat: document.format,
                contentHash: document.contentHash,
                sizeBytes: document.originalData.count,
                fileObjectId: object.id,
                parentVersionId: currentVersion?.id,
                createdAt: now
            ))
            let stored = StoredDocument(
                id: documentID,
                sourceKey: sourceKey,
                title: document.displayName,
                originalFormat: document.format,
                currentVersionId: versionID,
                state: "collected",
                createdAt: existing?.createdAt ?? now,
                updatedAt: now
            )
            if let existingIndex { snapshot.documents[existingIndex] = stored }
            else { snapshot.documents.append(stored) }
            try saveSnapshot(snapshot)
            return plan == .newDocument ? .added(documentID) : .newVersion(documentID)
        } catch {
            if let createdObjectURL { try? FileManager.default.removeItem(at: createdObjectURL) }
            throw error
        }
    }

    func documents() throws -> [LibraryDocumentSummary] {
        let snapshot = try loadSnapshot()
        let hiddenDocumentIDs = Set(snapshot.documents.filter { $0.state == "ai_result_ready" }.map(\.id))
        let documents: [LibraryDocumentSummary] = snapshot.documents.compactMap { document -> LibraryDocumentSummary? in
            guard !hiddenDocumentIDs.contains(document.id) else { return nil }
            guard let version = snapshot.versions.first(where: { $0.id == document.currentVersionId }) else { return nil }
            return LibraryDocumentSummary(
                id: document.id,
                kind: "document",
                title: document.title,
                format: document.originalFormat,
                state: document.state,
                updatedAt: document.updatedAt,
                contentHash: version.contentHash,
                sizeBytes: version.sizeBytes,
                sourceDocumentID: nil,
                sourceTitle: nil,
                resultType: nil,
                isStale: false
            )
        }
        let aiResults = snapshot.aiResults.compactMap { result -> LibraryDocumentSummary? in
            guard result.deletedAt == nil,
                  let fileObject = snapshot.fileObjects.first(where: { $0.id == result.fileObjectId }),
                  let sourceVersion = snapshot.versions.first(where: { $0.id == result.sourceVersionId }),
                  let sourceDocument = snapshot.documents.first(where: { $0.id == sourceVersion.documentId }),
                  let document = snapshot.documents.first(where: { $0.id == result.documentId }) else { return nil }
            return LibraryDocumentSummary(
                id: result.id,
                kind: "ai_result",
                title: aiResultTitle(result.resultType, base: document.title),
                format: result.format,
                state: "ai_result",
                updatedAt: result.updatedAt,
                contentHash: fileObject.contentHash,
                sizeBytes: fileObject.sizeBytes,
                sourceDocumentID: sourceDocument.id,
                sourceTitle: sourceDocument.title,
                resultType: result.resultType,
                isStale: sourceDocument.currentVersionId != result.sourceVersionId || sourceDocument.updatedAt > result.updatedAt
            )
        }
        return (documents + aiResults).sorted { $0.updatedAt > $1.updatedAt }
    }

    func openRequest(documentID: String) throws -> LibraryOpenRequest? {
        let snapshot = try loadSnapshot()
        guard let document = snapshot.documents.first(where: { $0.id == documentID && $0.deletedAt == nil }),
              let version = snapshot.versions.first(where: { $0.id == document.currentVersionId }),
              let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return nil }
        let url = libraryDirectory.appending(path: object.relativePath)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return LibraryOpenRequest(url: url, displayName: document.title)
    }

    func aiResultOpenRequest(resultID: String) throws -> LibraryOpenRequest? {
        let snapshot = try loadSnapshot()
        guard let result = snapshot.aiResults.first(where: { $0.id == resultID && $0.deletedAt == nil }),
              let document = snapshot.documents.first(where: { $0.id == result.documentId }),
              let object = snapshot.fileObjects.first(where: { $0.id == result.fileObjectId }) else { return nil }
        let url = libraryDirectory.appending(path: object.relativePath)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return LibraryOpenRequest(url: url, displayName: aiResultTitle(result.resultType, base: document.title))
    }

    func conflictVersionExport(versionID: String) throws -> ConflictVersionExport? {
        let snapshot = try loadSnapshot()
        guard let version = snapshot.versions.first(where: { $0.id == versionID }),
              let document = snapshot.documents.first(where: { $0.id == version.documentId }),
              let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return nil }
        let url = libraryDirectory.appending(path: object.relativePath)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return ConflictVersionExport(
            versionID: version.id,
            title: document.title,
            format: version.originalFormat,
            fileURL: url
        )
    }

    func setArchived(documentID: String, archived: Bool) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.documents.firstIndex(where: { $0.id == documentID }) else { return }
        snapshot.documents[index].state = archived ? "archived" : "collected"
        snapshot.documents[index].updatedAt = timestamp()
        try saveSnapshot(snapshot)
    }

    func syncBundle(documentID: String) throws -> LibrarySyncBundle? {
        let snapshot = try loadSnapshot()
        guard let document = snapshot.documents.first(where: { $0.id == documentID && $0.deletedAt == nil }),
              let version = snapshot.versions.first(where: { $0.id == document.currentVersionId }),
              let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return nil }
        let fileURL = libraryDirectory.appending(path: object.relativePath)
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }
        return LibrarySyncBundle(
            documentID: document.id,
            title: document.title,
            originalFormat: document.originalFormat,
            documentCreatedAt: document.createdAt,
            documentUpdatedAt: document.updatedAt,
            versionID: version.id,
            parentVersionID: version.parentVersionId,
            contentHash: version.contentHash,
            sizeBytes: version.sizeBytes,
            fileObjectID: version.fileObjectId,
            fileURL: fileURL,
            versionCreatedAt: version.createdAt
        )
    }

    func updateSyncState(documentID: String, state: String) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.documents.firstIndex(where: { $0.id == documentID }) else { return }
        snapshot.documents[index].state = state
        snapshot.documents[index].updatedAt = timestamp()
        try saveSnapshot(snapshot)
    }

    func localDeviceID() throws -> String {
        var snapshot = try loadSnapshot()
        let id = try deviceID(snapshot: &snapshot)
        try saveSnapshot(snapshot)
        return id
    }

    func syncBundleIncludingDeleted(documentID: String) throws -> LibrarySyncBundle? {
        let snapshot = try loadSnapshot()
        guard let document = snapshot.documents.first(where: { $0.id == documentID }),
              let version = snapshot.versions.first(where: { $0.id == document.currentVersionId }),
              let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return nil }
        return LibrarySyncBundle(
            documentID: document.id,
            title: document.title,
            originalFormat: document.originalFormat,
            documentCreatedAt: document.createdAt,
            documentUpdatedAt: document.updatedAt,
            versionID: version.id,
            parentVersionID: version.parentVersionId,
            contentHash: version.contentHash,
            sizeBytes: version.sizeBytes,
            fileObjectID: version.fileObjectId,
            fileURL: libraryDirectory.appending(path: object.relativePath),
            versionCreatedAt: version.createdAt
        )
    }

    func deleteFromDevice(documentID: String, deletedAt: String) throws {
        var snapshot = try loadSnapshot()
        if let index = snapshot.documents.firstIndex(where: { $0.id == documentID }),
           let version = snapshot.versions.first(where: { $0.id == snapshot.documents[index].currentVersionId }),
           let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) {
            let document = snapshot.documents[index]
            snapshot.documents[index] = StoredDocument(
                id: document.id,
                sourceKey: document.sourceKey,
                title: document.title,
                originalFormat: document.originalFormat,
                currentVersionId: document.currentVersionId,
                state: "deleted",
                createdAt: document.createdAt,
                updatedAt: deletedAt,
                deletedAt: deletedAt
            )
            try saveSnapshot(snapshot)
            let referenced = snapshot.documents.contains { candidate in
                guard candidate.id != documentID, candidate.deletedAt == nil,
                      let candidateVersion = snapshot.versions.first(where: { $0.id == candidate.currentVersionId }),
                      let candidateObject = snapshot.fileObjects.first(where: { $0.id == candidateVersion.fileObjectId }) else { return false }
                return candidateObject.relativePath == object.relativePath
            }
            if !referenced { try? FileManager.default.removeItem(at: libraryDirectory.appending(path: object.relativePath)) }
            return
        }

        guard let resultIndex = snapshot.aiResults.firstIndex(where: { $0.id == documentID && $0.deletedAt == nil }) else { return }
        let result = snapshot.aiResults[resultIndex]
        guard let object = snapshot.fileObjects.first(where: { $0.id == result.fileObjectId }) else { return }
        snapshot.aiResults[resultIndex] = StoredAIResult(
            id: result.id,
            documentId: result.documentId,
            sourceVersionId: result.sourceVersionId,
            sourceArtifactId: result.sourceArtifactId,
            sourceDeviceId: result.sourceDeviceId,
            fileObjectId: result.fileObjectId,
            resultType: result.resultType,
            format: result.format,
            generatorName: result.generatorName,
            generatorVersion: result.generatorVersion,
            createdAt: result.createdAt,
            updatedAt: deletedAt,
            deletedAt: deletedAt
        )
        try saveSnapshot(snapshot)
        let versionReferenced = snapshot.versions.contains { $0.fileObjectId == result.fileObjectId }
        let resultReferenced = snapshot.aiResults.contains { $0.id != result.id && $0.deletedAt == nil && $0.fileObjectId == result.fileObjectId }
        if !versionReferenced && !resultReferenced {
            try? FileManager.default.removeItem(at: libraryDirectory.appending(path: object.relativePath))
        }
    }

    func restoreOnDevice(documentID: String, downloadedFile: URL, restoredAt: String) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.documents.firstIndex(where: { $0.id == documentID }),
              let version = snapshot.versions.first(where: { $0.id == snapshot.documents[index].currentVersionId }),
              let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return }
        let target = libraryDirectory.appending(path: object.relativePath)
        try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
        try FileManager.default.copyItem(at: downloadedFile, to: target)
        let document = snapshot.documents[index]
        snapshot.documents[index] = StoredDocument(
            id: document.id,
            sourceKey: document.sourceKey,
            title: document.title,
            originalFormat: document.originalFormat,
            currentVersionId: document.currentVersionId,
            state: "synced",
            createdAt: document.createdAt,
            updatedAt: restoredAt,
            deletedAt: nil
        )
        try saveSnapshot(snapshot)
    }

    func conflicts() throws -> [LibraryConflict] {
        try loadSnapshot().conflicts ?? []
    }

    func replaceConflicts(_ conflicts: [LibraryConflict]) throws {
        var snapshot = try loadSnapshot()
        snapshot.conflicts = conflicts
        try saveSnapshot(snapshot)
    }

    func canonicalizeFileObject(versionID: String, localID: String, remoteID: String) throws {
        guard localID != remoteID else { return }
        var snapshot = try loadSnapshot()
        guard let versionIndex = snapshot.versions.firstIndex(where: { $0.id == versionID }),
              let local = snapshot.fileObjects.first(where: { $0.id == localID }) else { return }
        if !snapshot.fileObjects.contains(where: { $0.id == remoteID }) {
            snapshot.fileObjects.append(StoredFileObject(
                id: remoteID,
                contentHash: local.contentHash,
                sizeBytes: local.sizeBytes,
                relativePath: local.relativePath,
                createdAt: local.createdAt
            ))
        }
        snapshot.versions[versionIndex].fileObjectId = remoteID
        try saveSnapshot(snapshot)
    }

    func applyRemoteDocument(
        id: String,
        sourceDeviceID: String,
        title: String,
        format: String,
        currentVersionID: String?,
        state: String,
        createdAt: String,
        updatedAt: String,
        deletedAt: String?
    ) throws {
        var snapshot = try loadSnapshot()
        let index = snapshot.documents.firstIndex(where: { $0.id == id })
        let existing = index.map { snapshot.documents[$0] }
        let document = StoredDocument(
            id: id,
            sourceKey: existing?.sourceKey ?? "sync:\(id)",
            title: title,
            originalFormat: format,
            currentVersionId: existing?.currentVersionId ?? currentVersionID ?? "",
            state: state,
            createdAt: existing?.createdAt ?? createdAt,
            updatedAt: updatedAt,
            deletedAt: deletedAt
        )
        if let index { snapshot.documents[index] = document } else { snapshot.documents.append(document) }
        try saveSnapshot(snapshot)
    }

    func applyRemoteAIResult(
        id: String,
        documentID: String,
        sourceVersionID: String,
        sourceArtifactID: String?,
        sourceDeviceID: String,
        fileObjectID: String,
        resultType: String,
        format: String,
        generatorName: String,
        generatorVersion: String,
        createdAt: String,
        updatedAt: String,
        deletedAt: String?,
        downloadedFile: URL,
        contentHash: String,
        sizeBytes: Int
    ) throws {
        var snapshot = try loadSnapshot()
        let relativePath = "objects/\(contentHash.replacingOccurrences(of: "sha256:", with: "")).bin"
        let objectURL = libraryDirectory.appending(path: relativePath)
        try FileManager.default.createDirectory(at: objectURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        if !FileManager.default.fileExists(atPath: objectURL.path) {
            let temporary = objectURL.appendingPathExtension("tmp-\(UUID().uuidString)")
            try FileManager.default.copyItem(at: downloadedFile, to: temporary)
            try FileManager.default.moveItem(at: temporary, to: objectURL)
        }
        if !snapshot.fileObjects.contains(where: { $0.id == fileObjectID }) {
            snapshot.fileObjects.append(StoredFileObject(
                id: fileObjectID,
                contentHash: contentHash,
                sizeBytes: sizeBytes,
                relativePath: relativePath,
                createdAt: createdAt
            ))
        }
        let item = StoredAIResult(
            id: id,
            documentId: documentID,
            sourceVersionId: sourceVersionID,
            sourceArtifactId: sourceArtifactID,
            sourceDeviceId: sourceDeviceID,
            fileObjectId: fileObjectID,
            resultType: resultType,
            format: format,
            generatorName: generatorName,
            generatorVersion: generatorVersion,
            createdAt: createdAt,
            updatedAt: updatedAt,
            deletedAt: deletedAt
        )
        if let index = snapshot.aiResults.firstIndex(where: { $0.id == id }) {
            snapshot.aiResults[index] = item
        } else {
            snapshot.aiResults.append(item)
        }
        try saveSnapshot(snapshot)
    }

    func applyRemoteVersion(
        id: String,
        documentID: String,
        sourceDeviceID: String,
        format: String,
        contentHash: String,
        sizeBytes: Int,
        fileObjectID: String,
        parentVersionID: String?,
        createdAt: String,
        updatedAt: String,
        deletedAt: String?,
        downloadedFile: URL,
        conflict: Bool
    ) throws {
        var snapshot = try loadSnapshot()
        let relativePath = "objects/\(contentHash.replacingOccurrences(of: "sha256:", with: "")).bin"
        let objectURL = libraryDirectory.appending(path: relativePath)
        try FileManager.default.createDirectory(at: objectURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        if !FileManager.default.fileExists(atPath: objectURL.path) {
            let temporary = objectURL.appendingPathExtension("tmp-\(UUID().uuidString)")
            try FileManager.default.copyItem(at: downloadedFile, to: temporary)
            try FileManager.default.moveItem(at: temporary, to: objectURL)
        }
        if !snapshot.fileObjects.contains(where: { $0.id == fileObjectID }) {
            snapshot.fileObjects.append(StoredFileObject(
                id: fileObjectID,
                contentHash: contentHash,
                sizeBytes: sizeBytes,
                relativePath: relativePath,
                createdAt: createdAt
            ))
        }
        if !snapshot.versions.contains(where: { $0.id == id }) {
            snapshot.versions.append(StoredVersion(
                id: id,
                documentId: documentID,
                sourceDeviceId: sourceDeviceID,
                originalFormat: format,
                contentHash: contentHash,
                sizeBytes: sizeBytes,
                fileObjectId: fileObjectID,
                parentVersionId: parentVersionID,
                createdAt: createdAt
            ))
        } else if let index = snapshot.versions.firstIndex(where: { $0.id == id }) {
            snapshot.versions[index].fileObjectId = fileObjectID
        }
        guard let documentIndex = snapshot.documents.firstIndex(where: { $0.id == documentID }) else {
            try saveSnapshot(snapshot)
            return
        }
        let existing = snapshot.documents[documentIndex]
        snapshot.documents[documentIndex] = StoredDocument(
            id: existing.id,
            sourceKey: existing.sourceKey,
            title: existing.title,
            originalFormat: existing.originalFormat,
            currentVersionId: conflict ? existing.currentVersionId : id,
            state: conflict ? "conflict" : "synced",
            createdAt: existing.createdAt,
            updatedAt: updatedAt,
            deletedAt: deletedAt
        )
        try saveSnapshot(snapshot)
    }

    func applyRemoteState(documentID: String, state: String, updatedAt: String, deletedAt: String?) throws {
        var snapshot = try loadSnapshot()
        guard let index = snapshot.documents.firstIndex(where: { $0.id == documentID }) else { return }
        let existing = snapshot.documents[index]
        let deletedObject = snapshot.versions.first(where: { $0.id == existing.currentVersionId })
            .flatMap { version in snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) }
        snapshot.documents[index] = StoredDocument(
            id: existing.id,
            sourceKey: existing.sourceKey,
            title: existing.title,
            originalFormat: existing.originalFormat,
            currentVersionId: existing.currentVersionId,
            state: state,
            createdAt: existing.createdAt,
            updatedAt: updatedAt,
            deletedAt: deletedAt
        )
        try saveSnapshot(snapshot)
        if state == "deleted", let deletedObject {
            let referenced = snapshot.documents.contains { candidate in
                guard candidate.id != documentID, candidate.deletedAt == nil,
                      let version = snapshot.versions.first(where: { $0.id == candidate.currentVersionId }),
                      let object = snapshot.fileObjects.first(where: { $0.id == version.fileObjectId }) else { return false }
                return object.relativePath == deletedObject.relativePath
            }
            if !referenced {
                try? FileManager.default.removeItem(at: libraryDirectory.appending(path: deletedObject.relativePath))
            }
        }
    }

    private func loadSnapshot() throws -> LibrarySnapshot {
        guard FileManager.default.fileExists(atPath: indexURL.path) else { return LibrarySnapshot() }
        return try JSONDecoder().decode(LibrarySnapshot.self, from: Data(contentsOf: indexURL))
    }

    private func saveSnapshot(_ snapshot: LibrarySnapshot) throws {
        try FileManager.default.createDirectory(at: libraryDirectory, withIntermediateDirectories: true)
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: indexURL, options: [.atomic, .completeFileProtection])
    }

    private func deviceID(snapshot: inout LibrarySnapshot) throws -> String {
        if let id = snapshot.deviceId { return id }
        let id = try newID(prefix: "dev_")
        snapshot.deviceId = id
        return id
    }

    private func newID(prefix: String) throws -> String {
        var bytes = [UInt8](repeating: 0, count: 10)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw LibraryFailure.randomUnavailable
        }
        let entropy = bytes.map { String(format: "%02x", $0) }.joined()
        return prefix + SharedContractEngine().entityId(
            timestampMillis: Int64(Date().timeIntervalSince1970 * 1_000),
            entropyHex: entropy
        )
    }

    private func safeExtension(_ fileName: String) -> String {
        let value = URL(fileURLWithPath: fileName).pathExtension.lowercased()
        return !value.isEmpty && value.count <= 12 && value.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) })
            ? value : "dat"
    }

    private func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }

    private var libraryDirectory: URL { URL.applicationSupportDirectory.appending(path: "Library", directoryHint: .isDirectory) }
    private var indexURL: URL { libraryDirectory.appending(path: "index.json") }
}

private struct LibrarySnapshot: Codable {
    var deviceId: String?
    var documents: [StoredDocument] = []
    var versions: [StoredVersion] = []
    var fileObjects: [StoredFileObject] = []
    var aiResults: [StoredAIResult] = []
    var conflicts: [LibraryConflict]? = nil
}

private struct StoredDocument: Codable {
    let id: String
    let sourceKey: String
    let title: String
    let originalFormat: String
    let currentVersionId: String
    var state: String
    let createdAt: String
    var updatedAt: String
    var deletedAt: String? = nil
}

private struct StoredVersion: Codable {
    let id: String
    let documentId: String
    let sourceDeviceId: String
    let originalFormat: String
    let contentHash: String
    let sizeBytes: Int
    var fileObjectId: String
    let parentVersionId: String?
    let createdAt: String
}

private struct StoredFileObject: Codable {
    let id: String
    let contentHash: String
    let sizeBytes: Int
    let relativePath: String
    let createdAt: String
}

private struct StoredAIResult: Codable {
    let id: String
    let documentId: String
    let sourceVersionId: String
    let sourceArtifactId: String?
    let sourceDeviceId: String
    let fileObjectId: String
    let resultType: String
    let format: String
    let generatorName: String
    let generatorVersion: String
    let createdAt: String
    let updatedAt: String
    let deletedAt: String?
}

private func aiResultTitle(_ resultType: String, base: String) -> String {
    switch resultType {
    case "summary": return "\(base) · AI摘要"
    case "structured_json": return "\(base) · AI提取"
    case "report": return "\(base) · AI报告"
    case "revision": return "\(base) · AI修订"
    default: return "\(base) · AI结果"
    }
}

private enum LibraryFailure: Error {
    case randomUnavailable
}
