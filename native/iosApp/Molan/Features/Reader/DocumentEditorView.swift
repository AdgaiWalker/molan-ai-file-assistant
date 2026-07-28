import SwiftUI

struct DocumentEditorView: View {
    let originalText: String
    let format: String
    let documentKey: String
    let draftStore: DraftStore
    let apply: (String) -> Void
    let dismiss: () -> Void

    @State private var text = ""
    @State private var preview = false
    @State private var errorMessage: String?
    @State private var saveTask: Task<Void, Never>?
    @State private var loaded = false

    var body: some View {
        NavigationStack {
            Group {
                if !loaded {
                    ProgressView(Strings.loadingDraft)
                } else if preview {
                    previewView
                } else {
                    TextEditor(text: $text)
                        .font(.body.monospaced())
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(8)
                        .accessibilityLabel(Strings.sourceText)
                }
            }
            .navigationTitle(Strings.editDocument)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(Strings.cancel, action: dismiss)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    if format == "json" {
                        Button(Strings.formatJSON, action: formatJSON)
                    }
                    Button(preview ? Strings.sourceText : Strings.preview) { togglePreview() }
                    Button(Strings.done, action: finish)
                        .fontWeight(.semibold)
                }
            }
        }
        .task {
            do {
                text = try await draftStore.load(documentKey: documentKey) ?? originalText
            } catch {
                text = originalText
                errorMessage = Strings.draftRecoveryFailed
            }
            loaded = true
        }
        .onChange(of: text) { _, value in
            guard loaded else { return }
            saveTask?.cancel()
            saveTask = Task {
                try? await Task.sleep(for: .milliseconds(450))
                guard !Task.isCancelled else { return }
                do {
                    try await draftStore.save(value, documentKey: documentKey)
                } catch {
                    errorMessage = Strings.draftSaveFailed
                }
            }
        }
        .alert(Strings.editingError, isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button(Strings.close, role: .cancel) {}
        } message: {
            Text(errorMessage ?? "")
        }
    }

    @ViewBuilder
    private var previewView: some View {
        ScrollView {
            if format == "markdown" {
                Text((try? AttributedString(markdown: text)) ?? AttributedString(text))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
                    .padding()
            } else if format == "json", case .success(let parsed) = JSONDocumentParser.parse(text) {
                Text(parsed.pretty)
                    .font(.body.monospaced())
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
                    .padding()
            } else {
                Text(text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
                    .padding()
            }
        }
    }

    private func togglePreview() {
        if format == "json", case .failure(let failure) = JSONDocumentParser.parse(text) {
            errorMessage = String(format: Strings.invalidJSONForSave, failure.line, failure.column)
            return
        }
        preview.toggle()
    }

    private func formatJSON() {
        switch JSONDocumentParser.parse(text) {
        case .success(let document): text = document.pretty
        case .failure(let failure): errorMessage = String(format: Strings.invalidJSONForSave, failure.line, failure.column)
        }
    }

    private func finish() {
        if format == "json", case .failure(let failure) = JSONDocumentParser.parse(text) {
            errorMessage = String(format: Strings.invalidJSONForSave, failure.line, failure.column)
            return
        }
        apply(text)
        dismiss()
    }
}
