# desktop/cli 固定样例

日期：2026-07-21

本目录同时服务三类用途：

- `molan convert` 的最小 Smoke 样例；
- Gate D / E / F 外部批次需要的 Office / PDF 原始对象；
- 后续真机、同步、AI 读取与结果回流录屏时可复用的固定输入。

## 当前样例

| 文件 | 用途 |
|---|---|
| `sample.md` | Markdown 阅读与 Markdown → docx |
| `sample.json` | JSON 结构化输出 |
| `sample.csv` | CSV → Markdown 表格 |
| `sample.docx` | docx → Markdown |
| `sample.xlsx` | xlsx → Markdown / 同步原件 |
| `sample.pptx` | pptx → Markdown / 同步原件 |
| `sample.pdf` | pdf → Markdown / AI 读取前派生副本 |

## 生成

固定样例可通过下列脚本重建：

```bash
cd desktop/cli/test-fixtures
python3 generate_office_fixtures.py
```

脚本依赖 `python-docx`、`openpyxl`、`python-pptx`、`reportlab`，它们只用于生成样例，不属于产品运行时依赖。

生成后会更新：

- `sample.docx`
- `sample.xlsx`
- `sample.pptx`
- `sample.pdf`
- `SHA256SUMS`

## 使用建议

- D-010：补 PostgreSQL 18、弱网和 Office/PDF 三端同步矩阵时直接复用本目录对象；
- E-007：验证“同步原件 → 派生 Markdown → 授权 → CLI/MCP 读取”时优先使用 `sample.docx` / `sample.pdf`；
- F-005：验证“来源文件 → AI 结果 → 手机回流”时，用同一批样例保持输入稳定。
