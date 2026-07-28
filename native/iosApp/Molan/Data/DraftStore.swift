import Foundation

actor DraftStore {
    func load(documentKey: String) throws -> String? {
        let url = try draftURL(documentKey)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try String(contentsOf: url, encoding: .utf8)
    }

    func save(_ text: String, documentKey: String) throws {
        let url = try draftURL(documentKey)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(text.utf8).write(to: url, options: .atomic)
    }

    func remove(documentKey: String) throws {
        let url = try draftURL(documentKey)
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }

    private func draftURL(_ documentKey: String) throws -> URL {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let safeKey = documentKey.replacingOccurrences(of: ":", with: "-")
        return base.appending(path: "Drafts/\(safeKey).txt")
    }
}
