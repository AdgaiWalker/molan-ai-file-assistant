import SwiftUI
import UniformTypeIdentifiers

struct TextFileDocument: FileDocument {
    static var readableContentTypes: [UTType] {
        [.plainText, .json] + [UTType(filenameExtension: "md")].compactMap { $0 }
    }

    let text: String
    let contentType: UTType

    init(text: String, contentType: UTType) {
        self.text = text
        self.contentType = contentType
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents,
              let text = String(data: data, encoding: .utf8) else {
            throw CocoaError(.fileReadCorruptFile)
        }
        self.text = text
        self.contentType = configuration.contentType
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}
