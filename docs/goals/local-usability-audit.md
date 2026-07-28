# Goal Document: 本地完整可用性巡检

日期：2026-07-26

## Go / No-Go

- **Judgment**：Go
- **Reason**：当前 46 项实现任务和固定回归均已通过，下一项最高价值工作是验证真实界面是否顺手；固定样例、三个模拟器目标和本地服务均已就绪，不需要新增产品决策。

## Target Outcome

Android、iPhone/iPad 与 macOS 桌面端的本地主链可以由新用户仅根据界面完成：打开文件、阅读、收集/同步、电脑查看、AI 授权读取、结果确认与回流。巡检中发现的 P0/P1 可用性问题全部修复，并用相同入口复验。

## Goal Definition

- **Type**：quality
- **Boundary**：固定样例、本地服务、Android API 36、iPhone 17 Pro、iPad (A16)、macOS Electron、CLI/MCP；覆盖主链与直接相邻的错误、空态、等待态和恢复动作。
- **Non-goals**：
  - 商店发布、签名、公证和生产部署；
  - 微信、QQ、Safari 真机来源和实体设备性能；
  - P2 视觉润色、功能扩张、重型编辑与 Office 手机端转换；
  - 冻结 `mobile/` 基线的重构或删除。
- **Deferred work**：
  - 真实个人文件的长期日用反馈；
  - 发布前真机和外部网络矩阵；
  - 不阻断主链的动画、包体和构建告警优化。
- **Verification rule**：先用真实 UI 记录基线，再对每个 P0/P1 复现、修复和复验；最后重跑受影响测试和全量固定命令。
- **Evidence source**：模拟器/桌面界面截图、可复现操作记录、系统 UI 自动化、契约测试、构建和验收报告。
- **Pass criteria**：
  - 定义的主链无崩溃、白屏、死路、误导性成功或数据丢失；
  - P0/P1 发现数归零，失败场景存在明确原因和下一动作；
  - Android、iPhone、iPad、桌面、CLI、服务固定命令退出码为 0；
  - 变更未增加兼容路径，`git diff --check` 通过。
- **Confidence note**：固定样例和本地服务能可靠验证交互与数据主链，但不能替代真实个人文件、真机来源和生产网络结论。
- **Judgment owner**：真实 UI 行为、自动化验收和固定回归共同裁决；若三者冲突，以真实可复现行为和数据安全为准。

## Current State

- `TODO.md` 46/46 已完成，契约、同步、AI 读取与结果回流均有自动化证明。
- iPhone/iPad 已有系统文件选择器与 Share Extension 自动化；Android 和桌面仍缺少同等级的整条可用性巡检。
- 现有验收偏重“功能存在和数据正确”，尚未集中检查入口可发现性、等待反馈、错误恢复、按钮命名和跨端状态是否容易理解。
- 工作区包含用户已有改动；只修改与本轮复现问题直接相关的文件，不整理无关变更。

## Priority Rationale

- 先跑未经美化的真实主链，最早暴露阻断问题，避免基于代码猜测 UI。
- P0 数据/权限/崩溃优先于 P1 死路、错误反馈和主操作不可发现；P2 仅记录，不在本轮扩张。
- 每个问题纵向修复并立即复验，不累计成大批 UI 改动。

## Assumptions and Open Decisions

| Item | Status | Impact | Owner / Next step |
|---|---|---|---|
| 使用仓库固定 Markdown、JSON、TXT、Office/PDF 样例代替个人文件 | assumed | 能稳定复现，但不代表长期日用体验 | 本轮采用；个人文件反馈延后 |
| 本地模拟器是当前正式调试门禁 | confirmed | 无需用户接管真机或镜像 | 沿用现有固定环境 |
| 只修 P0/P1 | confirmed | 防止巡检演变为无边界重设计 | P2 写入报告，不实现 |
| 未明确要求兼容旧内部行为 | confirmed | 内部实现可直接收敛到单一路径 | 不写 shim、别名或双存储 |

## Phases

### Phase 1: 真实主链基线

- **Purpose**：用用户可见界面找到真正阻断使用的问题。
- **Entry condition**：固定样例、本地服务和三个模拟器目标可启动。
- **Phase rules**：
  - 只读代码和运行产品，不先改样式；
  - 从界面可见入口操作，不用数据库或内部文件直接伪造成功；
  - 每个发现记录平台、步骤、预期、实际、严重级别和证据。
- **Todos**：
  - [x] 巡检 Android 打开、阅读、搜索、收集、同步和恢复入口
    - **Surface**：Android 模拟器、系统文件入口、应用 UI
    - **Proof**：操作记录与关键状态截图
    - **Depends on**：none
  - [x] 巡检 iPhone/iPad 打开、阅读、分享、收集和同步状态
    - **Surface**：iOS 模拟器、FilesUI、Share Extension、应用 UI
    - **Proof**：操作记录、既有 XCUITest 与补充截图
    - **Depends on**：none
  - [x] 巡检桌面收件箱、转换、授权读取、失败恢复和结果确认
    - **Surface**：Electron、本地服务、CLI/MCP
    - **Proof**：端到端操作记录、对象/版本关系与界面截图
    - **Depends on**：本地服务
- **Exit proof**：主链每一步都有可见结果，P0/P1 清单可独立复现。
- **Stop condition**：发现数据丢失、未授权正文读取、删除后仍可读或公共契约漂移时，停止其他巡检并优先处理。

### Phase 2: P0/P1 纵向修复

- **Purpose**：消除阻断主链或造成错误理解的问题。
- **Entry condition**：问题具备最小复现步骤和明确期望。
- **Phase rules**：
  - 纯逻辑、状态和外部契约按 RED → GREEN → REFACTOR；
  - UI 渲染不补 mock-heavy 测试，以真实模拟器复验；
  - 先读完整文件并复用现有字符串、错误和存储模式；
  - 不增加兼容代码，不顺带实现 P2。
- **Todos**：
  - [x] 按 P0 → P1 顺序逐项修复
    - **Surface**：复现涉及的 UI、逻辑、数据和文档
    - **Proof**：每项独立复现消失、相邻失败路径仍成立
    - **Depends on**：Phase 1 发现
  - [x] 同步用户文案、TODO/设计说明和验收证据
    - **Surface**：字符串常量、相关文档、巡检报告
    - **Proof**：代码与文档描述一致
    - **Depends on**：对应修复
- **Exit proof**：P0/P1 为 0；所有修复均有行为证据。
- **Stop condition**：修复需要新的产品决策、公共契约破坏或范围扩展时暂停该项并记录，不自行引入双路径。

### Phase 3: 回归与收口

- **Purpose**：证明局部修复没有破坏已关闭的 46 项能力。
- **Entry condition**：Phase 2 无未关闭 P0/P1。
- **Phase rules**：
  - 先跑受影响模块，再跑固定全量命令；
  - 非阻断告警与失败分开记录，不把警告冒充通过或失败；
  - 报告只声明本地模拟器和本地服务结论。
- **Todos**：
  - [x] 重跑 Android、iPhone、iPad、桌面、CLI、服务和契约
    - **Surface**：固定测试与构建入口
    - **Proof**：命令退出码、测试计数、xcresult
    - **Depends on**：Phase 2
  - [x] 生成最终可用性巡检报告
    - **Surface**：`docs/validation-runs/2026-07-26/local-usability-audit/`
    - **Proof**：发现、修复、延后项和证据路径完整
    - **Depends on**：全量回归
- **Exit proof**：固定命令通过，报告可复查，`git diff --check` 通过。
- **Stop condition**：任何回归出现数据、权限或公共契约失败时返回 Phase 2。

## Dry-Run Findings

- 所需固定样例、模拟器和服务入口均存在，没有循环依赖。
- Android/桌面缺少单一 UI 自动化脚本，因此 Phase 1 先使用真实 UI 控制与截图；只有稳定且高价值的系统入口才固化自动化。
- “真实个人文件长期使用”无法由本轮自动完成，明确延后，不影响本地固定样例可用性裁决。
- 当前无需新增功能或架构决策，可以直接执行。

## Final Validation

- `node scripts/todo_consistency_check.mjs`
- 契约、本地服务、桌面、CLI 和站点测试/构建
- Android `:shared:allTests :androidApp:assembleDebug :androidApp:testDebugUnitTest`
- iPhone/iPad 系统 UI 与完整模拟器测试
- 巡检报告中的 P0/P1 数量为 0
- `git diff --check`

## First Execution Step

启动本地服务、Electron、Android API 36 与 iPhone 17 Pro，从系统文件入口使用固定 JSON 样例跑第一遍未经修改的真实主链并记录基线。

## Execution Result

- **Final judgment**：Go
- **Closed findings**：P0 2 项、P1 2 项；剩余 P0/P1 为 0。
- **Verified chain**：Android 打开/阅读/收集/同步、iPhone/iPad Files 与 Share Extension、桌面登录/收件箱/转换、CLI 七类样例、服务与公共契约均已通过。
- **Deferred only**：实体设备与外部来源、生产网络/PostgreSQL、签名发布、扫描 PDF OCR、P2 构建与视觉优化。
- **Report**：`docs/validation-runs/2026-07-26/local-usability-audit/report.md`
