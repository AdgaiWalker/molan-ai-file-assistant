# 当前下一步动作

日期：2026-07-21

用途：只回答“现在下一步最该做什么”，避免在多份总览之间来回切换。

## 当前总览

- 未完成任务数：19
- [!]：2
- [v]：16
- [~]：1

## 当前第一优先波次

- 波次：第 1 波：身份、账号与责任主体
- 关联任务：A-007、G-001
- 当前动作：补齐真实身份字段并预检
- 现在是否能直接做：不能，还需要外部条件
- 是否需要外部条件：需要
- 默认命令 / 操作：`node scripts/apply_release_identity_inputs.mjs --check`
- 后续紧跟动作：字段补齐后先运行 node scripts/apply_release_identity_inputs.mjs --check / node scripts/apply_release_identity_inputs.mjs --dry-run，确认无误后再执行 node scripts/apply_release_identity_inputs.mjs。
- 为什么先做它：这一波已经不缺工程改造，只缺真实主体、域名、邮箱和各平台账号主体。

### 当前卡点

- 正式主体名称（当前：[待补正式主体]）
- 支持邮箱（当前：[待补支持邮箱]）
- 正式域名（当前：[待补正式域名]）
- 账号 / 数据删除入口 URL（当前：[待补正式域名]/account/delete（待确认））
- Apple 开发者账号主体
- Google Play 开发者账号主体
- Windows / Microsoft 发布主体
- 域名持有人

### 直接看这些入口

- `config/release-identity-inputs.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`

