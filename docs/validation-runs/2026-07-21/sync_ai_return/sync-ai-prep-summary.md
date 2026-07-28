# 同步 / AI 读取 / 结果回流统一准备结果

日期：2026-07-21

对应任务：

- D-010
- F-005

用途：把 D-010 / E-007 / F-005 进入真实外部执行前需要的预检与三份批次模板收敛成一个统一入口，减少手工步骤，并固定执行顺序。

## 本次已执行

### 外部批次预检

- 命令：`node scripts/v2_validation_preflight.mjs`

```text
墨览 V2 外部批次预检
日期：2026-07-21

✓ 移动阅读固定样例
  - fixtures/mobile-reading/markdown/normal.md [ok] 292 B
  - fixtures/mobile-reading/markdown/image.png [ok] 1607 B
  - fixtures/mobile-reading/markdown/empty.md [ok] 0 B
  - fixtures/mobile-reading/markdown/malformed.md [ok] 114 B
  - fixtures/mobile-reading/markdown/large-1mb.md [ok] 1512031 B
  - fixtures/mobile-reading/json/normal.json [ok] 167 B
  - fixtures/mobile-reading/json/invalid.json [ok] 63 B
  - fixtures/mobile-reading/json/large-5mb.json [ok] 5243566 B
  - fixtures/mobile-reading/text/utf8.txt [ok] 77 B
  - fixtures/mobile-reading/text/gbk.txt [ok] 15 B
  - fixtures/mobile-reading/names/中文 文件 名.md [ok] 60 B
  - fixtures/mobile-reading/names/file with spaces.json [ok] 31 B
  - fixtures/mobile-reading/names/超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名超长文件名.md [ok] 94 B
  - fixtures/mobile-reading/names/no-extension [ok] 50 B
  - fixtures/mobile-reading/binary/disguised-as-text.txt [ok] 16 B
  - fixtures/mobile-reading/binary/unsupported.bin [ok] 12 B
✓ Office / PDF 固定样例
  - desktop/cli/test-fixtures/sample.docx [ok] 36796 B
  - desktop/cli/test-fixtures/sample.pdf [ok] 1722 B
  - desktop/cli/test-fixtures/sample.pptx [ok] 29172 B
  - desktop/cli/test-fixtures/sample.xlsx [ok] 4941 B

✓ 移动真机批次（B/C） (B-002, B-004, B-008, B-009, C-002, C-004, C-008, C-009)
  sample: fixtures/mobile-reading/markdown/normal.md 292 B
  sample: fixtures/mobile-reading/json/normal.json 167 B
  sample: fixtures/mobile-reading/text/utf8.txt 77 B
  sample: fixtures/mobile-reading/markdown/large-1mb.md 1512031 B
  sample: fixtures/mobile-reading/json/large-5mb.json 5243566 B
  evidence: native/androidApp/verify-evidence 26 entries
  evidence: native/iosApp/verify-evidence 20 entries
✓ Gate D 外部批次（D-010） (D-010)
  sample: fixtures/mobile-reading/markdown/normal.md 292 B
  sample: fixtures/mobile-reading/json/normal.json 167 B
  sample: fixtures/mobile-reading/text/utf8.txt 77 B
  sample: desktop/cli/test-fixtures/sample.docx 36796 B
  sample: desktop/cli/test-fixtures/sample.pdf 1722 B
  sample: desktop/cli/test-fixtures/sample.xlsx 4941 B
  sample: desktop/cli/test-fixtures/sample.pptx 29172 B
  evidence: native/androidApp/verify-evidence 26 entries
  evidence: native/iosApp/verify-evidence 20 entries
  evidence: desktop/verify-evidence 5 entries
✓ Gate E 外部批次（E-007） (E-007)
  sample: desktop/cli/test-fixtures/sample.docx 36796 B
  sample: desktop/cli/test-fixtures/sample.pdf 1722 B
  evidence: desktop/verify-evidence 5 entries
✓ Gate F 外部批次（F-005） (F-005)
  sample: desktop/cli/test-fixtures/sample.docx 36796 B
  sample: desktop/cli/test-fixtures/sample.pdf 1722 B
  sample: fixtures/mobile-reading/json/normal.json 167 B
  evidence: native/androidApp/verify-evidence 26 entries
  evidence: native/iosApp/verify-evidence 20 entries
  evidence: desktop/verify-evidence 5 entries
✓ 发布前演练批次（G-007） (G-007)
  evidence: site 13 entries
  evidence: desktop 16 entries
  evidence: server 15 entries
```

### Gate D 外部批次模板

- 命令：`node scripts/v2_validation_report.mjs --batch gate_d_sync --out default`
- 输出：`docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md
```

### Gate F 外部批次模板

- 命令：`node scripts/v2_validation_report.mjs --batch gate_f_result_return --out default`
- 输出：`docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md
```

### 同步 / AI / 回流逐项执行清单

- 命令：`node scripts/sync_ai_run_sheet.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- 输出：`docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md
```

## 默认证据入口

- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- `docs/validation-runs/2026-07-21/gate_d_sync/gate-d-sync-report.md`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/gate-e-ai-read-report.md`
- `docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-d-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-e-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/gate-f-evidence-paths.txt`
- `docs/design/v2-validation-batches.md`

## 下一步

E-007 已关闭，真实 Codex 写回与电脑确认也已通过；按 docs/design/v2-validation-batches.md 用同一套 Docker Compose、桌面和真机环境完成 D-010 与 F-005 的剩余矩阵。

