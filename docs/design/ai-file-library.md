# D3.4 AI 文件资料库设计

## 1. 定位

AI 文件资料库不是云盘，也不是完整知识库。它只管理用户主动保存、愿意被跨设备找回或给 AI 读取的资料。

核心目标：
- 用户能把“有用文件”从最近文件中沉淀出来。
- AI 能通过 CLI 优先读取被授权的 Markdown / JSON。
- 手机、桌面、CLI 对收藏、标签、状态的理解一致。

## 2. 信息架构

```text
AI 文件资料库
  - 收件箱：来自手机/桌面/CLI 的主动保存记录
  - 收藏：用户标记的重要资料
  - 项目/集合：按任务或主题组织资料
  - 标签：跨集合的轻量分类
  - 状态：未处理、已阅读、已复制、已编辑、已转换、已分享、已归档、已同步、冲突
```

导航优先级：
1. 收件箱：默认视图，解决“刚保存的去哪了”。
2. 收藏：解决“常用资料快速找回”。
3. 项目/集合：解决“围绕某个任务交给 AI”。
4. 标签：解决“横向筛选”。

## 3. 资料条目

```ts
interface LibraryDocument {
  id: string;
  title: string;
  kind: 'markdown' | 'json' | 'converted' | 'office_source' | 'prompt';
  source: 'mobile' | 'desktop' | 'cli' | 'import';
  sourceDeviceId: string;
  favorite: boolean;
  collectionIds: string[];
  tags: string[];
  status: 'unprocessed' | 'read' | 'copied' | 'edited' | 'converted' | 'shared' | 'archived' | 'synced' | 'conflict';
  readableByAi: boolean;
  fileObjectId?: string;
  contentHash?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  lastReadByAiAt?: string;
}
```

规则：
- `fileObjectId` 为空时只同步元数据，AI 不能读取内容。
- `readableByAi=false` 时 CLI `read` 必须返回未授权错误或不可读提示。
- `status` 使用 TODO §19.1 的统一文件状态，不另造一套资料库状态。
- `office_source` 只代表原始 Office 文件记录，不表示手机端能重转换。

## 4. 收藏

收藏是个人级布尔标记：
- 任何资料条目都可收藏。
- 收藏不改变文件内容、不触发上传。
- 收藏项默认排在列表前，但仍受权限与本地/云端可见性约束。
- AI 默认不因收藏获得读取权限，仍需 `readableByAi=true` 且有内容对象。

## 5. 项目与集合

```ts
interface LibraryCollection {
  id: string;
  name: string;
  description?: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}
```

集合规则：
- 一个资料可属于多个集合。
- 集合只是组织层，不复制文件对象。
- 归档集合不删除资料，只从默认集合列表隐藏。
- V3 团队空间前，集合只属于个人。

## 6. 标签

标签规则：
- 标签是小写文本，显示可保留中文。
- 同一资料标签去重。
- 标签可由用户手动添加，也可由本地规则建议。
- AI 自动标签只能作为建议，用户确认后写入。

常见标签：
- `prd`
- `api`
- `review`
- `prompt`
- `meeting`
- `todo`
- `json`

## 7. 列表筛选

资料库需要支持以下筛选：

| 筛选 | 说明 |
|---|---|
| 类型 | Markdown / JSON / 转换结果 / 原始 Office / 提示词 |
| 来源 | 手机 / 桌面 GUI / CLI / 导入 |
| 状态 | 统一文件状态 |
| 收藏 | 只看收藏 |
| 集合 | 只看某项目 |
| 标签 | 多标签交集 |
| AI 可读 | 只看可被 CLI read 的资料 |

搜索范围：
- 标题
- 标签
- 集合名
- 摘要
- 已授权上传的 Markdown / JSON 内容

## 8. AI 读取边界

CLI 优先入口：

```bash
molan pull --json
molan read <document-id> --json
```

未来可扩展：

```bash
molan pull --tag prd --collection "墨览" --json
molan read <document-id> --json
```

AI 能看到：
- id
- title
- kind
- tags
- collection names
- status
- readable
- content when authorized

AI 不能看到：
- 未授权上传的文件内容
- 用户手机号
- 其他设备 token
- 本地路径中包含的隐私目录细节

## 9. 验收口径

- 最近文件可被标记为有用资源并进入资料库。
- 资料可收藏、加入集合、添加标签、按状态筛选。
- `readableByAi=false` 或无 `fileObjectId` 时，AI 读取失败但列表仍可展示元数据。
- 文件状态与手机最近文档、云端收件箱、CLI 输出保持同一套枚举。
- 资料库不会扫描并上传全部本地文件，只接收用户主动保存的条目。
