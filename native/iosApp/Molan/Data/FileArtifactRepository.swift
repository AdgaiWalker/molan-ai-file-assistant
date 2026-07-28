import Foundation

struct FileArtifactRepository: Sendable {
    func shareArtifact(text: String, fileName: String) throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: "MolanShare", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appending(path: safeFileName(fileName))
        try Data(text.utf8).write(to: url, options: .atomic)
        return url
    }

    func shareArtifact(fileURL: URL, fileName: String) throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appending(path: "MolanShare", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let output = directory.appending(path: safeFileName(fileName))
        if FileManager.default.fileExists(atPath: output.path) {
            try FileManager.default.removeItem(at: output)
        }
        try FileManager.default.copyItem(at: fileURL, to: output)
        return output
    }

    private func safeFileName(_ value: String) -> String {
        let cleaned = value.replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? "document.txt" : String(cleaned.prefix(180))
    }
}
