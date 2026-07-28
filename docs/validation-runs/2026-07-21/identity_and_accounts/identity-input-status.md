# 身份输入当前状态

日期：2026-07-21

来源：`config/release-identity-inputs.json`

用途：把 A-007 / G-001 这 8 个真实输入压成一张可直接填写的总表，避免在多个总览之间来回切换。

## 汇总

- 总字段数：8
- 已填：0
- 待补：8
- 当前默认下一条命令：`node scripts/apply_release_identity_inputs.mjs --check`

## 字段总表

| 字段 | 当前值 | 状态 | 直接影响 |
| --- | --- | --- | --- |
| 正式主体名称 | [待补正式主体] | 待补 | A-007、G-001、G-002、G-003、G-004、G-005、G-006、G-007 |
| 支持邮箱 | [待补支持邮箱] | 待补 | A-007、G-001、G-006 |
| 正式域名 | [待补正式域名] | 待补 | A-007、G-001、G-006 |
| 账号 / 数据删除入口 URL | [待补正式域名]/account/delete（待确认） | 待补 | G-001、G-006 |
| Apple 开发者账号主体 | 未填写 | 待补 | A-007、G-001、G-003、G-005 |
| Google Play 开发者账号主体 | 未填写 | 待补 | A-007、G-001、G-002 |
| Windows / Microsoft 发布主体 | 未填写 | 待补 | A-007、G-001、G-004 |
| 域名持有人 | 未填写 | 待补 | A-007、G-001、G-006 |

## 下一步

- 当前动作：补齐真实身份字段并预检
- 默认命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 后续动作：字段补齐后先运行 node scripts/apply_release_identity_inputs.mjs --check / node scripts/apply_release_identity_inputs.mjs --dry-run，确认无误后再执行 node scripts/apply_release_identity_inputs.mjs。

