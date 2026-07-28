# 剩余任务执行看板

日期：2026-07-21

用途：把当前剩余任务按执行波次集中成一个总览，看清楚“下一波是什么、被什么卡住、默认命令是什么、证据入口在哪”。

## 当前总览

- 总任务数：55
- 未完成任务数：19
- [!]：2
- [v]：16
- [~]：1

## 当前默认下一波

- 波次：第 1 波：身份、账号与责任主体
- 起手命令：`node scripts/apply_release_identity_inputs.mjs --check`

## 波次状态

### 第 1 波：身份、账号与责任主体

- 默认命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 波次状态：已准备，可执行
- 未完成任务：A-007、G-001
- 当前阻塞：需要真实主体、域名、支持邮箱、删除入口与各平台账号主体。
- 任务状态：A-007 [!] 阻塞；G-001 [!] 阻塞

#### 证据入口

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

### 第 2 波：移动真机矩阵一次跑完

- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 波次状态：已准备，可执行
- 未完成任务：B-002、B-004、B-008、B-009、C-002、C-004、C-008、C-009
- 当前阻塞：需要 Android / iPhone / iPad 真机、微信/QQ/浏览器/文件 App 等真实来源矩阵取证。
- 任务状态：B-002 [v] 待实机/商店验收；B-004 [v] 待实机/商店验收；B-008 [v] 待实机/商店验收；B-009 [v] 待实机/商店验收；C-002 [v] 待实机/商店验收；C-004 [v] 待实机/商店验收；C-008 [v] 待实机/商店验收；C-009 [v] 待实机/商店验收

#### 证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

### 第 3 波：同步 / AI / 结果回流共用环境

- 默认命令：`node scripts/prepare_sync_ai_wave.mjs --out default`
- 波次状态：已准备，可执行
- 未完成任务：D-010、F-005
- 当前阻塞：真实 PostgreSQL 18.4 数据库主链、真实 Codex 读取/写回和电脑确认已通过；还需要 Docker Compose 编排/卷隔离与 Android/iOS 真机完成剩余矩阵。
- 任务状态：D-010 [v] 待实机/商店验收；E-007 [x] 已完成；F-005 [v] 待实机/商店验收

#### 证据入口

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

### 第 4 波：平台发布、官网与演练

- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 波次状态：已准备，可执行
- 未完成任务：G-002、G-003、G-004、G-005、G-006、G-007
- 当前阻塞：正式身份与账号前置未关闭；B/C/D/E/F 外部证据仍未补齐
- 任务状态：G-002 [v] 待实机/商店验收；G-003 [v] 待实机/商店验收；G-004 [v] 待实机/商店验收；G-005 [v] 待实机/商店验收；G-006 [v] 待实机/商店验收；G-007 [v] 待实机/商店验收

#### 证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

### 第 5 波：删除旧 React Native 端

- 默认命令：`node scripts/prepare_legacy_mobile_wave.mjs --out default`
- 波次状态：已准备，可执行
- 未完成任务：G-008
- 当前阻塞：仍需先关闭这些发布任务：G-002、G-003、G-004、G-005、G-006、G-007
- 任务状态：G-008 [~] 有基础但未完成

#### 证据入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`


