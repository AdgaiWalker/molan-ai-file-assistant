import CoreFoundation
import Foundation

struct JSONEntry: Equatable, Sendable {
    let key: String
    let value: JSONValue
}

indirect enum JSONValue: Equatable, Sendable {
    case object([JSONEntry])
    case array([JSONValue])
    case string(String)
    case number(String)
    case bool(Bool)
    case null

    var summary: String {
        switch self {
        case .object(let entries): "对象 · \(entries.count) 项"
        case .array(let values): "数组 · \(values.count) 项"
        case .string(let value): value
        case .number(let value): value
        case .bool(let value): value ? "true" : "false"
        case .null: "null"
        }
    }

    var childCount: Int {
        switch self {
        case .object(let entries): entries.count
        case .array(let values): values.count
        default: 0
        }
    }

    var copyText: String {
        switch self {
        case .string(let value): value
        case .number(let value): value
        case .bool(let value): value ? "true" : "false"
        case .null: "null"
        case .object, .array: JSONDocumentParser.compact(self)
        }
    }
}

struct ParsedJSONDocument: Equatable, Sendable {
    let root: JSONValue
    let pretty: String
    let compact: String
    let nodeCount: Int
}

struct JSONSyntaxFailure: Error, Equatable, Sendable {
    let message: String
    let line: Int
    let column: Int
}

enum JSONDocumentParser {
    static func parse(_ text: String) -> Result<ParsedJSONDocument, JSONSyntaxFailure> {
        let data = Data(text.utf8)
        do {
            let object = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
            var nodeCount = 0
            let root = try convert(object, depth: 0, nodeCount: &nodeCount)
            let pretty = try encoded(object, options: [.prettyPrinted, .sortedKeys, .fragmentsAllowed])
            let compact = try encoded(object, options: [.sortedKeys, .fragmentsAllowed])
            return .success(ParsedJSONDocument(root: root, pretty: pretty, compact: compact, nodeCount: nodeCount))
        } catch let failure as JSONSyntaxFailure {
            return .failure(failure)
        } catch {
            let cocoa = error as NSError
            let offset = cocoa.userInfo["NSJSONSerializationErrorIndex"] as? Int ?? 0
            let location = lineAndColumn(data: data, byteOffset: offset)
            return .failure(JSONSyntaxFailure(
                message: cocoa.localizedDescription,
                line: location.line,
                column: location.column
            ))
        }
    }

    static func search(_ root: JSONValue, query: String, limit: Int = 1_000) -> [JSONSearchResult] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return [] }
        var results: [JSONSearchResult] = []
        var pending: [(path: String, key: String?, value: JSONValue)] = [("$", nil, root)]
        while let current = pending.popLast(), results.count < limit {
            if (current.key?.localizedCaseInsensitiveContains(needle) == true) ||
                current.value.summary.localizedCaseInsensitiveContains(needle) {
                results.append(JSONSearchResult(path: current.path, preview: current.value.summary))
            }
            switch current.value {
            case .object(let entries):
                for entry in entries.reversed() {
                    pending.append((JSONPath.property(current.path, key: entry.key), entry.key, entry.value))
                }
            case .array(let values):
                for (index, value) in values.enumerated().reversed() {
                    pending.append((JSONPath.index(current.path, index: index), String(index), value))
                }
            default:
                break
            }
        }
        return results
    }

    static func visibleChildCount(total: Int, loaded: Int, pageSize: Int = 100) -> Int {
        min(total, max(pageSize, loaded))
    }

    static func compact(_ value: JSONValue) -> String {
        guard let data = try? JSONSerialization.data(
            withJSONObject: foundationValue(value),
            options: [.sortedKeys, .fragmentsAllowed]
        ) else { return value.summary }
        return String(decoding: data, as: UTF8.self)
    }

    private static func convert(_ value: Any, depth: Int, nodeCount: inout Int) throws -> JSONValue {
        guard depth <= maximumDepth else {
            throw JSONSyntaxFailure(message: "JSON 嵌套超过 \(maximumDepth) 层", line: 1, column: 1)
        }
        nodeCount += 1
        guard nodeCount <= maximumNodes else {
            throw JSONSyntaxFailure(message: "JSON 节点数超过移动端安全上限", line: 1, column: 1)
        }
        if value is NSNull { return .null }
        if let string = value as? String { return .string(string) }
        if let number = value as? NSNumber {
            if CFGetTypeID(number) == CFBooleanGetTypeID() { return .bool(number.boolValue) }
            return .number(number.stringValue)
        }
        if let array = value as? [Any] {
            return .array(try array.map { try convert($0, depth: depth + 1, nodeCount: &nodeCount) })
        }
        if let object = value as? [String: Any] {
            let entries = try object.keys.sorted().map { key in
                JSONEntry(key: key, value: try convert(object[key]!, depth: depth + 1, nodeCount: &nodeCount))
            }
            return .object(entries)
        }
        throw JSONSyntaxFailure(message: "包含不支持的 JSON 值", line: 1, column: 1)
    }

    private static func encoded(_ value: Any, options: JSONSerialization.WritingOptions) throws -> String {
        String(decoding: try JSONSerialization.data(withJSONObject: value, options: options), as: UTF8.self)
    }

    private static func lineAndColumn(data: Data, byteOffset: Int) -> (line: Int, column: Int) {
        let prefix = String(decoding: data.prefix(max(0, min(byteOffset, data.count))), as: UTF8.self)
        let parts = prefix.split(separator: "\n", omittingEmptySubsequences: false)
        return (max(1, parts.count), (parts.last?.count ?? 0) + 1)
    }

    private static func foundationValue(_ value: JSONValue) -> Any {
        switch value {
        case .object(let entries): Dictionary(uniqueKeysWithValues: entries.map { ($0.key, foundationValue($0.value)) })
        case .array(let values): values.map(foundationValue)
        case .string(let value): value
        case .number(let value): Decimal(string: value) ?? 0
        case .bool(let value): value
        case .null: NSNull()
        }
    }

    private static let maximumDepth = 256
    private static let maximumNodes = 500_000
}

struct JSONSearchResult: Equatable, Sendable {
    let path: String
    let preview: String
}

enum JSONPath {
    static func property(_ parent: String, key: String) -> String {
        if isIdentifier(key) { return "\(parent).\(key)" }
        let escaped = key.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        return "\(parent)['\(escaped)']"
    }

    static func index(_ parent: String, index: Int) -> String {
        "\(parent)[\(index)]"
    }

    private static func isIdentifier(_ key: String) -> Bool {
        guard let first = key.first, first.isASCII, first.isLetter || first == "_" || first == "$" else { return false }
        return key.dropFirst().allSatisfy { character in
            character.isASCII && (character.isLetter || character.isNumber || character == "_" || character == "$")
        }
    }
}
