# Goal Document: 移动端模拟器集中验收

## Go / No-Go

- **Judgment**: Go
- **Reason**: 当前机器已实际启动 Android 16、iPhone 与 iPad 模拟器，原生工程、固定样例和既有验收记录均已就绪。

## Target Outcome

用一次 Android 与一次 iOS 模拟器环境启动，重新证明当前代码可以构建、安装和启动，并覆盖现有模拟器能够可靠证明的移动端主链；发现问题立即修复并复验。

## Goal Definition

- **Type**: quality / delivery
- **Boundary**: Android 模拟器、iPhone 模拟器、iPad 模拟器的构建、安装、启动和可自动执行的主链验证。
- **Non-goals**:
  - 不把模拟器结果写成国产 Android、iPhone 或 iPad 真机结论。
  - 不伪造微信、QQ、TestFlight、应用商店、签名和物理性能证据。
- **Deferred work**:
  - 两种国产 Android 品牌真机矩阵。
  - iPhone/iPad 真机入口、内存与录屏。
  - 正式签名、商店、Windows 与 Docker Compose 验收。
- **Verification rule**: 标准构建/测试命令通过，产物可安装到已启动模拟器，应用进程成功启动；新增证据记录设备、系统、命令和结论。
- **Evidence source**: Gradle、xcodebuild、adb、simctl 命令输出与截图/运行记录。
- **Pass criteria**: Android 和 iOS 标准构建无失败；Android 16、iPhone 17 Pro、iPad (A16) 均可安装并启动；未发现阻断级崩溃或错误。
- **Confidence note**: 模拟器可证明代码与平台运行时链路，但不能替代厂商系统、物理资源、签名和商店环境。
- **Judgment owner**: 构建工具、平台运行时与 TODO.md 的验收定义共同判定。

## Current State

- Android SDK 已安装 `medium_phone` AVD，系统为 Android 16 / API 36。
- Xcode 26.6 已安装 iOS 26.5 与 27.0 运行时，iPhone 17 Pro 和 iPad (A16) 已实测可启动。
- B/C 本地实现和既有模拟器证据已完成；剩余状态主要是 `[v]` 真机验收。
- 工作区包含前序任务的大量未提交改动，本轮只追加模拟器验收证据并修复实际发现的问题。

## Plan Rewrite Notes

| Existing item | Decision | Reason |
|---|---|---|
| B/C 真机批次 | keep | 模拟器不能替代 TODO 明确要求的真机证据 |
| B/C 本地模拟器证明 | reorder | 当前环境已具备，先集中复验并尽早发现回归 |
| D/E/F 外部批次 | keep | 仅在移动端运行链可复用时补充模拟器旁证，不改写真机结论 |
| G 发布任务 | keep | 签名、商店和真实渠道仍是独立外部条件 |

## Drift Diagnosis

- **Goal drift**: 不新增与移动端模拟器验证无关的功能。
- **Phase drift**: 按“构建基线 → Android → iPhone/iPad → 证据收口”推进。
- **Validation drift**: 不以“已有源码”代替构建、安装和启动结果。
- **Compatibility drift**: 不新增兼容分支或双实现。
- **Cleanup drift**: 不在本轮清理旧移动端或其他历史文件。

## Priority Rationale

- 构建失败会阻断所有后续模拟器动作，因此最先执行。
- Android 与 iOS 环境分别只启动一次，减少重复等待。
- 先用本机环境找回归，把昂贵的真机时间留给模拟器无法证明的部分。

## Assumptions and Open Decisions

| Item | Status | Impact | Owner / Next step |
|---|---|---|---|
| 模拟器不等于真机 | confirmed | B/C/F 的真机门不得改为 `[x]` | 保持 `[v]` |
| 现有固定样例可继续使用 | confirmed | 可复用跨端 SHA-256 和阅读样例 | 本轮直接复验 |
| 正式签名身份缺失 | confirmed | 不影响无签名模拟器构建，阻塞发布 | 留待身份/账号批次 |

## Phases

### Phase 1: 构建基线

- **Purpose**: 证明当前共享契约与两端工程仍可构建。
- **Entry condition**: 原生工程与本地工具链存在。
- **Phase rules**:
  - 只运行标准命令；失败时先定位真实根因。
  - 不为绕过错误新增兼容代码。
- **Todos**:
  - [x] 执行共享、Android 与 iOS 标准构建/测试。
    - **Surface**: contracts / native
    - **Proof**: 命令退出码和日志
    - **Depends on**: none
- **Exit proof**: 相关命令全部通过。
- **Stop condition**: 发现数据契约、权限边界或构建产物损坏。

### Phase 2: Android 模拟器主链

- **Purpose**: 证明 APK 在 Android 16 模拟器可安装和启动。
- **Entry condition**: Android 构建通过。
- **Phase rules**:
  - 记录 AVD、系统、包名和启动结果。
  - 模拟器性能只作为本地旁证。
- **Todos**:
  - [x] 启动 AVD、安装 APK、启动应用并检查崩溃。
    - **Surface**: Android app / adb
    - **Proof**: adb 状态、进程和截图
    - **Depends on**: Phase 1
- **Exit proof**: 应用前台启动，无阻断级崩溃。
- **Stop condition**: 安装失败或应用无法进入首屏。

### Phase 3: iPhone 与 iPad 模拟器主链

- **Purpose**: 证明同一 iOS 构建可在手机和平板运行。
- **Entry condition**: iOS 构建通过。
- **Phase rules**:
  - 使用无签名模拟器构建。
  - 分别记录 iPhone 与 iPad 启动结果。
- **Todos**:
  - [x] 安装并启动 iPhone 17 Pro。
    - **Surface**: iOS app / simctl
    - **Proof**: simctl 启动状态和截图
    - **Depends on**: Phase 1
  - [x] 安装并启动 iPad (A16)。
    - **Surface**: iPadOS app / simctl
    - **Proof**: simctl 启动状态和截图
    - **Depends on**: Phase 1
- **Exit proof**: 两种设备均进入应用且无阻断级崩溃。
- **Stop condition**: 任一设备安装或启动失败。

### Phase 4: 证据与 TODO 收口

- **Purpose**: 把本轮事实同步回执行记录。
- **Entry condition**: 前三阶段有明确结果。
- **Phase rules**:
  - 只写已执行事实。
  - 真机限定项继续保持 `[v]`。
- **Todos**:
  - [x] 记录命令、设备、产物、截图与结论，并同步 TODO。
    - **Surface**: validation evidence / TODO.md
    - **Proof**: `git diff --check` 与状态一致性检查
    - **Depends on**: Phase 1-3
- **Exit proof**: 证据可复查，TODO 无夸大结论。
- **Stop condition**: 证据不足以支持结论。

## Dry-Run Findings

- 构建、安装和启动均可在本机完成，不依赖账号或证书。
- 现有 B/C 状态已经正确区分模拟器与真机，本轮不应改变这些任务的 `[v]` 状态。
- Android Studio 不是前置条件，现有 SDK、Gradle 与 adb 足够执行。

## Final Validation

- 共享契约测试、Android 构建/单测、iOS 构建/测试通过。
- Android 16、iPhone 17 Pro、iPad (A16) 安装启动通过。
- `git diff --check` 和 TODO 状态一致性检查通过。

## First Execution Step

并行执行共享契约、Android 和 iOS 标准构建/测试，确认产物后启动一次模拟器波次。
