# D3.7 AI 生产结果回流设计

## 1. 目标

AI 生成的结果必须能回到墨览，而不是停留在聊天窗口里。回流对象限定为：
- Markdown 文档。
- JSON 结构化结果。
- 针对原文档的新版本。
- 新建资料库条目。

V2 前优先通过 CLI `molan push` 模拟；真实云端后再接云端 API 和 MCP `write_result`。

## 2. 回流入口

| 入口 | 阶段 | 用途 |
|---|---|---|
| CLI `molan push <file> --json` | 当前/V2 | AI 把本地结果文件写入收件箱 |
| CLI `molan push --stdin --title ... --json` | V2 | AI 直接写入生成内容 |
| MCP `write_result` | V2 后段 | 本地 Agent 工具化写回 |
| 云端 API `POST /documents/:id/results` | V2/V3 | 网页、团队、第三方集成 |

所有入口都需要用户确认；AI 不能静默覆盖原文档。

## 3. 结果类型

```ts
type AiResultKind = 'markdown' | 'json';

interface AiGeneratedResult {
  id: string;
  sourceDocumentId?: string;
  sourceVersionId?: string;
  title: string;
  kind: AiResultKind;
  content: string;
  promptId?: string;
  promptTextHash?: string;
  modelName?: string;
  createdBy: 'cli' | 'mcp' | 'cloud_api';
  createdAt: string;
}
```

规则：
- Markdown 结果保存为 `.md`。
- JSON 结果保存前必须能 `JSON.parse`，失败则只能作为 Markdown 或纯文本草稿保存。
- `promptTextHash` 记录提示词来源，不保存完整敏感提示词到云端日志。
- `modelName` 可选，用于用户理解来源，不作为权限判断。

## 4. 保存为版本

当结果基于已有文档时，默认保存为新版本：

```ts
interface DocumentVersionFromAi {
  id: string;
  documentId: string;
  parentVersionId?: string;
  kind: 'original' | 'edit' | 'conversion' | 'ai_result';
  title: string;
  contentHash: string;
  fileObjectId?: string;
  createdByDeviceId: string;
  createdBySource: 'cli' | 'mcp' | 'cloud_api';
  createdAt: string;
}
```

版本规则：
- 永不覆盖原版本。
- 原文档保留“AI 结果”版本历史入口。
- 用户可以将 AI 结果另存为新文档。
- 若原文档已被其他设备更新，结果保存为冲突候选或独立副本。

## 5. 保存为新文档

适用场景：
- AI 汇总多个文件。
- AI 生成新的 PRD、清单、测试报告。
- AI 输出与原文档没有一对一关系。

新文档规则：
- 来源标记为 `ai_result`。
- 可加入集合、标签、收藏。
- 默认不允许继续给 AI 读取，除非用户确认。
- 可同步回手机、桌面和 CLI 收件箱。

## 6. 用户确认

确认页展示：

| 项 | 说明 |
|---|---|
| 标题 | 可编辑 |
| 类型 | Markdown / JSON |
| 来源 | CLI / MCP / 云端 API |
| 基于文件 | 原文件标题和版本 |
| 保存方式 | 新版本 / 新文档 / 草稿 |
| AI 可读 | 默认关闭 |
| 云端上传 | 默认遵循 D3.5 上传边界 |

用户确认前：
- 不写云端正式版本。
- 不覆盖本地原文件。
- 可以保存在本机临时草稿中。

## 7. 同步回手机与电脑

回流后的同步路径：

```text
AI 生成结果
  -> 用户确认保存
  -> 生成 document_version 或新 document
  -> 写 sync_event
  -> 手机/桌面/CLI pull 增量拉取
  -> 最近文件/资料库展示为 AI 结果
```

状态映射：
- 新结果：`unprocessed`
- 用户打开：`read`
- 用户复制：`copied`
- 用户编辑：`edited`
- 同步成功：`synced`
- 基于旧版本保存失败：`conflict`

## 8. 冲突与失败

| 场景 | 处理 |
|---|---|
| 原文档已更新 | 保存为冲突候选或新副本 |
| JSON 校验失败 | 不写 JSON 版本，提示保存为 Markdown 草稿 |
| 上传文件对象失败 | 先保存元数据和本地草稿，稍后重试 |
| 用户取消确认 | 丢弃临时云端写入，只保留本地草稿 |
| 设备被撤销 | 返回鉴权错误，本地文件仍可保存 |

## 9. 验收口径

- AI 生成 Markdown/JSON 后，可以通过 CLI 写回本地收件箱。
- JSON 结果必须校验通过才保存为 JSON 类型。
- 保存为版本不会覆盖原文档。
- 多设备更新时保留冲突，不自动覆盖。
- 手机、桌面、CLI 都能在后续同步中看到 AI 结果条目。
- 回流仍遵守 D3.5：不默认上传内容，不默认允许 AI 再读取。
