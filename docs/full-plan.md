# 全量方案：墨览 AI 文件与提示词助手

版本：v2  
依据：[PRD.md](../PRD.md)、[TODO.md](../TODO.md)、[distribution.md](distribution.md)、[market-research.md](market-research.md)、[AI 可读云端工作流](ai-readable-cloud-workflow.md)  
市场：国内优先  
总体目标：**把散落文件整理成 AI 能读、人能用的内容。**

## 1. 方案总览

墨览分成两个产品面：

| 端 | 核心定位 | 第一目标 | 技术方向 |
|---|---|---|---|
| 手机 App | AI 文件与提示词手机工作台 | 快速打开、阅读、复制、轻编辑、分享 | 轻 React Native + TypeScript |
| 电脑端 / CLI | AI 可调用的文件转换工具 | Office / PDF / PPT / Excel 转 Markdown 给 AI 读取 | Node.js + TypeScript + Pandoc / LibreOffice |

产品不做万能工具。V1 只打通两条链路：

手机端：

```text
微信 / QQ / 本地文件 → 打开 → 阅读 → 复制 / 轻编辑 → 转 PDF / Word / 原文件 → 分享
```

电脑端：

```text
Word / PDF / Excel / PPT → Markdown → AI 读取 / 处理 / 复用
```

2026-07-03 裁定：

**全量工作先设计，后开发。**

含义不是先画几个漂亮页面，而是先把 PRD 中全部功能的使用场景、流程、页面、状态、数据模型、接口、权限、异常、验收标准设计完整，再按端进入开发。

后续除修复严重缺陷、真机验证阻塞项外，新增功能都必须先有对应设计任务。

### 1.1 当前选定 UI 方向

本方案后续采用低饱和 Apple 玻璃质感 UI：

| 端 | UI 基准 | 覆盖范围 |
|---|---|---|
| 手机端 | `docs/assets/selected-mobile-ui.png` | 首页、Markdown 阅读、JSON 阅读、编辑、提示词快贴、转换中心、AI 可读卡片、云端收件箱 |
| 电脑端 | `docs/assets/selected-desktop-ui.png` | 置顶快贴、Mini 模式、快捷命令、提示词详情、拖拽转换、AI/CLI 连接状态 |

裁定：

- 微信 / QQ 系统打开页只是外部入口，不是 App 自身 UI。
- 手机端阅读页仍是主屏，不让玻璃效果压低正文可读性。
- 电脑端重点是置顶快贴和转换，不做重型办公套件。

## 2. 核心原则

1. **阅读优先**
   - 文件打开后先进入阅读，不先弹识别、导入、保存、上传确认。
   - 识别和推荐动作只能后台执行，不阻断阅读。

2. **离线优先**
   - V1 不依赖后端。
   - 阅读、编辑、复制、最近文档、提示词、基础转换、系统分享都本地完成。
   - 云备份、同步、AI 识别后置，且用户主动开启。

3. **Markdown / JSON 双核心**
   - Markdown 是文档形态。
   - JSON 是结构化 AI 产物形态。
   - 两者都要能读、能改、能复制、能分享。

4. **复制是高频动作**
   - 提示词、代码块、JSON 字段的复制优先级高于转换。
   - 操作要做到一键复制和长按片段复制。

5. **转换服务分享和 AI 读取**
   - 手机端转换服务“给别人看/改”。
   - 电脑端转换服务“让 AI 能读取”。
   - 不做完整办公套件。

6. **React / TypeScript 优先**
   - 迎合 AI 辅助开发。
   - 手机端采用轻 React Native。
   - 电脑端 CLI / GUI / 未来后端尽量统一 TypeScript。

7. **先设计后开发**
   - 所有 PRD 功能先进入设计任务。
   - 设计产物必须覆盖流程、页面状态、数据结构、异常和验收。
   - 开发只执行已经设计清楚的功能，避免边做边改导致返工。

8. **云端先设计，后实现**
   - 云端不是 V1 前置条件。
   - 但云端数据模型、文件状态、同步边界和 AI 读取入口必须先设计。
   - 手机端、电脑端、本地存储的模型要为后续云端留出清晰路径。

## 3. 技术选型

### 3.1 手机 App

推荐栈：

```text
React Native / Expo + TypeScript
Hermes
AsyncStorage / 后续 SQLite
marked / 后续可替换为 remark
自研 JSON Tree
expo-document-picker
expo-file-system
expo-sharing
react-native-safe-area-context
```

策略：

- 继续使用 React Native / Expo 快速打磨 UI 和文件流程。
- 保持“轻 React Native”，不把 Office / PDF / PPT / Excel 重转换塞进手机包。
- 转换模块懒加载，阅读首屏优先。
- APK / AAB 优先优化下载体积和启动速度。
- 如果真实包体和启动成为市场阻碍，再评估：
  - React Native Bare
  - 关键入口原生化
  - Android / iOS 原生重写

### 3.2 电脑 CLI

推荐栈：

```text
Node.js + TypeScript
commander
execa
fast-glob
zod
Pandoc
LibreOffice
Vitest
```

目标：

- 脚本优先，GUI 后置。
- 输出结构化 JSON，便于 AI / agent 判断下一步。
- 支持批量文件。
- 支持 Office / PDF / PPT / Excel 转 Markdown。

示例命令：

```powershell
molan convert sample.docx --to md --out ./output --json
molan convert ./docs --from docx,pdf,pptx,xlsx --to md --batch --json
```

示例输出：

```json
{
  "ok": true,
  "input": "sample.docx",
  "output": "output/sample.md",
  "warnings": []
}
```

### 3.3 电脑 GUI

推荐栈：

```text
Electron + Vite + React + TypeScript
```

定位：

- 人用轻量批量转换器。
- 轻量 Markdown / JSON 阅读编辑。
- 不承担手机端社交分享主流程。

### 3.4 后端

V1 不做后端。

V2 如需要再考虑：

```text
Node.js + TypeScript
PostgreSQL / Supabase
对象存储
用户主动开启云备份
```

## 4. 功能架构

### 4.1 手机端功能模块

| 模块 | 说明 | V1 |
|---|---|---|
| 文件入口 | 微信 / QQ / 文件管理器打开 `.md` / `.json` | 必做 |
| 阅读器 | Markdown / JSON 阅读 | 必做 |
| 编辑器 | Markdown / JSON 原文编辑、预览、校验 | 必做 |
| 复制系统 | 全文、片段、代码块、JSON 字段、提示词复制 | 必做 |
| 分享系统 | 原文件、纯文本、PDF、Word 分享 | 必做 |
| 当前文件转换 | Markdown / JSON 转 PDF / Word / Markdown | 必做 |
| 最近文档 | 最近打开、阅读位置、来源、类型 | 必做 |
| 提示词库 | 收藏、最近复制、一键复制 | 必做 |
| 提示词快贴 | App 内快贴、Android 悬浮快贴、iOS 键盘/分享扩展 | P1 / P2 |
| 转换配方 | 给 AI 读、给别人看、给别人改、给 Agent 配置 | P1 |
| 批量转换中心 | 多文件转换 | V1.5 |
| AI 文件识别 | 类型识别、操作建议 | V2 |
| 云备份 | 历史找回、多端同步 | V2 |

### 4.2 电脑端功能模块

| 模块 | 说明 | 优先级 |
|---|---|---|
| CLI 转换 | AI / agent 调用入口 | P0 |
| Office 转 Markdown | Word / PDF / PPT / Excel → Markdown | P0 |
| 批量转换 | 文件夹批处理 | P0 |
| 结构化日志 | JSON 输出、错误可读 | P0 |
| GUI 转换器 | 人用转换面板 | P1 |
| GUI 阅读编辑 | 轻量 Markdown / JSON 阅读编辑 | P1 |
| 置顶快贴窗 | 开发时贴边置顶，快速搜索和复制提示词 | P1 |

## 5. 手机端页面方案

### 5.1 首页

用户主动打开 App 时展示。

内容：

- 最近文档
- 常用提示词
- 打开文件
- 转换中心
- 设置

原则：

- 不做营销页。
- 不做复杂底部 Tab。
- 首页要轻，启动只读元数据。

### 5.2 阅读页

从微信 / QQ / 文件管理器打开文件后直接进入。

主区域：

- Markdown 渲染阅读
- JSON 树形阅读

操作面板：

- 复制
- 编辑
- 分享
- 转格式
- 搜索 / 目录
- 收藏 / 加入提示词库

原则：

- 阅读优先。
- 操作面板默认隐藏，轻点唤出。
- 首屏不加载转换器。

### 5.3 编辑页

Markdown：

- 原文编辑
- 预览切换
- 自动草稿
- 保存副本

JSON：

- 原文编辑
- 格式化
- 校验
- 错误提示
- 树形预览

### 5.4 提示词页

内容：

- 最近复制
- 收藏提示词
- 标签 / 分组
- 搜索
- 一键复制
- 片段组合复制
- 变量模板
- 从 AI 阅读卡片导入提示词候选

### 5.4.1 提示词快贴

定位：

```text
服务手机端 AI Agent / Claude / Hannes 等工具的复制粘贴场景，让用户少切换、少查找、少重复输入。
```

App 内：

- 搜索提示词
- 最近复制
- 收藏
- 一键复制
- 组合复制
- 从当前 Markdown / JSON 导入

Android 增强：

- 可选悬浮快贴
- 用户主动授权
- 不默认读取输入框
- 不默认上传剪贴板
- 可随时关闭

iOS 增强：

- 墨览键盘扩展
- 分享扩展
- 系统剪贴板 + App 内快贴

第一阶段先做 App 内快贴；Android 悬浮窗和 iOS 键盘扩展进入 V2。

### 5.5 转换中心

V1.5 引入。

内容：

- 添加文件
- 选择目标格式
- 转换配方
  - 给 AI 读：Markdown
  - 给别人看：PDF
  - 给别人改：Word
  - 给开发 / Agent：JSON 或 Markdown
- 批量转换
- 成功 / 失败列表
- 转换后分享 / 保存

## 6. 数据模型

### 6.1 DocumentRecord

```ts
type DocumentKind = 'markdown' | 'json' | 'text' | 'word' | 'pdf' | 'excel' | 'ppt';
type DocumentSource = 'wechat' | 'qq' | 'local' | 'github' | 'browser' | 'ai-app' | 'unknown';

interface DocumentRecord {
  id: string;
  title: string;
  kind: DocumentKind;
  source: DocumentSource;
  uri?: string;
  localPath?: string;
  contentHash: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  lastScrollOffset?: number;
  favorite?: boolean;
  temporary?: boolean;
}
```

### 6.2 PromptItem

```ts
interface PromptItem {
  id: string;
  title: string;
  content: string;
  format: 'markdown' | 'json' | 'text';
  tags: string[];
  folderId?: string;
  sourceDocumentId?: string;
  copyCount: number;
  lastCopiedAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 6.3 ConvertTask

```ts
type ConvertStatus = 'pending' | 'running' | 'success' | 'failed';

interface ConvertTask {
  id: string;
  inputPath: string;
  outputPath?: string;
  from: string;
  to: string;
  status: ConvertStatus;
  error?: string;
  warnings?: string[];
  createdAt: number;
  finishedAt?: number;
}
```

### 6.4 ShareRecord

```ts
interface ShareRecord {
  id: string;
  documentId: string;
  format: 'markdown' | 'json' | 'text' | 'pdf' | 'word';
  target: 'wechat' | 'qq' | 'system' | 'local' | 'other';
  createdAt: number;
  ok: boolean;
}
```

## 7. 文件处理流程

### 7.1 外部文件打开

```text
系统 Intent / URL
→ App 接收 URI
→ 判断文件类型
→ 复制到缓存或读取内容
→ 进入阅读页
→ 后台记录最近打开
→ 后台做轻量类型识别
→ 调整操作建议
```

要求：

- 不阻断阅读。
- 读取失败要有明确提示。
- `content://` 必须真机验证。

### 7.2 Markdown 阅读

```text
读取文本
→ marked / parser 分块
→ FlatList 虚拟化渲染
→ 代码块/表格横向滚动
→ 记录滚动位置
```

### 7.3 JSON 阅读

```text
读取文本
→ JSON.parse
→ 根节点树形展示
→ 用户按需展开
→ 搜索时按需 flatten
→ 字段复制 / JSONPath 复制
```

### 7.4 提示词复制

```text
提示词库 / 当前文档
→ 一键复制全文
→ 或长按选择片段
→ 记录最近复制
→ 可收藏 / 加入提示词库
```

### 7.5 当前文件转换分享

```text
当前文档
→ 用户选择格式
→ 懒加载转换模块
→ 生成临时文件
→ 调起系统分享面板
→ 记录分享结果
```

## 8. 转换方案

### 8.1 手机端转换

V1 保留轻转换：

- Markdown → PDF
- Markdown → Word
- JSON → Markdown
- JSON → PDF / Word 可先规则化生成简洁文档

不做：

- Word / PDF / PPT / Excel → Markdown
- 复杂 Office 排版编辑
- OCR

### 8.2 电脑端转换

V1 重点：

- Word → Markdown：Pandoc
- PDF → Markdown：优先文本提取，必要时后续引入 OCR
- PPT → Markdown：LibreOffice / 解包提取文本
- Excel → Markdown：Sheet 转 Markdown 表格 / CSV
- 批量转换：Node CLI 编排

输出要求：

- Markdown 文件
- JSON 日志
- 错误码
- warnings

## 9. 包体与启动优化方案

### 9.1 目标

- 微信 / QQ 找到墨览：最多滑动 1-2 次
- 点击文件到看到内容：5 秒内
- 打开文档到复制提示词：10 秒内
- 打开文档到转换并分享：20 秒内
- APK / AAB 尽量小，但不牺牲核心体验

### 9.2 手机端策略

- Hermes 优先。
- AAB 上架，官网 APK 分架构。
- 转换模块懒加载。
- 首页只加载元数据。
- 不启动时扫描文件。
- 不预加载 Office 转换。
- 图片懒加载。
- Markdown 分块渲染。
- JSON 不一次性展开全部。
- 重转换下沉电脑端。

### 9.3 依赖控制

优先保留：

- 文件打开
- 分享
- 安全区
- Markdown / JSON 阅读
- 剪贴板
- 本地存储

谨慎引入：

- 大型富文本编辑器
- 大型 PDF 渲染器
- Office 解析库
- Mermaid / KaTeX
- 云 SDK

## 10. 调试与验证

### 10.1 UI 调试

工具：

- Chrome DevTools
- Expo Web
- React Native DevTools
- Electron DevTools

用途：

- 首页布局
- 阅读页排版
- 操作面板
- JSON 树
- 提示词复制入口
- 转换中心
- 深色模式
- 手机尺寸模拟

### 10.2 真机验证

必须验证：

- 微信打开 `.md`
- 微信打开 `.json`
- QQ 打开 `.md`
- QQ 打开 `.json`
- 文件管理器打开
- Android `content://`
- 分享到微信
- 分享到 QQ
- 底部按钮 safe-area
- 冷启动耗时

### 10.3 自动化验证

V1：

- TypeScript typecheck
- Markdown parser 单测
- JSONPath 单测
- 转换规则 fixtures
- CLI fixtures

V1.5：

- Playwright：桌面 GUI
- Maestro：移动端关键流程
- GitHub Actions：typecheck / test / build

## 11. 发布方案

### 11.1 GitHub

用途：

- 源码
- Release
- Issue
- 构建说明
- 校验文件

### 11.2 官网 / 下载页

用途：

- 普通用户下载
- 微信 / QQ 打开教程
- 隐私说明
- 更新日志

### 11.3 国内镜像

建议：

- 阿里云 OSS
- 腾讯云 COS
- 七牛云
- Gitee Release

### 11.4 发布产物

```text
molan-mobile-android-v0.1.0-arm64.apk
molan-mobile-android-v0.1.0-universal.apk
molan-desktop-win-x64-v0.1.0-setup.exe
molan-cli-win-x64-v0.1.0.zip
checksums-sha256.txt
release-notes.md
```

## 12. 实施路线

实施路线调整为两大段：

```text
全量设计冻结 → 分端开发落地
```

### 12.1 设计阶段总目标

设计阶段不是做视觉稿局部优化，而是把 PRD 全部功能设计完整。

必须覆盖：

- 使用场景
- 用户流程
- 页面信息架构
- 交互状态
- 异常和空态
- 数据模型
- 本地 / 云端 / CLI / MCP 接口边界
- 权限和隐私
- 验收标准

设计阶段完成前，不启动新的大功能开发；已有代码只做验证、修复和与设计一致的收敛。

### 12.2 D0：产品场景与边界设计

目标：

```text
把“阅读器”升级为“AI 文件工作流中转站”的产品边界讲清楚。
```

设计任务：

- 端到端场景地图：微信 / QQ、本地电脑、GitHub、Office 文件、提示词、AI 生产结果。
- 用户任务优先级矩阵：阅读、复制、编辑、转换、分享、归档、同步、AI 读取。
- 功能边界裁定：不做云盘、不做完整 Office、不做重型知识库、不做内置 AI 聊天。
- 关键指标：5 秒看到内容、10 秒复制、20 秒转换分享、AI 可读取成功率。
- 隐私原则：文件默认本地，主动上传，敏感字段提醒。

验收：

- PRD 每个功能都有对应设计任务。
- 产品边界能解释“为什么不是普通阅读器，也不是云盘”。

### 12.3 D1：手机端全量 UX / UI 设计

目标：

```text
手机端先完成所有核心页面和状态设计，再开发补齐。
```

设计范围：

- 微信 / QQ / 文件管理器打开流程。
- 首页：最近文档、提示词、打开文件、转换中心、设置。
- Markdown 阅读页：目录、搜索、代码块、表格、图片、链接、字号、深色模式。
- JSON 阅读页：树形、搜索、折叠、复制字段、JSONPath、大 JSON、Markdown 字段预览。
- 编辑页：Markdown 编辑/预览、JSON 格式化/校验、草稿、保存副本、分享。
- 复制系统：全文、选中段落、代码块、JSON 字段、多段组合复制。
- 提示词库：最近复制、收藏、搜索、标签、剪贴板导入、从文件导入。
- 转换：当前文件转换、批量转换中心、失败重试、结果分享。
- 分享：原文件、纯文本、PDF、Word、微信/QQ/系统面板、保存本地。
- 最近文档 / 文件收件箱：来源、状态、收藏、归档、云端标识。
- AI 阅读卡片：类型、摘要、提示词候选、待办、敏感字段、保存建议。
- 设置：默认打开指引、云同步、隐私、缓存、导出数据。

验收：

- 每个页面有主状态、空态、错误态、加载态、离线态。
- Android / iOS safe-area、底部导航、Home Indicator 均有设计约束。
- 阅读始终是打开文件后的第一动作。

### 12.4 D2：电脑端 / CLI 全量设计

目标：

```text
电脑端服务 AI 读取和生产，不复制手机端完整体验。
```

设计范围：

- CLI 命令体系：`convert`、`check`、`pull`、`read`、`push`。
- Office / PDF / PPT / Excel → Markdown 转换规则。
- 批量转换任务和结构化 JSON 输出。
- 错误码、退出码、失败恢复。
- 桌面 GUI：拖拽、队列、输出目录、阅读预览、轻量 JSON 编辑。
- 置顶快贴窗：侧边置顶、迷你模式、快捷命令模式、提示词详情、复制后回到开发窗口。
- AI 调用说明：Codex / Claude Code / Cursor 如何通过 CLI 读取资料。

验收：

- CLI 命令可被 AI / agent 稳定调用。
- 输出结构能让 AI 判断下一步。
- 电脑端和手机端的文件状态能对上。

### 12.5 D3：云端与 AI 工作流设计

目标：

```text
先设计手机和电脑如何通过云端互通，再开发云端。
```

设计范围：

- 云端 MVP：手机保存到云端 → 电脑 CLI 拉取 → AI 读取。
- 账号和设备：手机号登录、设备绑定、设备名、最后同步时间。
- 同步策略：本地优先、增量同步、冲突保留、删除、离线队列。
- AI 文件资料库：收藏、有用资源、项目/集合、标签、状态。
- 上传边界：默认不上传、主动保存、敏感字段提醒、上传前确认。
- AI 读取入口：CLI 优先、MCP 后置、云端 API 后置。
- AI 生产结果回流：生成 Markdown / JSON，保存版本，同步回手机和电脑。

验收：

- 云端不是网盘的边界清楚。
- 文件上传必须由用户主动触发。
- 能证明“手机文件进入电脑 AI 工作流”的最小闭环。

### 12.6 D4：数据模型与接口设计

目标：

```text
让手机端、电脑端、云端、AI 工具共享同一套概念。
```

设计范围：

- 本地模型：DocumentRecord、PromptItem、CopyEvent、ConversionJob、InboxItem、Settings。
- 云端模型：users、devices、prompts、documents、document_versions、file_objects、sync_events、conversion_jobs、ai_jobs。
- 文件状态机：未处理、已阅读、已复制、已编辑、已转换、已分享、已归档、已同步、冲突。
- 转换状态机：pending、running、success、failed、cancelled、shared、saved。
- API 草案：auth、sync、documents、prompts、files、conversion_jobs、ai_jobs。
- CLI / MCP 输出契约。

验收：

- 不同端不会各自定义一套文件概念。
- 后续上云不需要推翻本地数据结构。

### 12.7 D5：发布与验证设计

目标：

```text
先设计怎么验收，再谈上线。
```

设计范围：

- 微信 / QQ / 文件管理器真机验证脚本。
- 启动速度、包体、safe-area、分享面板验收。
- Android AAB / arm64 APK / universal APK 策略。
- Windows installer、CLI zip、校验文件、release notes。
- 官网下载页、国内镜像、微信 / QQ 教程。

验收：

- 每个发布包都有下载、校验、安装、回滚说明。
- 每个核心体验都有可重复验证步骤。

### 12.8 设计冻结门槛

进入大规模开发前必须满足：

- PRD 全部功能都能映射到设计任务和开发任务。
- 手机端主流程设计齐备：打开、阅读、复制、编辑、转换、分享、提示词、收件箱。
- 电脑端 CLI 命令和 JSON 输出契约齐备。
- 云端 MVP 闭环、数据模型、隐私边界齐备。
- 每个开发任务都有验收标准、失败状态和优先级。

### 12.9 开发阶段 E0：现有代码收敛

目标：

```text
让当前代码与设计方向对齐，不做大重写。
```

任务：

- 保留已完成的移动端阅读、JSON、编辑、转换、分享、提示词、最近文档。
- 修正与设计不一致的入口、文案、状态和按钮层级。
- 完成微信 / QQ 真机入口验证。
- 完成包体和启动基线。

### 12.10 开发阶段 E1：手机端 V1 核心闭环

目标：

```text
快开文件 → 阅读 → 复制 → 轻量编辑 → 转 PDF / Word → 分享
```

任务：

- 微信 / QQ 真机打开稳定。
- Markdown / JSON 阅读补强。
- 复制系统补齐。
- JSON 编辑与校验完善。
- 当前文件转换和分享闭环。
- 最近文档和提示词库补齐。
- App 内提示词快贴补齐。
- iOS / Android UI 适配。

验收：

- 微信 / QQ 中最多滑动 1-2 次找到 App。
- 5 秒内看到内容。
- 10 秒内复制提示词。
- 20 秒内转换并分享。

### 12.11 开发阶段 E2：电脑端 CLI 和轻量 GUI

目标：

```text
Office / PDF / PPT / Excel → Markdown → 给 AI 读取
```

任务：

- CLI 转换能力补强。
- `molan pull/read/push` 云端入口后续接入。
- GUI 多格式转换和 JSON 编辑补齐。
- 置顶快贴窗：已完成主窗口快贴 tab、独立小窗、always-on-top、搜索提示词、一键复制、Mini、位置记忆、`Ctrl/Command + Shift + M` 呼出。
- 快贴窗后续接入提示词云同步、变量模板填充和 Spotlight 式快捷命令面板。
- fixtures 测试和错误码验证。

### 12.12 开发阶段 E3：V1.5 办公增强

任务：

- 手机端批量转换中心。
- 分享前格式推荐。
- 文件内容搜索。
- 提示词标签 / 分类。
- 转换配方。
- 提示词变量模板和组合复制。
- 图片保存 / 分享。
- 链接长按复制。
- 横屏 / 平板适配。

### 12.13 开发阶段 E4：云端 MVP 与 AI 读取

任务：

- 登录和设备绑定。
- 提示词库同步。
- 最近文档 / 文件状态同步。
- 用户主动保存文件到云端。
- 电脑端 CLI 拉取云端收件箱。
- AI 读取同步后的 Markdown / JSON。
- Android 悬浮快贴。
- iOS 键盘扩展 / 分享扩展。
- 提示词库同步到手机、电脑置顶快贴窗和 CLI / MCP。

### 12.14 开发阶段 E5：发布与增长

任务：

- Android APK / AAB 构建。
- Windows installer。
- CLI zip。
- GitHub Release。
- 官网下载页。
- 国内镜像。
- SHA256 校验。
- 微信 / QQ 使用教程。

## 13. 当前仓库现状

已具备：

- 手机端 Markdown 阅读
- 手机端 JSON 树形阅读
- 手机端轻量编辑
- 手机端最近文档
- 手机端提示词库、最近复制、剪贴板导入
- 手机端 PDF / Word / Markdown / JSON 基础导出
- 手机端 AI 阅读卡片本地骨架
- 桌面端 Electron 转换 GUI
- 桌面端 Markdown / JSON 阅读
- 桌面端 TypeScript CLI
- 桌面端共享转换引擎
- 根 Python pandoc 原型（legacy）
- GitHub 仓库
- PRD / TODO / 市场调研 / 发布方案 / AI 云端工作流文档

明显缺口：

- 微信 / QQ 真机可发现性验证
- iOS 真机适配验证
- JSON 编辑校验细节完善
- 组合复制 / 高级片段复制
- 分享入口从“发给微信”升级为“分享 / 发送”
- 手机端包体和启动优化
- 手机端批量转换中心
- 电脑端 GUI 多格式接入和 JSON 编辑
- Release 下载包
- 官网下载页
- 云端 MVP
- CLI 云端 `pull/read/push`
- MCP / 本地 Agent 读取入口

## 14. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| React Native 包体偏大 | 下载转化下降 | AAB、分架构 APK、懒加载、重转换下沉电脑端 |
| 微信 / QQ 打开列表不好找 | 核心入口失败 | 图标/命名优化、intent filter 强声明、真机专项测试 |
| Android `content://` 不稳定 | 文件打开失败 | ContentResolver 路径专项处理、失败兜底提示 |
| JSON 大文件卡顿 | 阅读体验差 | 虚拟列表、按需展开、搜索结果分页 |
| 手机端转换过重 | 启动慢、包大 | 只保留轻转换，重转换交给电脑 CLI |
| AI 大厂抢文档理解 | 差异化变弱 | 不做 AI 总结，做文件准备层和提示词快复制 |
| 云能力带来隐私顾虑 | 用户不信任 | 默认本地、不默认上传、用户主动开启 |

## 15. V1 完成定义

V1 完成必须同时满足：

- 手机端可从微信 / QQ / 文件管理器打开 `.md` / `.json`。
- Markdown / JSON 都能稳定阅读。
- Markdown / JSON 都能轻量编辑。
- 能一键复制提示词 / 全文 / 代码块 / JSON 字段。
- 能分享原文件和纯文本。
- 能把当前 Markdown 转 PDF / Word 并分享。
- 最近文档可用。
- 离线可用。
- 真机验证通过入口、safe-area、分享链路。
- APK / AAB 有可接受体积，启动体验达标。
- 电脑端 CLI 至少完成 Word → Markdown 和批量转换基础。

## 16. 不做清单

- 不做重型 Markdown 编辑器。
- 不做 Obsidian 类知识库。
- 不做完整办公套件。
- 不做专业 JSON IDE。
- 不做提示词社区。
- 不做云盘。
- 不默认上传用户文件。
- 不内置 AI 聊天。
- 不把电脑端重转换塞进手机 APK。
- 不为了兼容历史实现保留复杂双流程。
