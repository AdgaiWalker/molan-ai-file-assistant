# D2.1 CLI 命令体系设计

## 1. 定位

`molan` CLI 是电脑端最稳定的 AI / Agent 入口：

- 把 Office / PDF / PPT / Excel / CSV 转成 Markdown。
- 输出结构化 JSON，方便 Codex、Claude Code、Cursor、脚本读取。
- 在真实后端上线前，用本地 AI 文件收件箱模拟 `push/pull/read` 云端闭环。

实现入口：`desktop/cli/src/index.ts`。转换引擎必须继续调用 `desktop/src/shared/converter.ts`。

## 2. 命令总览

| 命令 | 目标 | 当前状态 | 是否外部契约 |
|---|---|---|---|
| `molan convert [inputs...]` | 转换文件，默认输出 Markdown | 已实现 | 是 |
| `molan check` | 检查 pandoc / Node / 平台 / 支持格式 | 已实现 | 是 |
| `molan push <file>` | 保存本地文件到 AI 文件收件箱 | 已实现，本地模拟云端 | 是 |
| `molan pull` | 列出 AI 文件收件箱 | 已实现，本地模拟云端 | 是 |
| `molan read <idOrTitle>` | 读取 AI 文件收件箱文档内容 | 已实现，本地模拟云端 | 是 |
| `molan write-result [file]` | 写入 AI 结果草稿，或在显式确认下落成正式结果 | 已实现，真实同步收件箱 | 是 |
| `molan confirm-result <draftId>` | 确认一份待处理 AI 结果草稿 | 已实现，真实同步收件箱 | 是 |
| `molan discard-result <draftId>` | 取消一份待处理 AI 结果草稿 | 已实现，真实同步收件箱 | 是 |

公共规则：

- 成功退出码为 `0`。
- 失败退出码为 `1`。
- `--json` 输出必须是可解析 JSON，不能混入普通日志。
- 非 `--json` 输出面向人读，可以包含中文说明。
- 新字段只能向后扩展，不能改名或删除现有字段。

## 3. JSON 公共结构

### 3.1 批量/列表结构

```ts
interface CliSummary<T = CliResult> {
  ok: boolean;
  total?: number;
  success?: number;
  failed?: number;
  errorCode?: string;
  error?: string;
  results: T[];
}
```

### 3.2 转换结果

```ts
interface CliConvertResult {
  inputPath: string;
  fileName: string;
  ok: boolean;
  outputPath?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];
}
```

### 3.3 收件箱结果

```ts
interface CliInboxResult {
  ok: boolean;
  id: string;
  title: string;
  kind: string;
  outputPath: string;
  updatedAt: string;
  content?: string;
}
```

必须保留字段：

- 顶层：`ok`、`results`、`errorCode`、`error`。
- 结果项：`ok`、`outputPath`。
- 转换结果项：`inputPath`、`fileName`、`warnings`。
- `read --json` 结果项：`content`。

## 4. `molan convert`

### 4.1 参数

```bash
molan convert [inputs...] --to <format> --out <dir> --batch --concurrency <n> --json
```

| 参数 | 默认 | 说明 |
|---|---|---|
| `inputs` | 无 | 文件、多个文件、glob 或目录 |
| `--to <format>` | `md` | 输出格式：`md`、`json`、`docx`、`pdf`；底层类型也允许 `pptx/xlsx/csv` 但不主推 |
| `--out <dir>` | `.` | 输出目录，不存在时创建 |
| `--batch` | false | 启用批量模式；多个 inputs 自动视为批量 |
| `--concurrency <n>` | `4` | 批量并发数 |
| `--json` | false | 输出 JSON 到 stdout |

### 4.2 输入展开

- 单文件：直接转换。
- 多文件：批量转换。
- glob：仅在 batch 模式展开。
- 目录：展开目录下所有文件。
- 不支持格式会被过滤；若全部不支持，命令失败。

### 4.3 输出示例

```json
{
  "ok": true,
  "total": 1,
  "success": 1,
  "failed": 0,
  "results": [
    {
      "inputPath": "D:/docs/demo.docx",
      "fileName": "demo.docx",
      "ok": true,
      "outputPath": "D:/out/demo.md",
      "warnings": []
    }
  ]
}
```

### 4.4 退出码

| 场景 | `ok` | exit |
|---|---|---:|
| 全部成功 | true | 0 |
| 部分失败 | false | 1 |
| 全部失败 | false | 1 |
| 无输入 | false | 1 |
| 无支持格式 | false | 1 |

批量转换必须失败隔离：单个文件失败不能阻断其他文件继续转换。

## 5. `molan check`

```bash
molan check
```

输出始终为 JSON：

```ts
interface CliCheckResult {
  ok: boolean;
  pandocPath?: string;
  nodeVersion?: string;
  platform?: NodeJS.Platform;
  supportedFormats?: string[];
  error?: string;
}
```

退出码：

- `0`：pandoc 可用或路径存在。
- `1`：pandoc 缺失或检查异常。

后续扩展可加入 `pandocVersion`、`pandocSha256`，但不能移除现有字段。

## 6. `molan push`

```bash
molan push <file> --title <title> --json
```

作用：把本地 Markdown / JSON / 文本文件保存到本地 AI 文件收件箱。当前存储位置：

- 默认：`~/.molan/cloud/`
- 测试/自定义：`MOLAN_CLOUD_DIR`

参数：

| 参数 | 默认 | 说明 |
|---|---|---|
| `file` | 必填 | 本地文件路径 |
| `--title` | 文件名 | 收件箱标题 |
| `--json` | false | 输出 JSON |

失败：

- 文件不存在：`E_INPUT_NOT_FOUND`。
- 写入失败：`E_CLOUD_WRITE_FAILED`。

## 7. `molan pull`

```bash
molan pull --json
```

作用：列出本地 AI 文件收件箱，供 AI/Agent 选择后调用 `read`。

空收件箱：

```json
{
  "ok": false,
  "errorCode": "E_CLOUD_EMPTY",
  "error": "AI 文件收件箱为空",
  "results": []
}
```

当前空收件箱 exit 为 `1`；后续如果产品需要把“空”视作成功，必须先更新本契约和测试。

## 8. `molan read`

```bash
molan read <idOrTitle> --json
```

匹配方式：

- `id`
- `title`
- `storedPath`

## 9. `molan write-result`

```bash
molan write-result [file] --stdin --title <title> --format <markdown|json> \
  --result-type <summary|report|structured_json|new_document|revision> \
  --save-mode <draft|new_document|new_version> \
  --document <idOrTitle> --version <id> --artifact <id> \
  --request-id <id> --confirm --json
```

作用：

- 把 AI 生成内容先写成草稿；
- 显式 `--confirm` 时直接落成新版本或独立结果文档；
- `save-mode=new_version` 使用来源版本做冲突保护；
- `--request-id` 用于幂等重放，重复请求返回同一份草稿。

失败：

- 缺少输入：`E_AI_RESULT_INPUT_REQUIRED`
- 非法 JSON：`E_AI_RESULT_JSON_INVALID`
- 来源版本已漂移：`E_AI_RESULT_SOURCE_CONFLICT`

示例返回：

```json
{
  "ok": true,
  "confirmed": false,
  "draftId": "draft_lxyz1234",
  "saveMode": "new_version",
  "title": "项目周报摘要",
  "sourceDocumentId": "doc_xxx",
  "sourceVersionId": "ver_xxx",
  "results": [
    {
      "ok": true,
      "draftId": "draft_lxyz1234",
      "confirmed": false,
      "saveMode": "new_version",
      "title": "项目周报摘要"
    }
  ]
}
```

## 10. `molan confirm-result`

```bash
molan confirm-result <draftId> --source synced --sync-root <dir> --json
```

作用：对一份待处理 AI 结果草稿执行显式确认，并写成新版本或独立文档。

失败：

- 草稿不存在：`E_AI_RESULT_DRAFT_NOT_FOUND`
- 来源版本已漂移：`E_AI_RESULT_SOURCE_CONFLICT`
- 草稿仍是 `saveMode=draft`：`E_AI_RESULT_CONFIRM_NOT_ALLOWED`

## 11. `molan discard-result`

```bash
molan discard-result <draftId> --source synced --sync-root <dir> --json
```

作用：取消待确认草稿，后续确认必须失败。

成功时 `results[0].content` 返回文件内容。非 JSON 模式直接打印内容。

失败：

- 找不到文档或文件丢失：`E_CLOUD_DOCUMENT_NOT_FOUND`。

## 9. 错误码

| 错误码 | 来源 | 含义 |
|---|---|---|
| `E_PANDOC_MISSING` | converter | 无法启动 pandoc |
| `E_UNSUPPORTED_FORMAT` | converter / cli | 文件格式不支持 |
| `E_INPUT_NOT_FOUND` | converter / cli | 输入文件不存在或无输入 |
| `E_CONVERT_FAILED` | converter | pandoc 或专用格式解析器转换失败 |
| `E_OUTPUT_FAILED` | converter | 写输出失败 |
| `E_CLOUD_EMPTY` | cli cloud | 本地 AI 文件收件箱为空 |
| `E_CLOUD_DOCUMENT_NOT_FOUND` | cli cloud | 收件箱文档不存在 |
| `E_CLOUD_WRITE_FAILED` | cli cloud | 本地收件箱写入失败 |

错误输出必须同时包含：

- `ok: false`
- `errorCode`
- `error`
- `results: []`

`check` 的异常输出当前只有 `ok/error`，后续实现可补 `errorCode`，但需要保持旧字段。

## 10. 后续扩展字段

允许扩展：

- `hash` / `sha256`
- `durationMs`
- `readabilityScore`
- `aiNextActions`
- `pandocVersion`
- `pandocSha256`
- `schemaVersion`

禁止破坏：

- 不把 `results` 改名为 `items`。
- 不把 `outputPath` 改名为 `path`。
- 不把 `errorCode` 改名为 `code`。
- 不把 `ok` 改成只用 exit code 表示。

## 11. 验收口径

- `npm run typecheck && npm run build && npm test` 通过。
- `cloud.test.ts` 覆盖 `push -> pull -> read --json`。
- 后续 CLI JSON 改动必须新增或更新契约测试。
- Pandoc 转换 smoke test 由 D2.2 / S2 转换任务补真实 fixture。
