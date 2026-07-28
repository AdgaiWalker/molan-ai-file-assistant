import SwiftUI
import UIKit

struct JSONDocumentView: View {
    let text: String
    let documentKey: String
    let query: String
    let textScale: Int
    let preferencesStore: ReaderPreferencesStore

    @ScaledMetric(relativeTo: .body) private var dynamicBodySize: CGFloat = 16
    @State private var result: Result<ParsedJSONDocument, JSONSyntaxFailure>?
    @State private var mode: JSONMode = .tree
    @State private var searchResults: [JSONSearchResult] = []
    @State private var restoredPath: String?
    @State private var positionSaveTask: Task<Void, Never>?

    var body: some View {
        Group {
            switch result {
            case .none:
                ProgressView(Strings.parsingJSON)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failure(let failure):
                invalidView(failure)
            case .success(let document):
                VStack(spacing: 10) {
                    Picker(Strings.jsonViewMode, selection: $mode) {
                        ForEach(JSONMode.allCases) { mode in Text(mode.title).tag(mode) }
                    }
                    .pickerStyle(.segmented)

                    if !query.isEmpty {
                        searchView
                    } else {
                        content(document)
                    }
                }
                .task(id: query) {
                    let root = document.root
                    searchResults = await Task.detached(priority: .userInitiated) {
                        JSONDocumentParser.search(root, query: query)
                    }.value
                }
            }
        }
        .task(id: text) {
            result = nil
            result = await Task.detached(priority: .userInitiated) {
                JSONDocumentParser.parse(text)
            }.value
        }
        .task(id: documentKey) {
            restoredPath = await preferencesStore.load().jsonPositions[documentKey]
        }
    }

    @ViewBuilder
    private func content(_ document: ParsedJSONDocument) -> some View {
        switch mode {
        case .tree:
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        JSONTreeNodeView(
                            label: nil,
                            path: "$",
                            value: document.root,
                            depth: 0,
                            bodySize: bodySize
                        )
                    }
                    .padding(.vertical, 8)
                }
                .coordinateSpace(name: JSONScrollCoordinateSpace.name)
                .task(id: restoredPath) {
                    guard let restoredPath else { return }
                    await Task.yield()
                    proxy.scrollTo(restoredPath, anchor: .top)
                }
                .onPreferenceChange(JSONNodePositionKey.self, perform: saveTopVisiblePosition)
            }
        case .raw:
            sourceView(text)
        case .pretty:
            sourceView(document.pretty)
        case .compact:
            sourceView(document.compact)
        }
    }

    private var searchView: some View {
        VStack(spacing: 8) {
            Text(searchResults.isEmpty ? Strings.searchNoResults : String(format: Strings.searchResults, searchResults.count))
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(searchResults.enumerated()), id: \.offset) { _, item in
                        Button {
                            UIPasteboard.general.string = item.path
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.path).font(.caption.monospaced()).foregroundStyle(.tint)
                                Text(item.preview).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func sourceView(_ value: String) -> some View {
        ScrollView([.horizontal, .vertical]) {
            Text(value)
                .font(.system(size: bodySize, design: .monospaced))
                .textSelection(.enabled)
                .fixedSize(horizontal: true, vertical: false)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 8)
        }
    }

    private func invalidView(_ failure: JSONSyntaxFailure) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(Strings.invalidJSON, systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(String(format: Strings.jsonErrorLocation, failure.line, failure.column))
                .font(.subheadline.monospaced())
            Text(failure.message).font(.caption).foregroundStyle(.secondary)
            sourceView(text)
        }
    }

    private var bodySize: CGFloat { dynamicBodySize * [0.86, 1, 1.18][textScale] }

    private func saveTopVisiblePosition(_ positions: [String: CGFloat]) {
        guard let path = positions.min(by: { abs($0.value) < abs($1.value) })?.key else { return }
        positionSaveTask?.cancel()
        positionSaveTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            try? await preferencesStore.updateJSONPosition(path, for: documentKey)
        }
    }
}

private enum JSONScrollCoordinateSpace {
    static let name = "json-scroll"
}

private struct JSONNodePositionKey: PreferenceKey {
    static let defaultValue: [String: CGFloat] = [:]

    static func reduce(value: inout [String: CGFloat], nextValue: () -> [String: CGFloat]) {
        value.merge(nextValue(), uniquingKeysWith: { _, new in new })
    }
}

private enum JSONMode: String, CaseIterable, Identifiable {
    case tree
    case raw
    case pretty
    case compact

    var id: Self { self }
    var title: String {
        switch self {
        case .tree: Strings.jsonTree
        case .raw: Strings.jsonRaw
        case .pretty: Strings.jsonPretty
        case .compact: Strings.jsonCompact
        }
    }
}

private struct JSONTreeNodeView: View {
    let label: String?
    let path: String
    let value: JSONValue
    let depth: Int
    let bodySize: CGFloat

    @State private var expanded = false
    @State private var loaded = 100
    @State private var markdownPreview: String?
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                if value.childCount > 0 {
                    Button { expanded.toggle() } label: {
                        Image(systemName: expanded ? "chevron.down" : "chevron.right")
                            .frame(width: 20)
                    }
                    .buttonStyle(.plain)
                } else {
                    Color.clear.frame(width: 20, height: 1)
                }
                if let label {
                    Text(label).foregroundStyle(.tint).fontWeight(.semibold)
                }
                Text(value.summary)
                    .foregroundStyle(value.childCount > 0 ? .secondary : valueColor)
                    .lineLimit(3)
                if isSensitive {
                    Image(systemName: "exclamationmark.shield.fill")
                        .foregroundStyle(.orange)
                        .accessibilityLabel(Strings.sensitiveField)
                }
                Spacer(minLength: 4)
                Menu {
                    Button(Strings.copyValue) {
                        UIPasteboard.general.string = value.copyText
                        copied = true
                    }
                    Button(Strings.copyJSONPath) {
                        UIPasteboard.general.string = path
                        copied = true
                    }
                    if case .string(let text) = value, looksLikeMarkdown(text) {
                        Button(Strings.previewMarkdown) { markdownPreview = text }
                    }
                } label: {
                    Image(systemName: copied ? "checkmark" : "ellipsis.circle")
                }
            }
            .font(.system(size: bodySize, design: value.childCount > 0 ? .default : .monospaced))
            .contentShape(Rectangle())
            .onTapGesture { if value.childCount > 0 { expanded.toggle() } }

            if expanded {
                children
                    .padding(.leading, 18)
            }
        }
        .onAppear { if depth == 0 { expanded = true } }
        .id(path)
        .background {
            if depth == 1 {
                GeometryReader { proxy in
                    Color.clear.preference(
                        key: JSONNodePositionKey.self,
                        value: [path: proxy.frame(in: .named(JSONScrollCoordinateSpace.name)).minY]
                    )
                }
            }
        }
        .sheet(isPresented: Binding(
            get: { markdownPreview != nil },
            set: { if !$0 { markdownPreview = nil } }
        )) {
            NavigationStack {
                ScrollView {
                    Text((try? AttributedString(markdown: markdownPreview ?? "")) ?? AttributedString(markdownPreview ?? ""))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .textSelection(.enabled)
                }
                .navigationTitle(Strings.markdownPreview)
                .toolbar { Button(Strings.close) { markdownPreview = nil } }
            }
        }
    }

    @ViewBuilder
    private var children: some View {
        switch value {
        case .object(let entries):
            let count = JSONDocumentParser.visibleChildCount(total: entries.count, loaded: loaded)
            ForEach(0..<count, id: \.self) { index in
                let entry = entries[index]
                JSONTreeNodeView(
                    label: entry.key,
                    path: JSONPath.property(path, key: entry.key),
                    value: entry.value,
                    depth: depth + 1,
                    bodySize: bodySize
                )
            }
            loadMore(total: entries.count, visible: count)
        case .array(let values):
            let count = JSONDocumentParser.visibleChildCount(total: values.count, loaded: loaded)
            ForEach(0..<count, id: \.self) { index in
                JSONTreeNodeView(
                    label: "[\(index)]",
                    path: JSONPath.index(path, index: index),
                    value: values[index],
                    depth: depth + 1,
                    bodySize: bodySize
                )
            }
            loadMore(total: values.count, visible: count)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func loadMore(total: Int, visible: Int) -> some View {
        if visible < total {
            Button(String(format: Strings.loadMoreJSON, min(100, total - visible))) { loaded += 100 }
                .font(.caption)
                .padding(.vertical, 6)
        }
    }

    private var valueColor: Color {
        switch value {
        case .string: .primary
        case .number: .purple
        case .bool: .blue
        case .null: .secondary
        default: .secondary
        }
    }

    private var isSensitive: Bool {
        guard let label else { return false }
        let normalized = label.lowercased().replacingOccurrences(of: "-", with: "_")
        return ["password", "passwd", "secret", "token", "api_key", "apikey", "private_key"].contains(normalized)
    }

    private func looksLikeMarkdown(_ text: String) -> Bool {
        text.contains("# ") || text.contains("\n- ") || text.contains("```") || text.contains("**")
    }
}
