# D2.5 电脑端与云端收件箱交互设计

## 1. 定位

电脑端与云端收件箱的目标是打通这条链路：

```text
手机保存有用文件
  -> 云端 AI 文件收件箱
  -> 电脑 CLI / GUI 拉取
  -> 本地 AI / Agent 读取
  -> 电脑转换或 AI 生产结果
  -> 上传回云端
  -> 手机继续阅读 / 复制 / 分享
```

当前没有真实后端；`molan push/pull/read` 是本地文件系统模拟，存储在 `~/.molan/cloud/` 或 `MOLAN_CLOUD_DIR`。S7 前不得写真实后端代码，只保持 JSON 契约稳定。

## 2. 阶段划分

| 阶段 | 能力 | 实现 |
|---|---|---|
| 现在 / S2 | 本地 AI 文件收件箱 | CLI `push/pull/read` 读写本地目录 |
| S3/S6 | GUI 展示本地收件箱入口 | 调 CLI 或共享本地收件箱模块 |
| S7 | 真实云端收件箱 | Node.js + TypeScript 后端，先设计 API 再实现 |
| S7+ | MCP / Agent 读取 | 复用同一数据模型和 CLI JSON 契约 |

## 3. 手机保存到云端

手机端动作：

| 入口 | 行为 |
|---|---|
| AI 阅读卡片“保存到云端” | 保存为有用文件 |
| AI 阅读卡片“转给 AI 处理” | 保存并创建 AI 任务 |
| 最近文档 / 收件箱 | 标记收藏、有用资源、同步 |
| 转换完成页 | 保存转换结果 |

上传前确认：

- 文件名。
- 类型：Markdown / JSON / 转换结果。
- 文件大小。
- 敏感字段提醒。
- 云端可见性：只同步记录 / 上传文件内容 / 允许 AI 读取。

默认行为：

- 不默认上传。
- 不默认允许 AI 读取。
- 云同步未开启时，按钮进入说明和登录/开启流程。

## 4. 电脑端拉取手机保存文件

### 4.1 CLI

当前本地模拟：

```bash
molan pull --json
molan read <idOrTitle> --json
```

未来真实云端：

```bash
molan pull --source cloud --json
molan read <document-id> --json
```

输出仍保持：

- `ok`
- `results`
- `outputPath`
- `errorCode`
- `error`

云端扩展字段：

```ts
interface CloudInboxItem {
  id: string;
  title: string;
  kind: 'markdown' | 'json' | 'text' | 'converted';
  status: 'unprocessed' | 'read' | 'copied' | 'edited' | 'converted' | 'shared' | 'archived' | 'synced' | 'conflict';
  sourceDeviceId: string;
  sourceDeviceName: string;
  updatedAt: string;
  contentHash?: string;
  hasFileObject: boolean;
  outputPath?: string;
}
```

### 4.2 GUI

桌面 GUI 后续增加“收件箱”入口：

| 区块 | 内容 |
|---|---|
| 收件箱列表 | 手机保存文件、电脑转换结果、AI 生成结果 |
| 筛选 | 未处理、已同步、已转换、冲突 |
| 动作 | 拉取、读取、打开本地输出、转换、上传结果 |
| 状态 | 本地模拟 / 云端已连接 / 离线 |

GUI 不直接发散成另一套协议；优先复用 CLI 或共享 sync 模块。

## 5. 上传转换结果

电脑端转换完成后，用户可主动上传结果。

入口：

- CLI：`molan push ./out/report.md --title "report.md" --json`。
- GUI：转换成功项“保存到云端”。
- 快贴窗轻量转换入口：“保存转换结果到云端”。

上传内容：

| 数据 | 是否上传 | 说明 |
|---|---|---|
| 转换后 Markdown | 用户主动确认后上传 | AI 可读主内容 |
| 原始 Office/PDF/PPT/Excel | 默认不上传 | 仅用户选择备份原件时上传 |
| 转换日志 JSON | 可上传元数据 | 不含文件正文 |
| hash/size/mime | 上传 | 幂等、去重、验证 |
| 本地绝对路径 | 默认不上传或脱敏 | 避免泄露用户名/目录 |

幂等规则：

- 同一 `inputSha256 + outputFormat + converterVersion` 生成同一个转换版本。
- 重复 push 不应产生重复文档；真实云端按 contentHash / clientMutationId 去重。

## 6. 打开本地输出

电脑端必须保留纯本地闭环：

| 动作 | 行为 |
|---|---|
| 打开输出目录 | `shell.openPath(outputDir)` |
| 打开单项输出 | 打开所在目录或系统默认应用 |
| 预览 Markdown | 载入 GUI 阅读页 |
| 复制 Markdown | 写入系统剪贴板 |
| 上传云端 | 另行确认，不是打开输出的一部分 |

无云端账号时，转换和打开输出仍完全可用。

## 7. 状态映射

| 手机 / 云端状态 | 电脑端展示 |
|---|---|
| 未处理 | 收件箱新文件 |
| 已阅读 | 已被手机读过 |
| 已复制 | 有复制价值 |
| 已编辑 | 可能有新版本 |
| 已转换 | 可查看转换版本 |
| 已分享 | 已对外发出 |
| 已归档 | 默认隐藏 |
| 已同步 | 本地和云端一致 |
| 冲突 | 保留两个版本，用户选择 |

电脑端读取或转换不能直接覆盖手机版本；只能生成新版本或新转换结果。

## 8. 失败路径

| 场景 | 处理 |
|---|---|
| 本地收件箱为空 | `E_CLOUD_EMPTY`，提示先 push 或手机保存 |
| 文档不存在 | `E_CLOUD_DOCUMENT_NOT_FOUND` |
| 云端未登录 | GUI 显示未连接，CLI 返回认证错误 |
| 离线 | 展示本地缓存，上传进入待同步 |
| 文件已删除 | 保留墓碑状态，不返回旧内容 |
| 冲突 | 保留两个版本，不自动覆盖 |
| 上传失败 | 本地结果仍可打开，重试上传 |

## 9. 隐私边界

- 文件内容默认不上传。
- 手机保存到云端、电脑上传结果都必须是用户主动动作。
- 转给 AI 处理前再次确认敏感字段。
- 后端存元数据和 file_objects 指针，文件对象单独存储。
- 删除云端文件应删除记录和文件对象引用。
- 日志不上传文件正文。

## 10. 验收口径

- 当前 `cloud.test.ts` 保持 `push -> pull -> read --json` 本地闭环。
- D3/S7 真实云端实现前，不改 CLI JSON 基础字段。
- 电脑端无云账号时仍能转换、打开本地输出、使用本地收件箱。
- 上传转换结果必须用户确认，不能转换后自动上传。
