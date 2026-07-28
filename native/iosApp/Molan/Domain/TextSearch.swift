import Foundation

enum TextSearch {
    static func displayBlocks(_ text: String, maximumCharacters: Int = 4_096) -> [String] {
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        var blocks: [String] = []
        for line in lines {
            if line.isEmpty {
                blocks.append("")
                continue
            }
            var start = line.startIndex
            while start < line.endIndex {
                let end = line.index(start, offsetBy: maximumCharacters, limitedBy: line.endIndex) ?? line.endIndex
                blocks.append(String(line[start..<end]))
                start = end
            }
        }
        return blocks.isEmpty ? [""] : blocks
    }

    static func matchingBlockIDs(in blocks: [String], query: String, limit: Int = 1_000) -> [Int] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return [] }
        var matches: [Int] = []
        for (index, block) in blocks.enumerated() where block.localizedCaseInsensitiveContains(needle) {
            matches.append(index)
            if matches.count == limit { break }
        }
        return matches
    }
}
