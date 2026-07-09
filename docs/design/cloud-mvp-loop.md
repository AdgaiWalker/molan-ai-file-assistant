# D3.1 云端 MVP 闭环设计

## 1. 目标

云端 MVP 只证明一条最小闭环：

```text
手机端用户主动保存 Markdown / JSON
  -> 云端生成收件箱记录
  -> 电脑 CLI pull 列出
  -> 电脑 CLI read 读取
  -> AI 使用内容
```

它不是云盘，不做公开分享，不做团队空间，不默认上传所有最近文件。

## 2. MVP 范围

| 包含 | 不包含 |
|---|---|
| 手机主动保存到云端 | 后台自动上传 |
| Markdown / JSON 文件 | Office 原件默认上传 |
| 提示词和最近文档记录 | 全量文件同步 |
| 电脑 CLI `pull/read` | 复杂 GUI 云盘 |
| 用户删除/撤回 | 团队权限 |
| 元数据 + 可选文件对象 | 默认 AI 读取 |

MVP 的唯一成功标准：用户在手机保存一份有用文件后，电脑端 AI 能通过 CLI 读取到内容。

## 3. 手机端保存

入口：

- AI 阅读卡片“保存到云端”。
- 最近文档 / 收件箱“设为有用资源”。
- 转换结果“保存到云端”。

上传前确认项：

| 项 | 说明 |
|---|---|
| 文件名 | 用户可改标题 |
| 类型 | markdown / json / converted |
| 大小 | 超阈值提示 |
| 敏感字段 | token/secret/key/password 命中提醒 |
| 可见性 | 只同步记录 / 上传文件内容 / 允许 AI 读取 |

默认：

- 云同步关闭。
- 文件内容不上传。
- AI 读取权限关闭。

## 4. 云端收件箱记录

MVP 至少存：

```ts
interface CloudMvpInboxItem {
  id: string;
  userId: string;
  deviceId: string;
  title: string;
  kind: 'markdown' | 'json' | 'converted';
  status: 'unprocessed' | 'synced';
  contentHash?: string;
  fileObjectId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

如果用户只同步记录、不上传文件内容：

- `fileObjectId` 为空。
- CLI pull 能看到记录。
- CLI read 返回需要用户授权上传或当前设备不可读的错误。

## 5. 电脑 CLI 拉取

MVP 命令保持：

```bash
molan pull --json
molan read <document-id> --json
```

真实云端上线后可扩展：

```bash
molan pull --source cloud --json
molan read <document-id> --source cloud --json
```

但不能破坏现有本地模拟。

CLI pull 返回：

- id
- title
- kind
- status
- updatedAt
- outputPath 或 cloud path
- 是否可读：`readable: true/false`

## 6. AI 读取

AI 读取步骤：

1. 执行 `molan pull --json`。
2. 选择 `readable=true` 的文档。
3. 执行 `molan read <id> --json`。
4. 使用 `results[0].content`。
5. 生成结果后，用户确认再 `molan push` 或云端 API 写回。

AI 不能：

- 绕过用户授权读文件。
- 批量读取全部文件内容。
- 默认把内容上传到第三方服务。

## 7. 删除与撤回

MVP 必须支持：

- 删除云端记录。
- 删除云端文件对象。
- 其他设备同步后隐藏被删除项。

删除后：

- `pull` 不再返回正常记录，或返回 `deleted` 墓碑用于同步。
- `read` 返回 `E_CLOUD_DOCUMENT_NOT_FOUND` 或云端等价错误。

## 8. 本地模拟到真实云端迁移

当前本地模拟：

- index：`~/.molan/cloud/index.json`
- documents：`~/.molan/cloud/documents/`
- 测试环境：`MOLAN_CLOUD_DIR`

迁移原则：

- 本地模拟继续可用，作为离线 fallback 和测试夹具。
- 真实云端新增 `--source cloud` 或登录态默认源前，先更新契约测试。
- `cloud.test.ts` 保持本地 roundtrip。

## 9. 验收口径

- 手机端保存动作必须是用户主动触发。
- 电脑 CLI 能列出云端收件箱并读取授权内容。
- 文件内容默认不上传，AI 读取默认关闭。
- 删除后电脑端不能继续读取旧云端内容。
- S7 前用本地 `push -> pull -> read` 测试模拟闭环。
