import CoreFoundation
import Foundation

struct DecodedText: Equatable, Sendable {
    let text: String
    let encoding: String
}

enum TextDocumentDecoder {
    static func decode(_ data: Data) -> DecodedText? {
        if data.isEmpty { return DecodedText(text: "", encoding: "utf-8") }
        if data.starts(with: [0xef, 0xbb, 0xbf]) {
            return String(data: data.dropFirst(3), encoding: .utf8)
                .map { DecodedText(text: $0, encoding: "utf-8-bom") }
        }
        if data.starts(with: [0xff, 0xfe]) {
            return String(data: data.dropFirst(2), encoding: .utf16LittleEndian)
                .map { DecodedText(text: $0, encoding: "utf-16le-bom") }
        }
        if data.starts(with: [0xfe, 0xff]) {
            return String(data: data.dropFirst(2), encoding: .utf16BigEndian)
                .map { DecodedText(text: $0, encoding: "utf-16be-bom") }
        }
        guard binaryControlRatio(data) <= maximumControlRatio else { return nil }
        if let text = String(data: data, encoding: .utf8) {
            return DecodedText(text: text, encoding: "utf-8")
        }
        let gb18030 = String.Encoding(
            rawValue: CFStringConvertEncodingToNSStringEncoding(
                CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue)
            )
        )
        return String(data: data, encoding: gb18030)
            .map { DecodedText(text: $0, encoding: "gbk") }
    }

    private static func binaryControlRatio(_ data: Data) -> Double {
        var controls = 0
        for byte in data {
            if byte == 0 { return 1 }
            if (byte < 0x20 && !allowedControls.contains(byte)) || byte == 0x7f {
                controls += 1
            }
        }
        return Double(controls) / Double(data.count)
    }

    private static let allowedControls: Set<UInt8> = [0x09, 0x0a, 0x0c, 0x0d]
    private static let maximumControlRatio = 0.02
}
