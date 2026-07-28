# Hai TDD：iOS 无人工 UI 验收

日期：2026-07-24（2026-07-26 追加真机关闭证据与模拟器调试决策）

## Target Behavior

一条命令自行启动 iPhone 17 Pro 模拟器，把固定 JSON 样例放入系统“文件”App，并完成：

1. 启动墨览并定位“打开文档”；
2. 拉起系统文件选择器并选择 `normal.json`；
3. 进入阅读页；
4. 打开系统分享面板并调用墨览 Share Extension；
5. 在 `group.com.molan.reader/ShareInbox` 验证原文件与元数据已经入队。

整个流程不依赖 iPhone 镜像坐标，也不需要用户接管鼠标。

同一入口还必须支持 iPad (A16) 模拟器，不能假设系统文件选择器始终采用 iPhone 的单栏导航结构。

## RED

### 稳定 UI 入口

- **Test added**：`MolanLaunchUITests.testLaunchExposesOpenDocumentControl`
- **Behavior asserted**：应用启动后 5 秒内存在 `molan.home.open-document`。
- **Observed failure**：测试正常启动 App，但找不到稳定标识，`xcodebuild` 退出码为 65。
- **Failure is correct because**：原按钮只有可见标题，自动化入口尚未形成。

### Share Extension 真实交接

- **Behavior asserted**：调用分享扩展后，App Group 必须出现 `normal.json` 的队列元数据。
- **Observed failure**：使用 `CODE_SIGNING_ALLOWED=NO` 时 UI 可以关闭分享面板，但主应用没有 App Group 容器，也没有 `ShareInbox` 元数据。
- **Failure is correct because**：无签名模拟器构建没有获得 App Group entitlement；只看面板消失会产生假阳性。

### 真机 Share Extension 激活规则

- **Behavior asserted**：iPhone 13 Pro 的系统分享“更多 → App”列表必须出现真正的 Share Extension，点击后必须形成 App Group 队列，不能把主 App 的“用墨览打开”入口当扩展。
- **Observed failure**：旧 `public.data` 字符串谓词下，“更多 → App”只出现主 App；点击后虽然分享面板关闭，但 App Group 无 `ShareInbox`，证明此前的“墨览”候选是假阳性。
- **Failure is correct because**：主 App 注册了文档类型，同样会出现在分享 App 列表；仅断言面板关闭无法区分主 App 与 Share Extension。
- **Minimal fix**：改用系统文件语义 `NSExtensionActivationSupportsFileWithMaxCount = 1`。系统在模拟器中把主 App 显示为“墨览 Dev”、扩展显示为“墨览”，并不会采用扩展 plist 中的“收集到墨览”作为分享列表标题。

### iPad 系统文件选择器

- **Behavior asserted**：同一 UI 验收在 iPhone 与 iPad 上都必须从系统文件选择器打开固定样例并进入阅读页。
- **Observed failure**：iPad (A16) / iOS 26.5 执行 10 项测试时为 8 项通过、1 项跳过、1 项失败；失败严格停在等待“浏览”按钮。xcresult 为 `native/iosApp/build/ios-ipad-debug-current/Logs/Test/Test-Molan-2026.07.26_08-48-24-+0800.xcresult`。
- **Failure is correct because**：iPad 文件选择器直接显示双栏侧边栏和 `DOC.sidebar.item.我的iPad`，没有 iPhone 单栏流程中的“浏览”按钮；随后还确认文件名在 iPad 可访问性树中不保证是 `StaticText`。
- **Minimal fix**：测试按系统语义定位 `DOC.sidebar.item.我的i*` 本机位置，并按可见标签匹配任意类型的文件名元素；生产代码未增加设备兼容分支。

## GREEN

- 新增 `MolanUITests` 原生 UI 测试目标。
- 给首页“打开文档”增加 `molan.home.open-document` accessibility identifier。
- `testOpenDocumentFromSystemFilePicker` 自动操作系统文件选择器、阅读页、系统分享面板和墨览扩展。
- 新增 `scripts/run_ios_ui_acceptance.sh`，负责启动模拟器、投放样例、清除旧会话、执行带签名 UI 测试，并检查 App Group 队列。

执行命令：

```bash
DEVELOPER_DIR="/Users/happy/Downloads/Xcode-beta.app/Contents/Developer" \
JAVA_HOME="/path/to/jdk17" ANDROID_HOME="/path/to/android-sdk" \
  ./scripts/run_ios_ui_acceptance.sh
```

实测结果：

- Xcode：`/Users/happy/Downloads/Xcode-beta.app`，Xcode 27.0（Build 27A5228h）；
- 设备：iPhone 17 Pro 与 iPad (A16) 模拟器，iOS 26.5；
- 验收样例：`fixtures/mobile-reading/json/normal.json`；
- UI 测试：两种尺寸均通过，`xcodebuild` 退出码 0；
- Share Extension：两种尺寸均生成 `ShareInbox/51f9b1e7.../metadata.json`，`originalName` 为 `normal.json`；
- iPhone UI xcresult：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_09-00-33-+0800.xcresult`；
- iPad UI xcresult：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_08-59-18-+0800.xcresult`；
- iPad 完整测试：10 项，9 项通过、1 项按设计跳过、0 失败；
- iPad 完整测试 xcresult：`native/iosApp/build/ios-ipad-debug-current/Logs/Test/Test-Molan-2026.07.26_09-01-40-+0800.xcresult`。
- 完整模拟器测试：10 项，9 项通过、1 项真机 App Group 测试按设计跳过、0 失败；
- 完整测试 xcresult：`native/iosApp/build/ios-full-after-share-fix/Logs/Test/Test-Molan-2026.07.25_01-32-24-+0800.xcresult`。

## REFACTOR

- **Refactor done**：yes
- **Change**：把模拟器选择、样例投放、App 重置、XCUITest 和 App Group 结果检查收进单一脚本；共用的阅读页分享步骤提取为测试内私有方法。测试既能从新安装的系统选择器进入，也能继续验证正常恢复的 `normal.json` 会话，并按系统语义同时处理 iPhone 单栏与 iPad 双栏文件选择器。`testAppGroupInboxRoundTripUsesProvisionedContainer` 的真机断言现放入编译期 `#else` 分支，清除了模拟器构建中 `throw XCTSkip` 后代码不可达的警告，不改变测试语义。
- **Verification**：
  - `zsh -n scripts/run_ios_ui_acceptance.sh`：通过；
  - iPhone 与 iPad 一键 UI 验收：通过；
  - 完整 iOS 模拟器测试：10 项，9 项通过、1 项无真机签名授权测试按设计跳过、0 失败，测试源码无编译警告；
  - 完整测试 xcresult：`native/iosApp/build/ios-debug-current/Logs/Test/Test-Molan-2026.07.26_08-45-26-+0800.xcresult`；
  - iPhone 系统级 UI xcresult：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_09-00-33-+0800.xcresult`；
  - iPad 系统级 UI xcresult：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_08-59-18-+0800.xcresult`；
  - iPad 完整测试 xcresult：`native/iosApp/build/ios-ipad-debug-current/Logs/Test/Test-Molan-2026.07.26_09-01-40-+0800.xcresult`。

## iPhone 13 Pro 最终结论

- Apple Development 证书、UI Test Runner 描述文件、App Group entitlement 和真机 XCTest 均已实际工作。
- iPhone 镜像连接时，系统 FilesUI / ShareSheet 不向 XCTest 暴露远程内容；此前失败结果保留在 `native/iosApp/build/ios-ui-physical-restored-share/Logs/Test/Test-Molan-2026.07.25_01-31-18-+0800.xcresult`，失败点严格停在 `shareCell` 未出现，没有把面板关闭冒充交接成功。
- 用户物理解锁并关闭 iPhone 镜像后，同一真机 XCTest 已执行 1 项、通过 1 项、失败 0 项。通过结果为 `native/iosApp/build/ios-ui-physical-restored-share/Logs/Test/Test-Molan-2026.07.25_01-38-25-+0800.xcresult`。
- 通过后设备容器存在 `Library/Application Support/SharedImports/a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e/large-5mb.json` 与 `metadata.json`，写入时间为 2026-07-25 01:39；这证明真正的 Share Extension 已完成 App Group 交接并由主应用接收。
- 真机 Share Extension 交接缺口至此关闭。

## 当前调试决策

- 从 2026-07-26 起，iOS 日常开发固定使用 `/Users/happy/Downloads/Xcode-beta.app` 与 iPhone 17 Pro / iOS 26.5 模拟器。
- `scripts/run_ios_ui_acceptance.sh` 已锁定当前 Xcode、JDK 与 Android SDK，是文件选择器、阅读、系统分享、Share Extension 与 App Group 交接的开发门禁；无需用户预先设置环境变量。
- 默认 iPhone 执行和 `IOS_SIMULATOR_NAME='iPad (A16)'` iPad 执行均已通过，并生成 `ShareInbox/51f9b1e7.../metadata.json`。
- 不再使用 iPhone 镜像和物理解锁作为日常调试环节；模拟器通过后即可继续本地任务。
- 真机只在发布前 V2 批次集中验证模拟器无法代表的外部来源、物理性能、系统策略和分发链路。

## Deferred Validation

以下验证不影响当前模拟器开发门禁成立，集中到发布前真机批次：

- Safari、微信、QQ 真实来源录屏；
- 真机首屏耗时、峰值内存和系统终止恢复；
- iPad 关键尺寸。
