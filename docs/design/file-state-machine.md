# D4.3 文件状态机设计

## 1. 统一枚举

跨手机、桌面、CLI、云端、未来 MCP 的文件状态固定为：

```ts
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
```

中文显示：

| 状态 | 中文 | 含义 |
|---|---|---|
| `unprocessed` | 未处理 | 新进入收件箱，用户未打开或未操作 |
| `read` | 已阅读 | 用户打开并看到内容 |
| `copied` | 已复制 | 用户复制全文、片段、代码块、字段或提示词 |
| `edited` | 已编辑 | 用户保存编辑或保存副本 |
| `converted` | 已转换 | 生成转换结果 |
| `shared` | 已分享 | 通过系统分享面板或保存到目标位置 |
| `archived` | 已归档 | 从默认列表隐藏但未删除 |
| `synced` | 已同步 | 本地变更成功进入云端或本地模拟收件箱 |
| `conflict` | 冲突 | 多设备或多版本修改需要用户处理 |

当前手机端已在 `mobile/src/storage/recentDocs.ts` 落地该枚举和 `mergeDocumentStatuses`。

## 2. 状态是集合，不是单值

一个文件可以同时拥有多个状态：
- `read + copied`
- `edited + synced`
- `converted + shared`
- `synced + conflict`

规则：
- 新文档默认只有 `unprocessed`。
- 出现任何其他状态后，移除 `unprocessed`。
- 状态按固定顺序展示，避免每端排序不同。
- `archived` 不等于删除；删除由 `deletedAt` 或 sync tombstone 表达。

## 3. 状态转移

```text
unprocessed
  -> read
  -> copied
  -> edited
  -> converted
  -> shared
  -> synced
  -> conflict

任意状态 -> archived
conflict -> edited/synced
archived -> read/edited/copied/shared/synced
```

触发规则：

| 触发 | 新增状态 |
|---|---|
| 打开并渲染成功 | `read` |
| 复制全文/片段/字段/提示词 | `copied` |
| 保存编辑、保存副本、AI 结果确认保存 | `edited` |
| 转换成功 | `converted` |
| 分享成功或保存到目标位置 | `shared` |
| 本地/云端同步成功 | `synced` |
| 检测到多端版本冲突 | `conflict` |
| 用户归档 | `archived` |

## 4. 跨端映射

| 端 | 存储/输出 | 映射 |
|---|---|---|
| 手机 | `RecentDoc.statuses` | 状态集合源头 |
| 桌面 GUI | Reader/Convert 任务结果 | 读文件为 `read`，转换成功为 `converted` |
| CLI | `pull/read/push` JSON | `push` 后可标记 `synced`，`read` 后可标记 `read` |
| 云端 | `documents.status` + `sync_events` | 保存当前主状态，并用事件记录变化 |
| MCP | list/read/write 工具 | 复用 CLI/云端状态，不新增状态名 |

云端 `documents.status` 可存主状态；完整状态历史通过 `sync_events` 或客户端状态集合保存。

## 5. 冲突状态

进入 `conflict` 的场景：
- 基于旧版本保存编辑。
- AI 结果回流时源版本已更新。
- 删除与编辑同时发生。
- 同一文档两个设备离线后分别修改。

处理规则：
- 不删除本地版本。
- 不覆盖远端版本。
- 冲突项在最近文件、云端收件箱、资料库都可见。
- 用户解决后新增 `edited` 或 `synced`，保留历史 `conflictAt`。

## 6. 删除与归档

归档：
- 状态为 `archived`。
- 从默认列表隐藏。
- 搜索、全部列表和项目集合仍可找到。

删除：
- 不是状态机枚举。
- 用 `deletedAt`、`sync_events.delete` 和文件对象删除表达。
- 删除后 CLI `read` 不能继续返回旧内容。

## 7. 测试判定

状态机属于 TODO §20.2 必测范围。当前至少保留：
- `mergeDocumentStatuses` 默认补 `unprocessed`。
- 多状态时移除 `unprocessed`。
- 状态顺序稳定。
- 保存已有文档时合并新旧状态。

如果后续新增状态或改变转移规则，必须同步更新状态测试。

## 8. 验收口径

- 手机、桌面、CLI、云端、MCP 使用同一套状态枚举。
- UI 可展示多状态，不把状态误写成互斥单值。
- 删除不混入状态枚举。
- 冲突必须保留双方版本，不自动覆盖。
- `mobile/src/__tests__/recentDocs.test.ts` 继续通过。
