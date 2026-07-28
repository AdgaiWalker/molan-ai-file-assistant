# iOS 本地验收记录

日期：2026-07-16～2026-07-17

环境：Xcode 26.6、iOS 26.5、iPhone 17 Pro 模拟器；开发 Bundle ID 为 `com.molan.reader.dev`，Share Extension 为 `com.molan.reader.dev.share`，App Group 为 `group.com.molan.reader.dev`。

## 构建与测试

- `xcodebuild test -project Molan.xcodeproj -scheme Molan -destination 'platform=iOS Simulator,id=AA674B72-105C-41BC-992F-89BA3FF0406C' -derivedDataPath build/ios-tests`：通过；8 项测试覆盖启动失败恢复、文本搜索、Markdown 解析、JSONPath/搜索/截断/非法与深层 JSON、收集规则。
- KMP 共享框架由 Xcode 构建阶段调用，Swift 主应用实际执行共享契约启动探针。
- 冷启动、亮色、暗色、横屏、进程终止后恢复均在干净 Debug 模拟器包验证。

## 外部入口与 Share Extension

- Document Picker / Open In：从“文件”App 打开 TXT 后直接进入正文，见 `ios-simulator-open-in-txt.png`。
- 系统分享面板可发现“墨览 Dev”；Share Extension 只把原始字节按 SHA-256 写入 App Group 队列并结束请求，不解析正文，见 `ios-simulator-share-extension-handoff.png`。
- 主应用未运行时共享文件仍留在 App Group；下一次启动由主应用认领到 Application Support 后打开。相同内容使用同一对象哈希，重复分享不会覆盖不同内容。
- security-scoped URL、来源消失、未下载/不可协调、扩展交接失败都有明确失败状态；模拟器未能让扩展主动拉起主应用，因此以“排队后下次启动认领”作为系统允许的恢复路径。

## 阅读与操作

- TXT/未知文本：UTF-8、UTF-8 BOM、UTF-16 BOM、GBK、无扩展名可读；二进制伪装和不允许的 Markdown/JSON 编码被拒绝。
- Markdown：标题、段落、行内样式、列表、引用、表格、代码、目录、搜索、代码复制、链接确认、本地/远程图片、失败占位和位置恢复均为原生 SwiftUI，无 WebView。结构化样例见 `ios-simulator-markdown-structured.png`，有效本地图片见 `ios-simulator-markdown-local-image.png`。
- JSON：异步解析，树形按 100 项继续加载，支持折叠、搜索、原文/美化/压缩、值/容器/JSONPath 复制、Markdown 字段预览、敏感键提示、根标量、深度/节点上限、错误行列和顶层 JSONPath 位置恢复。见 `ios-simulator-json-tree.png`、`ios-simulator-json-large-5mb.png`。
- 编辑：草稿自动保存与恢复、JSON 保存前校验、取消不丢草稿、1 MB 以上只读；无效 JSON 见 `ios-simulator-editor-invalid-json.png`，恢复见 `ios-simulator-draft-restored.png`。
- 保存副本：系统 Document Browser 首次冷展示约 4 秒；保存后的 `session-restore.json` 与来源 SHA-256 完全一致，且未覆盖来源，见 `ios-simulator-save-copy-success.png`。
- 分享：通过临时文件 URL 进入系统分享面板，取消不删除草稿或正文，见 `ios-simulator-system-share.png`。

## 本地收集与恢复

- 明确点击“收集到墨览”后，原始字节按 SHA-256 进入应用受控目录，元数据记录 Document、Version、FileObject、父版本和仅本地状态；临时打开不会自动入库。
- 同来源同哈希幂等，同来源不同哈希新增版本，同内容复用对象。收集结果见 `ios-simulator-collection-success.png`。
- 外部来源移走并终止进程后，仍可从本地文件库离线打开相同内容，见 `ios-simulator-library-offline-open.png`。
- 阅读会话保存 security-scoped bookmark 或本地文档 ID；进程终止后恢复正确文件，见 `ios-simulator-process-session-restore.png`。横屏恢复见 `ios-simulator-landscape-recovery.png`。

## 性能基线

- `markdown/large-1mb.md`：1,512,031 字节；在 5 秒观察窗口内出现可用正文，模拟器 physical footprint 约 61 MB，见 `ios-simulator-markdown-large-1mb.png`。
- `json/large-5mb.json`：5,243,566 字节；在 5 秒观察窗口内出现树形正文，5014 项数组默认折叠，模拟器 physical footprint 约 71 MB，见 `ios-simulator-json-large-5mb.png`。
- 两项均未崩溃或长时间冻结；旋转和终止恢复后未串文件。

## D-007 同步代码验收

- Keychain 保存会话，持久队列只接收用户明确选择的文档；登录不会扫描或上传历史文件；
- Background URLSession 负责分片传输，AppDelegate 接回系统回调，前台激活时补偿同步；
- 支持旋转 refresh、分页 pull、带载荷事件重建、远端对象下载及 SHA-256/大小校验；
- 当前设备、云端、所有设备删除在确认前分别说明影响，恢复会重新下载缺失对象，冲突默认保留双方版本；
- 冲突面板可分别复制当前版本和传入版本到临时分享目录并打开系统分享面板，原始格式和版本 ID 后缀保留；
- Swift 6 模拟器构建和 8 项测试通过；当前主机没有可运行的 PostgreSQL/Docker 服务，后台终止、网络切换和真实三端链路尚未验收，D-007 保持 `[~]`。

## 尚待外部验收

- 当前证据全部来自模拟器，不能替代至少一台真实 iPhone 上的微信、QQ、Safari、“文件”App和系统分享面板入口矩阵。
- 真机还需记录机型、系统、来源 App 版本、首屏耗时、峰值内存和录屏；因此 C-002、C-004、C-008、C-009 保持 `[v]`，Gate C 尚未关闭。

## D-010 本地三端实链（2026-07-19）

- iPhone 17 / iOS 26.5 模拟器使用正常的本地临时签名构建，Keychain 会话写入成功；未签名测试包的 Keychain 拒绝被识别为构建证据问题，没有增加明文降级存储。
- 通过系统文件 URL 入口打开并明确收集 `d010-ios.txt`（77 B，SHA-256 `1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014`），入队后手动同步，首页直接显示“已同步”。
- 同一 iOS 首页同时拉到 Android 的 Markdown 和 JSON，格式、大小与同步状态一致；Electron 随后拉到 iOS TXT。
- 截图：`d010-ios-three-device-sync.jpg`。真机后台终止、系统调度和网络切换仍待外部验收。
