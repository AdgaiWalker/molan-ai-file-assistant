import SwiftUI
import UIKit

struct MarkdownDocumentView: View {
    let text: String
    let sourceURL: URL
    let documentKey: String
    let query: String
    let textScale: Int
    let lineSpacing: Int
    let preferencesStore: ReaderPreferencesStore

    @ScaledMetric(relativeTo: .body) private var dynamicBodySize: CGFloat = 17
    @State private var blocks: [MarkdownBlock]?
    @State private var visibleBlock: Int?
    @State private var matches: [Int] = []
    @State private var selectedMatch = 0
    @State private var showsContents = false
    @State private var pendingLink: URL?
    @State private var copiedBlock: Int?
    @State private var positionSaveTask: Task<Void, Never>?

    var body: some View {
        Group {
            if let blocks {
                ScrollViewReader { proxy in
                    VStack(spacing: 8) {
                        HStack {
                            Button {
                                showsContents = true
                            } label: {
                                Label(Strings.tableOfContents, systemImage: "list.bullet.indent")
                            }
                            .disabled(headings.isEmpty)
                            if !query.isEmpty {
                                Spacer()
                                Text(matches.isEmpty ? Strings.searchNoResults : String(format: Strings.searchResults, matches.count))
                                    .font(.caption)
                                Button(Strings.previousResult) { moveSearch(by: -1, proxy: proxy) }
                                    .disabled(matches.isEmpty)
                                Button(Strings.nextResult) { moveSearch(by: 1, proxy: proxy) }
                                    .disabled(matches.isEmpty)
                            }
                        }
                        .font(.caption)

                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: blockSpacing) {
                                ForEach(blocks) { block in
                                    blockView(block)
                                        .id(block.id)
                                }
                            }
                            .scrollTargetLayout()
                            .padding(.vertical, 8)
                        }
                        .scrollPosition(id: $visibleBlock, anchor: .top)
                        .onChange(of: visibleBlock) { _, value in savePosition(value) }
                    }
                    .environment(\.openURL, OpenURLAction { url in
                        pendingLink = url
                        return .handled
                    })
                    .task {
                        let preferences = await preferencesStore.load()
                        if let position = preferences.blockPositions[documentKey], blocks.contains(where: { $0.id == position }) {
                            visibleBlock = position
                            proxy.scrollTo(position, anchor: .top)
                        }
                    }
                    .task(id: query) {
                        let values = blocks.map(\.searchableText)
                        matches = await Task.detached(priority: .userInitiated) {
                            TextSearch.matchingBlockIDs(in: values, query: query)
                        }.value
                        selectedMatch = 0
                        if let first = matches.first { proxy.scrollTo(first, anchor: .center) }
                    }
                    .sheet(isPresented: $showsContents) {
                        NavigationStack {
                            List(headings, id: \.id) { heading in
                                Button {
                                    showsContents = false
                                    withAnimation { proxy.scrollTo(heading.id, anchor: .top) }
                                } label: {
                                    Text(heading.text).padding(.leading, CGFloat(heading.level - 1) * 12)
                                }
                            }
                            .navigationTitle(Strings.tableOfContents)
                            .toolbar {
                                Button(Strings.close) { showsContents = false }
                            }
                        }
                        .presentationDetents([.medium, .large])
                    }
                }
            } else {
                ProgressView(Strings.renderingMarkdown)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task(id: text) {
            blocks = await Task.detached(priority: .userInitiated) {
                MarkdownDocumentParser.parse(text)
            }.value
        }
        .alert(Strings.openExternalLink, isPresented: Binding(
            get: { pendingLink != nil },
            set: { if !$0 { pendingLink = nil } }
        )) {
            Button(Strings.cancel, role: .cancel) { pendingLink = nil }
            Button(Strings.continueOpen) {
                if let pendingLink { UIApplication.shared.open(pendingLink) }
                pendingLink = nil
            }
        } message: {
            Text(pendingLink?.absoluteString ?? "")
        }
    }

    @ViewBuilder
    private func blockView(_ block: MarkdownBlock) -> some View {
        switch block.kind {
        case .heading(let level, let text):
            Text(inline(text))
                .font(headingFont(level))
                .fontWeight(.bold)
                .textSelection(.enabled)
        case .paragraph(let text):
            Text(inline(text))
                .font(bodyFont)
                .lineSpacing(blockSpacing)
                .textSelection(.enabled)
        case .unorderedList(let items):
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .firstTextBaseline) {
                        Text("•")
                        Text(inline(item)).textSelection(.enabled)
                    }
                }
            }
            .font(bodyFont)
        case .orderedList(let items):
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .firstTextBaseline) {
                        Text("\(index + 1).")
                        Text(inline(item)).textSelection(.enabled)
                    }
                }
            }
            .font(bodyFont)
        case .quote(let text):
            HStack(alignment: .top, spacing: 10) {
                RoundedRectangle(cornerRadius: 2).fill(Color.secondary).frame(width: 4)
                Text(inline(text)).font(bodyFont).foregroundStyle(.secondary).textSelection(.enabled)
            }
            .padding(.vertical, 4)
        case .code(let language, let code):
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(language ?? Strings.code)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button(copiedBlock == block.id ? Strings.copiedCode : Strings.copyCode) {
                        UIPasteboard.general.string = code
                        copiedBlock = block.id
                    }
                    .font(.caption)
                }
                ScrollView(.horizontal) {
                    Text(code)
                        .font(.system(size: dynamicBodySize * 0.86 * scaleMultiplier, design: .monospaced))
                        .textSelection(.enabled)
                        .fixedSize(horizontal: true, vertical: false)
                }
            }
            .padding(12)
            .background(.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
        case .table(let headers, let rows):
            ScrollView(.horizontal) {
                Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 8) {
                    GridRow {
                        ForEach(Array(headers.enumerated()), id: \.offset) { _, value in
                            Text(inline(value)).bold().textSelection(.enabled)
                        }
                    }
                    Divider()
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                        GridRow {
                            ForEach(Array(row.enumerated()), id: \.offset) { _, value in
                                Text(inline(value)).textSelection(.enabled)
                            }
                        }
                    }
                }
                .font(bodyFont)
                .padding(10)
            }
            .background(.secondary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
        case .image(let alt, let source):
            MarkdownImageView(alt: alt, source: source, documentURL: sourceURL)
        case .divider:
            Divider()
        }
    }

    private func inline(_ value: String) -> AttributedString {
        (try? AttributedString(
            markdown: value,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        )) ?? AttributedString(value)
    }

    private func headingFont(_ level: Int) -> Font {
        let multiplier: CGFloat = [0, 1.75, 1.5, 1.3, 1.15, 1.05, 1][level]
        return .system(size: dynamicBodySize * multiplier * scaleMultiplier)
    }

    private var bodyFont: Font { .system(size: dynamicBodySize * scaleMultiplier) }
    private var scaleMultiplier: CGFloat { [0.86, 1, 1.22][textScale] }
    private var blockSpacing: CGFloat { [6, 12, 18][lineSpacing] }

    private var headings: [(id: Int, level: Int, text: String)] {
        (blocks ?? []).compactMap { block in
            guard case .heading(let level, let text) = block.kind else { return nil }
            return (block.id, level, text)
        }
    }

    private func moveSearch(by offset: Int, proxy: ScrollViewProxy) {
        guard !matches.isEmpty else { return }
        selectedMatch = (selectedMatch + offset + matches.count) % matches.count
        withAnimation { proxy.scrollTo(matches[selectedMatch], anchor: .center) }
    }

    private func savePosition(_ value: Int?) {
        guard let value else { return }
        positionSaveTask?.cancel()
        positionSaveTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            if !Task.isCancelled { try? await preferencesStore.updatePosition(value, for: documentKey) }
        }
    }
}

private struct MarkdownImageView: View {
    let alt: String
    let source: String
    let documentURL: URL

    @State private var image: UIImage?
    @State private var failed = false

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .accessibilityLabel(alt)
            } else if failed {
                Label(alt.isEmpty ? Strings.imageUnavailable : alt, systemImage: "photo.badge.exclamationmark")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 100)
                    .background(.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
            } else {
                ProgressView().frame(maxWidth: .infinity, minHeight: 100)
            }
        }
        .task(id: source) {
            do {
                let data = try await loadData()
                guard data.count <= 20 * 1024 * 1024, let loaded = UIImage(data: data) else { throw ImageFailure.invalid }
                image = loaded
            } catch {
                failed = true
            }
        }
    }

    private func loadData() async throws -> Data {
        if let url = URL(string: source), let scheme = url.scheme?.lowercased(), ["https", "http"].contains(scheme) {
            let (data, _) = try await URLSession.shared.data(from: url)
            return data
        }
        let fileURL = URL(fileURLWithPath: source, relativeTo: documentURL.deletingLastPathComponent()).standardizedFileURL
        return try await Task.detached(priority: .utility) {
            let accessed = fileURL.startAccessingSecurityScopedResource()
            defer { if accessed { fileURL.stopAccessingSecurityScopedResource() } }
            return try Data(contentsOf: fileURL, options: .mappedIfSafe)
        }.value
    }

    private enum ImageFailure: Error { case invalid }
}
