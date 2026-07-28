import CryptoKit
import Foundation
import MolanShared
import Security
import UIKit

struct IOSSyncCredentials: Codable, Sendable {
    let serverURL: String
    let accessToken: String
    let refreshToken: String
    let expiresAt: String
    let deviceID: String
    var cursor: String?
}

enum IOSSyncState: Equatable, Sendable {
    case loggedOut
    case loggingIn
    case loggedIn(deviceID: String, notice: IOSSyncNotice?)
    case failed(IOSSyncFailure)
}

enum IOSSyncNotice: Equatable, Sendable { case queued, syncing }
enum IOSSyncFailure: Equatable, Sendable { case login, loginRequired, queue }

fileprivate struct QueuedSync: Codable, Sendable {
    let id: String
    let documentID: String
    let uploadMutationID: String
    let documentMutationID: String
    let versionMutationID: String
    var retryCount: Int
    var lastErrorCode: String?
}

actor IOSSyncCredentialStore {
    func load() throws -> IOSSyncCredentials? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw SyncFailure.keychain }
        return try JSONDecoder().decode(IOSSyncCredentials.self, from: data)
    }

    func save(_ credentials: IOSSyncCredentials) throws {
        let data = try JSONEncoder().encode(credentials)
        let update = [kSecValueData as String: data]
        let status = SecItemUpdate(baseQuery as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var query = baseQuery
            query[kSecValueData as String] = data
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw SyncFailure.keychain }
        } else if status != errSecSuccess {
            throw SyncFailure.keychain
        }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw SyncFailure.keychain }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.molan.reader.sync",
            kSecAttrAccount as String: "session",
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
    }
}

actor IOSSyncQueueStore {
    func enqueue(documentID: String) throws {
        var records = try load()
        guard !records.contains(where: { $0.documentID == documentID }) else { return }
        records.append(QueuedSync(
            id: try newID("mut_"),
            documentID: documentID,
            uploadMutationID: try newID("mut_"),
            documentMutationID: try newID("mut_"),
            versionMutationID: try newID("mut_"),
            retryCount: 0,
            lastErrorCode: nil
        ))
        try save(records)
    }

    fileprivate func pending() throws -> [QueuedSync] { try load() }

    func remove(id: String) throws {
        try save(try load().filter { $0.id != id })
    }

    func markFailure(id: String, code: String) throws {
        var records = try load()
        guard let index = records.firstIndex(where: { $0.id == id }) else { return }
        records[index].retryCount += 1
        records[index].lastErrorCode = code
        try save(records)
    }

    private func load() throws -> [QueuedSync] {
        guard FileManager.default.fileExists(atPath: url.path) else { return [] }
        return try JSONDecoder().decode([QueuedSync].self, from: Data(contentsOf: url))
    }

    private func save(_ value: [QueuedSync]) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(value).write(to: url, options: [.atomic, .completeFileProtection])
    }

    private func newID(_ prefix: String) throws -> String {
        var bytes = [UInt8](repeating: 0, count: 10)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw SyncFailure.random }
        return prefix + SharedContractEngine().entityId(
            timestampMillis: Int64(Date().timeIntervalSince1970 * 1_000),
            entropyHex: bytes.map { String(format: "%02x", $0) }.joined()
        )
    }

    private var url: URL { URL.applicationSupportDirectory.appending(path: "Sync/queue.json") }
}

actor SyncCoordinator {
    private let credentials = IOSSyncCredentialStore()
    private let queue = IOSSyncQueueStore()
    private let library: LibraryRepository

    init(library: LibraryRepository) { self.library = library }

    func savedState() async -> IOSSyncState {
        guard let value = try? await credentials.load() else { return .loggedOut }
        return .loggedIn(deviceID: value.deviceID, notice: nil)
    }

    func login(serverURL: String, phone: String, code: String) async throws -> IOSSyncCredentials {
        let localDeviceID = try await library.localDeviceID()
        let challengeData = try await request(
            serverURL: serverURL,
            path: "/v1/auth/code/request",
            method: "POST",
            json: ["phoneNumber": phone]
        )
        let challenge = try json(challengeData)
        let response = try await request(
            serverURL: serverURL,
            path: "/v1/auth/code/verify",
            method: "POST",
            json: [
                "challengeId": requiredString(challenge, "challengeId"),
                "code": code,
                "device": [
                    "installationId": localDeviceID,
                    "name": UIDevice.current.model,
                    "type": "phone",
                    "platform": "ios",
                    "appVersion": "0.1.0-dev"
                ]
            ]
        )
        let object = try json(response)
        let device = try requiredObject(object, "device")
        let value = IOSSyncCredentials(
            serverURL: serverURL,
            accessToken: try requiredString(object, "accessToken"),
            refreshToken: try requiredString(object, "refreshToken"),
            expiresAt: try requiredString(object, "expiresAt"),
            deviceID: try requiredString(device, "id"),
            cursor: nil
        )
        try await credentials.save(value)
        return value
    }

    func logout() async throws { try await credentials.clear() }

    func enqueue(documentID: String) async throws {
        guard try await credentials.load() != nil else { throw SyncFailure.loginRequired }
        try await queue.enqueue(documentID: documentID)
        try await library.updateSyncState(documentID: documentID, state: "sync_pending")
    }

    func deleteDocument(documentID: String, scope: String) async throws {
        if scope == "current_device" {
            try await library.deleteFromDevice(documentID: documentID, deletedAt: timestamp())
            return
        }
        guard let session = try await credentials.load(),
              let bundle = try await library.syncBundleIncludingDeleted(documentID: documentID) else {
            throw SyncFailure.loginRequired
        }
        _ = try await authorizedRequest(
            credentials: session,
            path: "/v1/documents/\(documentID)",
            json: [
                "clientMutationId": try newMutationID(),
                "deviceId": session.deviceID,
                "baseVersionId": bundle.versionID,
                "scope": scope
            ],
            method: "DELETE"
        )
        try await sync()
    }

    func restoreDocument(documentID: String, scope: String) async throws {
        guard let session = try await credentials.load(),
              let bundle = try await library.syncBundleIncludingDeleted(documentID: documentID) else {
            throw SyncFailure.loginRequired
        }
        if scope == "current_device" {
            let download = try await authorizedDownload(credentials: session, fileObjectID: bundle.fileObjectID)
            defer { try? FileManager.default.removeItem(at: download.url) }
            try verifyDownload(download.url, contentHash: bundle.contentHash, sizeBytes: bundle.sizeBytes)
            try await library.restoreOnDevice(documentID: documentID, downloadedFile: download.url, restoredAt: timestamp())
            return
        }
        _ = try await authorizedRequest(
            credentials: session,
            path: "/v1/documents/\(documentID)/restore",
            json: ["clientMutationId": try newMutationID(), "deviceId": session.deviceID]
        )
        try await sync()
    }

    func resolveConflict(id: String, resolution: String) async throws {
        guard let session = try await credentials.load() else { throw SyncFailure.loginRequired }
        _ = try await authorizedRequest(
            credentials: session,
            path: "/v1/conflicts/\(id)/resolve",
            json: ["clientMutationId": try newMutationID(), "resolution": resolution]
        )
        try await loadConflicts(credentials: session)
    }

    func sync() async throws {
        guard var session = try await credentials.load() else { throw SyncFailure.loginRequired }
        for item in try await queue.pending() {
            guard let bundle = try await library.syncBundle(documentID: item.documentID) else {
                try await queue.markFailure(id: item.id, code: "E_SOURCE_MISSING")
                continue
            }
            do {
                session = try await sync(item: item, bundle: bundle, credentials: session)
                try await queue.remove(id: item.id)
                try await library.updateSyncState(documentID: item.documentID, state: "synced")
            } catch let failure as SyncHTTPFailure {
                try await queue.markFailure(id: item.id, code: failure.code)
                try await library.updateSyncState(documentID: item.documentID, state: failure.code == "E_BASE_VERSION_CONFLICT" ? "conflict" : "failed")
                throw failure
            }
        }
        var hasMore = true
        while hasMore {
            let pull = try await authorizedRequest(credentials: session, path: "/v1/sync/pull", json: [
                "deviceId": session.deviceID,
                "cursor": session.cursor ?? NSNull(),
                "limit": 100
            ])
            session = pull.credentials
            let pulled = try json(pull.data)
            for event in pulled["events"] as? [[String: Any]] ?? [] {
                session = try await applyPulledEvent(event, credentials: session)
            }
            session.cursor = try requiredString(pulled, "cursor")
            try await credentials.save(session)
            hasMore = pulled["hasMore"] as? Bool == true
        }
        try await loadConflicts(credentials: session)
    }

    private func sync(item: QueuedSync, bundle: LibrarySyncBundle, credentials initial: IOSSyncCredentials) async throws -> IOSSyncCredentials {
        var session = initial
        let upload = try await authorizedRequest(credentials: session, path: "/v1/files/uploads", json: [
            "clientMutationId": item.uploadMutationID,
            "fileObjectId": bundle.fileObjectID,
            "role": "original",
            "format": bundle.originalFormat,
            "contentHash": bundle.contentHash,
            "sizeBytes": bundle.sizeBytes,
            "mediaType": mediaType(bundle.originalFormat)
        ])
        session = upload.credentials
        let uploadJSON = try json(upload.data)
        var remoteFileObjectID = uploadJSON["fileObjectId"] as? String ?? bundle.fileObjectID
        if uploadJSON["alreadyComplete"] as? Bool != true {
            let uploadID = try requiredString(uploadJSON, "uploadId")
            let data = try Data(contentsOf: bundle.fileURL, options: .mappedIfSafe)
            var parts: [[String: Any]] = []
            var offset = 0
            var part = 1
            while offset < data.count {
                let end = min(data.count, offset + 4 * 1024 * 1024)
                let file = URL.cachesDirectory.appending(path: "sync-\(uploadID)-\(part).part")
                try Data(data[offset..<end]).write(to: file, options: .atomic)
                let response = try await BackgroundUploadSession.shared.upload(
                    serverURL: session.serverURL,
                    path: "/v1/files/uploads/\(uploadID)/parts/\(part)",
                    token: session.accessToken,
                    fileURL: file
                )
                try? FileManager.default.removeItem(at: file)
                let result = try json(response)
                parts.append(["partNumber": part, "etag": try requiredString(result, "etag")])
                offset = end
                part += 1
            }
            let completed = try await authorizedRequest(
                credentials: session,
                path: "/v1/files/uploads/\(uploadID)/complete",
                json: ["parts": parts]
            )
            session = completed.credentials
            let fileObject = try requiredObject(try json(completed.data), "fileObject")
            remoteFileObjectID = try requiredString(fileObject, "id")
        }
        try await library.canonicalizeFileObject(
            versionID: bundle.versionID,
            localID: bundle.fileObjectID,
            remoteID: remoteFileObjectID
        )
        let document: [String: Any] = [
            "id": bundle.documentID, "sourceDeviceId": session.deviceID, "title": bundle.title,
            "originalFormat": bundle.originalFormat, "currentVersionId": NSNull(),
            "createdAt": bundle.documentCreatedAt, "updatedAt": bundle.documentUpdatedAt, "deletedAt": NSNull()
        ]
        let version: [String: Any] = [
            "id": bundle.versionID, "documentId": bundle.documentID, "sourceDeviceId": session.deviceID,
            "originalFormat": bundle.originalFormat, "contentHash": bundle.contentHash,
            "sizeBytes": bundle.sizeBytes, "fileObjectId": remoteFileObjectID,
            "parentVersionId": bundle.parentVersionID ?? NSNull(), "createdAt": bundle.versionCreatedAt,
            "updatedAt": bundle.documentUpdatedAt, "deletedAt": NSNull()
        ]
        let mutations = [
            mutation(id: item.documentMutationID, session: session, bundle: bundle, versionID: nil, base: nil, payload: document),
            mutation(id: item.versionMutationID, session: session, bundle: bundle, versionID: bundle.versionID, base: bundle.parentVersionID, payload: version)
        ]
        let pushed = try await authorizedRequest(credentials: session, path: "/v1/sync/push", json: [
            "deviceId": session.deviceID, "mutations": mutations
        ])
        let result = try json(pushed.data)
        if result["ok"] as? Bool != true,
           let first = (result["results"] as? [[String: Any]])?.first(where: { $0["ok"] as? Bool == false }),
           let error = first["error"] as? [String: Any] {
            throw SyncHTTPFailure(status: 409, code: error["errorCode"] as? String ?? "E_INTERNAL")
        }
        return pushed.credentials
    }

    private func authorizedRequest(
        credentials value: IOSSyncCredentials,
        path: String,
        json body: [String: Any],
        method: String = "POST"
    ) async throws -> (data: Data, credentials: IOSSyncCredentials) {
        do {
            return (try await request(serverURL: value.serverURL, path: path, method: method, json: body, token: value.accessToken), value)
        } catch let failure as SyncHTTPFailure where failure.status == 401 && failure.code != "E_DEVICE_REVOKED" {
            let updated = try await refreshSession(value)
            return (try await request(serverURL: updated.serverURL, path: path, method: method, json: body, token: updated.accessToken), updated)
        }
    }

    private func loadConflicts(credentials value: IOSSyncCredentials) async throws {
        let response = try await authorizedGet(credentials: value, path: "/v1/conflicts")
        let object = try json(response.data)
        let rows = object["conflicts"] as? [[String: Any]] ?? []
        let conflicts = try rows.map { row in
            LibraryConflict(
                id: try requiredString(row, "id"),
                documentID: try requiredString(row, "documentId"),
                localVersionID: try requiredString(row, "localVersionId"),
                remoteVersionID: try requiredString(row, "remoteVersionId"),
                detectedAt: try requiredString(row, "detectedAt")
            )
        }
        try await library.replaceConflicts(conflicts)
    }

    private func authorizedGet(
        credentials value: IOSSyncCredentials,
        path: String
    ) async throws -> (data: Data, credentials: IOSSyncCredentials) {
        do {
            return (try await get(serverURL: value.serverURL, path: path, token: value.accessToken), value)
        } catch let failure as SyncHTTPFailure where failure.status == 401 && failure.code != "E_DEVICE_REVOKED" {
            let updated = try await refreshSession(value)
            return (try await get(serverURL: updated.serverURL, path: path, token: updated.accessToken), updated)
        }
    }

    private func applyPulledEvent(
        _ event: [String: Any],
        credentials value: IOSSyncCredentials
    ) async throws -> IOSSyncCredentials {
        let documentID = try requiredString(event, "documentId")
        let operation = try requiredString(event, "operation")
        let updatedAt = try requiredString(event, "updatedAt")
        switch operation {
        case "upsert":
            let payload = try requiredObject(event, "payload")
            let id = try requiredString(payload, "id")
            let conflict = event["phase"] as? String == "conflict"
            if id.hasPrefix("doc_") {
                try await library.applyRemoteDocument(
                    id: id,
                    sourceDeviceID: try requiredString(payload, "sourceDeviceId"),
                    title: try requiredString(payload, "title"),
                    format: try requiredString(payload, "originalFormat"),
                    currentVersionID: optionalString(payload, "currentVersionId"),
                    state: conflict ? "conflict" : (payload["state"] as? String ?? "synced"),
                    createdAt: try requiredString(payload, "createdAt"),
                    updatedAt: try requiredString(payload, "updatedAt"),
                    deletedAt: optionalString(payload, "deletedAt")
                )
                return value
            }
            if id.hasPrefix("air_") {
                let fileObjectID = try requiredString(payload, "fileObjectId")
                let download = try await authorizedDownload(credentials: value, fileObjectID: fileObjectID)
                defer { try? FileManager.default.removeItem(at: download.url) }
                let contentHash = try requiredString(payload, "contentHash")
                let sizeBytes = try requiredInt(payload, "sizeBytes")
                try verifyDownload(download.url, contentHash: contentHash, sizeBytes: sizeBytes)
                try await library.applyRemoteAIResult(
                    id: id,
                    documentID: documentID,
                    sourceVersionID: try requiredString(payload, "sourceVersionId"),
                    sourceArtifactID: optionalString(payload, "sourceArtifactId"),
                    sourceDeviceID: try requiredString(payload, "sourceDeviceId"),
                    fileObjectID: fileObjectID,
                    resultType: try requiredString(payload, "resultType"),
                    format: try requiredString(payload, "format"),
                    generatorName: try requiredString(payload, "generatorName"),
                    generatorVersion: try requiredString(payload, "generatorVersion"),
                    createdAt: try requiredString(payload, "createdAt"),
                    updatedAt: updatedAt,
                    deletedAt: optionalString(payload, "deletedAt"),
                    downloadedFile: download.url,
                    contentHash: contentHash,
                    sizeBytes: sizeBytes
                )
                return download.credentials
            }
            guard id.hasPrefix("ver_") else { return value }
            let fileObjectID = try requiredString(payload, "fileObjectId")
            let download = try await authorizedDownload(credentials: value, fileObjectID: fileObjectID)
            defer { try? FileManager.default.removeItem(at: download.url) }
            let contentHash = try requiredString(payload, "contentHash")
            let sizeBytes = try requiredInt(payload, "sizeBytes")
            try verifyDownload(download.url, contentHash: contentHash, sizeBytes: sizeBytes)
            try await library.applyRemoteVersion(
                id: id,
                documentID: documentID,
                sourceDeviceID: try requiredString(payload, "sourceDeviceId"),
                format: try requiredString(payload, "originalFormat"),
                contentHash: contentHash,
                sizeBytes: sizeBytes,
                fileObjectID: fileObjectID,
                parentVersionID: optionalString(payload, "parentVersionId"),
                createdAt: try requiredString(payload, "createdAt"),
                updatedAt: updatedAt,
                deletedAt: optionalString(payload, "deletedAt"),
                downloadedFile: download.url,
                conflict: conflict
            )
            return download.credentials
        case "delete":
            let tombstone = try requiredObject(event, "tombstone")
            let deletedAt = try requiredString(tombstone, "deletedAt")
            let scope = (event["payload"] as? [String: Any])?["scope"] as? String
            if scope == "cloud" {
                try await library.applyRemoteState(documentID: documentID, state: "collected", updatedAt: deletedAt, deletedAt: nil)
            } else {
                try await library.applyRemoteState(documentID: documentID, state: "deleted", updatedAt: deletedAt, deletedAt: deletedAt)
            }
        case "archive":
            try await library.applyRemoteState(documentID: documentID, state: "archived", updatedAt: updatedAt, deletedAt: nil)
        case "restore":
            try await library.applyRemoteState(documentID: documentID, state: "synced", updatedAt: updatedAt, deletedAt: nil)
            if let bundle = try await library.syncBundle(documentID: documentID) {
                let restored = try await authorizedDownload(credentials: value, fileObjectID: bundle.fileObjectID)
                defer { try? FileManager.default.removeItem(at: restored.url) }
                try verifyDownload(restored.url, contentHash: bundle.contentHash, sizeBytes: bundle.sizeBytes)
                try await library.restoreOnDevice(documentID: documentID, downloadedFile: restored.url, restoredAt: updatedAt)
                return restored.credentials
            }
        default:
            break
        }
        return value
    }

    private func authorizedDownload(
        credentials value: IOSSyncCredentials,
        fileObjectID: String
    ) async throws -> (url: URL, credentials: IOSSyncCredentials) {
        do {
            return (try await download(serverURL: value.serverURL, fileObjectID: fileObjectID, token: value.accessToken), value)
        } catch let failure as SyncHTTPFailure where failure.status == 401 && failure.code != "E_DEVICE_REVOKED" {
            let updated = try await refreshSession(value)
            return (try await download(serverURL: updated.serverURL, fileObjectID: fileObjectID, token: updated.accessToken), updated)
        }
    }

    private func refreshSession(_ value: IOSSyncCredentials) async throws -> IOSSyncCredentials {
        let refresh = try await request(
            serverURL: value.serverURL,
            path: "/v1/auth/refresh",
            method: "POST",
            json: ["refreshToken": value.refreshToken]
        )
        let object = try json(refresh)
        let updated = IOSSyncCredentials(
            serverURL: value.serverURL,
            accessToken: try requiredString(object, "accessToken"),
            refreshToken: try requiredString(object, "refreshToken"),
            expiresAt: try requiredString(object, "expiresAt"),
            deviceID: value.deviceID,
            cursor: value.cursor
        )
        try await credentials.save(updated)
        return updated
    }

    private func request(
        serverURL: String,
        path: String,
        method: String,
        json: [String: Any],
        token: String? = nil
    ) async throws -> Data {
        guard let url = URL(string: serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path) else { throw SyncFailure.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONSerialization.data(withJSONObject: json)
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if !(200...299).contains(status) {
            let object = (try? self.json(data)) ?? [:]
            throw SyncHTTPFailure(status: status, code: object["errorCode"] as? String ?? "E_INTERNAL")
        }
        return data
    }

    private func get(serverURL: String, path: String, token: String) async throws -> Data {
        guard let url = URL(string: serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path) else {
            throw SyncFailure.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if !(200...299).contains(status) {
            let object = (try? json(data)) ?? [:]
            throw SyncHTTPFailure(status: status, code: object["errorCode"] as? String ?? "E_INTERNAL")
        }
        return data
    }

    private func download(serverURL: String, fileObjectID: String, token: String) async throws -> URL {
        guard let url = URL(string: serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + "/v1/files/\(fileObjectID)") else {
            throw SyncFailure.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (temporary, response) = try await URLSession.shared.download(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(status) else {
            let body = (try? Data(contentsOf: temporary)).flatMap { try? json($0) } ?? [:]
            throw SyncHTTPFailure(status: status, code: body["errorCode"] as? String ?? "E_INTERNAL")
        }
        return temporary
    }

    private func verifyDownload(_ url: URL, contentHash: String, sizeBytes: Int) throws {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var hasher = SHA256()
        var total = 0
        while let data = try handle.read(upToCount: 64 * 1024), !data.isEmpty {
            total += data.count
            if total > sizeBytes { throw SyncHTTPFailure(status: 422, code: "E_HASH_MISMATCH") }
            hasher.update(data: data)
        }
        let hash = "sha256:" + hasher.finalize().map { String(format: "%02x", $0) }.joined()
        guard total == sizeBytes, hash == contentHash else {
            throw SyncHTTPFailure(status: 422, code: "E_HASH_MISMATCH")
        }
    }

    private func mutation(
        id: String,
        session: IOSSyncCredentials,
        bundle: LibrarySyncBundle,
        versionID: String?,
        base: String?,
        payload: [String: Any]
    ) -> [String: Any] {
        [
            "clientMutationId": id, "deviceId": session.deviceID, "documentId": bundle.documentID,
            "versionId": versionID ?? NSNull(), "baseVersionId": base ?? NSNull(),
            "operation": "upsert", "retryCount": 0, "payload": payload
        ]
    }

    private func json(_ data: Data) throws -> [String: Any] {
        guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw SyncFailure.invalidResponse }
        return value
    }

    private func requiredString(_ object: [String: Any], _ key: String) throws -> String {
        guard let value = object[key] as? String else { throw SyncFailure.invalidResponse }
        return value
    }

    private func requiredObject(_ object: [String: Any], _ key: String) throws -> [String: Any] {
        guard let value = object[key] as? [String: Any] else { throw SyncFailure.invalidResponse }
        return value
    }

    private func requiredInt(_ object: [String: Any], _ key: String) throws -> Int {
        guard let value = object[key] as? NSNumber else { throw SyncFailure.invalidResponse }
        return value.intValue
    }

    private func optionalString(_ object: [String: Any], _ key: String) -> String? {
        object[key] is NSNull ? nil : object[key] as? String
    }

    private func mediaType(_ format: String) -> String {
        switch format { case "json": "application/json"; case "markdown": "text/markdown"; default: "text/plain" }
    }

    private func newMutationID() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 10)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw SyncFailure.random
        }
        return "mut_" + SharedContractEngine().entityId(
            timestampMillis: Int64(Date().timeIntervalSince1970 * 1_000),
            entropyHex: bytes.map { String(format: "%02x", $0) }.joined()
        )
    }

    private func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }
}

struct SyncHTTPFailure: Error, Sendable { let status: Int; let code: String }
private enum SyncFailure: Error { case keychain, random, loginRequired, invalidURL, invalidResponse }

final class BackgroundUploadSession: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    static let shared = BackgroundUploadSession()
    private let lock = NSLock()
    private var continuations: [Int: CheckedContinuation<Data, Error>] = [:]
    private var responseData: [Int: Data] = [:]
    private var backgroundCompletion: (() -> Void)?
    private lazy var session = URLSession(
        configuration: URLSessionConfiguration.background(withIdentifier: "com.molan.reader.sync-upload"),
        delegate: self,
        delegateQueue: nil
    )

    func upload(serverURL: String, path: String, token: String, fileURL: URL) async throws -> Data {
        guard let url = URL(string: serverURL.trimmingCharacters(in: CharacterSet(charactersIn: "/")) + path) else { throw SyncFailure.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await withCheckedThrowingContinuation { continuation in
            let task = session.uploadTask(with: request, fromFile: fileURL)
            lock.withLock {
                continuations[task.taskIdentifier] = continuation
                responseData[task.taskIdentifier] = Data()
            }
            task.resume()
        }
    }

    func handleEvents(completion: @escaping () -> Void) {
        lock.withLock { backgroundCompletion = completion }
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        lock.withLock { responseData[dataTask.taskIdentifier, default: Data()].append(data) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        let item = lock.withLock { (continuations.removeValue(forKey: task.taskIdentifier), responseData.removeValue(forKey: task.taskIdentifier) ?? Data()) }
        guard let continuation = item.0 else { return }
        if let error { continuation.resume(throwing: error); return }
        let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0
        if (200...299).contains(status) { continuation.resume(returning: item.1) }
        else {
            let object = (try? JSONSerialization.jsonObject(with: item.1) as? [String: Any]) ?? [:]
            continuation.resume(throwing: SyncHTTPFailure(status: status, code: object["errorCode"] as? String ?? "E_INTERNAL"))
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        let completion = lock.withLock { let value = backgroundCompletion; backgroundCompletion = nil; return value }
        DispatchQueue.main.async { completion?() }
    }
}
