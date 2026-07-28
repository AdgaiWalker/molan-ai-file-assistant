# 剩余任务外部依赖矩阵

日期：2026-07-21

用途：不按任务波次，而按“真正卡住收口的外部条件”来分组，看清楚先拿下哪一组资源最值钱。

## 当前结论

- 总任务数：55
- 未完成任务数：19
- 仍需关注的依赖组：5
- 当前最先要拿下的一组：正式身份、账号与公开主体
- 起手命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 直接覆盖任务：A-007、G-001
- 会继续推进的后续任务：G-002、G-003、G-004、G-005、G-006、G-007

## 依赖矩阵

| 依赖组 | 当前状态 | 直接覆盖任务 | 继续推进 | 起手命令 |
| --- | --- | --- | --- | --- |
| 正式身份、账号与公开主体 | 阻塞（2） | A-007、G-001 | G-002、G-003、G-004、G-005、G-006、G-007 | `node scripts/apply_release_identity_inputs.mjs --check` |
| Android / iPhone / iPad 真机来源矩阵 | 待真机 / 渠道验收（8） | B-002、B-004、B-008、B-009、C-002、C-004、C-008、C-009 | D-010、F-005、G-002、G-003、G-006、G-007 | `node scripts/prepare_mobile_true_device_wave.mjs --out default` |
| 同步 / AI 读取 / 结果回流共用环境 | 待真机 / 渠道验收（2） | D-010、F-005 | G-002、G-003、G-006、G-007、G-008 | `node scripts/prepare_sync_ai_wave.mjs --out default` |
| 正式渠道、签名、公证与官网替换 | 待真机 / 渠道验收（6） | G-002、G-003、G-004、G-005、G-006、G-007 | G-008 | `node scripts/prepare_release_wave.mjs --out default` |
| 最终清理窗口（非外部资源） | 有基础待外部证据（1） | G-008 | 无 | `node scripts/prepare_legacy_mobile_wave.mjs --out default` |

## 分组说明

### 正式身份、账号与公开主体

- 当前状态：阻塞（2）
- 直接覆盖任务：A-007、G-001
- 继续推进：G-002、G-003、G-004、G-005、G-006、G-007
- 当前卡点：需要真实主体、域名、支持邮箱、删除入口与各平台账号主体。

#### 本组必须到位的资源

- 正式产品名，以及 Android applicationId / iOS Bundle ID / 桌面 App ID 等最终标识
- Apple / Google / Windows 正式开发者账号或团队信息
- 域名、支持邮箱、隐私政策、服务条款、删除/注销说明与商店后台可提交资料

#### 现成证据入口

- `config/release-identity-inputs.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-prep-summary.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-evidence-templates.md`
- `docs/validation-runs/2026-07-21/minimal-external-inputs.md`

#### 默认起手命令

- `node scripts/apply_release_identity_inputs.mjs --check`

### Android / iPhone / iPad 真机来源矩阵

- 当前状态：待真机 / 渠道验收（8）
- 直接覆盖任务：B-002、B-004、B-008、B-009、C-002、C-004、C-008、C-009
- 继续推进：D-010、F-005、G-002、G-003、G-006、G-007
- 当前卡点：缺 Android / iPhone / iPad 真机、真实来源入口、性能数据与恢复录屏。

#### 本组必须到位的资源

- Android 真机，至少覆盖微信 / QQ / 浏览器 / 文件管理器来源
- iPhone 与 iPad 真机，覆盖微信 / QQ / Safari / “文件”App / 系统分享面板
- 固定样例、首屏耗时、滚动表现、峰值内存、横竖屏/退后台/杀进程恢复证据

#### 现成证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`

#### 默认起手命令

- `node scripts/prepare_mobile_true_device_wave.mjs --out default`

### 同步 / AI 读取 / 结果回流共用环境

- 当前状态：待真机 / 渠道验收（2）
- 直接覆盖任务：D-010、F-005
- 继续推进：G-002、G-003、G-006、G-007、G-008
- 当前卡点：真实 PostgreSQL 18.4 数据库主链、真实 Codex 读取/写回和电脑确认已通过；缺 Docker Compose 编排/卷隔离与 Android/iOS 真机共同联调证据。

#### 本组必须到位的资源

- Docker Compose 运行时、卷隔离与桌面端真实收件箱环境
- Android / iOS 真机与 Office / PDF 固定样例
- Android / iOS 结果回流、打开、复制、分享、保存副本、本机删除和回到来源录屏

#### 现成证据入口

- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/gate-e-ai-read-report.md`
- `docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`

#### 默认起手命令

- `node scripts/prepare_sync_ai_wave.mjs --out default`

### 正式渠道、签名、公证与官网替换

- 当前状态：待真机 / 渠道验收（6）
- 直接覆盖任务：G-002、G-003、G-004、G-005、G-006、G-007
- 继续推进：G-008
- 当前卡点：缺正式签名、商店/TestFlight/下载渠道、官网真实入口、SHA256 与回滚演练证据。

#### 本组必须到位的资源

- Android 签名、AAB / APK、渠道后台与升级/回滚验证
- Apple Team / Profile、Archive、TestFlight / App Store 入口、macOS 签名与公证
- Windows 安装包、官网真实下载链接、客服邮箱、教程截图、发布/监控/回滚记录

#### 现成证据入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`

#### 默认起手命令

- `node scripts/prepare_release_wave.mjs --out default`

### 最终清理窗口（非外部资源）

- 当前状态：有基础待外部证据（1）
- 直接覆盖任务：G-008
- 继续推进：无
- 当前卡点：这不是新外部资源问题，而是必须等 G-002～G-007 全部关闭后，才能执行真实删除动作。

#### 本组必须到位的资源

- G-002～G-007 全部改成 [x]
- 删除后原生 Android / iOS、桌面 GUI、CLI 的全量构建验证
- 仓库主流程不再依赖旧 React Native 基线

#### 现成证据入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`

#### 默认起手命令

- `node scripts/prepare_legacy_mobile_wave.mjs --out default`


## 极简外部输入清单

- `docs/validation-runs/2026-07-21/minimal-external-inputs.md`

