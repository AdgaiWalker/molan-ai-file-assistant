# D2.6 AI 调用说明设计

## 1. 定位

电脑端 CLI 是 AI 读取资料的第一入口。Codex、Claude Code、Cursor、Hannes 等工具可以通过命令行：

- 把 Office / PDF / PPT / Excel / CSV 转成 Markdown。
- 读取本地 AI 文件收件箱里的 Markdown / JSON。
- 把 AI 生成结果写回本地收件箱，后续同步给手机。

优先级：CLI -> 本地 Agent / MCP -> 云端 API。

## 2. AI 调用原则

- 所有 AI 调用优先加 `--json`，便于解析。
- AI 只读取用户明确给出的文件、目录或收件箱 id。
- 不扫描全盘。
- 不读取 `config.json` 等 out-of-scope 文件。
- 文件内容默认不上传云端。
- 命令失败时先看 `errorCode/error`，不要猜。

## 3. 前置检查

AI 开始处理 Office/PDF/PPT/Excel 前，先运行：

```powershell
cd desktop/cli
npm run build
node dist/index.js check
```

判断：

- `ok=true`：可以继续转换。
- `ok=false`：提示用户安装或下载 pandoc，不继续批量转换。

## 4. 单文件转换给 AI 读

```powershell
node dist/index.js convert "D:\docs\需求.docx" --to md --out "D:\molan-out" --json
```

AI 读取 JSON：

```ts
if (result.ok && result.results[0].ok) {
  // 读取 result.results[0].outputPath 的 Markdown
} else {
  // 依据 errorCode/error 给用户下一步建议
}
```

成功后：

- 读取 `outputPath`。
- 摘要、提取需求、生成任务、改写文档。
- 若用户需要回到手机，执行 `push`。

## 5. 批量转换

目录：

```powershell
node dist/index.js convert "D:\project-docs" --batch --to md --out "D:\molan-out" --json
```

glob：

```powershell
node dist/index.js convert "D:\project-docs\**\*.docx" --batch --to md --out "D:\molan-out" --json
```

多文件：

```powershell
node dist/index.js convert "a.docx" "b.pdf" "c.pptx" --to md --out ".\out" --json
```

AI 处理策略：

- `success > 0`：先读取成功输出。
- `failed > 0`：列出失败文件、`errorCode`、`error`。
- 不因部分失败放弃全部结果。

## 6. 本地 AI 文件收件箱

### 6.1 列出文件

```powershell
node dist/index.js pull --json
```

输出为空时：

- `errorCode=E_CLOUD_EMPTY`。
- 提示用户先在手机保存到云端，或在电脑执行 `push`。

### 6.2 读取文件

```powershell
node dist/index.js read "<id或标题>" --json
```

成功时读取：

- `results[0].title`
- `results[0].kind`
- `results[0].content`

AI 可直接基于 `content` 做摘要、重写、任务拆解、提示词提取。

### 6.3 写回结果

AI 生成 Markdown / JSON 后，先写成本地文件，再 push：

```powershell
node dist/index.js push ".\out\ai-result.md" --title "AI 处理结果" --json
```

未来真实云端上线后，这条命令会成为“电脑结果回手机”的入口之一。

## 7. Codex 用法

推荐提示词：

```text
请用 molan CLI 处理这个 Office 文件：
1. 运行 check 确认转换环境。
2. 用 convert --json 转 Markdown。
3. 读取 outputPath，按 PRD/接口/待办结构总结。
4. 如果转换失败，只根据 errorCode/error 给下一步建议，不臆测内容。
```

适合任务：

- PRD 拆解。
- 代码上下文整理。
- 接口文档摘要。
- 测试计划生成。
- Office 转 Markdown 后继续编辑。

## 8. Claude Code 用法

Claude Code 可把 `molan` 当作外部命令：

```bash
node desktop/cli/dist/index.js convert ./docs --batch --to md --out ./out --json
```

处理建议：

- 只把成功输出的 Markdown 加入上下文。
- 失败项用列表反馈给用户。
- 大量输出时分文件读取，不一次塞满上下文。
- 若用户要求同步给手机，再调用 `push`。

## 9. Cursor 用法

Cursor 适合在项目根目录中处理资料：

```bash
node desktop/cli/dist/index.js convert "./docs/**/*" --batch --to md --out "./.molan/out" --json
```

推荐流程：

1. 将项目中的 docx/pdf/pptx/xlsx/csv 转成 Markdown。
2. 让 Cursor 读取 `.molan/out` 中的 Markdown。
3. 生成 README、任务清单、接口说明或代码注释。
4. 将重要结果 `push` 到本地 AI 文件收件箱。

## 10. 错误处理模板

| errorCode | AI 应答 |
|---|---|
| `E_PANDOC_MISSING` | “当前电脑找不到 pandoc，请先运行下载脚本或设置 PANDOC_PATH。” |
| `E_UNSUPPORTED_FORMAT` | “这个文件格式暂不支持，请改用 docx/pdf/pptx/xlsx/csv/md/json。” |
| `E_INPUT_NOT_FOUND` | “输入路径不存在，请确认文件路径。” |
| `E_CONVERT_FAILED` | “转换引擎返回失败，建议查看文件是否加密、损坏或为扫描件。” |
| `E_OUTPUT_FAILED` | “输出目录不可写或磁盘异常，请换输出目录。” |
| `E_CLOUD_EMPTY` | “本地 AI 文件收件箱为空。” |
| `E_CLOUD_DOCUMENT_NOT_FOUND` | “没有找到这个 id 或标题。” |

## 11. 安全边界

- AI 不应主动读取 `config.json`。
- AI 不应把本地绝对路径发到外部服务。
- AI 不应自动上传转换结果；`push` 也只是本地模拟，未来真实云端必须用户确认。
- 敏感文件转换前，应先询问用户是否确认。
- 转换日志可记录路径、hash、错误，不记录文件正文。

## 12. 验收口径

- 文档包含 Codex / Claude Code / Cursor 三类调用流程。
- 文档中的命令均使用现有 CLI 命令。
- AI 消费 JSON 时以 `ok/results/outputPath/errorCode/error` 为准。
- 写回结果使用 `push --json`，不绕过 CLI 契约。
