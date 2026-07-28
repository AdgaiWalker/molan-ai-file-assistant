# 剩余外部批次准备结果

日期：2026-07-21

用途：根据当前 `TODO.md` 的未完成状态，一次性准备仍需执行的外部批次模板与发布快照。

## 本次已准备

### 公开面与 TODO 总自检

- 关联任务：A-007 / G-001 / G-006 / G-007 / G-008
- 输出：`node scripts/public_surface_sync_check.mjs`

### 身份与账号统一准备摘要

- 关联任务：A-007 / G-001
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.md`
- JSON：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.json`
- 证据种子：
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-product-identity.json`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-identity-values.txt`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/public-doc-placeholders.txt`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-readiness-findings.txt`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/engineering-identity-values.txt`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`

### 身份、账号与责任主体清单

- 关联任务：A-007 / G-001
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- JSON：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.json`

### 身份与公开入口当前状态快照

- 关联任务：A-007 / G-001
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- JSON：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.json`

### 工程身份一致性快照

- 关联任务：A-007 / G-001
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- JSON：`docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.json`

### 移动真机批次统一准备摘要

- 关联任务：B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009
- 输出：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- JSON：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.json`
- 证据种子：
  - `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
  - `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
  - `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
  - `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
  - `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
  - `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

### 移动真机批次（B/C）

- 关联任务：B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009
- 输出：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`

### 同步 / AI 读取 / 结果回流统一准备摘要

- 关联任务：D-010 / F-005
- 输出：`docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- JSON：`docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.json`
- 证据种子：
  - `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
  - `docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres18-native-integration.txt`
  - `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/codex-mcp-result-write-confirm.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-sample-checksums.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-d-evidence-paths.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-e-evidence-paths.txt`
  - `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-f-evidence-paths.txt`

### Gate D 外部批次（D-010）

- 关联任务：D-010
- 输出：`docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`

### Gate F 外部批次（F-005）

- 关联任务：F-005
- 输出：`docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`

### 发布波次统一准备摘要

- 关联任务：G-002 / G-003 / G-004 / G-005 / G-006 / G-007
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- JSON：`docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.json`
- 证据种子：
  - `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
  - `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

### 发布就绪快照

- 关联任务：G-002 / G-003 / G-004 / G-005 / G-006 / G-007
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- JSON：`docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.json`

### 发布前演练批次（G-007）

- 关联任务：G-007
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`

### 旧 mobile 删除波次统一准备摘要

- 关联任务：G-008
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- JSON：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.json`
- 证据种子：
  - `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
  - `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
  - `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
  - `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
  - `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
  - `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`

### 旧 mobile 基线删除前审计

- 关联任务：G-008
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- JSON：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.json`

### 最短收口路径

- 输出：`docs/validation-runs/2026-07-21/fastest-remaining-path.md`
- JSON：`docs/validation-runs/2026-07-21/fastest-remaining-path.json`

### 当前下一步动作

- 输出：`docs/validation-runs/2026-07-21/next-remaining-action.md`
- JSON：`docs/validation-runs/2026-07-21/next-remaining-action.json`

### 剩余任务执行看板

- 输出：`docs/validation-runs/2026-07-21/remaining-execution-dashboard.md`
- JSON：`docs/validation-runs/2026-07-21/remaining-execution-dashboard.json`

### 剩余任务外部依赖矩阵

- 输出：`docs/validation-runs/2026-07-21/remaining-dependency-matrix.md`
- JSON：`docs/validation-runs/2026-07-21/remaining-dependency-matrix.json`

### 外部批次报告检查

- 输出：`docs/validation-runs/2026-07-21/validation-report-check.md`
- JSON：`docs/validation-runs/2026-07-21/validation-report-check.json`

### 剩余任务完成审计

- 输出：`docs/validation-runs/2026-07-21/remaining-completion-audit.md`
- JSON：`docs/validation-runs/2026-07-21/remaining-completion-audit.json`

### 最小外部输入清单

- 输出：`docs/validation-runs/2026-07-21/minimal-external-inputs.md`
- JSON：`docs/validation-runs/2026-07-21/minimal-external-inputs.json`

