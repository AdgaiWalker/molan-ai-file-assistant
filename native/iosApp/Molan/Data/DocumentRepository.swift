import Foundation
import CryptoKit
import MolanShared

struct DocumentRepository: Sendable {
    func open(_ url: URL, displayName: String? = nil) async throws -> OpenDocument {
        try await Task.detached(priority: .userInitiated) {
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }

            guard FileManager.default.fileExists(atPath: url.path) else {
                throw DocumentOpenFailure.sourceMissing
            }
            var coordinationError: NSError?
            var result: Result<Data, Error>?
            NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { readableURL in
                result = Result { try Data(contentsOf: readableURL, options: .mappedIfSafe) }
            }
            if let coordinationError { throw coordinationError }
            guard let result else { throw DocumentOpenFailure.sourceMissing }
            let data = try result.get()
            guard data.count <= maximumBufferedBytes else { throw DocumentOpenFailure.tooLarge }
            guard let decoded = TextDocumentDecoder.decode(data) else {
                throw DocumentOpenFailure.decodeFailed
            }
            let format = SharedContractEngine().detectFormat(
                fileName: url.lastPathComponent,
                textPrefix: String(decoded.text.prefix(detectionPrefixLength))
            )
            guard supportedFormats.contains(format) else { throw DocumentOpenFailure.unsupportedFormat }
            let maxBytes = format == "json" ? maximumJSONBytes : maximumTextBytes
            guard data.count <= maxBytes else { throw DocumentOpenFailure.tooLarge }
            if (format == "markdown" && !markdownEncodings.contains(decoded.encoding)) ||
                (format == "json" && !jsonEncodings.contains(decoded.encoding)) {
                throw DocumentOpenFailure.decodeFailed
            }
            return OpenDocument(
                sourceURL: url,
                displayName: displayName ?? (url.lastPathComponent.isEmpty ? Strings.unnamedDocument : url.lastPathComponent),
                format: format,
                encoding: decoded.encoding,
                text: decoded.text,
                originalData: data,
                contentHash: "sha256:" + SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            )
        }.value
    }

    private let maximumBufferedBytes = 16 * 1024 * 1024
    private let maximumJSONBytes = 16 * 1024 * 1024
    private let maximumTextBytes = 8 * 1024 * 1024
    private let detectionPrefixLength = 512
    private let supportedFormats: Set<String> = ["markdown", "json", "text"]
    private let markdownEncodings: Set<String> = ["utf-8", "utf-8-bom"]
    private let jsonEncodings: Set<String> = ["utf-8", "utf-8-bom", "utf-16le-bom", "utf-16be-bom"]
}
