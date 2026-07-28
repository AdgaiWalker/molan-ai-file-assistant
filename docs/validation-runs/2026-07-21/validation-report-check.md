# 外部批次报告检查

日期：2026-07-21

用途：检查外部批次报告是否还停留在模板状态，或是否已经填完到可以作为完成证据的程度。

## 汇总

- 检查范围：remaining
- 报告数：4
- ready：0
- template：4
- incomplete：0
- missing_report：0

## 移动真机批次（B/C）

- 批次ID：`mobile_true_device`
- 报告：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- evidence 目录：`docs/validation-runs/2026-07-21/mobile_true_device/evidence`
- 检查状态：`template`
- 报告状态：`待执行模板`
- evidence 文件数：5
- 问题：报告状态仍是“待执行模板”
- 问题：仍有未填写字段：设备 / 系统、墨览版本、来源App / 版本、样例文件 / 大小 / hash、操作步骤、目标指标、实测结果、截图或录屏路径、是否通过

## Gate D 外部批次（D-010）

- 批次ID：`gate_d_sync`
- 报告：`docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- evidence 目录：`docs/validation-runs/2026-07-21/gate_d_sync/evidence`
- 检查状态：`template`
- 报告状态：`待执行模板`
- evidence 文件数：1
- 问题：报告状态仍是“待执行模板”
- 问题：仍有未填写字段：账号 / 设备、来源文件ID / 版本 / hash、同步事件ID、电脑落盘与派生对象、AI读取入口、结果ID / 来源版本、故障注入、恢复结果、证据路径

## Gate F 外部批次（F-005）

- 批次ID：`gate_f_result_return`
- 报告：`docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`
- evidence 目录：`docs/validation-runs/2026-07-21/gate_f_result_return/evidence`
- 检查状态：`template`
- 报告状态：`待执行模板`
- evidence 文件数：1
- 问题：报告状态仍是“待执行模板”
- 问题：仍有未填写字段：真实 AI 客户端、来源文件 / 来源版本 / hash、结果类型（Markdown / JSON）、结果ID、写回入口（CLI / MCP）、桌面确认结果、Android 录屏路径、iOS 录屏路径、是否通过

## 发布前演练批次（G-007）

- 批次ID：`release_dry_run`
- 报告：`docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- evidence 目录：`docs/validation-runs/2026-07-21/release_dry_run/evidence`
- 检查状态：`template`
- 报告状态：`待执行模板`
- evidence 文件数：6
- 问题：报告状态仍是“待执行模板”
- 问题：仍有未填写字段：平台 / 渠道、版本 / 构建号、产物文件、签名主体、SHA256、安装 / 升级 / 回滚结果、隐私与权限检查、下载或测试链接、已知问题


