# CLI Smoke 测试记录

## 2026-07-26 macOS 本地可用性复测

环境：macOS ARM64 + Node v24.18.0 + 仓库内 pandoc 3.10。

固定 `sample.docx`、`sample.pdf`、`sample.pptx`、`sample.xlsx`、`sample.csv`、`sample.md`、`sample.json` 逐一执行 `molan convert --to md --json`，结果为 7/7 成功。PDF 使用本地文本提取器，XLSX 使用工作表解析器，JSON 使用规则化 Markdown 展开；DOCX、PPTX、CSV 和 Markdown 继续复用共享 Pandoc 路径。Electron GUI 另以 `sample.pdf` 实测，显示“成功 1 / 失败 0”。

下文保留 2026-07-04 的历史结果，便于说明问题发现与修复背景。

## 2026-07-04 Windows 历史记录

日期：2026-07-04
环境：Windows + Node v24.16.0 + pandoc (resources/pandoc.exe)

## 样本

> 2026-07-21 起，仓库已补齐固定 `sample.docx` / `sample.xlsx` / `sample.pptx` / `sample.pdf` 与 `SHA256SUMS`，用于 Gate D/E/F 的同步、AI 读取和结果回流外部批次。下表仍保留 2026-07-04 那次 Windows + pandoc Smoke 实测时实际参与转换的样本与结果。

| 文件 | 格式 | 大小 |
|---|---|---|
| `sample.md` | Markdown | 168 B（标题/加粗/列表/代码块/表格） |
| `sample.json` | JSON | 202 B（嵌套对象+数组） |
| `sample.csv` | CSV | 56 B（中文表头+2行数据） |
| `sample.docx` | Word | 8741 B（H1/H2/加粗/斜体/项目符号） |

固定对象库见同目录 `README.md` 与 `SHA256SUMS`。

## 转换结果（molan convert --json）

| 输入 → 输出 | 结果 | 输出文件 |
|---|---|---|
| docx → md | ✅ ok:true success:1 | `out/sample.md`（H1/H2/加粗/斜体/列表正确） |
| md → docx | ✅ ok:true success:1 | `out/sample.docx` |
| csv → md | ✅ ok:true success:1 | `out/sample_1.md`（正确渲染为 MD 表格） |
| json → json | ✅ ok:true success:1 | 序列化为 `{file,path,content,convertedAt}` 结构 |
| 批量目录（test-fixtures） | ⚠️ total:7 success:6 failed:1 | 失败隔离生效：json→md 因 pandoc 不认原生 JSON 而失败，其余 6 个成功，批量不中断 |

## 当时的限制（已于 2026-07-26 修复）

- 当时 `json → md` 直接走 pandoc 会失败；现在共享转换引擎会规则化展开合法 JSON，并为非法 JSON 生成带错误说明、保留完整原文的 Markdown。
- **失败隔离**已验证：批量中单文件失败返回 `ok:false` 但其余成功项仍正常输出，不抛未捕获异常。

## 复现

```bash
cd desktop/cli
npm run build
node dist/index.js check                          # 确认 pandoc 可用
node dist/index.js convert test-fixtures/sample.docx --to md --out test-fixtures/out --json
node dist/index.js convert test-fixtures --batch --to md --out test-fixtures/out --json
```
