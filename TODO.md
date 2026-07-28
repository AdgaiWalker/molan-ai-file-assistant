# 墨览本地可执行开发任务

版本：v13

日期：2026-07-26

依据：`PRD.md` 与当前代码状态

## 1. 当前目标

### 1.1 Go / No-Go

- **判断**：Go。
- **目标**：在一台开发电脑上完成契约、Android/iOS 原生阅读、本地收集、跨端同步、电脑 AI 读取和 AI 结果回流，并用自动化测试、Android 模拟器、iPhone/iPad 模拟器和本地服务证明。
- **完成裁决者**：固定命令、契约测试、模拟器系统级 UI 验收、跨端事件日志与内容哈希。

### 1.2 范围

本 TODO 只包含本地可实现、可重复、可由 Codex 独立执行的开发与验证。

包含：

- 共享数据契约与状态规则；
- Android/iOS 原生阅读、收集与恢复；
- 本地同步服务、桌面收件箱、CLI、MCP；
- AI 授权读取与结果回流；
- Android、iPhone、iPad 模拟器系统级验收；
- PostgreSQL 18.4 本地数据库语义验证；
- 弱网、离线、重启、撤销、删除、恢复与冲突故障矩阵。

不包含：

- Android/iOS/Windows/macOS 商店发布、签名、公证、TestFlight、渠道上传；
- 官网正式下载入口、正式域名、客服邮箱和公开主体；
- 真机、微信、QQ 或实体设备性能矩阵；
- 为发布准备的回滚、商店素材和审核材料；
- 删除冻结的旧移动端验收基线；
- P3 候选功能。

`PRD.md` 仍是产品与技术事实来源；本 TODO 的范围收缩只表示当前不执行发布和真机工作。

### 1.3 本轮重写记录

| 原计划内容 | 处理 | 原因 |
|---|---|---|
| A-007 正式身份与商店约定 | 删除 | 只服务正式发布 |
| Gate G、G-001～G-008 | 删除 | 发布、渠道和发布后清理不再属于当前目标 |
| B/C 真机验收门 | 改为模拟器验收门 | 当前目标要求完全本地可执行 |
| F-005 真机回流录屏 | 改为模拟器与事件日志 | 本地回流主链已有可验证证据 |
| D-010 真机与 Docker Compose 批次 | 改为本地模拟器与 PostgreSQL 18.4 故障矩阵 | 容器发布编排不再是目标；数据库语义已由原生 PostgreSQL 验证 |
| `[v]` 外部验收状态 | 删除 | 当前计划不再包含外部验收 |

### 1.4 漂移诊断

- **目标漂移**：旧计划把商店发布、正式身份和渠道材料混入本地产品闭环。
- **阶段漂移**：移动端完成条件同时依赖本地实现和物理设备，导致代码完成后仍长期悬空。
- **验证漂移**：相同系统入口同时维护模拟器和真机两套门禁，重复启动环境。
- **兼容漂移**：本轮不增加兼容路径；只修改验收边界。
- **清理漂移**：旧 React Native 工程继续作为冻结验收证据，不再设置发布后删除任务。

## 2. 执行规则

### 2.1 状态

| 标记 | 含义 | 使用条件 |
|---|---|---|
| `[ ]` | 待做 | 尚未开始 |
| `[~]` | 进行中 | 已有实现或证据，但本地验收矩阵未完整关闭 |
| `[x]` | 完成 | 产出、失败路径、本地验证和证据齐全 |
| `[!]` | 阻塞 | 缺少当前本地目标必需且无法替代的输入 |

当前计划不使用 `[v]`；模拟器验收是正式完成证据，不是临时替代状态。

### 2.2 单项完成定义

任务只有同时满足以下条件才能标记 `[x]`：

1. 产出真实存在；
2. 主路径从真实本地入口运行到结果；
3. 关键失败路径有明确结果；
4. 受影响模块的逻辑/契约测试、类型检查或构建通过；
5. UI 或系统入口在对应模拟器完成自动化验收；
6. 外部 JSON、Schema、持久化数据和权限边界没有漂移；
7. 文档同步且 `git diff --check` 通过。

不为薄封装、UI 渲染和类型系统已保证的行为增加低价值测试。纯规则、状态机、解析器、同步幂等和外部输出契约必须有自动化测试。

### 2.3 不写兼容代码

- 不增加双实现、别名、降级存储或旧接口转发；
- 只有已公开的 Schema、API、CLI/MCP 输出和持久化数据迁移保留兼容约束；
- 内部调用可直接迁移到唯一实现；
- 旧 `mobile/` 只读，不扩展、不删除。

### 2.4 固定环境

- Android：Android 16 / API 36 `medium_phone` ARM64 模拟器。
- iOS：`/Users/happy/Downloads/Xcode-beta.app`，Xcode 27.0（Build 27A5228h）。
- iPhone：iPhone 17 Pro / iOS 26.5 模拟器。
- iPad：iPad (A16) / iOS 26.5 模拟器。
- 数据库：PGlite 本地开发入口与 PostgreSQL 18.4 原生集成环境。
- AI：真实 Codex CLI + 本地 MCP。

### 2.5 标准验证命令

```bash
# 文档与 TODO
node scripts/todo_consistency_check.mjs
git diff --check

# 共享契约
(cd contracts && npm test && npm run check)

# Android 与共享核心
(
  cd native
  JAVA_HOME='/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home' \
  ANDROID_HOME='/Users/happy/Library/Android/sdk' \
  ./gradlew :shared:allTests :androidApp:assembleDebug :androidApp:testDebugUnitTest
)

# iPhone 系统级 UI
./scripts/run_ios_ui_acceptance.sh

# iPad 系统级 UI
IOS_SIMULATOR_NAME='iPad (A16)' ./scripts/run_ios_ui_acceptance.sh

# iOS 完整模拟器测试
DEVELOPER_DIR='/Users/happy/Downloads/Xcode-beta.app/Contents/Developer' \
JAVA_HOME='/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home' \
ANDROID_HOME='/Users/happy/Library/Android/sdk' \
xcodebuild -quiet \
  -project native/iosApp/Molan.xcodeproj \
  -scheme Molan \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' \
  -derivedDataPath native/iosApp/build/ios-tests \
  test

# iPad 完整模拟器测试
DEVELOPER_DIR='/Users/happy/Downloads/Xcode-beta.app/Contents/Developer' \
JAVA_HOME='/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home' \
ANDROID_HOME='/Users/happy/Library/Android/sdk' \
xcodebuild -quiet \
  -project native/iosApp/Molan.xcodeproj \
  -scheme Molan \
  -destination 'platform=iOS Simulator,name=iPad (A16),OS=26.5' \
  -derivedDataPath native/iosApp/build/ios-ipad-tests \
  test

# 桌面、CLI、服务
(cd desktop && npm run typecheck && npm run build)
(cd desktop/cli && npm run typecheck && npm run build && npm run test)
(cd server && npm test && npm run test:postgres:local)
```

## 3. 当前执行队列

### 3.1 阶段门

| 阶段门 | 关闭条件 | 状态 |
|---|---|---|
| Gate A 契约可用 | A-001～A-006 | 已关闭 |
| Gate B Android 阅读可用 | B-001～B-009，Android 模拟器验收通过 | 已关闭 |
| Gate C iOS 阅读可用 | C-001～C-009，iPhone/iPad 模拟器验收通过 | 已关闭 |
| Gate D 跨端同步可用 | D-001～D-010 | 已关闭 |
| Gate E AI 可读取 | E-001～E-007 | 已关闭 |
| Gate F 结果可回流 | F-001～F-005 | 已关闭 |

硬规则：

- 发现数据丢失、未授权读取、删除后仍可读、迁移损坏或公共契约漂移时立即停止；
- 不把模拟器结论写成真机、商店或生产环境结论；
- P3 候选功能不进入当前执行队列。

### 3.2 当前任务

当前没有未完成任务；46 项均为 `[x]`。

## 4. 阶段 A：契约与迁移准备

### [x] A-001 `[P0]` 固化当前行为与差距

- **完成证明**：`docs/design/mobile-reading-acceptance-matrix.md` 已记录入口、阅读、编辑、分享、恢复和失败路径。

### [x] A-002 `[P0]` 建立跨端验收样例库

- **完成证明**：`fixtures/mobile-reading/` 含 16 个固定样例、生成/校验脚本和 SHA256 清单。

### [x] A-003 `[P0]` 冻结文件与版本核心契约

- **完成证明**：`contracts/v1/file-contract.schema.json` 与核心契约测试覆盖 ID、哈希、版本和关系。

### [x] A-004 `[P0]` 冻结生命周期与同步语义

- **完成证明**：生命周期枚举、转移规则、幂等、冲突和 tombstone 测试通过。

### [x] A-005 `[P0]` 冻结格式能力契约

- **完成证明**：Markdown、JSON、TXT、PDF、DOCX、PPTX、XLSX 能力、探测顺序和限制已机器可读。

### [x] A-006 `[P0]` 完成 KMP 最小技术验证

- **完成证明**：KMP 只共享 UUIDv7、生命周期和格式纯逻辑；Android 与 iOS 均实际调用并通过测试。

## 5. 阶段 B：Android 原生阅读

### [x] B-001 `[P0]` 建立 Android 可构建骨架

- **完成证明**：Kotlin、Compose、共享核心、Manifest 与标准构建链可运行。

### [x] B-002 `[P0]` 跑通系统文件到首屏正文

- **模拟器验收**：Android 16 模拟器通过 `ACTION_VIEW`、`ACTION_SEND`、SAF、重复 Intent、返回和错误恢复；TXT 冷启动首屏记录为 2431ms。

### [x] B-003 `[P0]` 实现格式探测与 TXT 阅读

- **完成证明**：UTF-8/BOM/GBK、未知文本兜底、二进制拒绝和位置恢复通过共享与平台测试。

### [x] B-004 `[P0]` 实现 Markdown 阅读纵向切片

- **模拟器验收**：标题、列表、引用、链接、图片、表格、代码、目录、搜索和复制通过；固定长文首屏记录为 1709ms。

### [x] B-005 `[P0]` 实现 JSON 阅读纵向切片

- **完成证明**：懒加载树、JSONPath、搜索、格式化、截断、深度保护和 5MB 样例通过。

### [x] B-006 `[P0]` 完成阅读操作闭环

- **完成证明**：读、搜、复制、编辑、保存副本、系统分享和阅读位置闭环，不覆盖原文件。

### [x] B-007 `[P1]` 建立 Android 本地收集与文件库

- **完成证明**：Room 元数据、受控对象、幂等收集、版本、搜索和归档可离线重启恢复。

### [x] B-008 `[P0]` Android 性能与恢复

- **模拟器验收**：冷启动、长文、5MB JSON、PSS/RSS、内存压力、横竖屏和进程终止恢复已记录，文件与正文不串。

### [x] B-009 `[P0]` Android 模拟器入口验收门

- **模拟器验收**：Android 16 / API 36 `medium_phone` 安装、冷启动、系统 Intent、文件选择、分享、恢复和 crash buffer 检查通过。
- **证据**：`docs/validation-runs/2026-07-24/simulator_wave/report.md`。

## 6. 阶段 C：iOS/iPadOS 原生阅读

### [x] C-001 `[P0]` 建立 iOS 可构建骨架

- **完成证明**：SwiftUI/UIKit、KMP 桥接、主应用、Share Extension 与 App Group 工程可构建。

### [x] C-002 `[P0]` 跑通系统文件到首屏正文

- **模拟器验收**：UTType、Document Picker、Open In、security-scoped 读取、Share Extension 和 App Group 队列通过。

### [x] C-003 `[P0]` 实现格式探测与 TXT 阅读

- **完成证明**：UTF-8/BOM/UTF-16/GBK、二进制拒绝、纯文本阅读与错误恢复通过。

### [x] C-004 `[P0]` 实现 Markdown 阅读纵向切片

- **模拟器验收**：结构化渲染、本地/远程图片、表格、代码、目录、搜索、复制、位置恢复及 1.5MB 长文通过。

### [x] C-005 `[P0]` 实现 JSON 阅读纵向切片

- **完成证明**：树形阅读、分页、搜索、JSONPath、格式化、深度/节点保护和 5.24MB 样例通过。

### [x] C-006 `[P0]` 完成阅读操作闭环

- **完成证明**：搜索、复制、编辑草稿、JSON 校验、保存副本、系统分享和阅读位置闭环。

### [x] C-007 `[P1]` 建立 iOS 本地收集与文件库

- **完成证明**：受控对象目录、版本、幂等收集、搜索、归档和离线重启恢复通过。

### [x] C-008 `[P0]` iOS 性能与恢复

- **模拟器验收**：冷启动、1.5MB Markdown、5.24MB JSON、横竖屏、后台返回和进程终止恢复通过；会话不串文件。

### [x] C-009 `[P0]` iPhone/iPad 模拟器入口验收门

- **模拟器验收**：iPhone 17 Pro 与 iPad (A16) 均完成系统“文件”选择器、阅读、系统分享、Share Extension 和 App Group 交接。
- **结果**：两种尺寸均生成 `ShareInbox/51f9.../metadata.json`；完整测试 10 项中 9 项通过、1 项按设计跳过、0 失败。
- **证据**：`docs/validation-runs/2026-07-24/ios_ui_automation/report.md`。

## 7. 阶段 D：本地收集与跨端同步

### [x] D-001 `[P1]` 冻结同步 API 和错误契约

- **完成证明**：OpenAPI 覆盖鉴权、设备、pull/push、对象、删除恢复、冲突和稳定错误结构。

### [x] D-002 `[P1]` 建立一键启动的本地后端

- **完成证明**：`npm run dev:local` 可启动、迁移、健康检查和停止；对象与元数据分离，日志不含正文。

### [x] D-003 `[P1]` 实现账号、设备与会话

- **完成证明**：登录、刷新、退出、设备撤销、refresh 重放拒绝和三端安全存储通过。

### [x] D-004 `[P1]` 实现文件上传下载与校验

- **完成证明**：分片、断点、哈希/大小校验、Range 下载、同哈希幂等和孤儿清理通过。

### [x] D-005 `[P1]` 实现增量同步与冲突

- **完成证明**：游标、100 次幂等重放、乱序隔离、tombstone、删除/编辑冲突和双方版本保留通过。

### [x] D-006 `[P1]` Android 同步接入

- **完成证明**：WorkManager、Room 迁移、Keystore、分片上传、分页 pull、冲突和前台补偿接通本地服务。

### [x] D-007 `[P1]` iOS 同步接入

- **完成证明**：Keychain、后台会话、持久队列、分片上传、分页 pull、冲突和前台补偿接通本地服务。

### [x] D-008 `[P1]` 电脑同步客户端与本地索引

- **完成证明**：Electron 受控收件箱、SQLite 索引、对象下载、游标恢复和离线读取通过。

### [x] D-009 `[P1]` 删除、撤回与冲突界面

- **完成证明**：三端区分本机、云端和所有设备删除；tombstone、恢复与 keep-local/remote/both 通过。

### [x] D-010 `[P1]` 关闭本地跨端同步验收门

- **目标主链**：Android 模拟器/iOS 模拟器收集文件 → 本地服务同步 → 电脑出现 → 电脑修改元数据 → 两端模拟器更新。
- **样例**：Markdown、JSON、TXT、DOCX、PPTX、XLSX、PDF。
- **故障矩阵**：弱网、长离线、服务重启、重复提交、设备撤销、删除恢复和双端冲突。
- **完成证明**：七类固定原件经 Android/iOS 设备身份补传并由桌面下载复算 SHA256；服务重建、分片中断、重复提交、设备撤销、删除恢复和双端冲突均通过。
- **全量回归**：契约 37 项、服务 21 项、本地 PostgreSQL 2 项、桌面 25 项、CLI 16 项、Android/共享核心构建与测试，以及 iPhone/iPad 系统 UI 和完整测试均通过。
- **证据**：`docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`。
- **退出证明**：未发现数据丢失或未授权读取；ID、版本与哈希一致；失败可恢复或明确终止；全部固定命令通过。
- **停止条件**：出现数据丢失、未授权读取、删除后仍可读或冲突覆盖任一方版本。

## 8. 阶段 E：电脑 AI 文件收件箱

### [x] E-001 `[P1]` 建立电脑收件箱统一模型

- **完成证明**：SQLite 映射 Document、Version、FileObject、DerivedArtifact、AiResult 和同步状态。

### [x] E-002 `[P1]` 实现 AI 文件收件箱主界面

- **完成证明**：搜索、状态、关系、授权和下一动作在 Electron 真实界面可见。

### [x] E-003 `[P1]` 把转换结果接入派生关系

- **完成证明**：转换输出记录来源、警告、耗时和 attempt，不覆盖旧证据。

### [x] E-004 `[P1]` CLI 连接真实收件箱并保留离线模式

- **完成证明**：synced/offline 双模式和既有 JSON 输出契约通过。

### [x] E-005 `[P1]` 实现最小 MCP 只读入口

- **完成证明**：列表、读取、版本关系、未授权拒绝和审计接入真实收件箱。

### [x] E-006 `[P1]` 实现 AI 授权与读取审计

- **完成证明**：默认拒绝、显式授权、撤回立即生效、设备撤销和无正文日志通过。

### [x] E-007 `[P1]` 关闭 AI 可读取验收门

- **完成证明**：真实 Codex 客户端完成拒绝 → 授权读取 → 关系追溯 → 撤回后拒绝。

## 9. 阶段 F：AI 结果回流

### [x] F-001 `[P1]` 冻结 AI 结果契约

- **完成证明**：五类结果包、来源版本约束和不覆盖原文件规则固化。

### [x] F-002 `[P1]` 实现 CLI/MCP 结果写入

- **完成证明**：草稿、确认、取消、幂等和冲突拒绝贯通真实收件箱。

### [x] F-003 `[P1]` 同步 AI 结果到手机

- **完成证明**：`air_` 事件、结果对象和来源版本关系同步到 Android/iOS。

### [x] F-004 `[P1]` 手机端结果阅读与操作

- **完成证明**：模拟器可阅读、复制、分享、保存副本、删除结果并往返来源。

### [x] F-005 `[P1]` 关闭本地结果回流验收门

- **本地验收**：手机模拟器文件 → 电脑 AI 授权读取 → 生成 Markdown/JSON → 电脑确认 → 同步 → 手机模拟器阅读。
- **故障路径**：非法结果、缺少来源、重复提交、来源更新、撤回和删除由契约与同步测试覆盖。
- **证据**：真实 Codex MCP 已生成并确认 Markdown/JSON 结果，保留 result/version ID、SHA256 和来源关系；见 `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/codex-mcp-result-write-confirm.txt`。

## 10. 最终验证

### 10.1 完成结论

- A/B/C/E/F 无未关闭本地依赖；
- D-010 的七类样例、三设备事件、故障矩阵和报告均已通过；
- 发布账号、真机、商店和正式域名不再影响当前目标；
- 当前没有剩余任务；
- 没有循环依赖，不需要新增产品决策。

### 10.2 最终完成检查

1. Gate D 已关闭；
2. TODO 中 46 个任务全部为 `[x]`；
3. `node scripts/todo_consistency_check.mjs` 已通过；
4. 标准验证命令已全部通过；
5. `git diff --check` 已通过。

## 11. 证据模板

### 11.1 代码任务

```text
任务 ID：
变更文件：
目标行为：
失败路径：
验证命令：
验证结果：
新增测试可捕获的回归：
未解决问题：
```

### 11.2 模拟器任务

```text
任务 ID：
模拟器 / 系统：
墨览构建：
样例文件 / 大小 / SHA256：
操作步骤：
目标指标：
实测结果：
截图或 xcresult：
是否通过：
```

### 11.3 跨端任务

```text
任务 ID：
本地账号 / 客户端：
来源文件 ID / 版本 / SHA256：
同步事件 ID：
电脑落盘与派生对象：
AI 读取入口：
结果 ID / 来源版本：
故障注入：
恢复结果：
证据路径：
```
