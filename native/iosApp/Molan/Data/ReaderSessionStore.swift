import Foundation

struct ReaderSession: Codable, Sendable {
    enum Kind: String, Codable, Sendable {
        case externalBookmark
        case libraryDocument
    }

    let kind: Kind
    let value: String
    let bookmark: Data?
    let displayName: String?
}

actor ReaderSessionStore {
    func saveExternal(url: URL, displayName: String?) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
        try save(ReaderSession(
            kind: .externalBookmark,
            value: url.absoluteString,
            bookmark: bookmark,
            displayName: displayName
        ))
    }

    func saveLibrary(documentID: String) throws {
        try save(ReaderSession(kind: .libraryDocument, value: documentID, bookmark: nil, displayName: nil))
    }

    func load() throws -> ReaderSession? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try JSONDecoder().decode(ReaderSession.self, from: Data(contentsOf: url))
    }

    func resolveURL(_ session: ReaderSession) throws -> URL? {
        if let bookmark = session.bookmark {
            var stale = false
            let resolved = try URL(
                resolvingBookmarkData: bookmark,
                options: [],
                relativeTo: nil,
                bookmarkDataIsStale: &stale
            )
            if stale { try saveExternal(url: resolved, displayName: session.displayName) }
            return resolved
        }
        return URL(string: session.value)
    }

    func clear() throws {
        guard FileManager.default.fileExists(atPath: url.path) else { return }
        try FileManager.default.removeItem(at: url)
    }

    private func save(_ session: ReaderSession) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(session).write(to: url, options: [.atomic, .completeFileProtection])
    }

    private var url: URL { URL.applicationSupportDirectory.appending(path: "Reader/session.json") }
}
