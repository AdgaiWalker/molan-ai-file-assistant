# CLI Smoke 测试记录

日期：2026-07-04
环境：Windows + Node v24.16.0 + pandoc (resources/pandoc.exe)

## 样本

| 文件 | 格式 | 大小 |
|---|---|---|
| `sample.md` | Markdown | 168 B（标题/加粗/列表/代码块/表格） |
| `sample.json` | JSON | 202 B（嵌套对象+数组） |
| `sample.csv` | CSV | 56 B（中文表头+2行数据） |
| `sample.docx` | Word | 8741 B（H1/H2/加粗/斜体/项目符号） |

> PDF/PPTX/XLSX 未包含：无法在无 Office 环境下脚本生成最小样本。真实样例留待有真实 Office 文件时补。

## 转换结果（molan convert --json）

| 输入 → 输出 | 结果 | 输出文件 |
|---|---|---|
| docx → md | ✅ ok:true success:1 | `out/sample.md`（H1/H2/加粗/斜体/列表正确） |
| md → docx | ✅ ok:true success:1 | `out/sample.docx` |
| csv → md | ✅ ok:true success:1 | `out/sample_1.md`（正确渲染为 MD 表格） |
| json → json | ✅ ok:true success:1 | 序列化为 `{file,path,content,convertedAt}` 结构 |
| 批量目录（test-fixtures） | ⚠️ total:7 success:6 failed:1 | 失败隔离生效：json→md 因 pandoc 不认原生 JSON 而失败，其余 6 个成功，批量不中断 |

## 已知限制

- **json → md 直接走 pandoc 会失败**（pandoc 把 JSON 当 pandoc-JSON 格式，报 `missing pandoc-api-version`）。这是 V1 已知限制：CLI 的 json 输入主要服务 `json → json` 结构化输出；json→md 规则化在手机端（`jsonToMarkdown`）实现，CLI 未复制该规则。
- **失败隔离**已验证：批量中单文件失败返回 `ok:false` 但其余成功项仍正常输出，不抛未捕获异常。

## 复现

```bash
cd desktop/cli
npm run build
node dist/index.js check                          # 确认 pandoc 可用
node dist/index.js convert test-fixtures/sample.docx --to md --out test-fixtures/out --json
node dist/index.js convert test-fixtures --batch --to md --out test-fixtures/out --json
```
