import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct ReaderView: View {
    let state: DocumentState
    let close: () -> Void
    let retry: () -> Void
    let collect: (OpenDocument) async throws -> CollectionOutcome

    var body: some View {
        Group {
            switch state {
            case .idle:
                ContentUnavailableView(Strings.emptyHomeTitle, systemImage: "doc.text")
            case .loading:
                ProgressView(Strings.loadingDocument)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .ready(let document):
                DocumentReader(document: document, collect: collect)
            case .failed(let failure):
                ContentUnavailableView {
                    Label(Strings.documentOpenFailed, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(failure.message)
                } actions: {
                    Button(Strings.retry, action: retry)
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .navigationTitle(Strings.readerTitle)
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: close) {
                    Label(Strings.back, systemImage: "chevron.left")
                }
                .accessibilityIdentifier("molan.reader.close")
            }
        }
    }
}

private struct DocumentReader: View {
    let document: OpenDocument
    let collect: (OpenDocument) async throws -> CollectionOutcome
    @State private var query = ""
    @State private var copied = false
    @State private var typeScale = 1
    @State private var lineSpacing = 1
    @State private var displayedText: String
    @State private var editing = false
    @State private var exporting = false
    @State private var exportDocument: TextFileDocument?
    @State private var activityURL: URL?
    @State private var errorMessage: String?
    @State private var collectionMessage: String?
    @State private var collecting = false
    @State private var preferencesStore = ReaderPreferencesStore()
    @State private var draftStore = DraftStore()

    init(document: OpenDocument, collect: @escaping (OpenDocument) async throws -> CollectionOutcome) {
        self.document = document
        self.collect = collect
        _displayedText = State(initialValue: document.text)
    }

    var body: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(document.displayName)
                    .font(.headline)
                    .lineLimit(2)
                Text(String(format: Strings.documentMetadata, document.format.uppercased(), document.encoding.uppercased()))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            TextField(Strings.searchDocument, text: $query)
                .textFieldStyle(.roundedBorder)
            HStack {
                Button(Strings.textSmaller) { typeScale -= 1 }
                    .disabled(typeScale == 0)
                Button(Strings.textLarger) { typeScale += 1 }
                    .disabled(typeScale == 2)
                Button(Strings.lineSpacing) { lineSpacing = (lineSpacing + 1) % 3 }
                Button(copied ? Strings.copiedDocument : Strings.copyDocument) {
                    UIPasteboard.general.string = displayedText
                    copied = true
                }
                Menu {
                    Button(Strings.collectToMolan, systemImage: "tray.and.arrow.down") { beginCollection() }
                        .disabled(collecting)
                    Button(Strings.editDocument, systemImage: "pencil") { openEditor() }
                        .disabled(displayedText.utf8.count > maximumEditableBytes)
                    Button(Strings.saveCopy, systemImage: "square.and.arrow.down", action: beginExport)
                    Button(Strings.shareDocument, systemImage: "square.and.arrow.up", action: beginShare)
                } label: {
                    Label(Strings.moreActions, systemImage: "ellipsis.circle")
                }
            }
            .buttonStyle(.bordered)

            Group {
                if displayedText.isEmpty {
                    ContentUnavailableView(Strings.emptyDocument, systemImage: "doc")
                } else {
                    switch document.format {
                    case "markdown":
                        MarkdownDocumentView(
                            text: displayedText,
                            sourceURL: document.sourceURL,
                            documentKey: document.contentHash,
                            query: query,
                            textScale: typeScale,
                            lineSpacing: lineSpacing,
                            preferencesStore: preferencesStore
                        )
                    case "json":
                        JSONDocumentView(
                            text: displayedText,
                            documentKey: document.contentHash,
                            query: query,
                            textScale: typeScale,
                            preferencesStore: preferencesStore
                        )
                    default:
                        PlainTextDocumentView(
                            text: displayedText,
                            documentKey: document.contentHash,
                            query: query,
                            textScale: typeScale,
                            lineSpacing: lineSpacing,
                            preferencesStore: preferencesStore
                        )
                    }
                }
            }
        }
        .padding(.horizontal, 18)
        .task {
            let preferences = await preferencesStore.load()
            typeScale = max(0, min(2, preferences.textScale))
            lineSpacing = max(0, min(2, preferences.lineSpacing))
        }
        .onChange(of: typeScale) { _, value in saveAppearance(scale: value, spacing: lineSpacing) }
        .onChange(of: lineSpacing) { _, value in saveAppearance(scale: typeScale, spacing: value) }
        .fullScreenCover(isPresented: $editing) {
            DocumentEditorView(
                originalText: displayedText,
                format: document.format,
                documentKey: document.contentHash,
                draftStore: draftStore,
                apply: { displayedText = $0 },
                dismiss: { editing = false }
            )
        }
        .fileExporter(
            isPresented: $exporting,
            document: exportDocument,
            contentType: contentType,
            defaultFilename: document.displayName
        ) { result in
            if case .success = result {
                Task { try? await draftStore.remove(documentKey: document.contentHash) }
            } else if case .failure(let error) = result, (error as NSError).code != NSUserCancelledError {
                errorMessage = Strings.saveCopyFailed
            }
            exportDocument = nil
        }
        .sheet(isPresented: Binding(
            get: { activityURL != nil },
            set: { if !$0 { activityURL = nil } }
        )) {
            if let activityURL { ActivityView(items: [activityURL]) }
        }
        .alert(Strings.operationFailed, isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button(Strings.close, role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
        .overlay(alignment: .bottom) {
            if let collectionMessage {
                Text(collectionMessage)
                    .font(.callout)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding(.bottom, 12)
            }
        }
    }

    private func openEditor() {
        if displayedText.utf8.count > maximumEditableBytes {
            errorMessage = Strings.largeFileReadOnly
        } else {
            editing = true
        }
    }

    private func beginExport() {
        guard validateJSON() else { return }
        exportDocument = TextFileDocument(text: displayedText, contentType: contentType)
        Task {
            await Task.yield()
            exporting = true
        }
    }

    private func beginShare() {
        guard validateJSON() else { return }
        let text = displayedText
        let fileName = document.displayName
        Task {
            do {
                activityURL = try await Task.detached(priority: .userInitiated) {
                    try FileArtifactRepository().shareArtifact(text: text, fileName: fileName)
                }.value
            } catch {
                errorMessage = Strings.shareFailed
            }
        }
    }

    private func validateJSON() -> Bool {
        guard document.format == "json" else { return true }
        guard case .failure(let failure) = JSONDocumentParser.parse(displayedText) else { return true }
        errorMessage = String(format: Strings.invalidJSONForSave, failure.line, failure.column)
        return false
    }

    private func saveAppearance(scale: Int, spacing: Int) {
        Task { try? await preferencesStore.updateAppearance(textScale: scale, lineSpacing: spacing) }
    }

    private func beginCollection() {
        collecting = true
        Task {
            do {
                let outcome = try await collect(document)
                collectionMessage = outcome.message
            } catch {
                errorMessage = Strings.collectionFailed
            }
            collecting = false
            try? await Task.sleep(for: .seconds(2))
            collectionMessage = nil
        }
    }

    private var contentType: UTType {
        if document.format == "json" { return .json }
        if document.format == "markdown", let markdown = UTType(filenameExtension: "md") { return markdown }
        return .plainText
    }

    private let maximumEditableBytes = 1024 * 1024
}

private extension CollectionOutcome {
    var message: String {
        switch self {
        case .added: Strings.collectionAdded
        case .duplicate: Strings.collectionDuplicate
        case .newVersion: Strings.collectionNewVersion
        }
    }
}

private extension DocumentOpenFailure {
    var message: String {
        switch self {
        case .permissionDenied: Strings.permissionError
        case .sourceMissing: Strings.sourceMissingError
        case .tooLarge: Strings.tooLargeError
        case .decodeFailed: Strings.decodeError
        case .unsupportedFormat: Strings.unsupportedError
        case .unknown: Strings.unknownOpenError
        }
    }
}
