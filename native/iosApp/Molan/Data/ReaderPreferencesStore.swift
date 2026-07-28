import Foundation

struct ReaderPreferences: Codable, Equatable, Sendable {
    var textScale: Int = 1
    var lineSpacing: Int = 1
    var blockPositions: [String: Int] = [:]
    var jsonPositions: [String: String] = [:]
}

actor ReaderPreferencesStore {
    func load() -> ReaderPreferences {
        guard let data = try? Data(contentsOf: storeURL),
              let value = try? JSONDecoder().decode(ReaderPreferences.self, from: data) else {
            return ReaderPreferences()
        }
        return value
    }

    func updateAppearance(textScale: Int, lineSpacing: Int) throws {
        var value = load()
        value.textScale = textScale
        value.lineSpacing = lineSpacing
        try save(value)
    }

    func updatePosition(_ position: Int, for documentKey: String) throws {
        var value = load()
        value.blockPositions[documentKey] = position
        if value.blockPositions.count > maximumRememberedDocuments,
           let first = value.blockPositions.keys.sorted().first {
            value.blockPositions.removeValue(forKey: first)
        }
        try save(value)
    }

    func updateJSONPosition(_ path: String, for documentKey: String) throws {
        var value = load()
        value.jsonPositions[documentKey] = path
        if value.jsonPositions.count > maximumRememberedDocuments,
           let first = value.jsonPositions.keys.sorted().first {
            value.jsonPositions.removeValue(forKey: first)
        }
        try save(value)
    }

    private func save(_ value: ReaderPreferences) throws {
        let data = try JSONEncoder().encode(value)
        try FileManager.default.createDirectory(
            at: storeURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try data.write(to: storeURL, options: .atomic)
    }

    private var storeURL: URL {
        let base = URL.applicationSupportDirectory
        return base.appending(path: "Reader/preferences.json")
    }

    private let maximumRememberedDocuments = 500
}
