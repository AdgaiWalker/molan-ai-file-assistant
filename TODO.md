# TODO：墨览 全量可执行任务拆解

版本：v2  
基线：PRD v2 + 全量方案 v1，已核实 `mobile/` 与 `desktop/` 实际代码状态  
更新：2026-07-02

> 本文件是唯一任务源。原 `TODO.md` 的里程碑表（M1–M8）已并入下方分层结构。

## 状态标记

- `[x]` 已完成（已核实代码）
- `[~]` 部分完成（需补齐或核实）
- `[ ]` 待做
- `[v]` 需真机验证（代码可能已具备，但市场关键体验未验）

## 优先级分层

| 层 | 名称 | PRD 对应 | 目标 |
|---|---|---|---|
| T0 | 仓库与文档基线 | §阶段0 | 收尾文档与构建脚本 |
| T1 | 手机端 V1 核心闭环 | §七 P0 / §十八 V1 | 快开→阅读→复制→轻编辑→转 PDF/Word→分享 |
| T2 | 电脑端 CLI | §十二.1 / §十八.8 / 全量方案§15 | Office/PDF/PPT/Excel → Markdown，供 AI 调用 |
| T3 | 发布准备 | §十一 / 全量方案§11 | APK/AAB、installer、校验、下载页 |
| T4 | V1.5 办公增强 | §七 P1 | 批量转换、搜索、收藏、标签 |
| T5 | V2 云端与 AI | §七 P2 | 云备份、同步、AI 识别 |

## PRD 冲突裁定（自行决定）

1. **批量转换中心归属**：PRD §十七 列其为"当前最高优先级 #7"，但 §七 与 §十八 明确归入 V1.5。**裁定归 T4（V1.5）**，V1 先做"当前文件转换后直接分享"。§十七 的 #7 应理解为"V1.5 起步项"而非 V1 阻塞项。
2. **电脑端是否进 V1**：PRD §十二 称"电脑端不进入 V1 主线"，但 §十八.8 与 全量方案 §15 把电脑端 CLI 脚本纳入 V1 完成定义。**裁定：§十二 指桌面 GUI 体验不进 V1 主线；CLI 脚本（Word→MD + 批量 + JSON 输出）属 V1（T2）**，因为它是 AI 工作流补充而非手机端社交分享主流程。
3. **JSON 转办公格式**：PRD §七 P0 列 JSON→PDF/MD/Word，但 §十八.1 把 JSON 转文档排到 V1.5。**裁定**：V1 只做 JSON→Markdown（规则化），JSON→PDF/Word 排 T4，避免低质量文档。

---

## T0 仓库与文档基线

- `[x]` T0.1 GitHub 仓库、PRD、TODO、市场调研、发布方案、全量方案齐备
- `[x]` T0.2 `AGENTS.md` 说明三端关系与命令
- `[x]` T0.3 `mdconvert.py` 标注为 legacy prototype
- `[ ]` T0.4 `download_pandoc.py` 改为正式构建脚本 — 验收：去掉硬编码 `C:\Users\26296\Desktop\新建文件夹 (6)` 路径，改为读取环境变量或参数；输出到 `desktop/resources/` — 复杂度 S
- `[ ]` T0.5 pandoc 下载增加版本固定与 SHA256 校验 — 验收：脚本内置 pandoc 版本号，下载后校验哈希失败则报错退出 — 复杂度 S
- `[ ]` T0.6 根目录补 `.gitignore` 确认（`config.json`、`*.exe` 个人文件、`build/`、`dist/`、`release/`） — 验收：`git status` 干净 — 复杂度 S

---

## T1 手机端 V1 核心闭环

> 闭环：**微信/QQ 收到文件 → 1–2 下找到墨览 → 5 秒看到内容 → 10 秒复制提示词 → 20 秒转换并分享**  
> 技术栈：Expo SDK 57 + TS + Hermes + AsyncStorage。读 `mobile/@mobile/AGENTS.md` 与 https://docs.expo.dev/versions/v57.0.0/ 后再改代码。

### T1.1 文件打开与可发现性

- `[x]` T1.1.1 `app.json` 注册 `.md`/`.markdown`/`.json` 打开方式（iOS CFBundleDocumentTypes + Android intentFilters，含 `content://`/`file://`、多 mimeType） — 已核实
- `[x]` T1.1.2 App 名"墨览 文档阅读助手"、slug `md-reader`、bundleId `com.mdreader.app` — 已核实
- `[ ]` T1.1.3 App 图标做品牌识别（非通用蓝色文档图标） — 验收：图标在微信/QQ"其他应用"列表中视觉醒目 — 复杂度 M
- `[v]` T1.1.4 微信打开 `.md`/`.json` 真机验证 — 验收：最多滑动 1–2 次找到墨览 — 复杂度 M
- `[v]` T1.1.5 QQ 打开 `.md`/`.json` 真机验证 — 验收：同上 — 复杂度 M
- `[v]` T1.1.6 系统文件管理器打开真机验证 — 复杂度 S
- `[v]` T1.1.7 Android `content://` 稳定读取真机验证 — 验收：读取失败有明确兜底提示，不白屏 — 复杂度 M
- `[ ]` T1.1.8 首次引导设置默认打开（可选引导页） — 验收：新用户首次打开看到一次"如何用墨览打开文件"提示 — 复杂度 S
- `[x]` T1.1.9 Android safe-area / 导航栏 / 手势条适配（`react-native-safe-area-context` 已装）
- `[ ]` T1.1.10 iOS Home Indicator 适配 — 验收：底部按钮不被遮挡 — 复杂度 S

### T1.2 Markdown 阅读

- `[x]` T1.2.1 标题、段落、列表、引用、加粗/斜体、链接、图片（`renderer.tsx` + `marked`）
- `[x]` T1.2.2 表格横向滚动、代码块横向滚动
- `[x]` T1.2.3 代码块一键复制（`expo-clipboard`）
- `[x]` T1.2.4 字号/行距、深色模式跟随系统（`theme.ts`）、目录跳转（`toc.ts`）、滚动位置记忆
- `[~]` T1.2.5 长文虚拟化渲染（FlatList 分块） — 需核实 `renderer.tsx` 是否已分块；验收：1MB+ 长文滚动不卡顿、不崩溃 — 复杂度 M
- `[~]` T1.2.6 正文长按系统选区、链接/图片长按动作 — 需核实手势冲突
- `[~]` T1.2.7 图片缓存进沙盒，离线二次打开可看（`expo-image`） — 需核实落盘策略
- `[ ]` T1.2.8 KaTeX 公式 — 复杂度 M（PRD 未列 P0，可延后；全量方案 §9.3 谨慎引入）
- `[ ]` T1.2.9 Mermaid 图表 — 复杂度 L（同上谨慎引入）

### T1.3 JSON 阅读

- `[x]` T1.3.1 树形展示、折叠/展开（`JsonTree.tsx` + `JsonView.tsx`）
- `[~]` T1.3.2 搜索 key/value — 需核实是否已实现按需 flatten 与高亮 — 复杂度 M
- `[~]` T1.3.3 复制字段值、复制 JSONPath — 需核实 — 复杂度 S
- `[ ]` T1.3.4 美化/压缩切换 — 验收：一键在 pretty/minify 间切换 — 复杂度 S
- `[ ]` T1.3.5 大 JSON 分块/虚拟列表 — 验收：5MB+ JSON 不卡死 — 复杂度 L
- `[~]` T1.3.6 `content`/`markdown`/`text` 字段内嵌 Markdown 预览 — 已核实存在，需核实边界（嵌套 JSON 内的 md 字段）

### T1.4 Markdown / JSON 编辑

- `[~]` T1.4.1 Markdown 原文编辑 + 预览切换（`EditSheet.tsx`） — 需核实预览实时性
- `[~]` T1.4.2 JSON 原文编辑 + 格式化 + 校验 + 错误提示 — 需核实错误定位精度 — 复杂度 M
- `[ ]` T1.4.3 自动保存草稿 — 验收：编辑中途退出再回来内容仍在；不破坏原文件 — 复杂度 S
- `[ ]` T1.4.4 保存为副本 — 验收：另存为新文件，原文件不变 — 复杂度 S
- `[ ]` T1.4.5 编辑后可直接分享 — 验收：编辑态有"分享"出口 — 复杂度 S
- `[ ]` T1.4.6 编辑入口显式按钮，不与阅读长按手势冲突 — 验收：阅读态长按只出系统选区 — 复杂度 S

### T1.5 复制与提示词库（最大缺口）

> 核实结果：`mobile/src` 下**无提示词库相关文件**，需从零实现。

- `[~]` T1.5.1 复制全文、复制代码块、复制 JSON 字段 — 部分具备，需统一复制出口 — 复杂度 S
- `[ ]` T1.5.2 复制选中段落（长按选区后接入复制） — 复杂度 S
- `[ ]` T1.5.3 组合复制多个片段 — 验收：长按选多段，合并进剪贴板 — 复杂度 M
- `[ ]` T1.5.4 提示词数据模型 `PromptItem`（id/title/content/format/tags/folderId/copyCount/lastCopiedAt/...）落地 AsyncStorage — 复杂度 M
- `[ ]` T1.5.5 提示词库页：收藏、最近复制、标签/分组、搜索、一键复制 — 复杂度 L
- `[ ]` T1.5.6 从剪贴板导入提示词 — 验收：检测剪贴板文本，一键入库 — 复杂度 S
- `[ ]` T1.5.7 从当前 Markdown/JSON 文件片段加入提示词库 — 复杂度 S
- `[ ]` T1.5.8 复制整个文件夹/分组内全部文本 — 复杂度 S
- `[ ]` T1.5.9 记录最近复制列表（按时间） — 复杂度 S

### T1.6 分享

- `[x]` T1.6.1 系统分享面板（`expo-sharing`）
- `[~]` T1.6.2 分享原 `.md`/`.json` 文件、分享纯文本 — 需核实两种形态都覆盖
- `[ ]` T1.6.3 保存到本地 — 验收：分享面板可选"保存到文件" — 复杂度 S
- `[v]` T1.6.4 微信/QQ 通过系统分享覆盖 — 真机验证是否好找
- `[ ]` T1.6.5 分享入口文案从"发给微信"升级为"分享/发送" — 验收：按钮文案统一为"分享" — 复杂度 S
- `[ ]` T1.6.6 记住最近分享方式 — 验收：下次分享默认高亮上次目标 — 复杂度 S
- `[ ]` T1.6.7 转换完成后直接进入分享面板（不要求用户去文件夹找） — 复杂度 S

### T1.7 当前文件转换

- `[x]` T1.7.1 Markdown → PDF（`expo-print`）
- `[x]` T1.7.2 Markdown → Word（`docx`）
- `[x]` T1.7.3 Word → Markdown（`mammoth`，`converter/docxToMd.ts`）
- `[~]` T1.7.4 JSON → Markdown（规则化） — 需核实规则质量 — 复杂度 M
- `[ ]` T1.7.5 JSON → PDF — 裁定排 T4（见冲突 3）
- `[ ]` T1.7.6 JSON → Word — 裁定排 T4
- `[~]` T1.7.7 转换后直接分享 — 需核实 `ConvertSheet.tsx` 是否已接分享出口 — 复杂度 S
- `[ ]` T1.7.8 转换模块懒加载 — 验收：首屏不加载转换器，冷启动只读元数据 — 复杂度 M

### T1.8 最近文档

- `[x]` T1.8.1 `DocumentRecord` 存储 + 最近打开（`storage/recentDocs.ts` + `RecentSheet.tsx`，AsyncStorage）
- `[~]` T1.8.2 最近编辑、最近复制标签 — 需核实是否区分 — 复杂度 S
- `[~]` T1.8.3 文件类型标识、来源标识（微信/QQ/本地/其他） — 需核实来源捕获 — 复杂度 S
- `[~]` T1.8.4 上次阅读位置（`lastScrollOffset`） — 需核实回填 — 复杂度 S

### T1.9 包体与启动优化

- `[ ]` T1.9.1 Hermes 已启用（核实 `app.json`/构建配置） — 复杂度 S
- `[ ]` T1.9.2 AAB 上架 + 官网分架构 APK（arm64/universal） — 复杂度 M（属 T3，此处登记）
- `[ ]` T1.9.3 首页只加载元数据，不启动时扫描文件、不预加载 Office 转换 — 验收：冷启动 ≤5 秒看到首页 — 复杂度 M
- `[ ]` T1.9.4 图片懒加载、Markdown 分块、JSON 按需展开 — 复杂度 M
- `[ ]` T1.9.5 依赖审计：谨慎引入大型富文本/PDF 渲染/Office 解析/Mermaid/KaTeX/云 SDK — 复杂度 S

### T1.10 自动化验证（手机端）

- `[ ]` T1.10.1 `package.json` 增加 `typecheck` 脚本（`tsc --noEmit`） — 复杂度 S
- `[ ]` T1.10.2 Markdown parser 单测（fixtures） — 复杂度 M
- `[ ]` T1.10.3 JSONPath / 复制逻辑单测 — 复杂度 M
- `[ ]` T1.10.4 转换规则 fixtures 测试（md↔docx↔json） — 复杂度 M
- `[ ]` T1.10.5（V1.5）Maestro 关键流程 — 复杂度 L

---

## T2 电脑端 CLI（V1 完成定义的一部分）

> 核实结果：`desktop/` 仅有 Electron GUI 调 pandoc（md↔docx），**无 Node/TS CLI、无 Office→MD（除 Word）、无测试**。需新建 CLI 包。

### T2.1 CLI 骨架

- `[ ]` T2.1.1 新建 `desktop/cli/`（或根 `cli/`）Node+TS 包，装 `commander`/`execa`/`fast-glob`/`zod` — 复杂度 M
- `[ ]` T2.1.2 `molan convert <file|dir> --to md [--from docx,pdf,pptx,xlsx] [--batch] [--json] [--out ./output]` — 复杂度 M
- `[ ]` T2.1.3 结构化 JSON 输出：`{ok,input,output,warnings,errorCode}` — 验收：失败可读、AI 能据 `errorCode` 判下一步 — 复杂度 S
- `[ ]` T2.1.4 错误码体系（E_PANDOC_MISSING / E_UNSUPPORTED_FORMAT / E_INPUT_NOT_FOUND ...） — 复杂度 S
- `[ ]` T2.1.5 退出码语义（0 成功 / 非 0 失败） — 复杂度 S

### T2.2 转换引擎

- `[x]` T2.2.1 Word → Markdown（pandoc `docx→gfm`，GUI 已有，CLI 复用）
- `[ ]` T2.2.2 PDF → Markdown — 验收：优先文本提取；扫描件先标记"需 OCR"不强行 — 复杂度 L
- `[ ]` T2.2.3 PPT → Markdown — 验收：LibreOffice 解包或文本提取，保留标题层级 — 复杂度 L
- `[ ]` T2.2.4 Excel/CSV → Markdown 表格 — 验收：每 sheet 一张 md 表，大表横向滚动 — 复杂度 M
- `[ ]` T2.2.5 批量转换：文件夹 glob + 并发控制 — 验收：`molan convert ./docs --batch --json` 稳定 — 复杂度 M
- `[ ]` T2.2.6 Office→MD 后规则清理（去页眉页脚、修空行、保留标题层级、修简单表格） — 复杂度 M

### T2.3 测试与打包

- `[ ]` T2.3.1 Vitest + fixtures（各格式样本文件） — 复杂度 M
- `[ ]` T2.3.2 `molan-cli-win-x64-vX.zip` 打包脚本 — 复杂度 S
- `[ ]` T2.3.3 pandoc 二进制随 CLI 包分发或自动探测 — 复杂度 S

### T2.4 桌面 GUI（P1，不阻塞 V1）

- `[x]` T2.4.1 Electron GUI：md↔docx 批量、拖拽、设置记忆、输出目录（已核实）
- `[x]` T2.4.2 GUI Markdown/JSON 阅读（JSON 只读，已核实）
- `[ ]` T2.4.3 GUI JSON 编辑（校验+格式化） — 复杂度 M
- `[ ]` T2.4.4 GUI 接入 PDF/PPT/Excel→MD（复用 T2.2） — 复杂度 M

---

## T3 发布准备

- `[ ]` T3.1 Android APK/AAB 构建（arm64 + universal） — 复杂度 M
- `[ ]` T3.2 Windows installer（NSIS，已配 `build:dist`） — 复杂度 S
- `[ ]` T3.3 CLI zip 包 — 复杂度 S
- `[ ]` T3.4 `checksums-sha256.txt` 生成 — 复杂度 S
- `[ ]` T3.5 `release-notes.md` 模板 — 复杂度 S
- `[ ]` T3.6 GitHub Release + 校验文件 — 复杂度 S
- `[ ]` T3.7 官网下载页（含微信/QQ 打开教程、隐私说明、更新日志） — 复杂度 M
- `[ ]` T3.8 国内镜像（阿里云 OSS / 腾讯云 COS / 七牛 / Gitee Release） — 复杂度 M
- `[ ]` T3.9 微信/QQ 使用教程图文 — 复杂度 S

---

## T4 V1.5 办公增强（P1）

- `[ ]` T4.1 手机端批量转换中心（独立页，不塞阅读页） — 复杂度 L
- `[ ]` T4.2 批量 MD→PDF/Word、JSON→PDF/MD/Word — 复杂度 M
- `[ ]` T4.3 转换结果列表 + 失败重试 — 复杂度 M
- `[ ]` T4.4 分享前格式推荐（规则：给人看→PDF、继续编辑→Word、给 AI→MD） — 复杂度 S
- `[ ]` T4.5 文件内容搜索 — 复杂度 M
- `[ ]` T4.6 提示词标签/分类 — 复杂度 M
- `[ ]` T4.7 收藏文件 — 复杂度 S
- `[ ]` T4.8 图片保存/分享、链接长按打开/复制 — 复杂度 S
- `[ ]` T4.9 横屏/平板适配 — 复杂度 M
- `[ ]` T4.10 飞书/钉钉/企业微信通过系统分享优化 — 复杂度 S
- `[ ]` T4.11 长图导出 — 复杂度 M
- `[ ]` T4.12 JSON→PDF/Word（裁定从 V1 延后至此） — 复杂度 M
- `[ ]` T4.13 桌面 GUI JSON 编辑 + Office→MD 接入（T2.4.3/T2.4.4）
- `[ ]` T4.14 GitHub Actions：typecheck/test/build — 复杂度 M
- `[ ]` T4.15 Playwright 桌面 GUI E2E — 复杂度 L

---

## T5 V2 云端与 AI（P2）

- `[ ]` T5.1 用户主动云备份（默认本地、不默认上传） — 复杂度 L
- `[ ]` T5.2 多设备同步、历史版本 — 复杂度 L
- `[ ]` T5.3 本地规则文件类型识别（PRD/README/提示词/API JSON/Agent 配置/MCP/错误日志） — 只调整操作建议，不阻断阅读 — 复杂度 M
- `[ ]` T5.4 Office→MD 后 AI 清理 — 复杂度 L
- `[ ]` T5.5 JSON 结构解释、提示词变量模板 — 复杂度 M
- `[ ]` T5.6 复制片段后跳 AI App 追问 — 复杂度 S
- `[ ]` T5.7 划线/高亮/笔记、TTS 朗读、多版本 diff — 复杂度 L
- `[ ]` T5.8 全文/语义搜索 — 复杂度 L
- `[ ]` T5.9 上架：国内安卓商店 / App Store / Google Play / 微软商店 — 复杂度 L

---

## V1 完成定义（DoD）

V1 视为完成须**全部**满足（PRD §十五 + 全量方案 §15）：

- [ ] 手机端可从微信/QQ/文件管理器打开 `.md`/`.json`（T1.1 真机通过）
- [ ] Markdown/JSON 都能稳定阅读（T1.2/T1.3，含长文/大 JSON）
- [ ] Markdown/JSON 都能轻量编辑（T1.4）
- [ ] 能一键复制提示词/全文/代码块/JSON 字段（T1.5）
- [ ] 能分享原文件和纯文本（T1.6）
- [ ] 能把当前 Markdown 转 PDF/Word 并分享（T1.7）
- [ ] 最近文档可用（T1.8）
- [ ] 离线可用
- [ ] 真机验证通过：入口、safe-area、分享链路（T1.1/T1.6）
- [ ] APK/AAB 体积可接受、启动达标（T1.9）
- [ ] 电脑端 CLI 至少完成 Word→Markdown + 批量 + JSON 输出（T2.1/T2.2.1/T2.2.5）

## 体验量化目标（验收门槛）

- 微信/QQ 中找到墨览：最多滑动 1–2 次
- 从点击文件到看到内容：5 秒内
- 从打开文档到复制提示词：10 秒内
- 从打开文档到转换并分享：20 秒内
- 底部操作按钮不被系统导航栏/手势条遮挡

## 不做清单（边界守护）

不做重型 MD 编辑器、Obsidian 类知识库、完整办公套件、专业 JSON IDE、提示词社区、云盘、默认上传用户文件、内置 AI 聊天、把电脑端重转换塞进手机 APK、为兼容历史保留复杂双流程。

## 核实说明

- 桌面端状态来自代码级核实（`electron/main/index.ts`、`src/components/*`、`package.json`）。
- 手机端状态来自 `app.json`、`package.json`、`src/` 文件清单与原 TODO 自报；标 `[~]` 的阅读器/编辑器内部细节（虚拟化、校验精度、来源捕获等）须在动手时先读对应组件核实，再决定补齐范围。
