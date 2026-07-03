# 手机端最近文档与文件收件箱设计

版本：v1  
日期：2026-07-04  
对应任务：D1.10  
依据：`mobile/src/components/RecentSheet.tsx`、`mobile/src/storage/recentDocs.ts`、`docs/design/information-architecture.md`

## 1. 定位

最近文档解决“回到刚打开 / 刚复制 / 刚编辑的文件”。文件收件箱解决“散落文件是否处理过、是否值得保留、是否同步”的状态管理。

```text
外部文件进入墨览
  -> 最近文档记录
  -> 文件状态更新
  -> 用户阅读 / 复制 / 编辑 / 转换 / 分享
  -> 收件箱按状态筛选
  -> V2 用户主动同步到云端
```

## 2. 当前能力基线

| 能力 | 当前实现 | 证据 |
|---|---|---|
| 最近文档列表 | `RecentSheet` | `RecentSheet.tsx` |
| 标题 / 类型 | `RecentDoc.title/kind` | `recentDocs.ts` |
| 来源记录 | `DocSource` | `recentDocs.ts` |
| 状态记录 | `DocumentStatus` | `recentDocs.ts` |
| 最近动作时间 | `lastCopiedAt/lastEditedAt/...` | `recentDocs.ts` |
| 搜索 | 标题 / 来源 / 类型 / 状态 | `RecentSheet.tsx` |
| 删除记录 | 长按移除 | `RecentSheet.tsx` |
| 状态合并测试 | `mergeDocumentStatuses` | `recentDocs.test.ts` |
| 归档 / 同步 / 冲突字段 | 数据层已有 | `DocumentStatus` |

## 3. 数据结构

当前 `RecentDoc` 已覆盖 V1 主体：

```ts
interface RecentDoc {
  id: string;
  title: string;
  kind: 'markdown' | 'json';
  content: string;
  updatedAt: number;
  source?: DocSource;
  statuses?: DocumentStatus[];
  readAt?: number;
  lastEditedAt?: number;
  lastCopiedAt?: number;
  lastConvertedAt?: number;
  lastSharedAt?: number;
  archivedAt?: number;
  syncedAt?: number;
  conflictAt?: number;
}
```

后续需要扩展：

```ts
favorite?: boolean;
lastScrollOffset?: number;
cloudState?: 'localOnly' | 'metadataSynced' | 'fileUploaded';
sourceAppVersion?: string;
```

## 4. 状态机

| 状态 | 触发 | UI 标签 | 进入收件箱意义 |
|---|---|---|---|
| 未处理 | 新文件进入但未阅读 | 未处理 | 待筛选 |
| 已阅读 | 正文成功展示 | 已阅读 | 已看过 |
| 已复制 | 全文 / 代码 / 字段 / 提示词复制 | 已复制 | 已产生价值 |
| 已编辑 | 保存更改或副本 | 已编辑 | 有用户产物 |
| 已转换 | PDF / Word / Markdown 输出 | 已转换 | 可办公分享或 AI 读取 |
| 已分享 | 系统分享面板成功调起 | 已分享 | 社交 / 办公闭环 |
| 已归档 | 用户主动归档 | 已归档 | 收件箱降噪 |
| 已同步 | 云端同步成功 | 已同步 | 可跨设备恢复 |
| 冲突 | 多端版本冲突 | 冲突 | 需要处理 |

`unprocessed` 一旦有其他状态必须移除，保持现有 `mergeDocumentStatuses` 规则。

## 5. 页面结构

```text
最近文档 / 收件箱
  顶部
    标题
    搜索
  筛选
    全部
    未处理
    已阅读
    已复制
    已编辑
    已转换
    已分享
    已归档
    已同步
    冲突
  列表项
    标题
    来源
    类型
    最近动作
    状态标签
    收藏 / 云端标识
    更多菜单
```

V1 可以保持 Sheet；V1.5 / V2 可升级为独立收件箱页面。

## 6. 收藏、归档、云端标识

| 能力 | 设计 | 阶段 |
|---|---|---|
| 收藏 | 列表项星标，收藏文件在首页和收件箱置顶 | V1.5 |
| 归档 | 更多菜单“归档”，默认筛选隐藏归档 | V1.5 |
| 云端标识 | 本地 / 已同步记录 / 已上传文件三态 | V2 |
| 冲突标识 | 红色状态标签，进入冲突处理 | V2 |
| 项目 / 集合 | 文件归入 AI 文件资料库 | V2 |

## 7. 搜索与筛选

V1 当前搜索：

- 标题
- 来源
- 类型
- 状态

V1.5 增强：

- 按收藏筛选。
- 按归档筛选。
- 按最近动作筛选。
- 按标签 / 项目筛选。

V2 增强：

- 云端收件箱搜索。
- 全文搜索。
- 语义搜索。

## 8. 操作菜单

| 操作 | V1 | V1.5 / V2 |
|---|---|---|
| 打开 | 已实现 | 保持 |
| 移除记录 | 长按移除 | 改为更多菜单 |
| 收藏 | 待补 | V1.5 |
| 归档 | 数据层已有，UI 待补 | V1.5 |
| 分享 | 从阅读页操作 | 列表快捷分享可后补 |
| 保存到云端 | 待补 | V2 |
| 删除云端数据 | 待补 | V2 |
| 解决冲突 | 待补 | V2 |

## 9. 空态与错误态

| 状态 | UI |
|---|---|
| 无最近文档 | “打开过的文档会出现在这里。” |
| 搜索无结果 | “没有找到匹配文档。” |
| 仅归档文档 | 默认空态提示可查看归档 |
| 云同步失败 | 状态标签“同步失败”，可重试 |
| 冲突 | 状态标签“冲突”，提示保留两个版本 |

## 10. D1.10 关闭标准

- 已覆盖本地来源、类型、状态、最近动作和搜索。
- 已设计收藏。
- 已设计归档。
- 已设计云端标识。
- 已设计文件收件箱完整结构。
- 已明确本地最近文档和 V2 云端收件箱关系。
