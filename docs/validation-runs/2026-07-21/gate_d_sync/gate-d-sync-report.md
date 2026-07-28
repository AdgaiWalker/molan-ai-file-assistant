# Gate D 本地跨端同步验收报告

日期：2026-07-26

任务：D-010

结论：**通过**。本地范围内未发现数据丢失、未授权读取、删除后仍可读或冲突覆盖任一版本。发布、真机和生产网络不在本次结论内。

## 验收边界

本批次使用三种真实认证设备身份、PGlite/PostgreSQL 仓储、原始对象存储和 Android/iPhone/iPad 模拟器完成本地闭环：

- Android API 36 模拟器身份负责 Markdown、TXT、PDF、PPTX；
- iPhone 17 Pro 模拟器身份负责 JSON、DOCX、XLSX；
- macOS 桌面身份负责统一拉取、下载核验、修改、冲突处理、设备撤销；
- iPhone 17 Pro 与 iPad (A16) 均实际执行系统文件选择器、阅读、系统分享、Share Extension 和 App Group 交接；
- PostgreSQL 集成测试实际执行上传、下载、同步事件、游标、重放、冲突、删除恢复与权限拒绝。

移动端 UI 验收和服务端故障矩阵分别自动化执行；本报告不把服务测试中的设备身份写成移动端 UI 网络抓包，也不把模拟器结论外推到真机或生产环境。

## 固定样例与 SHA-256

以下七个文件均先核对固定大小与 SHA-256，再作为 `original` 对象上传；桌面身份下载对象后重新按原始字节计算 SHA-256。

| 文件 | 大小 | SHA-256 | 结果 |
|---|---:|---|---|
| `fixtures/mobile-reading/markdown/normal.md` | 292 B | `4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5` | 一致 |
| `fixtures/mobile-reading/json/normal.json` | 167 B | `51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98` | 一致 |
| `fixtures/mobile-reading/text/utf8.txt` | 77 B | `1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014` | 一致 |
| `desktop/cli/test-fixtures/sample.docx` | 36,796 B | `032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570` | 一致 |
| `desktop/cli/test-fixtures/sample.pdf` | 1,722 B | `84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9` | 一致 |
| `desktop/cli/test-fixtures/sample.xlsx` | 4,941 B | `6c8972a832dfa8bfed1015ca9799fd7bcad3a4dfeb00b867584460057b2a5119` | 一致 |
| `desktop/cli/test-fixtures/sample.pptx` | 29,172 B | `1deaac9db9546da9337535d0121f843b842db340d9f915fd9fb7fb202cef71d6` | 一致 |

## 故障矩阵

| 场景 | 注入与断言 | 结果 |
|---|---|---|
| 长离线 | 七个文档先形成客户端待提交描述，服务与仓储重新创建后统一上传与 push；事件携带 `retryCount: 1` | 全部恢复 |
| 服务重启 | 不复用原服务实例，基于同一数据库和对象目录重新创建 `FileService`、`SyncService` 与仓储 | 对象、版本、游标连续 |
| 弱网/分片中断 | `files.test.ts` 中断分片后以同一幂等键恢复，并校验完整 SHA-256 | 通过 |
| 重复提交 | 七个版本事件全部重放；既有并发用例执行 10 路 PGlite / 20 路 PostgreSQL 18.4 并发 | 返回原事件，无重复版本 |
| 双端冲突 | 桌面与 Android 以同一旧基版本分别提交；第二个事件必须为 `conflict` | 两个新版本与原版本共 3 个版本，`save_copy` 可解决 |
| 删除恢复 | `all_devices` 删除后桌面下载必须返回 `E_OBJECT_MISSING`，恢复后哈希不变 | 通过 |
| 设备撤销 | 桌面撤销 iOS 设备后，既有 access token 再认证必须返回 `E_DEVICE_REVOKED` | 立即拒绝 |
| 统一事件日志 | 桌面从空游标拉取，检查 Android/iOS 来源、`upsert/delete/restore` 与唯一冲突事件 | 顺序、来源和阶段完整 |

## 验收补证记录

### Target Behavior

单条 PostgreSQL 集成命令必须证明七类固定原件的三设备同步、字节哈希、离线恢复、幂等、冲突、删除恢复和撤销权限，而不是依赖多个无法关联的手工结论。

### RED

- 原 `postgres.integration.test.ts` 只上传一个运行时生成的 Markdown 字节串。
- 原 Gate D 报告仍是“待执行模板”，没有 Office/PDF 下载后哈希、三设备来源或统一事件日志。
- 现有生产实现已经存在，因此这是验收补证，不把它伪装成“测试先于实现”的功能 TDD。

### GREEN

- 在 `server/test/postgres.integration.test.ts` 增加固定七文件的真实数据库/对象存储验收。
- `npm run typecheck && npm run test:postgres:local` 通过：1 个文件、2 项测试、0 失败。
- 原有 PostgreSQL 18.4 原生证据继续证明迁移、真实 PostgreSQL 驱动、20 路并发和正常停机。

### REFACTOR

- 未修改生产代码，未增加兼容路径。
- 固定样例、设备登录、补传、冲突和恢复均留在集成测试边界；没有为测试创造未被生产使用的 helper。

## 全量回归

| 范围 | 命令摘要 | 结果 |
|---|---|---|
| TODO | `node scripts/todo_consistency_check.mjs` | 收口后复验通过 |
| 契约 | `npm test && npm run check` | 37 项通过 |
| 服务 | `npm test` | 21 项通过、2 项按环境跳过 |
| 本地 PostgreSQL | `npm run test:postgres:local` | 2 项通过 |
| 服务构建 | `npm run build` | 通过 |
| 桌面 | `npm run typecheck && npm test && npm run build` | 25 项通过，构建通过 |
| CLI | `npm run typecheck && npm test && npm run build` | 16 项通过，构建通过 |
| 站点 | `npm run typecheck && npm run build` | 通过；仅有既有包体提示 |
| Android/共享核心 | `:shared:allTests :androidApp:assembleDebug :androidApp:testDebugUnitTest` | 通过 |
| iPhone 系统 UI | `./scripts/run_ios_ui_acceptance.sh` | 通过 |
| iPad 系统 UI | `IOS_SIMULATOR_NAME='iPad (A16)' ./scripts/run_ios_ui_acceptance.sh` | 通过 |
| iPhone 完整测试 | `xcodebuild ... iPhone 17 Pro ... test` | 10 项：9 通过、1 项按设计跳过 |
| iPad 完整测试 | `xcodebuild ... iPad (A16) ... test` | 10 项：9 通过、1 项按设计跳过 |

CLI 的 CJS `import.meta` 和 Vite 旧 Node API 提示、站点大于 500 kB 的 chunk 提示均为非阻断告警；所有命令退出码为 0。

## 证据

- PostgreSQL 18.4 原生实例：`docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres18-native-integration.txt`
- iPhone 系统 UI：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_13-29-54-+0800.xcresult`
- iPad 系统 UI：`native/iosApp/build/ios-ui-acceptance/Logs/Test/Test-Molan-2026.07.26_13-30-58-+0800.xcresult`
- iPhone 完整测试：`native/iosApp/build/ios-tests/Logs/Test/Test-Molan-2026.07.26_13-32-18-+0800.xcresult`
- iPad 完整测试：`native/iosApp/build/ios-ipad-tests/Logs/Test/Test-Molan-2026.07.26_13-33-29-+0800.xcresult`

## 最终裁决

- 数据丢失：未发现；
- ID、版本、文件对象、内容哈希：一致；
- 未授权读取：设备撤销后立即拒绝；
- 删除语义：删除后不可读，恢复后原哈希可读；
- 冲突语义：双方版本均保留，可显式 `save_copy`；
- 失败恢复：分片续传、离线补传、重放和服务重建均通过；
- Gate D：关闭。
