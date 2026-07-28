# D3.6 AI 读取入口设计

## 1. 入口优先级

| 优先级 | 入口 | 阶段 | 裁定 |
|---|---|---|---|
| 1 | CLI | 当前 / 阶段 E | 首选入口，当前已有本地模拟，后续接真实同步数据 |
| 2 | MCP | 阶段 E | 给本地 Agent 暴露标准工具，不早于 CLI 契约稳定后 |
| 3 | 云端 API | 后续 | 给网页、团队空间、第三方集成使用，必须在权限模型稳定后 |

原因：
- CLI 最容易被 Codex / Claude Code / Cursor / 本地脚本调用。
- CLI JSON 契约已经有测试保护。
- MCP 和云 API 会扩大攻击面，必须等文件上传边界与账号设备体系稳定。

## 2. CLI 入口

当前命令：

```bash
molan check
molan convert <file> --json
molan pull --json
molan read <id-or-title> --json
molan push <file> --json
```

AI 读取流程：
1. `molan check` 确认本地依赖。
2. `molan pull --json` 列出可读资料。
3. 根据 `results[].id`、`title`、`kind`、`readable` 选择文件。
4. `molan read <id> --json` 获取内容。
5. 生成结果后，经用户确认再 `molan push` 回流。

必须保留字段：
- `ok`
- `results`
- `outputPath`
- `errorCode`
- `error`

可向后扩展字段：
- `source`
- `sourceDeviceName`
- `readable`
- `contentHash`
- `tags`
- `collectionIds`
- `permission`
- `nextAction`

## 3. CLI 错误策略

| 错误 | code | 说明 |
|---|---|---|
| 没有可读内容 | `E_CLOUD_DOCUMENT_NOT_READABLE` | 只有元数据或未授权 AI 读取 |
| 文档不存在 | `E_CLOUD_DOCUMENT_NOT_FOUND` | 已删除、id 错误或无权限 |
| 未登录 | `E_CLOUD_AUTH_REQUIRED` | 真实云端阶段需要登录 |
| 设备撤销 | `E_CLOUD_DEVICE_REVOKED` | 当前设备 token 失效 |
| 同步冲突 | `E_CLOUD_CONFLICT` | 结果回流前需要用户选择 |

错误返回仍必须是可解析 JSON，不把堆栈作为主要输出。

## 4. MCP 入口

MCP 工具后置到 CLI 契约稳定后，最小工具集合：

| 工具 | 输入 | 输出 |
|---|---|---|
| `list_documents` | filter/tag/collection/status | 文档元数据列表 |
| `read_document` | documentId | 授权内容 |
| `search_prompts` | query/tag | 提示词列表 |
| `write_result` | draftId/title/content/format/resultType/saveMode/confirmed | 草稿、确认后的新版本或独立文档 |

MCP 规则：
- 不绕过 CLI/云端权限模型。
- 不暴露未授权文件内容。
- 不默认列出本机全部文件。
- 错误码与 CLI 对齐。

## 5. 云端 API 入口

云端 API 后置，原因：
- 需要账号、设备、同步、上传边界全部稳定。
- 需要服务端鉴权、审计、限流、删除能力。
- 需要明确第三方 AI 是否能读取内容。

最小 API：

```http
GET /v1/documents
GET /v1/documents/:id/read
POST /v1/documents/:id/results
```

API 默认返回元数据；读取内容需要：
1. 用户已登录。
2. 设备/客户端未撤销。
3. 文档存在。
4. 文件内容已上传。
5. `readableByAi=true`。

## 6. 安全边界

- AI 入口不能读取 `config.json` 或任何 out-of-scope 文件。
- AI 入口不能通过本地路径遍历读取任意文件。
- AI 入口只读取用户通过 CLI 参数、资料库或云端收件箱授权的文件。
- 文件内容不写入日志。
- 读取事件写入 `sync_events` 或未来审计日志：谁、何时、通过哪个入口读取。

## 7. 验收口径

- 当前阶段 AI 能通过 CLI 本地模拟完成 `push -> pull -> read`。
- 后续真实云端只扩展字段，不破坏现有 JSON 字段。
- MCP 工具设计与 CLI 错误码一致，不新增另一套语义。
- 云端 API 读取内容必须经过文件上传边界与 AI 可读授权。
- 任何入口都不能默认读取用户本地全部文件或未授权内容。
