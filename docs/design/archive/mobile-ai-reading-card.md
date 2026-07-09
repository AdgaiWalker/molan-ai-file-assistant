# D1.11 AI 阅读卡片设计

## 1. 定位

AI 阅读卡片是手机端阅读页的辅助判断层，不替代 Markdown / JSON 阅读器，也不内置通用聊天。它回答用户打开文件后的第一批问题：

- 这是什么类型的文件，适合直接读、保存、复制，还是转给 AI。
- 内容大概讲什么，有没有可复制的提示词、待办、命令片段。
- 是否包含 token、secret、api key、password 等敏感字段。
- 是否值得保存到提示词库、最近文件、云端小数据，或主动转给 AI 处理。

V1 只做本地规则识别，不能默认上传文件。V2 接入真实 AI 时，上传动作也必须由用户主动触发。

## 2. 设计范围

实现参考：`mobile/src/components/AiInsightSheet.tsx`。

| 能力 | 设计口径 |
|---|---|
| 文件类型 | V1 区分 Markdown 与 JSON；V1.5/V2 可细分为 PRD、README、API 响应、Agent 配置、MCP 配置、日志 |
| 内容摘要 | Markdown 取首段与标题/代码块统计，JSON 取对象/数组/字段摘要；摘要只做快速判断，不承诺完整总结 |
| 提示词候选 | 识别 prompt、system、instruction、rules、message、template、斜杠命令；候选可一键复制，V1.5 可导入提示词库 |
| 待办候选 | 识别 todo、待办、任务、下一步、action、review 等线索；候选用于复制或 V2 转任务 |
| 敏感字段 | 识别 token、secret、api_key、authorization、password、privateKey 等 key/path；仅本地提示，不自动上传，不自动清洗原文件 |
| 保存建议 | 根据结构、提示词、敏感字段给保留/临时查看建议；建议不自动改变文件状态 |

## 3. 卡片结构

从上到下固定为 5 个区块：

| 区块 | 内容 | 操作 |
|---|---|---|
| 文件概览 | 文件类型、文件名、保存建议 | 关闭卡片 |
| 内容摘要 | 1-3 条摘要、结构统计 | 单条复制 |
| 提示词候选 | prompt/rules/system/command 片段 | 单条复制，V1.5 导入提示词库 |
| 待办候选 | todo/action/review/下一步等片段 | 单条复制，V2 可转任务 |
| 敏感字段提醒 | 命中的字段名、JSONPath 或原始行 | 单条复制，提示用户谨慎分享 |

空态必须直接说明“暂未识别到”，不能留白。

## 4. 文件类型识别

V1 识别规则：

| 输入 | 类型判断 | 摘要依据 |
|---|---|---|
| Markdown | `.md` / `.markdown` 或打开页 kind 为 markdown | 首段、标题数、代码块数、提示词关键词 |
| JSON 对象 | JSON parse 后为 object | 顶层字段数、前 8 个字段名、结构化 prompt/config/API 字段 |
| JSON 数组 | JSON parse 后为 array | 数组长度、前 20 项内的 prompt/todo/sensitive 线索 |
| JSON 基础值 | string/number/boolean/null | 提醒这是基础值 JSON |
| 无效 JSON | parse 失败 | 提醒进入编辑页格式化或修正 |

V1.5 / V2 可扩展类型：

- `PRD / 需求文档`：标题包含 PRD、需求、背景、验收、范围。
- `Prompt / 提示词`：prompt/system/rules/message 密度高。
- `API / 接口响应`：code、message、data、meta、error、traceId 等字段明显。
- `Agent / MCP 配置`：tools、servers、commands、resources、schema 等字段明显。
- `日志 / 调试输出`：timestamp、level、stack、requestId、duration 等字段明显。

## 5. 提示词与待办提取

提示词候选：

- Markdown 行命中 `prompt/system/instruction/rules/role/content/message/template`。
- Markdown 行以 `/` 命令开头，例如 `/goal`、`/review`。
- JSON key 命中提示词关键词，且 value 是非空字符串。
- 候选去重，单条展示最长 180 字，最多展示 5 条。

待办候选：

- Markdown 行命中 `todo/待办/任务/下一步/action/fix/review/完成/实现/优化`。
- Markdown checkbox 行，如 `- [ ]`、`- [x]`。
- JSON key 或 value 命中待办关键词。
- 候选去重，单条展示最长 160 字，最多展示 5 条。

这些规则属于纯本地判断，不改变文件内容，不自动写入提示词库。

## 6. 敏感字段提醒

敏感字段命中后只做提醒和复制，不做自动删除：

- token、secret、apikey、api_key。
- authorization、password、passwd。
- accessKey、privateKey。
- 后续可扩展 phone、id_card、email 等个人信息，但 V1 不做误报高的 PII 扫描。

分享、保存到云端、转给 AI 处理前，如果 AI 阅读卡片存在敏感字段提醒，必须在对应流程再次提示用户确认。

## 7. 保存建议与转给 AI 处理

保存建议分三类：

| 建议 | 触发 | 默认动作 |
|---|---|---|
| 建议保留 | 有标题结构、提示词候选、prompt/config/API 字段 | 只展示建议，用户手动收藏或保存 |
| 谨慎处理 | 有敏感字段 | 不自动上传，分享和 AI 处理前二次确认 |
| 临时查看 | 结构弱、无候选、一次性响应 | 用户可读完关闭，不自动归档 |

“转给 AI 处理”在 V1 是设计入口，不接外部 AI 服务。V2 实现时必须遵守：

- 文件内容默认不上传。
- 用户主动点击“转给 AI 处理”才进入上传/调用流程。
- 上传前展示文件名、大小、敏感字段提醒、目标用途。
- 后端只存必要元数据，文件内容按用户选择保存或临时处理。
- AI 处理结果回到手机端后，仍可复制、转换、分享。

## 8. 状态与失败路径

| 状态 | 展示 |
|---|---|
| 空内容 | 摘要区显示暂无可分析内容 |
| 无效 JSON | 摘要区提示 JSON 无法解析，建议去编辑页格式化或修正 |
| 无提示词候选 | 提示词区显示暂未识别到明显提示词 |
| 无待办候选 | 待办区显示暂未识别到待办 |
| 命中敏感字段 | 敏感区展示字段路径，后续分享/AI 处理二次确认 |
| 长文档 | 只展示前若干候选与摘要，阅读主体仍由 Reader 承担 |
| 离线 | 卡片可用，因为 V1 是本地规则 |

## 9. 验收口径

- Markdown 文件能展示文件类型、摘要、标题/代码块提示、提示词候选、待办候选。
- JSON 文件能展示对象/数组摘要、主要字段、JSONPath 风格敏感字段提醒。
- 无效 JSON 不崩溃，并给出编辑修正建议。
- 所有候选项可复制，复制后有短反馈。
- 无外部网络、无云端登录时功能可用。
- 不默认上传文件、不自动读取剪贴板、不自动写云端。
