# D6.4 云端设计冻结

## 1. 结论

云端 MVP 闭环、数据模型、隐私边界已经齐备，可作为 S7 后端启动前的设计基线。

S7 前仍不写真实后端代码；当前 CLI `push/pull/read` 本地模拟继续作为契约验证和离线 fallback。

## 2. 设计覆盖

| 主题 | 设计文档 |
|---|---|
| 云端 MVP 闭环 | `docs/design/cloud-mvp-loop.md` |
| 账号与设备 | `docs/design/cloud-account-device-system.md` |
| 同步策略 | `docs/design/cloud-sync-strategy.md` |
| AI 文件资料库 | `docs/design/ai-file-library.md` |
| 上传边界 | `docs/design/cloud-file-upload-boundary.md` |
| AI 读取入口 | `docs/design/ai-read-entrypoints.md` |
| AI 结果回流 | `docs/design/ai-result-return-flow.md` |
| 云端数据模型 | `docs/design/cloud-data-model.md` |
| API 草案 | `docs/design/cloud-api-draft.md` |
| 字段映射 | `docs/design/local-cloud-field-mapping.md` |

## 3. MVP 闭环

```text
手机主动保存 Markdown/JSON
  -> 云端收件箱记录
  -> 电脑 CLI pull
  -> 电脑 CLI read
  -> AI 使用内容
  -> AI 结果经用户确认 push/write back
  -> 同步回手机/电脑
```

MVP 不包含：
- 默认上传全部文件。
- 云盘。
- 团队空间。
- 公开分享。
- 内置通用 AI 聊天。

## 4. 数据模型冻结

固定 9 个概念：
- users
- devices
- prompts
- documents
- document_versions
- file_objects
- sync_events
- conversion_jobs
- ai_jobs

规则：
- 文件内容只进入 `file_objects`。
- 文档元数据在 `documents`。
- 历史版本在 `document_versions`。
- 增量同步在 `sync_events`。
- AI 结果回流为文档版本或新文档。

## 5. 隐私边界冻结

不可破坏的边界：
- 登录不等于上传。
- 收藏不等于上传。
- 加标签不等于上传。
- 加入集合不等于上传。
- 文件内容默认不上传。
- AI 读取默认关闭。
- 删除后 CLI/API 不能继续读旧内容。
- token、secret、password、api_key 等敏感命中只本地提醒，不写日志。

## 6. API 与 CLI 边界

真实云端 API 后置到 S7：
- auth
- sync
- documents
- prompts
- files
- conversion_jobs
- ai_jobs

CLI 继续优先：
- `molan pull --json`
- `molan read <id> --json`
- `molan push <file> --json`

后续真实云端接入只能向后扩展，不得破坏本地模拟和 JSON 必留字段。

## 7. S7 启动条件

进入后端实现前必须先完成：
- S7-BACKEND-001 后端技术选型。
- 本地运行方案。
- 数据库/对象存储选择。
- OpenAPI 或 TS interface 契约。
- 合同测试计划。
- 隐私与删除策略。

## 8. 验收口径

- 云端闭环能从手机保存走到 CLI/AI 读取和结果回流。
- 数据模型只使用 9 个固定概念。
- 隐私边界覆盖默认不上传、主动确认、敏感字段、删除撤回。
- API 草案存在，但 S7 前无后端实现。
- CLI 本地 `push/pull/read` 测试继续通过。
