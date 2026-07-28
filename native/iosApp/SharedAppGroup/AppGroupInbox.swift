import CryptoKit
import Foundation

enum AppGroupInbox {
    static let groupIdentifier = "group.com.molan.reader"
    static let openURL = URL(string: "molan://inbox")!

    struct Metadata: Codable, Sendable {
        let originalName: String
        let typeIdentifier: String
        let receivedAt: Date
        let sha256: String
    }

    static func enqueue(fileAt sourceURL: URL, originalName: String, typeIdentifier: String) throws {
        let data = try Data(contentsOf: sourceURL, options: .mappedIfSafe)
        guard data.count <= maximumBytes else { throw InboxError.tooLarge }
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        let queue = try queueDirectory()
        let destination = queue.appending(path: hash, directoryHint: .isDirectory)
        if FileManager.default.fileExists(atPath: destination.path) { return }

        let staging = queue.appending(path: ".\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: staging, withIntermediateDirectories: false)
        do {
            let fileName = safeFileName(originalName)
            try data.write(to: staging.appending(path: fileName), options: .atomic)
            let metadata = Metadata(
                originalName: fileName,
                typeIdentifier: typeIdentifier,
                receivedAt: Date(),
                sha256: hash
            )
            try JSONEncoder().encode(metadata).write(
                to: staging.appending(path: metadataFileName),
                options: .atomic
            )
            try FileManager.default.moveItem(at: staging, to: destination)
        } catch {
            try? FileManager.default.removeItem(at: staging)
            throw error
        }
    }

    static func claimNewest() throws -> URL? {
        let queue = try queueDirectory()
        let items = try FileManager.default.contentsOfDirectory(
            at: queue,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        )
        let candidates = items.compactMap { item -> (URL, Metadata)? in
            let metadataURL = item.appending(path: metadataFileName)
            guard let data = try? Data(contentsOf: metadataURL),
                  let metadata = try? JSONDecoder().decode(Metadata.self, from: data) else { return nil }
            return (item, metadata)
        }.sorted { $0.1.receivedAt > $1.1.receivedAt }
        guard let (item, metadata) = candidates.first else { return nil }

        let imports = try importsDirectory()
        let destination = imports.appending(path: metadata.sha256, directoryHint: .isDirectory)
        if !FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.moveItem(at: item, to: destination)
        } else {
            try FileManager.default.removeItem(at: item)
        }
        return destination.appending(path: metadata.originalName)
    }

    private static func queueDirectory() throws -> URL {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: groupIdentifier
        ) else { throw InboxError.appGroupUnavailable }
        let queue = container.appending(path: "ShareInbox", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: queue, withIntermediateDirectories: true)
        return queue
    }

    private static func importsDirectory() throws -> URL {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let imports = base.appending(path: "SharedImports", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: imports, withIntermediateDirectories: true)
        return imports
    }

    private static func safeFileName(_ rawName: String) -> String {
        let value = rawName
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? "shared-document.txt" : String(value.prefix(180))
    }

    private static let metadataFileName = "metadata.json"
    private static let maximumBytes = 16 * 1024 * 1024
}

enum InboxError: Error {
    case appGroupUnavailable
    case tooLarge
}
