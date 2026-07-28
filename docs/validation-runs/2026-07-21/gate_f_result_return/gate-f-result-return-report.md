# Gate F 外部批次（F-005） 验收记录模板

> 批次ID：gate_f_result_return
> 状态：待执行模板。完成实际执行后，请手动改成“已执行”。

日期：2026-07-21

任务：

- F-005

## 固定样例

| 文件 | 大小 | SHA256 |
|---|---:|---|
| `desktop/cli/test-fixtures/sample.docx` | 36796 B | `032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570` |
| `desktop/cli/test-fixtures/sample.pdf` | 1722 B | `84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9` |
| `fixtures/mobile-reading/json/normal.json` | 167 B | `51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98` |

## 本地证据目录

- `native/androidApp/verify-evidence`（26 entries）
- `native/iosApp/verify-evidence`（20 entries）
- `desktop/verify-evidence`（5 entries）

## 默认落盘位置

- 报告：`docs/validation-runs/2026-07-21/gate_f_result_return/gate-f-result-return-report.md`
- 证据目录：`docs/validation-runs/2026-07-21/gate_f_result_return/evidence`

## 建议证据文件名

- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-write-result-log.txt`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-air-event-log.txt`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/android-result-open.mp4`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/android-result-back-to-source.mp4`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ios-result-open.mp4`
- `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ios-result-back-to-source.mp4`

## 建议执行步骤

1. 用真实 AI 客户端读取已授权样例，生成 Markdown / JSON 结果。
2. 通过 `molan write-result` 或 MCP `write_result` 写回，并确认保存为新版本或独立文档。
3. 桌面推送 `air_` 事件，Android / iOS 拉到结果卡片并进入阅读页。
4. 从结果回到来源，再执行复制 / 分享 / 保存副本，保留双端录屏。

## 必留证据

- 结果 ID / 来源文档 / 来源版本
- 桌面写回确认结果与 `air_` 事件痕迹
- Android 结果卡片与来源跳转录屏
- iOS 结果卡片与来源跳转录屏



## 填写模板

```text
任务ID：F-005
真实 AI 客户端：
来源文件 / 来源版本 / hash：
结果类型（Markdown / JSON）：
结果ID：
写回入口（CLI / MCP）：
桌面确认结果：
Android 录屏路径：
iOS 录屏路径：
是否通过：
```
