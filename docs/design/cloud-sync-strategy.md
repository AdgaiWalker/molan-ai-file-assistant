# D3.3 同步策略设计

## 1. 目标

同步策略必须保证：
- 本地阅读、编辑、复制、转换不被网络阻塞。
- 同一文件多设备修改时不覆盖、不丢失。
- 删除能跨设备生效，但保留可审计的删除事件。
- 离线一周后重新联网仍可增量恢复。

V2 前不写真实后端；当前 `molan push/pull/read` 仍使用本地模拟。本文用于 S7 后端与客户端同步队列实现。

## 2. 核心原则

| 原则 | 裁定 |
|---|---|
| 本地优先 | 客户端本地数据先落盘，再异步入队同步 |
| 增量同步 | 基于 `syncCursor`、`updatedAt`、`deletedAt` 拉取变更 |
| 幂等 | 每次本地变更带 `clientMutationId`，重复提交不产生重复版本 |
| 冲突保留 | 同一基础版本的多端修改生成 conflict，不自动覆盖 |
| 删除是状态 | 删除写 tombstone，同步到其他设备后隐藏或标记删除 |
| 文件内容显式上传 | 元数据可同步，文件内容必须由用户主动允许 |

## 3. 本地变更记录

```ts
interface LocalSyncMutation {
  id: string;
  clientMutationId: string;
  deviceId: string;
  entityType: 'prompt' | 'document' | 'document_version' | 'file_object' | 'conversion_job' | 'ai_job';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'upload_file' | 'mark_status';
  baseVersionId?: string;
  contentHash?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastErrorCode?: string;
}
```

入队规则：
- 用户动作完成后立即写本地数据，再写 mutation。
- 同一实体连续更新可在本地合并，但不能合并跨版本内容变更。
- `delete` 不直接物理删除云端记录，先生成墓碑。
- 文件对象上传失败不影响文档元数据同步；`fileObjectId` 可以暂为空。

## 4. 增量拉取

```ts
interface SyncPullRequest {
  deviceId: string;
  cursor?: string;
  limit: number;
}

interface SyncPullResponse {
  ok: true;
  cursor: string;
  events: SyncEvent[];
  hasMore: boolean;
}
```

拉取规则：
- 首次同步无 `cursor`，按用户维度拉取最近有效事件。
- 后续同步只拉取大于本地 `syncCursor` 的事件。
- 服务端按事件顺序返回，不要求客户端扫全表。
- `hasMore=true` 时客户端继续拉取，直到队列耗尽。

## 5. 推送顺序

同步循环顺序：

```text
加载本地 mutation 队列
  -> 推送待上传文件对象
  -> 推送文档/提示词/状态变更
  -> 拉取远端增量事件
  -> 合并到本地
  -> 更新 syncCursor 与 lastSyncAt
```

推送规则：
- 每个 mutation 单独提交，失败不阻塞后续可独立处理的 mutation。
- 同一实体同一版本的 mutation 必须保持顺序。
- 服务端返回已处理过的 `clientMutationId` 时，客户端视为成功。
- 网络错误使用退避重试；鉴权错误暂停队列并要求重新登录。

## 6. 冲突处理

冲突定义：
- 本地变更基于 `baseVersionId=A`。
- 服务端当前最新版本不是 `A`。
- 两边都修改了可见内容或关键元数据。

处理规则：
- 不覆盖远端最新版本。
- 生成新的本地/云端冲突版本，状态标记为 `conflict`。
- 移动端最近文档和云端收件箱都显示冲突。
- 用户可选择保留本机版本、保留远端版本、另存副本，后续再做自动合并。

```ts
interface SyncConflict {
  id: string;
  documentId: string;
  localVersionId: string;
  remoteVersionId: string;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'keep_local' | 'keep_remote' | 'save_copy' | 'manual_merge';
}
```

## 7. 删除与恢复

删除规则：
- 删除文档生成 `deletedAt` 和 `sync_events.delete`。
- 其他设备拉到删除事件后，从默认列表隐藏。
- 已上传文件对象进入待清理状态；短期保留用于撤销，超过保留期物理删除。
- `read` 删除项返回 `E_CLOUD_DOCUMENT_NOT_FOUND` 或等价错误，不能继续返回旧内容。

恢复规则：
- 未过保留期可恢复文档元数据与最近版本。
- 恢复生成新事件，不直接抹掉删除事件。

## 8. 离线队列 UI

移动端和桌面端显示三个层次：

| 状态 | 含义 | UI |
|---|---|---|
| 未同步 | 本地已有变更，未成功推送 | 小圆点或“待同步” |
| 同步中 | 队列正在处理 | 进度或旋转状态 |
| 同步失败 | 网络、鉴权、冲突或上传失败 | 可重试、查看原因 |

UI 不能因为同步失败阻塞阅读；只有用户尝试云端读取、跨设备恢复或分享云端链接时才展示阻断错误。

## 9. 验收口径

- 断网时本地编辑、保存副本、复制、转换继续可用，并生成待同步队列。
- 重复提交同一 `clientMutationId` 不产生重复文档或版本。
- 两台设备编辑同一文档时保留两份版本，并标记 `conflict`。
- 删除后其他设备默认列表不再显示该文档，AI `read` 不能读取旧内容。
- CLI JSON 契约继续保留 `ok/results/outputPath/errorCode/error`，同步字段只做向后扩展。
