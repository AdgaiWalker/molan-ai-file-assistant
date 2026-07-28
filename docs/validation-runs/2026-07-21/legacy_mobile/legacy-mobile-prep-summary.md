# 旧 mobile 删除波次统一准备结果

日期：2026-07-21

对应任务：

- G-008

用途：把 G-008 在真实删除前需要的审计结果、前置状态和删除后验证动作收敛成一个统一入口，避免到最后一步还要手工拼检查项。

## 本次已执行

### 旧 mobile 基线删除前审计

- 命令：`node scripts/legacy_mobile_retirement_audit.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md
```

### 旧 React Native mobile 删除逐项执行清单

- 命令：`node scripts/legacy_mobile_run_sheet.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- 输出：`docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md
```

## 当前删除前置状态

- G-002 ～ G-007 未完成数：6
- 尚未关闭：`G-002`、`G-003`、`G-004`、`G-005`、`G-006`、`G-007`

## 默认证据入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-audit-buckets.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt`

## 下一步

- 当前仍需先关闭这些前置发布任务：G-002、G-003、G-004、G-005、G-006、G-007
- 在这些任务全部改成 [x] 之前，不执行真实删除动作
- 可继续把 legacy-mobile-retirement-audit 作为删除前阻塞面板使用

