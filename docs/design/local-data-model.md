# D4.1 本地数据模型设计

## 1. 范围

本地数据模型覆盖 V1/V1.5/V2 客户端本地落盘对象：
- `DocumentRecord`
- `PromptItem`
- `CopyEvent`
- `ConversionJob`
- `InboxItem`
- `Settings`

当前已落地基础：
- 手机 `mobile/src/storage/recentDocs.ts`：`RecentDoc`、`DocumentStatus`。
- 手机 `mobile/src/storage/prompts.ts`：`PromptItem`。
- 桌面 `desktop/src/shared/ipc.ts`：`ConvertTask`、`ReadableFile`。
- CLI `desktop/cli/src/index.ts`：本地云收件箱 `CloudDocument`。

本文是后续统一类型的目标形态，不要求一次性迁移已有存储；涉及真实代码时按垂直切片逐步替换。

## 2. DocumentRecord

```ts
type DocumentKind = 'markdown' | 'json' | 'converted' | 'office_source';
type DocumentSource = 'wechat' | 'qq' | 'fileManager' | 'documentPicker' | 'desktop' | 'cli' | 'recent' | 'other';
type DocumentStatus =
  | 'unprocessed'
  | 'read'
  | 'copied'
  | 'edited'
  | 'converted'
  | 'shared'
  | 'archived'
  | 'synced'
  | 'conflict';

interface DocumentRecord {
  id: string;
  title: string;
  kind: DocumentKind;
  source: DocumentSource;
  content?: string;
  localUri?: string;
  localPath?: string;
  size?: number;
  contentHash?: string;
  statuses: DocumentStatus[];
  createdAt: number;
  updatedAt: number;
  readAt?: number;
  lastCopiedAt?: number;
  lastEditedAt?: number;
  lastConvertedAt?: number;
  lastSharedAt?: number;
  archivedAt?: number;
  syncedAt?: number;
  conflictAt?: number;
  cloudDocumentId?: string;
  cloudVersionId?: string;
}
```

映射到当前实现：
- `RecentDoc.kind` 当前只有 `markdown/json`，后续转换结果扩展为 `converted`。
- `RecentDoc.content` 保留 V1 快速打开；大文件后续可改为 `localUri/localPath`。
- `DocumentStatus` 已在手机端落地，D4.3 负责统一状态机。

## 3. PromptItem

```ts
type PromptFormat = 'md' | 'json' | 'text';

interface PromptItem {
  id: string;
  title: string;
  content: string;
  format: PromptFormat;
  tags: string[];
  folderId?: string;
  favorite?: boolean;
  copyCount: number;
  lastCopiedAt?: number;
  createdAt: number;
  updatedAt?: number;
  cloudPromptId?: string;
  syncedAt?: number;
}
```

映射到当前实现：
- 手机 `PromptItem` 已有 `id/title/content/format/tags/folderId/copyCount/lastCopiedAt/createdAt`。
- `favorite/updatedAt/cloudPromptId/syncedAt` 是 V1.5/V2 扩展字段。
- 提示词内容仍默认本地，不因登录自动上传。

## 4. CopyEvent

```ts
interface CopyEvent {
  id: string;
  sourceType: 'document' | 'prompt' | 'json_field' | 'code_block' | 'selection';
  sourceId?: string;
  documentId?: string;
  promptId?: string;
  label?: string;
  textHash: string;
  copiedAt: number;
  targetApp?: 'wechat' | 'qq' | 'ai_app' | 'other';
}
```

规则：
- 不默认保存完整复制文本，只保存 hash、来源和时间。
- 用户选择“加入提示词库”时，才把文本作为 `PromptItem.content` 保存。
- 最近复制列表优先从 `PromptItem.lastCopiedAt` 和显式 CopyEvent 聚合。

## 5. ConversionJob

```ts
type ConversionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'shared' | 'saved';

interface ConversionJob {
  id: string;
  inputDocumentId?: string;
  inputPath?: string;
  inputName: string;
  inputKind: DocumentKind;
  outputFormat: 'md' | 'json' | 'pdf' | 'docx';
  status: ConversionStatus;
  outputPath?: string;
  outputDocumentId?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  sharedAt?: number;
  savedAt?: number;
}
```

映射到当前实现：
- 桌面 `ConvertTask.status` 当前是 `pending/converting/success/failed`，D4.4 统一为 `pending/running/success/failed/cancelled/shared/saved`。
- CLI `ConvertResult` 是对外输出契约，不直接等同本地任务，但字段可映射。
- 手机转换中心按同一状态机展示。

## 6. InboxItem

```ts
interface InboxItem {
  id: string;
  title: string;
  kind: DocumentKind | 'prompt';
  source: 'mobile' | 'desktop' | 'cli' | 'cloud';
  sourceDeviceId?: string;
  documentId?: string;
  promptId?: string;
  outputPath?: string;
  readableByAi: boolean;
  status: DocumentStatus;
  createdAt: number;
  updatedAt: number;
}
```

映射到当前实现：
- CLI 本地 `CloudDocument` 可映射为 `InboxItem + DocumentRecord`。
- `outputPath` 是 CLI/桌面可读路径；手机端优先使用 `localUri`。
- `readableByAi` 由 D3.5 上传授权决定，不由收藏或登录隐式打开。

## 7. Settings

```ts
interface Settings {
  themeMode: 'system' | 'light' | 'dark';
  cloudSyncEnabled: boolean;
  uploadContentByDefault: false;
  allowAiReadByDefault: false;
  defaultConversionOutput: 'md' | 'pdf' | 'docx';
  lastOutputDir?: string;
  safeAreaDebug?: boolean;
  updatedAt: number;
}
```

规则：
- `uploadContentByDefault` 和 `allowAiReadByDefault` 固定为 `false`，不提供“默认上传所有文件”开关。
- 桌面输出目录记忆归入 Settings。
- 手机 safe-area 调试只用于验收，不出现在普通用户主流程。

## 8. 验收口径

- 本地文档、提示词、复制、转换、收件箱、设置都有明确模型。
- 现有手机、桌面、CLI 类型都能映射到本文目标模型。
- 文件状态与 D4.3 共用，不新增状态命名。
- 转换状态与 D4.4 共用，不用 `converting` 作为跨端状态。
- 任何本地模型字段都不能暗示默认上传文件内容。
