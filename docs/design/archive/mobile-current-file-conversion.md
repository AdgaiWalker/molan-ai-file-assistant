# 手机端当前文件转换流程设计

版本：v1  
日期：2026-07-04  
对应任务：D1.8  
依据：`mobile/src/components/ConvertSheet.tsx`、`mobile/src/converter/fileConvert.ts`、`docs/design/mobile-share-flow.md`

## 1. 转换定位

阅读页只服务当前文件转换，不做批量队列。批量转换中心归 V1.5。

```text
当前文件
  -> 选择输出用途 / 格式
  -> 本地轻转换
  -> 生成临时文件或载入 Markdown
  -> 成功后直接分享 / 阅读
```

## 2. 设计范围

实现参考：`mobile/src/components/ConvertSheet.tsx`、`mobile/src/converter/fileConvert.ts`。

## 3. 转换入口

```text
阅读页底部操作栏
  -> 点击“转换”
  -> ConvertSheet
  -> 根据 kind=markdown/json 展示动作文案
```

入口规则：

- Markdown 文件默认展示：Word、PDF、导出 `.md`、选择 Word -> Markdown。
- JSON 文件默认展示：JSON -> Word、JSON -> PDF、JSON -> Markdown 并分享、分享原 `.json`、JSON -> Markdown 并阅读。
- 转换动作执行时禁用其他转换按钮，避免重复任务。

## 4. 转换流程

### 4.1 Markdown -> PDF

```text
Markdown content
  -> marked.parse 转 HTML
  -> 注入日 / 夜主题样式
  -> Print.printToFileAsync
  -> Sharing.shareAsync(pdf)
  -> onConverted(shared=true)
```

### 4.2 Markdown -> Word

```text
Markdown content
  -> mdToDocxBytes
  -> 写 cache/title.docx
  -> Sharing.shareAsync(docx)
  -> onConverted(shared=true)
```

### 4.3 JSON -> Markdown

```text
JSON raw
  -> JSON.parse
  -> jsonValueToMarkdown
  -> # title + markdown body
  -> 写 .md 分享 或载入 Reader
```

JSON 解析失败时：

```text
# title

JSON 解析失败，以下为原始内容：

```json
raw
```
```

保留原始内容，不丢数据。

### 4.4 JSON -> PDF / Word

```text
JSON raw
  -> jsonToMarkdown
  -> PDF / Word 转换
  -> 分享
```

产品裁定：

- V1 只把 JSON -> Markdown 作为强制完成定义。
- JSON -> PDF / Word 已有基础能力，但质量验收放到 V1.5。

## 5. 状态与失败表

| 状态 | 触发 | UI | 后续动作 |
|---|---|---|---|
| 空闲 | 打开 ConvertSheet | 展示转换动作 | 选择格式 |
| 转换中 | 点击动作 | busy=true，按钮 disabled，ActivityIndicator | 等待 |
| 转换成功 | 生成 outputPath | 显示“已生成 ...” | 自动调起分享或载入阅读 |
| 分享成功 | shareAsync 返回 | 记录 converted/shared | 继续阅读 |
| 分享不可用 | Sharing unavailable | 显示“当前环境不支持系统分享” | 可保留文件路径 |
| 转换失败 | converter 返回 ok=false | 显示“转换失败 / 导出失败：error” | 可重试 |
| 用户取消选择 Word | DocumentPicker canceled | 关闭 busy | 返回 |
| Word 导入成功 | docx -> md | 载入 Reader | 记录 converted/read |

## 6. 输出命名与位置

| 输出 | 命名 | 位置 |
|---|---|---|
| PDF | Expo Print URI | cache |
| Word | `${safeFileName(title)}.docx` | cache |
| Markdown | `${safeFileName(title)}.md` | cache |
| JSON | `${safeFileName(title)}.json` | cache |

文件名必须过滤 `\ / : * ? " < > |`。

## 7. 转换配方

| 用户目的 | 推荐动作 | 文案 |
|---|---|---|
| 给别人看 | PDF | 适合办公查看和微信/QQ 转发 |
| 给别人继续编辑 | Word | 适合发给别人继续编辑 |
| 给 AI 读取 | Markdown | 适合给 AI 或懂 Markdown 的人继续处理 |
| 给开发 / 配置 | JSON 原文件 | 保留结构化数据，不做格式转换 |
| 自己继续阅读 | JSON -> Markdown 并阅读 | 转为文档视图，方便继续阅读和复制 |

## 8. 验收脚本

| 编号 | 输入 | 动作 | 通过标准 | 证据 |
|---|---|---|---|---|
| C1 | Markdown | 导出 PDF | 生成 PDF 并打开分享面板 | 输出文件 + 录屏 |
| C2 | Markdown | 当前文档 -> Word | 生成 docx 并打开分享面板 | 输出文件 + 录屏 |
| C3 | Markdown | 导出 `.md` | 分享面板可见 `.md` | 输出文件 |
| C4 | JSON | JSON -> Markdown 并分享 | Markdown 可读 | 输出文件 |
| C5 | JSON | JSON -> Markdown 并阅读 | Reader 显示转换结果 | 录屏 |
| C6 | JSON | 分享原 `.json` | 保留原内容 | 输出文件 |
| C7 | 非法 JSON | JSON -> Markdown | 输出含原始 JSON fenced block | 输出文件 |
| C8 | Word | 选择 Word -> Markdown | 载入阅读页 | 样例 + 录屏 |

## 9. 待实现 / 待验收差距

| 项目 | 当前状态 | 后续任务 |
|---|---|---|
| 转换模块懒加载 | ConvertSheet 静态 import 转换模块 | S1-CONV-005 |
| JSON -> PDF / Word 质量 | 已能生成，但规则质量待验收 | S1-CONV-006 / 007 或 S6 |
| 转换耗时记录 | 未记录具体耗时 | S1-PERF-006 |
| 输出保存目录 | 依赖系统分享面板 | S1-SHARE / S4 |
| 转换任务状态机 | 组件内 busy/msg | D4.4 |

## 10. D1.8 关闭标准

- 已覆盖 Markdown -> PDF / Word。
- 已覆盖 JSON -> Markdown / PDF / Word。
- 已覆盖转换中、失败、成功后分享。
- 已明确 V1 与 V1.5 的 JSON 办公格式质量边界。
- 已列出验收脚本和后续差距。
