# D4.6 本地/云端字段映射

## 1. 目标

手机、桌面、CLI、云端必须共享数据语义。字段可以因平台不同暂时命名不同，但必须能明确映射到统一概念，不能出现“同名不同义”或“同义多名无人负责”。

## 2. 文档字段

| 统一语义 | 手机本地 | 桌面/CLI | 云端 | 说明 |
|---|---|---|---|---|
| 文档 ID | `RecentDoc.id` | `CloudDocument.id` | `documents.id` | 本地可临时生成，云端用服务端 ID |
| 标题 | `title` | `title` | `documents.title` | 用户可编辑显示名 |
| 类型 | `kind` | `kind` | `documents.kind` | 手机当前 `markdown/json`，后续扩展 |
| 来源 | `source` | `sourcePath`/命令来源 | `documents.source` | CLI 不暴露隐私路径给 AI |
| 内容 | `content` | `storedPath` + `content` | `file_objects` | 云端内容不放 documents |
| 大小 | 待扩展 `size` | `size` | `file_objects.size` | 元数据可同步 |
| hash | 待扩展 `contentHash` | 待扩展 | `file_objects.sha256` | 幂等、去重、审计 |
| 状态 | `statuses[]` | JSON 扩展字段 | `documents.status` + `sync_events` | 状态机见 D4.3 |
| 更新时间 | `updatedAt` number | `updatedAt` ISO | `updatedAt` ISO | 跨端传输用 ISO，本地可用毫秒 |
| 云端文档 | 待扩展 `cloudDocumentId` | `id` | `documents.id` | 建立本地/云端关联 |

## 3. 提示词字段

| 统一语义 | 手机本地 | 云端 | 说明 |
|---|---|---|---|
| 提示词 ID | `PromptItem.id` | `prompts.id` | 本地和云端可不同，需 `cloudPromptId` 映射 |
| 标题 | `title` | `title` | 用户可编辑 |
| 内容 | `content` | `content` | 默认本地，开启后同步 |
| 格式 | `format` | `format` | `md/json/text` |
| 标签 | `tags` | `tags` | 本地去重 |
| 分组 | `folderId` | `folderId` | V1.5 使用 |
| 收藏 | 待扩展 `favorite` | `favorite` | 默认 false |
| 复制次数 | `copyCount` | `copyCount` | 同步时取服务端增量或累加事件 |
| 最近复制 | `lastCopiedAt` number | `lastCopiedAt` ISO | 展示用 |

## 4. 转换字段

| 统一语义 | 桌面 GUI | CLI | 云端 |
|---|---|---|---|
| 任务 ID | `ConvertTask.id` | 批次内可扩展 | `conversion_jobs.id` |
| 输入路径 | `inputPath` | `inputPath` | 不直接进入云端公开字段 |
| 文件名 | `fileName` | `fileName` | `inputName` |
| 输出格式 | `direction`/目标格式 | `--to` | `outputFormat` |
| 状态 | `pending/converting/success/failed` | `ok` | D4.4 状态 |
| 输出路径 | `outputPath` | `outputPath` | `outputFileObjectId`/本地路径扩展 |
| 错误码 | 待扩展 | `errorCode` | `errorCode` |
| 错误信息 | `error` | `error` | `error` |

迁移规则：
- 桌面 `converting` 映射为公共 `running`。
- CLI `ok=true` 映射为 `success`，`ok=false` 映射为 `failed`。
- CLI JSON 字段不可删除，只能扩展任务 ID、状态、hash 等字段。

## 5. 收件箱字段

| 统一语义 | CLI 本地模拟 | 云端收件箱 | AI 读取 |
|---|---|---|---|
| 条目 ID | `CloudDocument.id` | `documents.id` | `results[].id` |
| 标题 | `title` | `documents.title` | `results[].title` |
| 类型 | `kind` | `documents.kind` | `results[].kind` |
| 可读路径 | `storedPath` | `file_objects.storageKey` | `outputPath` 或云端路径 |
| 是否可读 | 当前默认 true | `readableByAi` + file object | `readable` 扩展 |
| 更新时间 | `updatedAt` | `documents.updatedAt` | `results[].updatedAt` |
| 内容 | `read` 读文件 | `/read` 返回 | `results[].content` |

## 6. 设置字段

| 统一语义 | 手机 | 桌面 | 云端 |
|---|---|---|---|
| 主题 | system theme | CSS vars/theme | 用户偏好可选 |
| 云同步 | 设置页开关 | 设置页/登录状态 | devices/users |
| 默认上传内容 | 固定 false | 固定 false | 不提供默认全量上传 |
| 默认 AI 可读 | 固定 false | 固定 false | `readableByAi=false` |
| 输出目录 | 不适用 | `lastOutputDir` | 不同步或仅设备级同步 |

## 7. 时间与 ID 规则

时间：
- 本地存储可继续用毫秒 number。
- API 和 CLI JSON 对外优先 ISO string。
- 文档必须说明单位，不能混用不标注。

ID：
- 本地 ID 用于离线与 UI。
- 云端 ID 用于跨设备。
- 同步时保留 `localId -> cloudId` 映射。
- 幂等写入使用 `clientMutationId`。

## 8. 验收口径

- D4.1 本地模型与 D4.2 云端模型每个关键字段都有映射。
- CLI JSON 对外字段 `ok/results/outputPath/errorCode/error` 保留。
- 文件内容字段只映射到本地内容或 `file_objects`，不塞进云端文档元数据。
- 时间单位明确，跨端 API 用 ISO。
- 默认上传和默认 AI 可读均为 false。
