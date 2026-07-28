import XCTest
@testable import Molan

@MainActor
final class AppModelTests: XCTestCase {
    func testBootstrapFailureHasVisibleRecovery() {
        struct Failure: Error {}
        let model = AppModel(bootstrap: { throw Failure() })

        guard case .failed(let failure) = model.bootstrapState else {
            return XCTFail("初始化失败必须进入错误状态")
        }
        XCTAssertEqual(failure.recoveryTitle, "重试")
    }

    func testRetryRunsBootstrapAgain() {
        var attempts = 0
        let model = AppModel(bootstrap: {
            attempts += 1
            if attempts == 1 { throw CancellationError() }
        })

        model.retryBootstrap()

        XCTAssertEqual(model.bootstrapState, .ready)
        XCTAssertEqual(attempts, 2)
    }

    func testDecoderSupportsUTF8BOMUTF16AndGBKWhileRejectingBinary() {
        XCTAssertEqual(
            TextDocumentDecoder.decode(Data([0xef, 0xbb, 0xbf]) + Data("你好".utf8)),
            DecodedText(text: "你好", encoding: "utf-8-bom")
        )
        XCTAssertEqual(
            TextDocumentDecoder.decode(Data([0xff, 0xfe, 0x2d, 0x4e, 0x87, 0x65]))?.text,
            "中文"
        )
        XCTAssertEqual(
            TextDocumentDecoder.decode(Data([0xd6, 0xd0, 0xce, 0xc4])),
            DecodedText(text: "中文", encoding: "gbk")
        )
        XCTAssertNil(TextDocumentDecoder.decode(Data([0x00, 0x01, 0x02, 0x03])))
    }

    func testTextSearchReturnsMatchingBlockIDsWithLimit() {
        let blocks = ["第一段 Alpha", "第二段", "alpha 再次出现", "ALPHA"]
        XCTAssertEqual(TextSearch.matchingBlockIDs(in: blocks, query: " alpha ", limit: 2), [0, 2])
        XCTAssertEqual(TextSearch.matchingBlockIDs(in: blocks, query: "不存在"), [])
        XCTAssertEqual(TextSearch.displayBlocks(String(repeating: "a", count: 9), maximumCharacters: 4), ["aaaa", "aaaa", "a"])
    }

    func testMarkdownParserKeepsStructuredBlocks() {
        let source = """
        # 标题

        - 一
        - 二

        | 名称 | 值 |
        | --- | --- |
        | 中文 | 1 |

        ```swift
        let value = 1
        ```

        ![图](image.png)
        """
        let blocks = MarkdownDocumentParser.parse(source)

        XCTAssertEqual(blocks[0].kind, .heading(level: 1, text: "标题"))
        XCTAssertEqual(blocks[1].kind, .unorderedList(["一", "二"]))
        XCTAssertEqual(blocks[2].kind, .table(headers: ["名称", "值"], rows: [["中文", "1"]]))
        XCTAssertEqual(blocks[3].kind, .code(language: "swift", text: "let value = 1"))
        XCTAssertEqual(blocks[4].kind, .image(alt: "图", source: "image.png"))
    }

    func testJSONPathsTruncationAndSearchMatchContract() throws {
        let parsed = try JSONDocumentParser.parse("{\"普通\": [{\"a.b\": \"Markdown 内容\"}], \"safe\": true}").get()
        guard case .object(let entries) = parsed.root else { return XCTFail("根节点应为对象") }

        XCTAssertEqual(JSONPath.property("$", key: "普通"), "$['普通']")
        XCTAssertEqual(JSONPath.property("$.safe", key: "a.b"), "$.safe['a.b']")
        XCTAssertEqual(JSONPath.index("$['普通']", index: 0), "$['普通'][0]")
        XCTAssertEqual(JSONDocumentParser.visibleChildCount(total: 501, loaded: 0), 100)
        XCTAssertEqual(JSONDocumentParser.visibleChildCount(total: 501, loaded: 200), 200)
        XCTAssertEqual(entries.count, 2)
        XCTAssertEqual(JSONDocumentParser.search(parsed.root, query: "markdown").first?.path, "$['普通'][0]['a.b']")
    }

    func testInvalidAndDeepJSONReturnActionableFailure() {
        guard case .failure(let invalid) = JSONDocumentParser.parse("{\n  \"a\": ") else {
            return XCTFail("非法 JSON 必须失败")
        }
        XCTAssertGreaterThanOrEqual(invalid.line, 1)
        XCTAssertGreaterThanOrEqual(invalid.column, 1)

        let deep = String(repeating: "[", count: 260) + "0" + String(repeating: "]", count: 260)
        guard case .failure(let failure) = JSONDocumentParser.parse(deep) else {
            return XCTFail("超深 JSON 必须被保护")
        }
        XCTAssertTrue(failure.message.contains("嵌套"))
    }

    func testCollectionPolicyIsIdempotentAndVersionsChangedContent() {
        XCTAssertEqual(
            decideCollectionPlan(documentExists: false, currentContentHash: nil, incomingContentHash: "sha256:a"),
            .newDocument
        )
        XCTAssertEqual(
            decideCollectionPlan(documentExists: true, currentContentHash: "sha256:a", incomingContentHash: "sha256:a"),
            .duplicate
        )
        XCTAssertEqual(
            decideCollectionPlan(documentExists: true, currentContentHash: "sha256:a", incomingContentHash: "sha256:b"),
            .newVersion
        )
    }

    func testAppGroupInboxRoundTripUsesProvisionedContainer() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("App Group 授权由真机签名描述文件验证")
        #else
        XCTAssertNotNil(
            FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: AppGroupInbox.groupIdentifier
            )
        )

        let payload = Data("真机 App Group \(UUID().uuidString)".utf8)
        let source = FileManager.default.temporaryDirectory
            .appending(path: "\(UUID().uuidString).md")
        try payload.write(to: source)
        defer { try? FileManager.default.removeItem(at: source) }

        try AppGroupInbox.enqueue(
            fileAt: source,
            originalName: "app-group-round-trip.md",
            typeIdentifier: "net.daringfireball.markdown"
        )
        let claimed = try XCTUnwrap(AppGroupInbox.claimNewest())
        defer { try? FileManager.default.removeItem(at: claimed.deletingLastPathComponent()) }

        XCTAssertEqual(claimed.lastPathComponent, "app-group-round-trip.md")
        XCTAssertEqual(try Data(contentsOf: claimed), payload)
        #endif
    }

}
