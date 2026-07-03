# D2.2 Office/PDF/PPT/Excel 转 Markdown 规则

## 1. 定位

电脑端转换的目标不是复刻 Office 排版，而是把办公文件转成 AI / Agent 易读、可引用、可继续处理的 Markdown。

范围：

- Word `.docx` -> Markdown
- PDF -> Markdown
- PPT `.pptx` -> Markdown
- Excel `.xlsx` / CSV -> Markdown

实现边界：

- 共享转换入口仍为 `desktop/src/shared/converter.ts`。
- CLI 与 Electron GUI 不复制 pandoc 调用逻辑。
- V1/S2 先基于 pandoc 输出稳定 Markdown；Office 转 Markdown 后清理进入后续增强。
- 不做 OCR，不处理扫描件 PDF，不做复杂 Office 编辑。

## 2. 当前转换基线

| 输入 | 当前 from/to | 代码 |
|---|---|---|
| `.docx` | `docx -> gfm` | `pandocFormat('.docx')` |
| `.pdf` | `pdf -> gfm` | `pandocFormat('.pdf')` |
| `.pptx` | `pptx -> gfm` | `pandocFormat('.pptx')` |
| `.xlsx` | `xlsx -> gfm` | `pandocFormat('.xlsx')` |
| `.csv` | `csv -> gfm` | `pandocFormat('.csv')` |

输出命名由 `makeOutputPath` 保证不覆盖已有文件：同名时追加 `_1`、`_2`。

## 3. 通用 Markdown 规则

| 元素 | 规则 | 验收 |
|---|---|---|
| 标题 | 保留层级为 `#` / `##` / `###`；未知样式按段落处理 | 大纲可被 AI 引用 |
| 段落 | 保留自然段，去除明显重复空行 | 不出现整篇单行 |
| 列表 | 保留有序 / 无序列表 | 嵌套层级可读 |
| 表格 | 转成 GFM 表格；复杂合并单元格允许降级为普通段落 | 表头和主要字段不丢 |
| 图片 | 默认不强制抽取；后续 `preserveImages` 生成资源目录 | Markdown 中有可追踪占位或链接 |
| 代码 | 等宽/代码块尽量保留 fenced code；不能识别时保留原文本 | AI 能复制代码片段 |
| 分页 | 页眉页脚和分页符不作为强语义内容 | 不因分页打碎自然段 |
| 脚注/批注 | V1 可保留为普通文本或忽略，后续增强 | 不阻断转换 |
| 元数据 | 文件名、路径、转换时间、hash 放入 JSON 结果，不强塞 Markdown 正文 | AI 通过 JSON 日志读取 |

## 4. Word -> Markdown

### 4.1 标题

- Word 标题样式映射到 Markdown heading。
- 没有标题样式但字号明显的段落，V1 不做推断，避免误判。
- 页眉页脚默认不作为标题。

### 4.2 表格

- 简单表格输出为 GFM table。
- 合并单元格、嵌套表格、复杂样式允许降级。
- 表格过宽时保留所有列，不为手机阅读主动裁剪；手机端通过横向滚动解决。

### 4.3 图片

V1 当前不承诺资源抽取。后续规则：

```text
output/
  report.md
  report.assets/
    image-001.png
    image-002.jpg
```

Markdown 引用：

```md
![image-001](report.assets/image-001.png)
```

图片失败时：

- Markdown 保留 `[图片未导出：image-001]`。
- JSON 结果 `warnings` 增加图片导出警告。

### 4.4 清理

后续 Office 清理只做规则层：

- 删除连续重复页眉/页脚。
- 删除孤立页码。
- 合并被分页打断的短段落。
- 保留标题层级。
- 修复简单表格。

不做语义改写；AI 清理到 S7 后置。

## 5. PDF -> Markdown

PDF 分两类：

| 类型 | 策略 |
|---|---|
| 文本型 PDF | pandoc 尝试提取文本并转 GFM |
| 扫描件 / 图片型 PDF | 不做 OCR，返回失败或低质量 Markdown + warning |

规则：

- PDF 页码、页眉页脚可能混入正文，V1 不承诺完全清理。
- 表格可能退化为文本，后续可引导用户改用原 Excel/Word。
- 转换结果必须在 JSON 中保留 `warnings`，用于提示“PDF 提取质量可能较低”。

失败策略：

- pandoc 失败返回 `E_CONVERT_FAILED`。
- 不自动调用外部 OCR。
- 不上传 PDF 到云端识别。

## 6. PPT -> Markdown

PPT 目标是让 AI 读到幻灯片结构和要点，不复刻视觉设计。

推荐输出结构：

```md
# {文件名}

## Slide 1: {标题}

- 要点 A
- 要点 B

## Slide 2: {标题}

正文或备注
```

规则：

- 每页至少保留标题或页序号。
- 文本框按阅读顺序输出。
- 演讲者备注可作为 `> 备注：`。
- 图片和图表 V1 可占位；后续资源抽取。
- 动画、转场、母版样式不保留。

## 7. Excel / CSV -> Markdown

目标是让 AI 读表格，而不是替代电子表格。

| 元素 | 规则 |
|---|---|
| 单工作表 | 输出一个 Markdown 表格 |
| 多工作表 | 每个 sheet 用 `## {sheetName}` 分段 |
| 表头 | 第一行优先作为表头；无法判断时生成列名 |
| 空行/空列 | 连续空行可作为表格分隔 |
| 公式 | 输出计算后的值；后续可在 warning 中说明公式丢失 |
| 单元格格式 | 不保留颜色、边框、合并样式 |
| 大表格 | 保留完整输出；后续可加摘要/截断选项 |

CSV 使用 UTF-8 优先；编码异常时返回 `E_CONVERT_FAILED` 或 warning。

## 8. 元数据与 hash

Markdown 正文保持干净；转换元数据进入 JSON 结果。

后续扩展结果项：

```ts
interface ConvertResultExtension {
  inputSha256?: string;
  outputSha256?: string;
  inputSize?: number;
  outputSize?: number;
  durationMs?: number;
  readabilityScore?: number;
  aiNextActions?: string[];
}
```

这些字段只能向后扩展，不能影响 D2.1 的 `ok/results/outputPath/errorCode/error`。

## 9. 失败策略

| 场景 | errorCode | 行为 |
|---|---|---|
| pandoc 缺失 | `E_PANDOC_MISSING` | 提示运行 `molan check` 或下载 pandoc |
| 格式不支持 | `E_UNSUPPORTED_FORMAT` | 过滤或失败 |
| 输入不存在 | `E_INPUT_NOT_FOUND` | 单文件失败；批量中只标记该项 |
| pandoc 失败 | `E_CONVERT_FAILED` | 保留 stderr 到 `error` |
| 输出写入失败 | `E_OUTPUT_FAILED` | 不生成假成功结果 |

批量转换失败隔离：

- 单个文件失败不终止其他文件。
- 总结 `ok=false`，`failed > 0`。
- 每个失败项保留 `fileName`、`inputPath`、`errorCode`、`error`。

## 10. 真实 fixture 验收

S2/S6 必须补真实样例：

| 文件 | 必须包含 |
|---|---|
| `sample.docx` | 标题、二级标题、段落、列表、表格、图片、代码样式 |
| `sample.pdf` | 文本型 PDF，多页、页码、表格样式 |
| `sample.pptx` | 多页、标题、要点、备注、图片 |
| `sample.xlsx` | 多 sheet、表头、公式、空行、宽表 |
| `sample.csv` | 中文、逗号、引号、换行字段 |

每个 fixture 记录：

- 输入路径、大小、SHA256。
- 输出 Markdown 路径、大小、SHA256。
- 命令与 JSON 输出。
- 失败样例和错误信息。

## 11. 验收口径

- CLI 和 GUI 均通过 `desktop/src/shared/converter.ts` 调用 pandoc。
- Word/PDF/PPT/Excel/CSV 转 Markdown 至少有真实 smoke 样例。
- 表格、标题、代码、图片占位、分页/页眉页脚处理规则有证据。
- 转换失败可读，AI 能根据 `errorCode/error/outputPath/warnings` 判断下一步。
