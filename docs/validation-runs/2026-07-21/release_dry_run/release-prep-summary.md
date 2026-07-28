# 发布波次统一准备结果

日期：2026-07-21

对应任务：

- G-002
- G-003
- G-004
- G-005
- G-006
- G-007

用途：把 G-002～G-007 进入真实发布 / 演练前需要的公开面自检、发布快照（含对外交付首选产物与 SHA256）和演练模板收敛成一个统一入口，减少手工步骤。

## 本次已执行

### 官网公开面与 TODO 总自检

- 命令：`node scripts/public_surface_sync_check.mjs`

```text
通过：工程身份配置
工程身份配置已同步。
通过：公开文案与身份常量
公开文案与站点身份常量已同步。
通过：官网发布渠道常量
官网发布渠道配置已同步。
通过：TODO 状态一致性
# TODO 一致性检查

- 文件：TODO.md
- 任务小节数：55
- 当前执行队列中的单任务行数：13
- 未完成任务数：19
- 结果：通过

## 状态统计

- [x]：36
- [!]：2
- [v]：16
- [~]：1
- [ ]：0
```

### 发布就绪快照

- 命令：`node scripts/release_readiness_report.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md
```

### 发布演练模板

- 命令：`node scripts/v2_validation_report.mjs --batch release_dry_run --out default`
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md
```

### 发布 / 上架 / 官网 / 回滚逐项执行清单

- 命令：`node scripts/release_run_sheet.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- 输出：`docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md
```

## 默认证据入口

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
- `docs/design/release-operations-checklist.md`

## 下一步

在此基础上按 docs/design/release-operations-checklist.md 逐平台补签名、上传、真实下载入口、SHA256、监控截图与回滚记录。

