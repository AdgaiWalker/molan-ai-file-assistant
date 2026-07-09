# D1.16 转换配方设计

## 1. 定位

转换配方把“选格式”从技术选项变成用途选择：

- 给 AI 读：Markdown。
- 给别人看：PDF。
- 给别人继续编辑：Word。
- 给开发 / Agent 配置：保留 JSON 或转 Markdown。
- 给提示词使用：提取 prompt / rules / system message / 命令片段。

配方用于手机端当前文件转换、V1.5 批量转换中心、电脑端 GUI/快贴窗和 CLI 文档说明。

## 2. 默认推荐

| 用户意图 | 推荐输出 | 备选 | 理由 |
|---|---|---|---|
| 给 AI 读 | Markdown | JSON | AI 易读、可引用、可继续改写 |
| 给别人看 | PDF | Markdown | 版式稳定，微信/QQ/系统预览友好 |
| 给别人继续编辑 | Word `.docx` | Markdown | 办公用户可继续修改 |
| 给开发 / Agent 配置 | JSON 原文件 | Markdown | 保留结构和字段，Agent 可直接解析 |
| 给提示词使用 | 文本 / Markdown 片段 | JSON | 方便粘贴到 AI 输入框 |
| 给自己临时阅读 | 原文件 | Markdown | 少一步转换，保留上下文 |

## 3. 手机端轻转换

手机端只保留服务分享闭环的轻转换，不做重型 Office 套件。

| 输入 | 给 AI 读 | 给别人看 | 给别人改 | 给开发 / Agent | 备注 |
|---|---|---|---|---|---|
| Markdown | 原 Markdown / `.md` | PDF | Word `.docx` | Markdown | 已由 `ConvertSheet` 支持 |
| JSON | Markdown | PDF 后置 / 可由 JSON -> Markdown -> PDF | Word 后置 / 可由 JSON -> Markdown -> Word | 原 `.json` | V1 优先 JSON -> Markdown 和原 JSON 分享 |
| Word `.docx` | Markdown | 不在手机端主推 | 不在手机端主推 | Markdown | 手机端只做临时 Word -> Markdown 阅读 |
| PDF / PPT / Excel | 不在手机端做重转换 | 不在手机端做 | 不在手机端做 | 不在手机端做 | 交给电脑端 CLI / GUI |

当前代码映射：

| 能力 | 代码 |
|---|---|
| Markdown -> PDF | `mobile/src/converter/fileConvert.ts` `exportPdfFile` |
| Markdown -> Word | `convertMdToDocxFile` |
| JSON -> Markdown | `jsonToMarkdown` + `writeMdFile` / 载入阅读器 |
| JSON -> PDF / Word | 先 `jsonToMarkdown`，再 PDF / Word |
| 原 JSON 分享 | `writeJsonFile` |
| Word -> Markdown | `convertDocxFileToMd` |

## 4. 电脑端重转换

电脑端承担 Office / PDF / PPT / Excel 到 Markdown 的重转换，转换引擎必须继续共用 `desktop/src/shared/converter.ts`，CLI 和 Electron GUI 不复制 pandoc 调用逻辑。

| 输入 | 推荐输出 | 使用场景 |
|---|---|---|
| Word `.docx` | Markdown | 给 AI 摘要、改写、提取需求 |
| PDF | Markdown | 给 AI 读取文本型 PDF |
| PPT `.pptx` | Markdown | 会议材料、方案、课件进入 AI 工作流 |
| Excel `.xlsx` / CSV | Markdown 表格或结构化 Markdown | 给 AI 分析表格 |
| Markdown | Word `.docx` | 电脑端办公交付 |
| Markdown / JSON | JSON 日志 | AI / Agent 稳定解析转换结果 |

CLI JSON 输出仍必须保留 `ok`、`results`、`outputPath`、`errorCode`、`error`，新增配方字段只能向后扩展。

## 5. JSON 转 Markdown 规则

JSON 是一等格式，转换时不能粗暴 stringify 给普通用户。

| JSON 类型 | Markdown 输出 |
|---|---|
| 对象 | 一级标题为文件名；字段名用小标题或列表项 |
| 数组 | 每项编号；对象项展开字段；基础值保持列表 |
| 字符串 | 若像 Markdown，直接保留；否则作为段落或代码块 |
| 嵌套对象 | 递归缩进，避免无限深展开 |
| 无效 JSON | 输出“JSON 解析失败”说明 + 原始 fenced code |

规则目标：

- 给 AI：字段和层级清楚，能引用。
- 给人看：避免一整块难读 JSON。
- 给开发：保留原 JSON 分享入口，不强制转 Markdown。

## 6. 分享前推荐

转换入口先问用途，再显示推荐格式：

| 文案 | 格式 | 适用输入 |
|---|---|---|
| 给 AI 读 | Markdown | Markdown、JSON、Office 转换结果 |
| 给别人看 | PDF | Markdown、规则化 JSON |
| 给别人改 | Word | Markdown、规则化 JSON |
| 给开发 / Agent | JSON 原文件 / Markdown | JSON、配置、API 响应 |
| 提取提示词 | 文本 / Markdown 片段 | Markdown、JSON |

V1 可以保留当前按钮式入口；V1.5 批量转换中心和分享前面板应使用配方文案。

## 7. 文件命名

| 输出 | 命名 |
|---|---|
| Markdown | `{baseName}.md` |
| JSON 转 Markdown | `{baseName}-json.md` 或 `{baseName}.md`，批量时避免重名 |
| PDF | `{baseName}.pdf` |
| Word | `{baseName}.docx` |
| 原 JSON | `{baseName}.json` |
| CLI JSON 日志 | `{baseName}.json` 或 stdout JSON |

临时分享文件位于缓存目录；用户通过系统分享面板保存到目标位置。

## 8. 失败与降级

| 失败 | 降级 |
|---|---|
| Markdown -> PDF 失败 | 提供 Markdown / 纯文本分享 |
| Markdown -> Word 失败 | 提供 Markdown 分享 |
| JSON parse 失败 | 原 JSON 分享 + 原文 Markdown 错误页 |
| 大 JSON 转换慢 | 先转 Markdown 预览，再由用户决定 PDF/Word |
| 手机端不支持重转换 | 提示使用电脑端 `molan convert` |
| Pandoc 缺失 | CLI 返回 `E_PANDOC_MISSING`，GUI/CLI 指向安装或下载 |

## 9. 与 AI 可读工作流关系

转换配方不是云上传开关：

- 本地转换完成后，用户可复制、分享、保存。
- “保存到云端”或“转给 AI 处理”必须另行确认。
- 文件内容默认不上传。
- AI 读取入口优先级：CLI -> 本地 Agent / MCP -> 云端 API。
- 云端只在用户主动选择后接收文件或转换结果。

## 10. 验收口径

- 用户不懂格式时，能按用途选择“给 AI 读 / 给别人看 / 给别人改 / 给开发或 Agent”。
- 手机端默认推荐 Markdown -> PDF、Markdown -> Word、JSON -> Markdown、JSON 原文件。
- 电脑端默认推荐 Office/PDF/PPT/Excel -> Markdown。
- JSON -> Markdown 输出可读，非法 JSON 不丢原文。
- CLI JSON 输出契约不因配方命名改变。
