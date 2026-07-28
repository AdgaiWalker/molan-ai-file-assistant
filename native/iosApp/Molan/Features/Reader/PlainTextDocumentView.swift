import SwiftUI

struct PlainTextDocumentView: View {
    let text: String
    let documentKey: String
    let query: String
    let textScale: Int
    let lineSpacing: Int
    let preferencesStore: ReaderPreferencesStore

    @ScaledMetric(relativeTo: .body) private var dynamicBodySize: CGFloat = 17
    @State private var visibleBlock: Int?
    @State private var matches: [Int] = []
    @State private var selectedMatch = 0
    @State private var positionSaveTask: Task<Void, Never>?

    private var blocks: [String] { TextSearch.displayBlocks(text) }

    var body: some View {
        ScrollViewReader { proxy in
            VStack(spacing: 8) {
                if !query.isEmpty { searchNavigation(proxy: proxy) }
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: spacingValue) {
                        ForEach(blocks.indices, id: \.self) { index in
                            highlighted(blocks[index], query: query)
                                .font(.system(size: dynamicBodySize * scaleMultiplier, design: .default))
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id(index)
                        }
                    }
                    .scrollTargetLayout()
                    .padding(.vertical, 8)
                }
                .scrollPosition(id: $visibleBlock, anchor: .top)
                .onChange(of: visibleBlock) { _, value in
                    guard let value else { return }
                    positionSaveTask?.cancel()
                    positionSaveTask = Task {
                        try? await Task.sleep(for: .milliseconds(300))
                        if !Task.isCancelled { try? await preferencesStore.updatePosition(value, for: documentKey) }
                    }
                }
            }
            .task {
                let preferences = await preferencesStore.load()
                if let position = preferences.blockPositions[documentKey], position < blocks.count {
                    visibleBlock = position
                    proxy.scrollTo(position, anchor: .top)
                }
            }
            .task(id: query) {
                let searchable = blocks
                matches = await Task.detached(priority: .userInitiated) {
                    TextSearch.matchingBlockIDs(in: searchable, query: query)
                }.value
                selectedMatch = 0
                if let first = matches.first { proxy.scrollTo(first, anchor: .center) }
            }
        }
    }

    private func searchNavigation(proxy: ScrollViewProxy) -> some View {
        HStack {
            Text(matches.isEmpty ? Strings.searchNoResults : String(format: Strings.searchResults, matches.count))
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button(Strings.previousResult) { moveSearch(by: -1, proxy: proxy) }
                .disabled(matches.isEmpty)
            Button(Strings.nextResult) { moveSearch(by: 1, proxy: proxy) }
                .disabled(matches.isEmpty)
        }
    }

    private func moveSearch(by offset: Int, proxy: ScrollViewProxy) {
        guard !matches.isEmpty else { return }
        selectedMatch = (selectedMatch + offset + matches.count) % matches.count
        withAnimation { proxy.scrollTo(matches[selectedMatch], anchor: .center) }
    }

    private func highlighted(_ value: String, query: String) -> Text {
        guard !query.isEmpty else { return Text(value) }
        var output = Text("")
        var remainder = value[value.startIndex...]
        for _ in 0..<100 {
            guard let match = remainder.range(of: query, options: .caseInsensitive) else {
                output = output + Text(String(remainder))
                return output
            }
            output = output + Text(String(remainder[..<match.lowerBound]))
            output = output + Text(String(remainder[match])).foregroundColor(.orange).bold()
            remainder = remainder[match.upperBound...]
        }
        return output + Text(String(remainder))
    }

    private var scaleMultiplier: CGFloat { [0.86, 1, 1.22][textScale] }
    private var spacingValue: CGFloat { [2, 7, 12][lineSpacing] }
}
