# AI 可读云端工作流

版本：v1  
日期：2026-07-03

## 一句话定位

墨览不只是 Markdown / JSON 阅读器，而是一个让散落文件进入 AI 工作流的中转站。

最终目标是：

**收集文件 → 筛选有用 → 转成 AI 可读格式 → 云端同步 → AI 调用 → 生成结果 → 回到手机 / 电脑继续使用。**

## 为什么要做云端

用户的真实设备场景是分裂的：

- 手机上从微信、QQ、文件管理器收到 Markdown / JSON。
- 电脑上写代码、跑脚本、调用 AI、处理 Office / PDF / PPT / Excel。
- GitHub、压缩包、本地项目里有大量 README、PRD、配置、提示词。
- 文件来回传输麻烦，复制粘贴也容易丢上下文。

所以云端的价值不是做网盘，而是把手机端和电脑端连接起来，让 AI 能稳定读取用户筛选过的资料。

## 产品原则

1. **本地优先**
   - 打开、阅读、编辑、复制、基础转换必须离线可用。
   - 云端不能成为阅读的前置条件。

2. **用户主动同步**
   - 不默认上传微信 / QQ / 本地文件。
   - 只有用户点“保存到云端”“设为有用资源”“转给 AI 处理”时才上传。

3. **AI 可读优先**
   - 云端存储不是为了堆文件，而是为了让 AI 可以读取、检索、引用、生产。
   - 核心格式优先收敛为 Markdown 和 JSON。

4. **手机收集，电脑生产**
   - 手机端负责快开、阅读、筛选、复制、分享。
   - 电脑端负责批量转换、脚本调用、AI 读取和生产。
   - 云端负责两端同步和上下文组织。

5. **不是云盘**
   - 不做完整网盘目录、共享空间、复杂权限、团队协作。
   - 只做 AI 文件资料库、提示词同步、历史记录和收件箱。

## 核心链路

### 手机到电脑

```text
微信 / QQ 收到 Markdown / JSON
  ↓
墨览打开并阅读
  ↓
AI 阅读卡片判断：有用内容 / 提示词 / 待办 / 敏感字段
  ↓
用户点击“保存到云端”或“转给 AI 处理”
  ↓
进入云端 AI 文件收件箱
  ↓
电脑端同步出现
  ↓
AI / CLI / Agent 读取并生产
```

### 电脑到手机

```text
电脑端 Word / PDF / PPT / Excel / GitHub 文档
  ↓
CLI 或桌面端批量转换成 Markdown
  ↓
保存到云端资料库或收件箱
  ↓
手机端同步看到
  ↓
阅读 / 复制 / 分享 / 收藏
```

### AI 生产闭环

```text
云端资料库
  ↓
AI 读取某个文件 / 文件夹 / 项目 / 提示词库
  ↓
生成代码、方案、总结、PRD、任务、脚本
  ↓
结果保存为 Markdown / JSON
  ↓
同步回手机和电脑
```

## 云端应该存什么

### V1.5：小数据同步

优先同步体积小、价值高、风险低的数据：

- 提示词库
  - 标题
  - 内容
  - 标签
  - 分组
  - 复制次数
  - 最近复制时间

- 最近文档记录
  - 文件名
  - 类型
  - 来源
  - 打开时间
  - 阅读位置
  - 是否收藏
  - 是否已复制
  - 是否已分享
  - 是否已转换

- 文件状态
  - 未处理
  - 已阅读
  - 已复制
  - 已分享
  - 已转换
  - 已归档

这一阶段可以只同步记录，不同步原始文件。

### V2：有用文件同步

用户主动标记后，再上传文件内容：

- 收藏的 Markdown / JSON
- 从 Office / PDF / PPT / Excel 转出的 Markdown
- GitHub 项目中的 README / PRD / 配置说明
- 用户确认有价值的提示词文件
- AI 生产后的结果文件

上传时必须提示：

- 是否包含敏感字段
- 是否只保存本地
- 是否保存到云端
- 是否允许 AI 读取

### V2.5：AI 任务同步

让电脑端或云端执行 AI 生产任务：

- 文件总结
- PRD 生成
- 代码上下文整理
- Office 转 Markdown 后清理
- JSON 配置解释
- 提示词抽取
- 转换质量评分

结果仍然保存为 Markdown / JSON，方便手机端阅读和分享。

## AI 如何读取

墨览应该提供三类 AI 读取入口。

### 1. CLI 入口

适合电脑端 AI / 脚本调用：

```bash
molan pull inbox
molan read <document-id>
molan convert ./docs --to md --json
molan push ./output --project my-project
```

CLI 输出必须结构化，方便 AI 判断下一步：

```json
{
  "ok": true,
  "documents": [
    {
      "id": "doc_001",
      "title": "项目 PRD",
      "format": "markdown",
      "path": "./output/project-prd.md",
      "status": "ready_for_ai"
    }
  ]
}
```

### 2. 本地 Agent / MCP 入口

适合 Codex、Claude Code、Cursor 等工具读取：

- 列出最近同步文件
- 读取某个文件内容
- 按项目读取资料包
- 搜索提示词
- 获取转换后的 Markdown
- 写回 AI 生成结果

这比手动复制文件更自然，AI 可以直接调用工具拿上下文。

### 3. 云端 API 入口

适合网站、自动化脚本、后续服务端 AI：

- 获取用户授权的文件
- 查询文件状态
- 上传转换结果
- 创建 AI 处理任务
- 返回生成结果

第一版 API 不做开放平台，只服务墨览自己的手机端、电脑端和 CLI。

## 推荐技术路线

### 后端

- Node.js + TypeScript
- Fastify 或 NestJS
- PostgreSQL
- Prisma 或 Drizzle
- 阿里云 OSS / 腾讯云 COS 存文件
- Redis / BullMQ 处理转换和 AI 任务队列

### 客户端

- 手机端：React Native / Expo + 本地 AsyncStorage，后续可加 SQLite
- 电脑端：Node.js + TypeScript CLI，Electron GUI 作为轻量操作界面
- 云同步：增量同步，不做实时协作

### 登录

国内优先：

- V1：手机号验证码
- V2：微信登录
- 管理后台：邮箱 / GitHub 登录可后置

## 数据模型草案

```text
users
devices
prompts
documents
document_versions
file_objects
collections
sync_events
conversion_jobs
ai_jobs
```

关键字段：

```text
id
userId
deviceId
contentHash
format
source
status
createdAt
updatedAt
deletedAt
version
```

文件内容和元数据分离：

- `documents` 存标题、格式、来源、状态、权限、当前版本。
- `document_versions` 存每次编辑或转换后的版本关系。
- `file_objects` 存 OSS / COS 路径、hash、大小、mimeType。

## 同步策略

同步不用一开始做复杂实时协作，只做增量同步：

```text
1. 本地记录 changedAt / deletedAt / version
2. App 启动、下拉刷新、切后台前触发同步
3. 先上传本地变更
4. 再拉取云端新变更
5. 冲突不覆盖，生成两个版本
```

冲突策略：

- 提示词：可按更新时间合并，也允许保留两个版本。
- 文档：不自动覆盖，保留副本。
- 转换结果：按输入 hash 和转换参数生成新版本。

## 阶段拆解

### 阶段 A：本地闭环

目标：没有云也能完成核心任务。

- 打开 Markdown / JSON
- 阅读
- 复制
- 编辑
- 当前文件转换
- 分享
- 最近文档
- 提示词库

### 阶段 B：提示词和记录同步

目标：手机和电脑先同步轻量数据。

- 登录
- 设备绑定
- 提示词库同步
- 最近文档记录同步
- 收藏状态同步
- 文件状态同步

### 阶段 C：AI 文件收件箱

目标：用户主动选择有用文件进入云端。

- 保存到云端
- 设为有用资源
- 云端文件列表
- 电脑端拉取
- 手机端查看电脑转换结果

### 阶段 D：AI 可读资料库

目标：让 AI 能按项目、文件夹、标签读取资料。

- 项目 / 集合
- 文档版本
- 转换后的 Markdown 管理
- CLI pull/read/push
- MCP 工具

### 阶段 E：AI 生产

目标：从“AI 能读取”走向“AI 能产出”。

- 生成总结
- 生成 PRD
- 生成代码上下文
- 生成提示词
- 清理转换结果
- 生成任务列表
- 结果同步回手机和电脑

## 当前裁定

1. 云端不是 V1 前置条件。
2. 云端第一步不做文件网盘，先做提示词库和文档记录同步。
3. 文件默认不上传，用户主动保存后才上传。
4. 手机端不承担重转换，电脑端负责 Office / PDF / PPT / Excel 转 Markdown。
5. AI 能读取的主入口优先做 CLI，其次做 MCP，最后做云端 API。
6. 最终产品目标从“阅读器”升级为“AI 文件工作流中转站”。

