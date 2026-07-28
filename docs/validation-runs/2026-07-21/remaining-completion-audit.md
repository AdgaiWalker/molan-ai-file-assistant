# 剩余任务完成审计

日期：2026-07-21

用途：逐项说明当前每个未完成任务为什么还不能改成 `[x]`，以及现成证据、默认命令和直接阻塞原因是什么。

## 汇总

- 未完成任务数：19
- [!]：2
- [v]：16
- [~]：1

## A-007 确认应用身份与工程约定

- 当前状态：`!`（阻塞）
- 所属波次：第 1 波：身份、账号与责任主体
- 默认命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 不能关闭的直接原因：需要真实主体、域名、支持邮箱、删除入口与各平台账号主体。
- 关联报告状态：无
- 报告检查状态：无
- 报告检查未发现额外问题。

### 现成证据入口

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

## B-002 跑通外部文件到首屏正文

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 Android 真机真实来源入口录屏与耗时证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## B-004 实现Markdown阅读纵向切片

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 Android 真机滚动、耗时与内存证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## B-008 Android性能与恢复

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有中低端 Android 真机性能与恢复矩阵。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## B-009 Android真实入口验收门

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有两种国产 Android 品牌的真实入口验收矩阵。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## C-002 跑通外部文件到首屏正文

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 iPhone 真机真实来源入口录屏与耗时证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## C-004 实现Markdown阅读纵向切片

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 iPhone 真机滚动、耗时与内存证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## C-008 iOS性能与恢复

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 iPhone / iPad 真机性能与恢复矩阵。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## C-009 iOS真实入口验收门

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 2 波：移动真机矩阵一次跑完
- 默认命令：`node scripts/prepare_mobile_true_device_wave.mjs --out default`
- 不能关闭的直接原因：还没有 iPhone / iPad 真实入口验收矩阵。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

## D-010 关闭跨端同步验收门

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 3 波：同步 / AI / 结果回流共用环境
- 默认命令：`node scripts/prepare_sync_ai_wave.mjs --out default`
- 不能关闭的直接原因：真实 PostgreSQL 18.4 数据库主链已通过；仍缺 Docker Compose 编排/卷隔离、真机、Office/PDF、弱网/长离线/冲突的真实联调证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：账号 / 设备、来源文件ID / 版本 / hash、同步事件ID、电脑落盘与派生对象、AI读取入口、结果ID / 来源版本、故障注入、恢复结果、证据路径

### 现成证据入口

- `docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres18-native-integration.txt`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/codex-mcp-result-write-confirm.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-d-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-e-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-f-evidence-paths.txt`

## F-005 关闭结果回流验收门

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 3 波：同步 / AI / 结果回流共用环境
- 默认命令：`node scripts/prepare_sync_ai_wave.mjs --out default`
- 不能关闭的直接原因：真实 Codex 客户端生成 Markdown/JSON 并由电脑确认已通过；仍缺 Android/iOS 真机结果回流、打开、复制、分享、保存副本、本机删除和回到来源录屏。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：真实 AI 客户端、来源文件 / 来源版本 / hash、结果类型（Markdown / JSON）、结果ID、写回入口（CLI / MCP）、桌面确认结果、Android 录屏路径、iOS 录屏路径、是否通过

### 现成证据入口

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

## G-001 完成账号、品牌与隐私前置

- 当前状态：`!`（阻塞）
- 所属波次：第 1 波：身份、账号与责任主体
- 默认命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 不能关闭的直接原因：需要真实主体、域名、支持邮箱、删除入口与各平台账号主体。
- 关联报告状态：无
- 报告检查状态：无
- 报告检查未发现额外问题。

### 现成证据入口

- `config/release-identity-inputs.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-product-identity.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/public-doc-placeholders.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-readiness-findings.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/engineering-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`

## G-002 Android正式构建与渠道验收

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺正式签名、AAB/Release APK、渠道上传与真机安装升级证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-003 iOS TestFlight与App Store验收

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺 Apple Team/Profile、Archive、TestFlight 上传与真机入口验收。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-004 Windows发布与商店验收

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺正式 Windows 安装包、全新环境手测与发布渠道证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-005 macOS签名、公证与发布

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺正式 Apple 账号、签名、公证与 Gatekeeper 全新机验证。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-006 官网接入真实发布内容

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺真实下载渠道、真实客服邮箱、真机教程截图与 SHA256 公布。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-007 建立发布、监控与回滚清单

- 当前状态：`v`（待实机/商店验收）
- 所属波次：第 4 波：平台发布、官网与演练
- 默认命令：`node scripts/prepare_release_wave.mjs --out default`
- 不能关闭的直接原因：缺一次真实测试版本发布/回滚演练的完整证据。
- 关联报告状态：`待执行模板`
- 报告检查状态：`template`
- 报告问题：报告状态仍是“待执行模板”
- 报告问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题

### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## G-008 删除旧React Native移动端

- 当前状态：`~`（有基础但未完成）
- 所属波次：第 5 波：删除旧 React Native 端
- 默认命令：`node scripts/prepare_legacy_mobile_wave.mjs --out default`
- 不能关闭的直接原因：前置发布任务 G-002～G-007 尚未全部关闭，不能执行真实删除动作。
- 关联报告状态：无
- 报告检查状态：无
- 报告检查未发现额外问题。

### 现成证据入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`


