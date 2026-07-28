import Foundation

struct MarkdownBlock: Identifiable, Equatable, Sendable {
    enum Kind: Equatable, Sendable {
        case heading(level: Int, text: String)
        case paragraph(String)
        case unorderedList([String])
        case orderedList([String])
        case quote(String)
        case code(language: String?, text: String)
        case table(headers: [String], rows: [[String]])
        case image(alt: String, source: String)
        case divider
    }

    let id: Int
    let kind: Kind

    var searchableText: String {
        switch kind {
        case .heading(_, let text), .paragraph(let text), .quote(let text): text
        case .unorderedList(let items), .orderedList(let items): items.joined(separator: "\n")
        case .code(let language, let text): [language, text].compactMap { $0 }.joined(separator: "\n")
        case .table(let headers, let rows): (headers + rows.flatMap { $0 }).joined(separator: "\t")
        case .image(let alt, let source): "\(alt) \(source)"
        case .divider: ""
        }
    }
}

enum MarkdownDocumentParser {
    static func parse(_ source: String) -> [MarkdownBlock] {
        let lines = source.replacingOccurrences(of: "\r\n", with: "\n").split(
            separator: "\n",
            omittingEmptySubsequences: false
        ).map(String.init)
        var blocks: [MarkdownBlock] = []
        var index = 0
        while index < lines.count {
            let line = lines[index]
            if line.trimmingCharacters(in: .whitespaces).isEmpty {
                index += 1
                continue
            }
            if line.hasPrefix("```") || line.hasPrefix("~~~") {
                let fence = String(line.prefix(3))
                let language = String(line.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                index += 1
                var code: [String] = []
                while index < lines.count && !lines[index].hasPrefix(fence) {
                    code.append(lines[index])
                    index += 1
                }
                if index < lines.count { index += 1 }
                blocks.append(block(.code(language: language.isEmpty ? nil : language, text: code.joined(separator: "\n")), blocks))
                continue
            }
            if let heading = heading(line) {
                blocks.append(block(.heading(level: heading.level, text: heading.text), blocks))
                index += 1
                continue
            }
            if index + 1 < lines.count, isTableSeparator(lines[index + 1]), line.contains("|") {
                let headers = tableCells(line)
                index += 2
                var rows: [[String]] = []
                while index < lines.count, lines[index].contains("|"), !lines[index].trimmingCharacters(in: .whitespaces).isEmpty {
                    rows.append(tableCells(lines[index]))
                    index += 1
                }
                blocks.append(block(.table(headers: headers, rows: rows), blocks))
                continue
            }
            if let image = standaloneImage(line) {
                blocks.append(block(.image(alt: image.alt, source: image.source), blocks))
                index += 1
                continue
            }
            if isDivider(line) {
                blocks.append(block(.divider, blocks))
                index += 1
                continue
            }
            if unorderedItem(line) != nil {
                var items: [String] = []
                while index < lines.count, let item = unorderedItem(lines[index]) {
                    items.append(item)
                    index += 1
                }
                blocks.append(block(.unorderedList(items), blocks))
                continue
            }
            if orderedItem(line) != nil {
                var items: [String] = []
                while index < lines.count, let item = orderedItem(lines[index]) {
                    items.append(item)
                    index += 1
                }
                blocks.append(block(.orderedList(items), blocks))
                continue
            }
            if line.trimmingCharacters(in: .whitespaces).hasPrefix(">") {
                var quote: [String] = []
                while index < lines.count {
                    let value = lines[index].trimmingCharacters(in: .whitespaces)
                    guard value.hasPrefix(">") else { break }
                    quote.append(String(value.dropFirst()).trimmingCharacters(in: .whitespaces))
                    index += 1
                }
                blocks.append(block(.quote(quote.joined(separator: "\n")), blocks))
                continue
            }

            var paragraph: [String] = [line]
            index += 1
            while index < lines.count,
                  !lines[index].trimmingCharacters(in: .whitespaces).isEmpty,
                  !startsBlock(lines, at: index) {
                paragraph.append(lines[index])
                index += 1
            }
            blocks.append(block(.paragraph(paragraph.joined(separator: "\n")), blocks))
        }
        return blocks
    }

    private static func block(_ kind: MarkdownBlock.Kind, _ existing: [MarkdownBlock]) -> MarkdownBlock {
        MarkdownBlock(id: existing.count, kind: kind)
    }

    private static func heading(_ line: String) -> (level: Int, text: String)? {
        let hashes = line.prefix(while: { $0 == "#" }).count
        guard hashes > 0, hashes <= 6, line.dropFirst(hashes).first == " " else { return nil }
        return (hashes, String(line.dropFirst(hashes + 1)).trimmingCharacters(in: .whitespaces))
    }

    private static func unorderedItem(_ line: String) -> String? {
        let value = line.trimmingCharacters(in: .whitespaces)
        guard value.count > 2, ["- ", "* ", "+ "].contains(where: value.hasPrefix) else { return nil }
        return String(value.dropFirst(2))
    }

    private static func orderedItem(_ line: String) -> String? {
        let value = line.trimmingCharacters(in: .whitespaces)
        guard let dot = value.firstIndex(of: "."), dot != value.startIndex else { return nil }
        let number = value[..<dot]
        let tail = value[value.index(after: dot)...]
        guard number.allSatisfy(\.isNumber), tail.first == " " else { return nil }
        return String(tail.dropFirst())
    }

    private static func standaloneImage(_ line: String) -> (alt: String, source: String)? {
        let value = line.trimmingCharacters(in: .whitespaces)
        guard value.hasPrefix("!["), value.hasSuffix(")"), let middle = value.range(of: "](") else { return nil }
        return (
            String(value[value.index(value.startIndex, offsetBy: 2)..<middle.lowerBound]),
            String(value[middle.upperBound..<value.index(before: value.endIndex)])
        )
    }

    private static func tableCells(_ line: String) -> [String] {
        var value = line.trimmingCharacters(in: .whitespaces)
        if value.hasPrefix("|") { value.removeFirst() }
        if value.hasSuffix("|") { value.removeLast() }
        return value.split(separator: "|", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
    }

    private static func isTableSeparator(_ line: String) -> Bool {
        let cells = tableCells(line)
        return !cells.isEmpty && cells.allSatisfy { cell in
            let value = cell.trimmingCharacters(in: CharacterSet(charactersIn: ":"))
            return value.count >= 3 && value.allSatisfy { $0 == "-" }
        }
    }

    private static func isDivider(_ line: String) -> Bool {
        let value = line.filter { !$0.isWhitespace }
        return value.count >= 3 && Set(value).count == 1 && ["-", "*", "_"].contains(String(value.first!))
    }

    private static func startsBlock(_ lines: [String], at index: Int) -> Bool {
        let line = lines[index]
        return line.hasPrefix("```") || line.hasPrefix("~~~") || heading(line) != nil ||
            unorderedItem(line) != nil || orderedItem(line) != nil || standaloneImage(line) != nil ||
            line.trimmingCharacters(in: .whitespaces).hasPrefix(">") || isDivider(line) ||
            (index + 1 < lines.count && line.contains("|") && isTableSeparator(lines[index + 1]))
    }
}
