# 身份与账号统一准备结果

日期：2026-07-21

对应任务：

- A-007
- G-001

用途：把 A-007 / G-001 需要的工程身份回写、公开文案同步、清单生成、状态快照和总自检压成一个统一入口，减少手工步骤。

## 本次已执行

### 公开文案与站点身份常量回写

- 命令：`node scripts/render_public_docs.mjs`

```text
已同步公开文案与站点身份常量：
- docs/public/privacy-policy.md
- docs/public/terms-of-service.md
- docs/public/account-and-data-deletion.md
- docs/public/support.md
- site/src/lib/publicIdentity.generated.ts
```

### 工程身份回写

- 命令：`node scripts/apply_engineering_identity.mjs`

```text
工程身份已与配置一致，无需改动。
```

### 身份与账号清单

- 命令：`node scripts/identity_and_accounts_template.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md
```

### 身份输入当前状态总表

- 命令：`node scripts/identity_input_status.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.md
```

### 身份信息逐位置回填清单

- 命令：`node scripts/identity_sync_targets.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-sync-targets.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-sync-targets.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/identity_and_accounts/identity-sync-targets.md
```

### 身份与公开入口人工证据模板

- 命令：`node scripts/identity_evidence_templates.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-evidence-templates.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-evidence-templates.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/identity_and_accounts/identity-evidence-templates.md
```

### 身份与公开入口状态快照

- 命令：`node scripts/identity_readiness_report.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md
```

### 工程身份一致性快照

- 命令：`node scripts/engineering_identity_check.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- 输出：`docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.json`

```text
已写入 docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md
```

### 公开面与 TODO 总自检

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

## 默认证据入口

- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-sync-targets.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-evidence-templates.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/engineering-identity-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-product-identity.json`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/current-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/public-doc-placeholders.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-readiness-findings.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/engineering-identity-values.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-input-status.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-sync-targets.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`

## 下一步

先运行 node scripts/apply_release_identity_inputs.mjs --init 生成本地输入模板，填入真实主体、支持邮箱、正式域名和账号主体后，再运行 node scripts/apply_release_identity_inputs.mjs --check；确认无误后执行默认 apply。随后按清单补商店后台与应用内入口证据。

