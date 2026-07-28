# 本地完整可用性巡检报告

日期：2026-07-26

## 结论

**Go。** 本轮发现的 2 个 P0、2 个 P1 已全部修复并复验，剩余 P0/P1 为 0。当前 Android、iPhone/iPad、macOS 桌面端、CLI、本地服务和公共契约组成的本地主链可继续开发与日常调试。

本结论仅覆盖固定样例、模拟器、macOS Electron 和本地服务，不替代实体设备、外部 App 来源、生产网络与签名发布验收。

## 已关闭问题

| 级别 | 问题 | 处理 | 复验证据 |
|---|---|---|---|
| P0 | macOS 没有可用 Pandoc，桌面和 CLI 的 Office 转换直接失败 | 下载脚本按 macOS arm64/x64 与 Windows x64 选择官方发布包、校验固定 SHA-256、设置可执行权限；打包配置同步携带对应二进制 | `pandoc 3.10` 可执行；桌面真实 PDF 转换成功；CLI 固定样例通过 |
| P0 | PDF、XLSX、JSON 虽被声明支持，但走 Pandoc 时不能可靠转成 Markdown | PDF 改用 `unpdf` 提取文本，XLSX 改用 `exceljs` 输出表格，JSON 输出结构化 Markdown；无效 JSON 明确保留原文并说明原因 | 转换引擎 12 项测试通过；DOCX/PDF/PPTX/XLSX/CSV/MD/JSON 七类真实样例全部成功 |
| P1 | 桌面收件箱元数据被右侧操作区挤压，文件名和状态难以阅读 | 收件箱条目改为单列网格，操作区移动到元数据下方 | [桌面收件箱修复截图](evidence/desktop-inbox-fixed.jpeg) |
| P1 | 手机号输入提示含糊，桌面端丢弃服务端的人类可读错误，只显示错误码 | 桌面和 iOS 文案明确要求含国家码；同步客户端保留 API `error` 字段；UI 统一去掉 Electron IPC 前缀并显示可读错误 | 真实桌面界面输入无效号码后显示“手机号格式无效”，随后使用 `+8613800000000` 登录成功 |

## 主链实测

### Android

- Android API 36 模拟器通过系统 DocumentsUI 打开固定 JSON。
- JSON 阅读页正常显示，收集动作成功，登录后同步成功，桌面端可拉取同一文档。
- 证据：
  - [文件阅读](evidence/android-json-reader.png)
  - [收集成功](evidence/android-collected-dialog.png)
  - [应用首页](evidence/android-molan-home.png)

### iPhone 与 iPad

- 固定 iOS UI 验收脚本在 iPhone 17 Pro（iOS 26.5）和 iPad (A16)（iOS 26.5）分别通过。
- 覆盖系统 Files 选择固定 JSON、阅读页、Share Extension 和 App Group 元数据。
- 结果包：
  - `native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_15-12-47-+0800.xcresult`
  - `native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_15-14-00-+0800.xcresult`

### 桌面、CLI 与服务

- Electron 完成登录、同步收件箱查看、错误恢复和真实 PDF 转换。
- CLI 的 DOCX、PDF、PPTX、XLSX、CSV、Markdown、JSON 七类固定样例均成功转换为 Markdown。
- Android 收集的数据可由桌面同步收件箱看到，证明移动端到电脑端本地主链成立。
- 服务端认证、同步、AI 授权读取和结果回流契约回归通过。

## RED → GREEN 证据

| 目标行为 | RED | GREEN | 收敛决定 |
|---|---|---|---|
| 按当前平台下载 Pandoc | 下载器不存在平台解析入口 | 3 项下载器测试通过 | 只保留当前 macOS/Windows 发布目标，不增加历史兼容路径 |
| 七类输入能产生 AI 可读 Markdown | PDF/XLSX/JSON 固定样例失败 | 转换引擎 12 项测试及七类真实样例通过 | Office 继续复用 Pandoc；PDF/XLSX/JSON 使用各自单一路径 |
| 服务错误对用户可读 | 客户端只保留 `errorCode`，UI 看到机器码 | 同步客户端 3 项测试、用户错误转换 2 项测试通过；真实 UI 显示服务文案 | 直接使用现行 API 的 `error` 字段，不增加旧字段别名 |

## 全量回归

| 范围 | 结果 |
|---|---|
| TODO 一致性 | 46/46 完成，未完成 0 |
| Contracts | 37 项通过，schema check 通过 |
| Desktop | 5 个测试文件、32 项测试通过；typecheck、build 通过 |
| CLI | 4 个测试文件、16 项测试通过；typecheck、build 通过 |
| Server | 21 项通过、2 项按环境跳过；typecheck 通过 |
| Android | `:shared:allTests`、debug build、unit test 全部成功 |
| iPhone / iPad | 两个固定 UI 验收目标分别通过 |
| Site | typecheck 与 Vite production build 通过 |
| 工作区文本检查 | `git diff --check` 通过 |

## 已知但不阻断的问题

- 直接在 iOS 27 模拟器以 `CODE_SIGNING_ALLOWED=NO` 跑整套测试时，系统 Files picker 的测试上下文失败；仓库规定的签名模拟器验收脚本在两个 iOS 26.5 目标均通过，因此记录为测试环境差异，不判定为产品 P1。
- CLI 的 esbuild 仍提示 CommonJS 输出中的 `import.meta` 告警；当前构建和行为均通过，可在包结构优化阶段处理。
- 站点主 chunk 超过 500 kB，属于加载性能优化项，不阻断本地主链。

## 延后验证

以下内容可后续验证，不应阻塞当前开发：

- 实体 iPhone/Android、微信/QQ/Safari 等真实来源；
- 生产 PostgreSQL、对象存储、外部网络和多设备长期离线冲突；
- 开发者证书、商店签名、公证和发布；
- 扫描型 PDF 的 OCR、复杂表格与超大个人文件；
- P2 动画、视觉细节、包体和构建告警优化。

## 最终裁决

当前没有必须由用户完成的操作。下一阶段可以直接使用本地模拟器和 Xcode/Electron 继续功能开发；到发布或实体设备验收阶段再补外部验证。
