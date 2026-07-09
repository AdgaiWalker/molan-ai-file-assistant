# D4.5 API 草案

## 1. 范围

本文只冻结 V2 云端 API 草案，不实现后端代码。真实开发从 S7-BACKEND-001 技术选型与接口设计开始。

API 设计原则：
- JSON over HTTPS。
- 本地优先，sync 异步。
- 文件内容默认不上传。
- 错误码与 CLI 尽量对齐。
- 所有写操作支持幂等。

## 2. 公共响应

```ts
interface ApiSuccess<T> {
  ok: true;
  data: T;
  requestId: string;
}

interface ApiFailure {
  ok: false;
  errorCode: string;
  error: string;
  requestId: string;
}
```

错误码示例：
- `E_AUTH_REQUIRED`
- `E_DEVICE_REVOKED`
- `E_DOCUMENT_NOT_FOUND`
- `E_DOCUMENT_NOT_READABLE`
- `E_CONFLICT`
- `E_FILE_TOO_LARGE`
- `E_RATE_LIMITED`
- `E_INTERNAL`

## 3. auth

```http
POST /v1/auth/otp/send
POST /v1/auth/otp/verify
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/me
```

关键请求：

```ts
interface VerifyOtpRequest {
  phoneNumber: string;
  code: string;
  device: {
    name: string;
    type: 'phone' | 'desktop' | 'cli' | 'web';
    platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
    appVersion: string;
  };
}
```

规则：
- 登录创建或恢复 device。
- logout 只清会话，不删除本地数据。
- refresh token 绑定 device。

## 4. sync

```http
POST /v1/sync/pull
POST /v1/sync/push
```

```ts
interface SyncPullRequest {
  deviceId: string;
  cursor?: string;
  limit: number;
}

interface SyncPushRequest {
  deviceId: string;
  mutations: Array<{
    clientMutationId: string;
    entityType: 'prompt' | 'document' | 'document_version' | 'file_object' | 'conversion_job' | 'ai_job';
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'restore' | 'upload_file' | 'mark_status';
    baseVersionId?: string;
    payload: Record<string, unknown>;
  }>;
}
```

规则：
- `clientMutationId` 幂等。
- 冲突返回 `E_CONFLICT` 和冲突详情，不覆盖。
- pull 返回 `sync_events`。

## 5. documents

```http
GET    /v1/documents
POST   /v1/documents
GET    /v1/documents/:id
PATCH  /v1/documents/:id
DELETE /v1/documents/:id
GET    /v1/documents/:id/read
POST   /v1/documents/:id/versions
GET    /v1/documents/:id/versions
POST   /v1/documents/:id/results
```

规则：
- 默认列表只返回元数据。
- `/read` 只有 `readableByAi=true` 且存在可读 file object 时返回内容。
- `DELETE` 写 tombstone，触发同步事件。
- `results` 用于 AI 结果回流，永不覆盖原版本。

## 6. prompts

```http
GET    /v1/prompts
POST   /v1/prompts
PATCH  /v1/prompts/:id
DELETE /v1/prompts/:id
POST   /v1/prompts/:id/copy
```

规则：
- 提示词同步由用户开启。
- copy 只更新复制计数和最近复制时间。
- 删除为软删除，便于多端同步。

## 7. files

```http
POST   /v1/files/upload-url
POST   /v1/files/complete
GET    /v1/files/:id/metadata
DELETE /v1/files/:id
```

规则：
- 文件对象与文档元数据分离。
- 上传前必须有用户确认。
- 删除文件对象后，相关文档可保留元数据但不可读内容。
- 服务端不记录文件内容日志。

## 8. conversion_jobs

```http
GET    /v1/conversion_jobs
POST   /v1/conversion_jobs
GET    /v1/conversion_jobs/:id
POST   /v1/conversion_jobs/:id/cancel
POST   /v1/conversion_jobs/:id/retry
```

规则：
- 状态使用 D4.4：`pending/running/success/failed/cancelled/shared/saved`。
- V1/V1.5 优先本地/桌面转换；云端转换后置。
- 输出结果回流为 `documents` 与 `document_versions`。

## 9. ai_jobs

```http
GET    /v1/ai_jobs
POST   /v1/ai_jobs
GET    /v1/ai_jobs/:id
POST   /v1/ai_jobs/:id/cancel
POST   /v1/ai_jobs/:id/results
```

规则：
- AI 任务默认只处理用户授权的文档。
- AI 结果必须经过用户确认后写入正式版本。
- 不把完整输入文件内容写入日志。

## 10. CLI 对齐

真实云端接入 CLI 时：
- `molan pull --json` 对齐 `GET /v1/documents` 或 `POST /v1/sync/pull`。
- `molan read <id> --json` 对齐 `GET /v1/documents/:id/read`。
- `molan push <file> --json` 对齐 `POST /v1/documents` + files 上传。
- CLI JSON 保留 `ok/results/outputPath/errorCode/error`。

## 11. 验收口径

- auth、sync、documents、prompts、files、conversion_jobs、ai_jobs 均有端点草案。
- 写接口有幂等依据。
- 文件上传与元数据分离。
- 删除、冲突、未授权读取有明确错误。
- S7 前不新增后端实现代码，只保持文档和 CLI 契约稳定。
