# 剩余任务最短收口路径

日期：2026-07-21

用途：把当前未完成的任务按“最少重复环境启动、最少返工”的顺序压成执行波次。

## 核心原则

1. 先拿正式身份与账号，再做任何正式发布动作。
2. 真机矩阵一次做完，不把 Android / iOS 拆成多轮。
3. D / F 共用一次 Docker Compose、桌面和真机环境；E 已关闭。
4. G-002～G-007 最后集中打包、发布、替换官网和做演练。
5. G-008 永远最后删除。

## 当前最短顺序

## 第 1 波：身份、账号与责任主体

### 为什么现在做

这是所有正式发布动作的最小外部前置；不先拿到正式身份，后面的签名、商店和域名动作都会反复返工。

### 覆盖任务

- A-007
- G-001

### 本波必须拿到的产物

- 正式产品名、Android applicationId、iOS Bundle ID、URL Scheme、App Group ID、桌面 App ID
- Apple / Google / Windows 发布账号与域名
- 隐私政策、服务条款、支持联系方式、账号删除与数据删除责任主体

### 证据入口

- `node scripts/public_surface_sync_check.mjs`
- `config/release-identity-inputs.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-product-identity.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/public-doc-placeholders.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-readiness-findings.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/engineering-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`
- `商店后台或开发者后台截图`
- `最终 ID / 域名 / 联系方式清单`
- `应用内和官网可访问的隐私与支持入口`

### 起手命令

- 编辑 config/release-identity-inputs.json
- node scripts/apply_release_identity_inputs.mjs --check
- node scripts/apply_release_identity_inputs.mjs --dry-run
- node scripts/apply_release_identity_inputs.mjs
- 人工确认正式产品名、Bundle ID、applicationId、URL Scheme、App Group ID、桌面 App ID
- 把最终 ID、域名、支持联系方式、隐私责任主体回填到 TODO / 官网 / 应用内入口

### 什么时候可以停

- A-007 与 G-001 的账号、标识、隐私主体都已可被截图或链接证明
- 正式 ID 不再是 .dev / 占位状态

### 当前已准备输出

- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-product-identity.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/public-doc-placeholders.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-readiness-findings.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/engineering-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`


### 并行建议

不可并行跳过；这是后续正式发布的硬前置。

## 第 2 波：移动真机矩阵一次跑完

### 为什么现在做

B/C 剩余项本质上都是同一批真机来源、性能与恢复证据；分开跑最浪费时间。

### 覆盖任务

- B-002
- B-004
- B-008
- B-009
- C-002
- C-004
- C-008
- C-009

### 本波必须拿到的产物

- Android：微信、QQ、浏览器、文件管理器的真实打开与恢复证据
- iPhone / iPad：微信、QQ、Safari、“文件”App、系统分享面板证据
- 大 Markdown / 大 JSON 的首屏、滚动、恢复与性能记录

### 证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`
- `对应 evidence/ 内的录屏、截图、性能文本`

### 起手命令

- node scripts/prepare_mobile_true_device_wave.mjs --out default
- 按 docs/design/v2-validation-batches.md 的真机来源矩阵执行 Android + iPhone/iPad 采集

### 什么时候可以停

- mobile-true-device-report.md 已填完设备、来源 App、样例 hash、性能数据与证据路径
- B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009 都有真实录屏或截图

### 当前已准备输出

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`


### 并行建议

Android 与 iOS 可以同一天并行采集，但必须使用同一批固定样例。

## 第 3 波：同步 / AI / 结果回流外部批次共用一次环境

### 为什么现在做

E-007 已关闭，真实 Codex 写回与电脑确认也已通过；D-010 与 F-005 现在只需复用同一套 Docker Compose、桌面和真机环境收尾。

### 覆盖任务

- D-010
- F-005

### 本波必须拿到的产物

- Docker Compose 编排/卷隔离 + 三端真机 + 桌面联调证据（真实 PostgreSQL 18.4 数据库主链已通过）
- Android / iOS 真机收到已确认 AI 结果并完成全部阅读操作的证据

### 证据入口

- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/gate-e-ai-read-report.md`
- `docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres18-native-integration.txt`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/codex-mcp-result-write-confirm.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-d-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-e-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-f-evidence-paths.txt`

### 起手命令

- node scripts/prepare_sync_ai_wave.mjs --out default
- cd server && docker compose up --build --wait
- 按固定顺序执行 D-010 → F-005

### 什么时候可以停

- D-010 与 F-005 报告都已填完真实 file id/version/hash、日志/录屏路径与结论
- D-010 / F-005 的唯一外部缺口全部被真实证据覆盖

### 当前已准备输出

- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/gate-e-ai-read-report.md`
- `docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres18-native-integration.txt`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/codex-mcp-result-write-confirm.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-d-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-e-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-f-evidence-paths.txt`


### 并行建议

环境准备一次，执行顺序建议固定为 D-010 → F-005；E-007 不重复执行。

## 第 4 波：平台发布、官网与演练

### 为什么现在做

当 Gate B/C/D/E/F 都拿到外部证据后，再集中做 G-002～G-007，能避免因为前置门没关而重复打包。

### 覆盖任务

- G-002
- G-003
- G-004
- G-005
- G-006
- G-007

### 本波必须拿到的产物

- Android AAB / APK / SHA256 / 渠道后台记录
- iOS Archive / TestFlight / 审核资料
- Windows / macOS 安装包、签名、公证或发布记录
- 官网真实下载链接、SHA256、教程截图、更新日志
- 完整发布演练与回滚演练记录

### 证据入口

- `node scripts/public_surface_sync_check.mjs`
- `docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`
- `docs/design/release-operations-checklist.md`

### 起手命令

- node scripts/prepare_release_wave.mjs --out default
- cd desktop && npm run build:dist
- xcodebuild -project native/iosApp/Molan.xcodeproj -scheme Molan -destination 'generic/platform=iOS Simulator' build
- 按 docs/design/release-operations-checklist.md 逐平台补签名、上传、SHA256、官网链接与回滚记录

### 什么时候可以停

- G-002 ～ G-007 的真实渠道、SHA256、官网链接、演练记录与回滚证据都已填入报告
- release-dry-run-report.md 与 release-readiness-snapshot.md 不再是草稿状态

### 当前已准备输出

- `docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`


### 并行建议

Windows 与 macOS 可并行；Android 与 iOS 共享品牌/隐私资料；官网最好最后一次统一替换真实链接。

## 第 5 波：删除旧 React Native 端

### 为什么现在做

G-008 是清理动作，不应抢在任何发布验收前执行。

### 覆盖任务

- G-008

### 本波必须拿到的产物

- 删除 mobile/ 及其专属依赖、文档、CI 引用
- 确认原生 Android / iOS 与桌面 / CLI 构建都仍然通过

### 证据入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`
- `仓库全文搜索无对 mobile/ 的残留主流程引用`
- `原生、桌面、CLI 构建验证输出`

### 起手命令

- node scripts/prepare_legacy_mobile_wave.mjs --out default
- 确认 G-002 ～ G-007 已全部改成 [x]
- 删除 mobile/ 及只为其存在的依赖、脚本、CI 和文档引用
- 重新执行原生、桌面、CLI 构建验证

### 什么时候可以停

- 全文搜索不再有旧 React Native 主流程残留引用
- G-008 所需构建与引用检查全部通过

### 当前已准备输出

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`


### 并行建议

不可提前；只能在所有发布门关闭后执行。


