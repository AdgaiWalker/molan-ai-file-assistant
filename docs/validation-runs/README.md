# 墨览外部验收记录目录

日期：2026-07-21

这个目录放外部验收记录及其执行草稿。

注意：

- `node scripts/v2_validation_report.mjs --batch <id> --out default` 生成的是“待执行模板”，只是为了先把固定样例、证据目录和字段摆好；
- 只有填入真实执行结果、证据路径和结论后的报告，才可以作为 `TODO.md` 对应任务改成 `[x]` 的完成证据；
- 如果某次只是为了预演命令而生成空模板，不应把它当作“已完成批次”。

目录约定：

```text
docs/validation-runs/
  2026-07-21/
    mobile_true_device/
      mobile-true-device-report.md
      evidence/
    gate_d_sync/
      gate-d-sync-report.md
      evidence/
    gate_e_ai_read/
      gate-e-ai-read-report.md
      evidence/
    gate_f_result_return/
      gate-f-result-return-report.md
      evidence/
    release_dry_run/
      release-dry-run-report.md
      evidence/
```

生成方式：

```bash
node scripts/v2_validation_report.mjs --batch gate_d_sync --out default
node scripts/v2_validation_report.mjs --batch gate_e_ai_read --out default
node scripts/v2_validation_report.mjs --batch gate_f_result_return --out default
node scripts/v2_validation_report.mjs --batch release_dry_run --out default
node scripts/prepare_identity_and_accounts.mjs --out default
node scripts/prepare_mobile_true_device_wave.mjs --out default
node scripts/mobile_true_device_run_sheet.mjs --out default
node scripts/prepare_release_wave.mjs --out default
node scripts/release_run_sheet.mjs --out default
node scripts/prepare_sync_ai_wave.mjs --out default
node scripts/sync_ai_run_sheet.mjs --out default
node scripts/prepare_legacy_mobile_wave.mjs --out default
node scripts/legacy_mobile_run_sheet.mjs --out default
node scripts/remaining_execution_dashboard.mjs --out default
node scripts/remaining_dependency_matrix.mjs --out default
node scripts/check_validation_reports.mjs --remaining --out default
node scripts/remaining_completion_audit.mjs --out default
node scripts/identity_and_accounts_template.mjs --out default
node scripts/identity_input_status.mjs --out default
node scripts/identity_evidence_templates.mjs --out default
node scripts/identity_readiness_report.mjs --out default
node scripts/apply_engineering_identity.mjs
node scripts/engineering_identity_check.mjs --out default
node scripts/todo_snapshot.mjs
node scripts/public_surface_sync_check.mjs
node scripts/legacy_mobile_retirement_audit.mjs --out default
node scripts/prepare_remaining_external_work.mjs --write-summary
node scripts/remaining_todo_fast_path.mjs --out default
node scripts/next_remaining_action.mjs --out default
```

其中：

- `node scripts/prepare_identity_and_accounts.mjs --out default` 是 A-007 / G-001 的统一准备入口：会先回写公开文案与工程身份，再生成清单、身份输入总表、身份回填目标、人工证据模板、身份快照、工程身份快照，并跑一次公开面总自检；真实主体输入可先用 `node scripts/apply_release_identity_inputs.mjs --init` 生成本地模板，再用 `--check` / `--dry-run` 预检；
- `node scripts/identity_input_status.mjs --out default` 会把 A-007 / G-001 现在只缺的 8 个字段压成一张总表，直接显示当前值、是否已填和影响任务；
- `node scripts/identity_evidence_templates.mjs --out default` 会把官网、应用内、商店后台、删除执行和最终记录同步的人工证据压成可填写模板，避免临近发布时临时拼截图清单；
- `node scripts/prepare_mobile_true_device_wave.mjs --out default` 是 B/C 真机批次的统一准备入口：会先跑外部批次预检，再生成移动真机批次模板、逐项执行清单，并固定样例与来源矩阵；
- `node scripts/mobile_true_device_run_sheet.mjs --out default` 会把 Android / iPhone / iPad 的设备槽位、来源 App、样例、验收点和建议证据文件名拆成逐行执行表；
- `node scripts/prepare_sync_ai_wave.mjs --out default` 是 D-010 / E-007 / F-005 的统一准备入口：会先跑外部批次预检，再生成 Gate D / Gate E / Gate F 的模板、逐项执行清单，并固定执行顺序；
- `node scripts/sync_ai_run_sheet.mjs --out default` 会把 PostgreSQL 18、三端同步、授权读取、撤回、AI 写回、`air_` 事件和手机回流拆成逐行执行表；
- `node scripts/prepare_release_wave.mjs --out default` 是 G-002～G-007 的统一准备入口：会先跑官网公开面总自检，再生成发布就绪快照、G-007 演练模板与发布逐项执行清单；
- `node scripts/release_run_sheet.mjs --out default` 会把 Android、iOS、Windows、macOS、官网、监控和回滚拆成逐行执行表；
- `node scripts/prepare_legacy_mobile_wave.mjs --out default` 是 G-008 的统一准备入口：会先刷新旧 mobile 删除前审计，再生成删除逐项执行清单，汇总 G-002～G-007 是否都已关闭，并给出真实删除前后的验证提示；
- `node scripts/legacy_mobile_run_sheet.mjs --out default` 会把旧 React Native mobile 删除拆成删除前置、真实删除、删除后验证和最终回写的逐行执行表；
- `node scripts/next_remaining_action.mjs --out default` 只回答“现在下一步最该做什么”：会给出当前第一优先波次、默认命令、是否还缺外部条件，以及应直接查看的证据入口；
- `node scripts/remaining_execution_dashboard.mjs --out default` 会把五个波次的当前状态、默认命令、阻塞原因与证据入口集中成总控看板；
- `node scripts/remaining_dependency_matrix.mjs --out default` 会把剩余任务改按“外部依赖组”收口，直接显示哪一组资源会解锁哪些任务；
- `node scripts/check_validation_reports.mjs --remaining --out default` 会检查当前剩余外部批次报告是否仍停留在模板状态、哪些字段还没填完；
- `node scripts/remaining_completion_audit.mjs --out default` 会按任务 ID 逐项说明为什么当前还不能改成 `[x]`、现成证据在哪、默认命令是什么；
- `node scripts/identity_and_accounts_template.mjs --out default`、`node scripts/identity_sync_targets.mjs --out default`、`node scripts/identity_evidence_templates.mjs --out default`、`node scripts/identity_readiness_report.mjs --out default`、`node scripts/apply_engineering_identity.mjs`、`node scripts/engineering_identity_check.mjs --out default` 仍可单独运行，用于只刷新其中某一类产物；
- `node scripts/v2_validation_preflight.mjs`、`node scripts/v2_validation_report.mjs --batch mobile_true_device --out default` 与 `node scripts/mobile_true_device_run_sheet.mjs --out default` 仍可单独运行，用于只刷新第 2 波真机批次产物；
- `node scripts/v2_validation_preflight.mjs`、`node scripts/v2_validation_report.mjs --batch gate_d_sync|gate_e_ai_read|gate_f_result_return --out default` 与 `node scripts/sync_ai_run_sheet.mjs --out default` 仍可单独运行，用于只刷新第 3 波中的某一类产物；
- `node scripts/release_readiness_report.mjs --out default`、`node scripts/v2_validation_report.mjs --batch release_dry_run --out default` 与 `node scripts/release_run_sheet.mjs --out default` 仍可单独运行，用于只刷新发布快照、演练模板或逐项执行清单；
- `node scripts/legacy_mobile_retirement_audit.mjs --out default` 与 `node scripts/legacy_mobile_run_sheet.mjs --out default` 仍可单独运行，用于只刷新 G-008 的删除前审计或逐项执行清单；
- `node scripts/todo_snapshot.mjs` 会单独输出当前总任务数、未完成任务数与各状态分组的任务 ID，适合在开始真机 / 发布批次前先确认收口范围；
- `node scripts/public_surface_sync_check.mjs` 会一起检查工程身份配置、公开文案生成结果、官网发布渠道生成结果和 `TODO.md` 状态是否与源文件保持一致；
- `node scripts/legacy_mobile_retirement_audit.mjs --out default` 会单独生成 G-008 删除前的旧移动基线引用审计，并自动区分“必须移除”和“可保留历史证据”；
- `node scripts/prepare_remaining_external_work.mjs` 会根据当前 `TODO.md` 未完成状态，一次性补齐还需要的外部批次草稿、最短收口路径、执行看板、外部依赖矩阵与逐项审计；
- `--write-summary` 会额外写出 `prepare-summary.md` 和 `prepare-summary.json`，方便在执行真机 / 发布批次前先确认本次该跑哪些项。
- `node scripts/remaining_todo_fast_path.mjs --out default` 会额外生成 `fastest-remaining-path.md/json`，把剩余任务压成最短执行波次。

规则：

- 报告文件优先记录一次真实执行结果；若先生成草稿模板，执行完成后要直接在同文件补齐，不额外再建第二份“正式版”；
- `evidence/` 下优先放录屏、截图、日志和 SHA256 文本；
- 文件名尽量复用模板里给出的建议命名，减少后续引用混乱；
- 真正执行后，要把 `TODO.md` 中对应任务的“当前记录”补上证据路径。
