# D4.2 云端数据模型设计

## 1. 固定概念

云端只使用 TODO §19.1 的 9 个数据概念：

1. `users`
2. `devices`
3. `prompts`
4. `documents`
5. `document_versions`
6. `file_objects`
7. `sync_events`
8. `conversion_jobs`
9. `ai_jobs`

后端、手机、桌面、CLI 不允许各自再定义平行概念。需要扩展时只能在这些概念内增加字段或关系。

## 2. users

```ts
interface CloudUser {
  id: string;
  phoneNumber: string;
  displayName?: string;
  avatarUrl?: string;
  status: 'active' | 'disabled' | 'deleting' | 'deleted';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

规则：
- 手机号只用于登录和找回。
- 删除账号进入 `deleting`，清理完成后 `deleted`。
- AI 读取入口不返回手机号。

## 3. devices

```ts
interface CloudDevice {
  id: string;
  userId: string;
  name: string;
  type: 'phone' | 'desktop' | 'cli' | 'web';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
  appVersion: string;
  trusted: boolean;
  lastSeenAt: string;
  lastSyncAt?: string;
  syncCursor?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}
```

规则：
- 设备是 sync 与审计的主体。
- 撤销设备后 token 失效，不能继续 `pull/read/push`。

## 4. prompts

```ts
interface CloudPrompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  format: 'md' | 'json' | 'text';
  tags: string[];
  folderId?: string;
  favorite: boolean;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

规则：
- 提示词同步由用户开启。
- 团队提示词在 V3 通过 workspace 扩展，不在个人模型里混入权限字段。

## 5. documents

```ts
interface CloudDocument {
  id: string;
  userId: string;
  title: string;
  kind: 'markdown' | 'json' | 'converted' | 'office_source' | 'prompt';
  source: 'mobile' | 'desktop' | 'cli' | 'import';
  sourceDeviceId: string;
  favorite: boolean;
  collectionIds: string[];
  tags: string[];
  status: 'unprocessed' | 'read' | 'copied' | 'edited' | 'converted' | 'shared' | 'archived' | 'synced' | 'conflict';
  latestVersionId?: string;
  readableByAi: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

规则：
- `documents` 是资料条目的元数据。
- 文件内容不放在 `documents` 表，必须通过 `document_versions` + `file_objects` 引用。
- `readableByAi` 默认 false。

## 6. document_versions

```ts
interface CloudDocumentVersion {
  id: string;
  documentId: string;
  userId: string;
  parentVersionId?: string;
  kind: 'original' | 'edit' | 'conversion' | 'ai_result';
  title: string;
  fileObjectId?: string;
  contentHash?: string;
  createdByDeviceId: string;
  createdBySource: 'mobile' | 'desktop' | 'cli' | 'mcp' | 'cloud_api';
  createdAt: string;
  deletedAt?: string;
}
```

规则：
- 新编辑、新转换、AI 回流都生成新版本。
- 冲突保留为多个版本，不覆盖。
- 只同步元数据时 `fileObjectId` 可为空。

## 7. file_objects

```ts
interface CloudFileObject {
  id: string;
  userId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  encrypted: boolean;
  createdAt: string;
  deletedAt?: string;
}
```

规则：
- 文件对象存储内容，DB 只保存指针和摘要。
- 删除文档不立即要求删除所有对象，但用户删除文件对象后 `read` 不能返回内容。
- 文件内容不写日志。

## 8. sync_events

```ts
interface CloudSyncEvent {
  id: string;
  userId: string;
  deviceId: string;
  entityType: 'prompt' | 'document' | 'document_version' | 'file_object' | 'conversion_job' | 'ai_job';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'upload_file' | 'mark_status';
  clientMutationId?: string;
  version: number;
  createdAt: string;
}
```

规则：
- 客户端通过 `sync_events` 增量拉取。
- `clientMutationId` 保证幂等。
- 删除用事件和 `deletedAt` 表达。

## 9. conversion_jobs

```ts
interface CloudConversionJob {
  id: string;
  userId: string;
  deviceId: string;
  inputDocumentId?: string;
  inputFileObjectId?: string;
  outputDocumentId?: string;
  outputFileObjectId?: string;
  outputFormat: 'md' | 'json' | 'pdf' | 'docx';
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'shared' | 'saved';
  errorCode?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}
```

规则：
- V1/V1.5 转换仍优先本地/桌面执行；云端转换是后续增强。
- 状态与 D4.4 保持一致。

## 10. ai_jobs

```ts
interface CloudAiJob {
  id: string;
  userId: string;
  deviceId: string;
  inputDocumentIds: string[];
  outputDocumentId?: string;
  promptId?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'saved';
  modelName?: string;
  errorCode?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}
```

规则：
- AI 任务只记录必要元数据，不记录完整文件内容到日志。
- AI 结果回流为 `documents` + `document_versions`。

## 11. 关系总览

```text
users 1 -> n devices
users 1 -> n prompts
users 1 -> n documents
documents 1 -> n document_versions
document_versions n -> 0..1 file_objects
users 1 -> n sync_events
documents 1 -> n conversion_jobs
documents n -> n ai_jobs
```

## 12. 验收口径

- 云端模型只包含 9 个固定概念，不新增平行表述。
- 文件内容通过 `file_objects` 管理，不放进 `documents`。
- 同步通过 `sync_events` 增量驱动。
- 转换任务和 AI 任务都能回流到文档版本。
- 默认不上传文件内容，默认不允许 AI 读取。
