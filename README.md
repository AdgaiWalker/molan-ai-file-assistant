# 墨览 AI 文件助手

跨手机与电脑的文件阅读、收集、转换和 AI 使用工具。手机端首先解决收到文件后的阅读问题，再把用户主动收集的文件同步到电脑，转换为 AI 可读内容，并让处理结果回到手机。完整业务与技术方向见 [PRD.md](PRD.md)。

## 项目结构

- `native/`：当前 Android / iOS 原生应用与最小共享契约核心；Android 使用 Kotlin + Compose，iOS 使用 Swift + SwiftUI。
- `contracts/`：跨 Android、iOS、桌面、CLI 与后端的版本化 JSON Schema、参考逻辑和契约测试。
- `desktop/`：Electron + Vite + React AI 文件工作台，提供跨端收件箱、阅读、转换和提示词快贴。
- `desktop/cli/`：命令行工具（`molan convert`）。Office/PDF/PPT/Excel → Markdown，供 AI / agent 调用。
- root — 构建脚本与项目配置。

## 产品与发布文档

- [PRD.md](PRD.md)：产品、业务流程、架构与技术栈的唯一事实源。
- [TODO.md](TODO.md)：按优先级拆解的任务清单。
- [docs/market-research.md](docs/market-research.md)：国内 AI 使用与产品机会调研。
- [docs/design/v2-validation-batches.md](docs/design/v2-validation-batches.md)：B/C 真机、D/E/F 外部批次与 G-007 演练的执行 runbook。

## 常用命令

### 跨端核心契约

```powershell
cd contracts
npm test
npm run check
```

### 原生 Android / iOS

```powershell
cd native
./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest

xcodebuild `
  -project native/iosApp/Molan.xcodeproj `
  -scheme Molan `
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' `
  -derivedDataPath native/iosApp/build/ios-simulator `
  CODE_SIGNING_ALLOWED=NO `
  build
```

### desktop GUI

```powershell
cd desktop
npm run dev
npm run typecheck
npm run build
```

### desktop CLI

```powershell
cd desktop/cli
npm run typecheck
npm run build
npm run pack:dist
node dist/index.js check                  # 检查 pandoc 是否可用
node dist/index.js convert <文件> --json  # Office → Markdown
node dist/index.js pull --json            # 查看本地 AI 文件收件箱
node dist/index.js read <id或标题> --json # 读取收件箱文件，供 AI 使用
node dist/index.js push <文件> --json     # 把文件保存到本地 AI 收件箱
node dist/index.js convert --help         # 查看所有选项
```

桌面版在 Windows 上优先使用 `desktop/resources/pandoc.exe`，在 macOS 上优先使用 `desktop/resources/pandoc`，都没有时再回退系统 PATH 中的 pandoc。CLI 若需要可分发压缩包，可执行 `cd desktop/cli && npm run pack:dist`，产物会写入 `desktop/cli/dist/`。准备当前桌面平台的随包 pandoc 请运行 `python3 scripts/download_pandoc.py`；脚本会识别 Windows x64 或 macOS ARM64/x64，校验官方 SHA256 后写入 `desktop/resources/`。

### V2 外部批次预检与记录模板

```powershell
node scripts/v2_validation_preflight.mjs
node scripts/v2_validation_report.mjs --list
node scripts/v2_validation_report.mjs --batch gate_d_sync
node scripts/v2_validation_report.mjs --batch gate_d_sync --out default
node scripts/prepare_identity_and_accounts.mjs --out default
node scripts/prepare_mobile_true_device_wave.mjs --out default
node scripts/mobile_true_device_run_sheet.mjs --out default
node scripts/prepare_release_wave.mjs --out default
node scripts/release_run_sheet.mjs --out default
node scripts/prepare_sync_ai_wave.mjs --out default
node scripts/sync_ai_run_sheet.mjs --out default
node scripts/prepare_legacy_mobile_wave.mjs --out default
node scripts/legacy_mobile_run_sheet.mjs --out default
node scripts/remaining_execution_dashboard.mjs --out default
node scripts/remaining_dependency_matrix.mjs --out default
node scripts/check_validation_reports.mjs --remaining --out default
node scripts/remaining_completion_audit.mjs --out default
node scripts/identity_and_accounts_template.mjs --out default
node scripts/identity_evidence_templates.mjs --out default
node scripts/identity_readiness_report.mjs --out default
node scripts/apply_engineering_identity.mjs
node scripts/engineering_identity_check.mjs --out default
node scripts/release_readiness_report.mjs
node scripts/todo_snapshot.mjs
node scripts/public_surface_sync_check.mjs
node scripts/legacy_mobile_retirement_audit.mjs --out default
node scripts/prepare_remaining_external_work.mjs
node scripts/remaining_todo_fast_path.mjs
node scripts/next_remaining_action.mjs --out default
node scripts/minimal_external_inputs.mjs --out default
node scripts/apply_release_identity_inputs.mjs
```

这些脚本会先校验固定样例和本地证据目录，再按批次生成可直接填写的 Markdown 验收记录模板。`--out default` 会把草稿写到 `docs/validation-runs/2026-07-21/<batch>/`，方便边执行边补证据；空模板本身不算完成记录。`node scripts/prepare_identity_and_accounts.mjs --out default` 是 A-007 / G-001 的统一入口：会按 `config/product-identity.json` 回写公开文案与工程身份，生成身份清单、身份输入总表、身份回填目标、人工证据模板、身份状态快照、工程身份快照，并在最后跑一遍公开面总自检；如果只想单独看某一份产物，再分别运行 `node scripts/identity_and_accounts_template.mjs --out default`、`node scripts/identity_input_status.mjs --out default`、`node scripts/identity_sync_targets.mjs --out default`、`node scripts/identity_evidence_templates.mjs --out default`、`node scripts/identity_readiness_report.mjs --out default`、`node scripts/apply_engineering_identity.mjs` 和 `node scripts/engineering_identity_check.mjs --out default`。`node scripts/apply_release_identity_inputs.mjs` 是“填完真实主体后的一键回写入口”：现在可以先运行 `node scripts/apply_release_identity_inputs.mjs --init` 自动生成本地 `config/release-identity-inputs.json`，填入真实主体、支持邮箱、正式域名和账号主体后，再用 `node scripts/apply_release_identity_inputs.mjs --check` 或 `--dry-run` 预检；确认无误后执行默认 apply，它会自动更新 `config/product-identity.json` 并重跑身份准备流程。`node scripts/prepare_mobile_true_device_wave.mjs --out default` 是 B/C 真机批次的统一入口：会先跑外部批次预检，再生成移动真机批次模板、逐项执行清单，并固定样例与来源矩阵，减少真机到位后临时拼命令的成本；如果只想单独刷新某一份产物，再分别运行 `node scripts/v2_validation_preflight.mjs`、`node scripts/v2_validation_report.mjs --batch mobile_true_device --out default` 与 `node scripts/mobile_true_device_run_sheet.mjs --out default`。`node scripts/prepare_sync_ai_wave.mjs --out default` 是 D-010 / E-007 / F-005 的统一入口：会先跑外部批次预检，再生成 Gate D、Gate E、Gate F 三份模板、逐项执行清单，并固定执行顺序，减少真机、后端和真实 AI 客户端环境到位后临时拼命令的成本；如果只想单独刷新某一份产物，再分别运行 `node scripts/v2_validation_preflight.mjs`、三条 `node scripts/v2_validation_report.mjs --batch ... --out default` 与 `node scripts/sync_ai_run_sheet.mjs --out default`。`node scripts/prepare_release_wave.mjs --out default` 是 G-002～G-007 的统一入口：会先跑公开面总自检，再生成发布就绪快照、G-007 演练模板和发布逐项执行清单，减少正式发布前手工拼命令的成本；如果只想单独刷新某一份产物，再分别运行 `node scripts/release_readiness_report.mjs --out default`、`node scripts/v2_validation_report.mjs --batch release_dry_run --out default` 与 `node scripts/release_run_sheet.mjs --out default`。`node scripts/prepare_legacy_mobile_wave.mjs --out default` 是 G-008 的统一入口：会先刷新旧 mobile 删除前审计，再生成删除逐项执行清单、汇总当前发布前置任务是否都已关闭，并给出真实删除动作前后的验证提示；如果只想单独刷新其中一份产物，再运行 `node scripts/legacy_mobile_retirement_audit.mjs --out default` 或 `node scripts/legacy_mobile_run_sheet.mjs --out default`。`node scripts/remaining_execution_dashboard.mjs --out default` 会把五个波次的当前状态、默认命令、阻塞原因和证据入口集中成一份总控看板，适合在真正开始外部执行前先看全局。`node scripts/next_remaining_action.mjs --out default` 只回答“现在下一步最该做什么”：会给出当前第一优先波次、现在能不能立刻做、默认命令是什么、还缺哪些外部条件，适合在每次继续推进前先看一眼。`node scripts/remaining_dependency_matrix.mjs --out default` 会改用“外部依赖组”视角，把剩余任务收口成正式身份/账号、移动真机、同步/AI环境、发布渠道、最终清理五组条件，适合判断先补哪一类资源最省时间。`node scripts/check_validation_reports.mjs --remaining --out default` 会检查当前剩余外部批次报告是否仍停留在模板状态、哪些字段还没填完，并生成一份统一检查结果，避免把空模板误当完成证据。`node scripts/remaining_completion_audit.mjs --out default` 会按任务 ID 逐项说明为什么当前还不能改成 `[x]`、现成证据在哪、默认命令是什么，适合在临近收口时做最终核对。`node scripts/minimal_external_inputs.mjs --out default` 会把真正无法靠本地继续推进的部分压成一份极简外部输入清单，区分“只缺几个真实值”和“必须拿到真机 / 账号 / 渠道”的部分，适合在开始找人补外部条件前先看一遍。`node scripts/todo_snapshot.mjs` 会直接输出当前总任务数、未完成任务数以及 `[!] / [v] / [~] / [ ]` 各组任务 ID，方便快速确认还剩哪些项；`node scripts/public_surface_sync_check.mjs` 会一次性检查工程身份配置、公开文案和 `TODO.md` 状态是否仍与源文件一致；`node scripts/prepare_remaining_external_work.mjs` 会按当前 `TODO.md` 未完成状态，一次性把还需要的外部批次草稿、身份/账号清单、身份输入总表、发布快照、最短收口路径、“当前下一步”提示、执行看板、外部依赖矩阵、报告检查结果、逐项完成审计、极简外部输入清单和 G-008 审计一起准备好；`node scripts/remaining_todo_fast_path.mjs` 则把剩余任务压成最短执行顺序，减少重复起环境和返工。

## CI 验收

GitHub Actions 当前主线覆盖与发布前检查会运行：

- `contracts`: `npm test`、`npm run check`
- `native/androidApp`: `./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest`
- `native/iosApp`: `xcodebuild ... build`
- `desktop`: `npm run typecheck`、`npm run build`
- `desktop/cli`: `npm run typecheck`、`npm run build`、`npm run test`

## 边界

- 不读取或提交 `config.json`，其中含个人凭据。
- 不把 `school_sdk (1).exe`、`analyze_exe.py`、`hello_tool.py` 当作本项目功能。
- `build/`、`dist/`、`logs/`、`.expo/`、`out/`、`release/` 是生成产物，不手工编辑。
