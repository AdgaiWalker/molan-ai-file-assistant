import Foundation

enum CollectionPlan: Equatable, Sendable {
    case newDocument
    case duplicate
    case newVersion
}

func decideCollectionPlan(documentExists: Bool, currentContentHash: String?, incomingContentHash: String) -> CollectionPlan {
    guard documentExists else { return .newDocument }
    return currentContentHash == incomingContentHash ? .duplicate : .newVersion
}

enum CollectionOutcome: Equatable, Sendable {
    case added(String)
    case duplicate(String)
    case newVersion(String)
}

struct LibraryDocumentSummary: Identifiable, Codable, Equatable, Sendable {
    let id: String
    let kind: String
    let title: String
    let format: String
    let state: String
    let updatedAt: String
    let contentHash: String
    let sizeBytes: Int
    let sourceDocumentID: String?
    let sourceTitle: String?
    let resultType: String?
    let isStale: Bool
}

struct LibraryOpenRequest: Sendable {
    let url: URL
    let displayName: String
}

struct LibrarySyncBundle: Sendable {
    let documentID: String
    let title: String
    let originalFormat: String
    let documentCreatedAt: String
    let documentUpdatedAt: String
    let versionID: String
    let parentVersionID: String?
    let contentHash: String
    let sizeBytes: Int
    let fileObjectID: String
    let fileURL: URL
    let versionCreatedAt: String
}

struct LibraryConflict: Identifiable, Codable, Equatable, Sendable {
    let id: String
    let documentID: String
    let localVersionID: String
    let remoteVersionID: String
    let detectedAt: String
}

struct ConflictVersionExport: Sendable {
    let versionID: String
    let title: String
    let format: String
    let fileURL: URL
}
