import XCTest

@MainActor
final class MolanLaunchUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testOpenDocumentFromSystemFilePicker() {
        let app = XCUIApplication()
        app.launch()
        let openDocumentButton = app.buttons["molan.home.open-document"]

        if !openDocumentButton.waitForExistence(timeout: 2) {
            let closeReader = app.buttons["molan.reader.close"]
            XCTAssertTrue(closeReader.waitForExistence(timeout: 5), "恢复阅读会话后必须能够返回首页")
            if app.staticTexts["normal.json"].waitForExistence(timeout: 5) {
                shareCurrentDocument(in: app)
                return
            }
            closeReader.tap()
        }
        XCTAssertTrue(
            openDocumentButton.waitForExistence(timeout: 5),
            "首页必须暴露稳定的打开文档控件，供无人工验收驱动定位"
        )
        XCTAssertTrue(openDocumentButton.isHittable)
        openDocumentButton.tap()

        let browse = app.buttons["浏览"]
        let localFiles = app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", "DOC.sidebar.item.我的i"))
            .firstMatch
        if !browse.waitForExistence(timeout: 5) && !localFiles.exists {
            XCTAssertTrue(openDocumentButton.waitForExistence(timeout: 2))
            XCTAssertTrue(openDocumentButton.isHittable)
            openDocumentButton.tap()
        }
        XCTAssertTrue(
            browse.waitForExistence(timeout: 8) || localFiles.waitForExistence(timeout: 8),
            "点击打开文档后必须显示系统文件选择器"
        )

        let fixtureNames = ["normal.json", "normal.md"]
        var selectedFixture = findFixture(named: fixtureNames, in: app)
        if selectedFixture == nil {
            if browse.exists {
                browse.tap()
            }
            selectedFixture = findFixture(named: fixtureNames, in: app)
            if selectedFixture == nil {
                XCTAssertTrue(localFiles.waitForExistence(timeout: 5), "文件选择器必须显示本机位置")
                localFiles.tap()
                selectedFixture = findFixture(named: fixtureNames, in: app)
            }
        }
        guard let selectedFixture else {
            XCTFail("系统文件选择器必须显示 normal.json 或 normal.md")
            return
        }
        selectedFixture.element.tap()

        XCTAssertTrue(
            app.navigationBars["阅读"].waitForExistence(timeout: 10),
            "选择文件后必须进入阅读页"
        )
        let openedFileName = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@", selectedFixture.name))
            .firstMatch
        XCTAssertTrue(openedFileName.waitForExistence(timeout: 5), "阅读页必须显示已选择的文件名")

        shareCurrentDocument(in: app)
    }

    private func shareCurrentDocument(in app: XCUIApplication) {
        app.buttons["更多"].tap()
        let shareDocument = app.buttons["系统分享"]
        XCTAssertTrue(shareDocument.waitForExistence(timeout: 3))
        shareDocument.tap()

        guard let shareExtension = findShareExtension(in: app) else {
            XCTFail("系统分享面板必须提供墨览分享扩展")
            return
        }
        let extensionHittable = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "hittable == true"),
            object: shareExtension
        )
        XCTAssertEqual(XCTWaiter.wait(for: [extensionHittable], timeout: 5), .completed)
        shareExtension.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()

        let shareSheet = app.descendants(matching: .any)["ActivityListView"]
        let shareSheetDismissed = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "exists == false"),
            object: shareSheet
        )
        XCTAssertEqual(
            XCTWaiter.wait(for: [shareSheetDismissed], timeout: 15),
            .completed,
            "分享扩展完成交接后必须关闭系统分享面板"
        )
    }

    private func findFixture(
        named names: [String],
        in app: XCUIApplication
    ) -> (name: String, element: XCUIElement)? {
        for name in names {
            let element = app.cells
                .matching(NSPredicate(format: "identifier BEGINSWITH %@", name))
                .firstMatch
            if element.waitForExistence(timeout: 2) {
                return (name, element)
            }
        }

        let supportedFile = app.cells
            .matching(NSPredicate(
                format: "identifier CONTAINS[c] %@ OR identifier CONTAINS[c] %@",
                ".json",
                ".md"
            ))
            .firstMatch
        if supportedFile.waitForExistence(timeout: 2) {
            let fileName = supportedFile.identifier
                .split(separator: ",", maxSplits: 1)
                .first
                .map(String.init) ?? supportedFile.label
            return (fileName, supportedFile)
        }
        return nil
    }

    private func findShareExtension(in app: XCUIApplication) -> XCUIElement? {
        let shareCells = app.cells.matching(identifier: "shareCell")
        guard shareCells.firstMatch.waitForExistence(timeout: 10) else { return nil }

        for _ in 0..<8 {
            let extensionCell = app.cells
                .matching(NSPredicate(
                    format: "identifier == %@ AND label == %@",
                    "shareCell",
                    "收集到墨览"
                ))
                .firstMatch
            if extensionCell.exists {
                return extensionCell
            }
            if !swipeShareAppsLeft(in: app) {
                break
            }
        }

        let moreApps = app.cells
            .matching(NSPredicate(
                format: "identifier == %@ AND label == %@",
                "shareCell",
                "更多"
            ))
            .firstMatch
        guard moreApps.exists else { return nil }
        moreApps.tap()

        let extensionInMore = app.descendants(matching: .any)
            .matching(NSPredicate(
                format: "identifier == %@ AND (label == %@ OR label == %@)",
                "activityTitleLabel",
                "收集到墨览",
                "墨览"
            ))
        let extensionCount = extensionInMore.count
        if extensionCount > 0 {
            return extensionInMore.element(boundBy: extensionCount - 1)
        }
        print("未在系统分享“更多”列表找到墨览扩展：\n\(app.debugDescription)")
        return nil
    }

    private func swipeShareAppsLeft(in app: XCUIApplication) -> Bool {
        let applicationFrame = app.frame
        let shareCells = app.cells.matching(identifier: "shareCell")
        for index in 0..<shareCells.count {
            let cellFrame = shareCells.element(boundBy: index).frame
            let center = CGPoint(x: cellFrame.midX, y: cellFrame.midY)
            guard
                cellFrame.width > 0,
                cellFrame.height > 0,
                applicationFrame.contains(center)
            else {
                continue
            }

            let start = app.coordinate(withNormalizedOffset: CGVector(
                dx: 0.82,
                dy: center.y / applicationFrame.height
            ))
            let end = app.coordinate(withNormalizedOffset: CGVector(
                dx: 0.15,
                dy: center.y / applicationFrame.height
            ))
            start.press(forDuration: 0.1, thenDragTo: end)
            return true
        }
        return false
    }
}
