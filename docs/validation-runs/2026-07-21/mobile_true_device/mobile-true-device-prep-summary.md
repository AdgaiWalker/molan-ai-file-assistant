# 移动真机批次统一准备结果

日期：2026-07-21

对应任务：

- B-002
- B-004
- B-008
- B-009
- C-002
- C-004
- C-008
- C-009

用途：把 B/C 真机批次进入真实执行前需要的预检与模板收敛成一个统一入口，减少手工步骤，并固定样例与来源矩阵。

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

### 移动真机批次模板

- 命令：`node scripts/v2_validation_report.mjs --batch mobile_true_device --out default`
- 输出：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md
```

### 移动真机逐项执行清单

- 命令：`node scripts/mobile_true_device_run_sheet.mjs --out default`
- 输出：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- 输出：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.json`

```text
已写入 /Users/happy/Desktop/molan-ai-file-assistant/docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md
```

## 默认证据入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-sample-checksums.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-evidence-paths.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-report-fields.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`
- `docs/design/v2-validation-batches.md`

## 下一步

按 docs/design/v2-validation-batches.md 的来源矩阵，用同一批固定样例完成 Android 与 iPhone / iPad 真机采集，并把真实录屏、机型、系统版本、耗时和内存结果直接补进报告。

