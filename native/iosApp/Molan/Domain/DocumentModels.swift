import Foundation

struct OpenDocument: Equatable, Sendable {
    let sourceURL: URL
    let displayName: String
    let format: String
    let encoding: String
    let text: String
    let originalData: Data
    let contentHash: String
}

enum DocumentOpenFailure: Error, Equatable, Sendable {
    case permissionDenied
    case sourceMissing
    case tooLarge
    case decodeFailed
    case unsupportedFormat
    case unknown
}

enum DocumentState: Equatable {
    case idle
    case loading
    case ready(OpenDocument)
    case failed(DocumentOpenFailure)
}
