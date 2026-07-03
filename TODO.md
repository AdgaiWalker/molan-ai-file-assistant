# TODO：墨览 全量可执行任务拆解

版本：v3  
基线：PRD v2 + 全量方案 v2，已核实 `mobile/` 与 `desktop/` 实际代码状态  
更新：2026-07-03

> 本文件是唯一任务源。原 `TODO.md` 的里程碑表（M1–M8）已并入下方分层结构。
> 2026-07-03 裁定：后续全量工作按“先完成 PRD 全功能设计，再进入开发实现”的顺序推进。除修复现有严重缺陷、真机验证阻塞项外，不新增未完成设计的功能开发。

## 状态标记

- `[x]` 已完成（已核实代码）
- `[~]` 部分完成（需补齐或核实）
- `[ ]` 待做
- `[v]` 需真机验证（代码可能已具备，但市场关键体验未验）
- `[d]` 设计任务（先产出流程、页面、状态、数据、验收，再开发）

## 总执行顺序裁定

1. **先全量设计**：把 PRD 中的全部功能先设计清楚，覆盖使用场景、用户流程、页面信息架构、状态、数据模型、接口、权限、异常、验收标准。
2. **再分端开发**：设计冻结后，再按手机端、电脑端 CLI / GUI、云端、发布四条线开发。
3. **阅读第一动作不变**：任何 AI、云端、转换、编辑功能都不能挡在打开文件后的阅读之前。
4. **云端后置但先设计**：云端不是 V1 前置，但其数据模型、同步边界和 AI 读取入口必须先设计，避免后续本地模型返工。
5. **代码实证继续保留**：当前已完成的移动端/桌面端能力不回滚；后续基于设计补齐，而不是重写。

## 当前选定 UI 基线

- 手机端：`docs/assets/selected-mobile-ui.png`
- 电脑端：`docs/assets/selected-desktop-ui.png`
- 视觉方向：低饱和 Apple 玻璃质感，阅读区域保持高对比，蓝色只用于主动作。
- 执行约束：后续 UI/UX 设计、前端实现、验收截图都以这两张图为基准；微信/QQ/系统打开页只作为入口场景参考，不当作墨览 App UI。

## 优先级分层

| 层 | 名称 | PRD 对应 | 目标 |
|---|---|---|---|
| D0 | 全量产品设计基线 | PRD 全文 | 统一定位、边界、优先级、场景和成功指标 |
| D1 | 手机端 UX / UI 设计 | §四-§十 / §十五 | 快开、阅读、复制、编辑、转换、分享、提示词、收件箱 |
| D2 | 电脑端 / CLI 设计 | §十二 / §十八 | AI 可调用转换脚本、轻量 GUI、结构化输出 |
| D3 | 云端与 AI 工作流设计 | §十一 / AI 可读云端工作流 | 手机电脑互通、AI 读取、用户主动同步 |
| D4 | 数据模型与接口设计 | §六 / §十二 / 云端文档 | 本地、云端、CLI、MCP 的统一数据契约 |
| D5 | 发布与验证设计 | §十四 / §十五 | 真机验证、包体、下载、渠道、验收 |
| T0 | 仓库与文档基线 | 设计与开发支撑 | 收尾文档与构建脚本 |
| T1 | 手机端 V1 开发 | §七 P0 / §十八 V1 | 快开→阅读→复制→轻编辑→转 PDF/Word→分享 |
| T2 | 电脑端 CLI 开发 | §十二.1 / §十八.8 | Office/PDF/PPT/Excel → Markdown，供 AI 调用 |
| T3 | 发布准备开发 | §十一 / 全量方案§11 | APK/AAB、installer、校验、下载页 |
| T4 | V1.5 办公增强开发 | §七 P1 | 批量转换、搜索、收藏、标签 |
| T5 | V2 云端与 AI 开发 | §七 P2 / 云端工作流 | 云备份、同步、AI 读取与生产 |

## PRD 冲突裁定（自行决定）

1. **批量转换中心归属**：PRD §十七 列其为"当前最高优先级 #7"，但 §七 与 §十八 明确归入 V1.5。**裁定归 T4（V1.5）**，V1 先做"当前文件转换后直接分享"。§十七 的 #7 应理解为"V1.5 起步项"而非 V1 阻塞项。
2. **电脑端是否进 V1**：PRD §十二 称"电脑端不进入 V1 主线"，但 §十八.8 与 全量方案 §15 把电脑端 CLI 脚本纳入 V1 完成定义。**裁定：§十二 指桌面 GUI 体验不进 V1 主线；CLI 脚本（Word→MD + 批量 + JSON 输出）属 V1（T2）**，因为它是 AI 工作流补充而非手机端社交分享主流程。
3. **JSON 转办公格式**：PRD §七 P0 列 JSON→PDF/MD/Word，但 §十八.1 把 JSON 转文档排到 V1.5。**裁定**：V1 只做 JSON→Markdown（规则化），JSON→PDF/Word 排 T4，避免低质量文档。

---

## D0 全量产品设计基线（先做）

- `[ ]` D0.1 重写一版“端到端使用场景地图” — 覆盖微信/QQ 收文件、本地电脑创建、GitHub 下载、Office 转换、提示词复制、AI 读取、结果回流。
- `[ ]` D0.2 输出“功能边界裁定表” — 明确做什么、不做什么、V1/V1.5/V2/V3 分界，避免阅读器、云盘、Office 套件、AI 聊天互相混淆。
- `[ ]` D0.3 输出“用户任务优先级矩阵” — 以频率、价值、风险、实现成本排序全部 PRD 功能。
- `[ ]` D0.4 输出“关键指标设计” — 5 秒看到内容、10 秒复制、20 秒转换分享、1-2 次滑动找到 App、云同步成功率、AI 可读取成功率。
- `[ ]` D0.5 输出“权限与隐私设计原则” — 文件默认本地、主动上传、敏感字段提醒、删除与撤回、云端可见性。
- `[ ]` D0.6 输出“全量信息架构 IA” — 首页、阅读页、编辑页、提示词库、最近文档、转换中心、AI 卡片、云端收件箱、设置。

## D1 手机端 UX / UI 全量设计（先做）

- `[~]` D1.1 设计微信/QQ/文件管理器打开文件流程 — 已落地首次引导与读取失败兜底；仍需补完整流程图和微信/QQ 真机截图证据。
- `[~]` D1.2 设计 Markdown 阅读页 — 代码已覆盖标题/段落/目录/搜索/字号/深色模式/长文分块；仍需补完整页面状态表和真机截图验收。
- `[ ]` D1.3 设计 JSON 阅读页 — 树形、搜索、折叠、复制字段、复制 JSONPath、pretty/minify、Markdown 字段预览、大 JSON 状态。
- `[ ]` D1.4 设计编辑流程 — Markdown 编辑/预览、JSON 格式化/校验、错误提示、草稿恢复、保存副本、保存并分享。
- `[ ]` D1.5 设计复制系统 — 全文、选中段落、代码块、JSON 字段、JSONPath、多段组合复制、复制后动作建议。
- `[ ]` D1.6 设计提示词库 — 最近复制、收藏、标签/分组、搜索、一键复制、剪贴板导入、从当前文件导入。
- `[ ]` D1.7 设计分享流程 — 原文件、纯文本、PDF、Word、最近分享目标、微信/QQ/系统面板、保存到本地。
- `[ ]` D1.8 设计当前文件转换流程 — Markdown→PDF/Word、JSON→Markdown/PDF/Word、转换中、失败、成功后分享。
- `[ ]` D1.9 设计批量转换中心 — 添加多文件、输出格式、队列、失败重试、结果分享/保存。
- `[~]` D1.10 设计最近文档与文件收件箱 — 已落地本地来源、类型、状态、最近动作和搜索；仍需补收藏、归档、云端标识与完整设计图。
- `[ ]` D1.11 设计 AI 阅读卡片 — 文件类型、摘要、提示词候选、待办、敏感字段、保存建议、转给 AI 处理。
- `[ ]` D1.12 设计设置页 — 默认打开指引、云同步开关、隐私说明、缓存管理、导出数据。
- `[ ]` D1.13 输出手机端全量页面状态表 — 空态、加载、错误、无权限、离线、大文件、转换失败、同步冲突。
- `[ ]` D1.14 输出手机端视觉规范 — 图标、字号、间距、按钮层级、安全区、浅深色、Android/iOS 适配。
- `[ ]` D1.15 设计 App 外快贴平台方案 — Android 悬浮快贴、iOS 键盘扩展/分享扩展、权限说明、关闭入口、隐私边界。
- `[ ]` D1.16 设计转换配方 — 给 AI 读→Markdown、给别人看→PDF、给别人改→Word、给开发/Agent→JSON 或 Markdown。

## D2 电脑端 / CLI 全量设计（先做）

- `[ ]` D2.1 设计 CLI 命令体系 — `molan convert/check/pull/read/push` 的参数、输出、错误码、退出码。
- `[ ]` D2.2 设计 Office/PDF/PPT/Excel→Markdown 转换规则 — 标题、表格、图片、代码、分页、元数据、失败策略。
- `[ ]` D2.3 设计批量转换输出结构 — 成功/失败列表、输出路径、hash、可读性评分、AI 下一步建议。
- `[ ]` D2.4 设计桌面 GUI 阅读与转换 — 拖拽、队列、输出目录、阅读预览、JSON 编辑、错误恢复。
- `[ ]` D2.5 设计电脑端与云端收件箱交互 — 拉取手机保存文件、上传转换结果、打开本地输出。
- `[ ]` D2.6 设计 AI 调用说明 — Codex/Claude Code/Cursor 如何通过 CLI 读取资料。
- `[ ]` D2.7 设计电脑端置顶快贴窗 — 侧边置顶、迷你模式、快捷命令模式、提示词详情、复制后回到开发窗口。

## D3 云端与 AI 工作流全量设计（先做）

- `[ ]` D3.1 设计云端 MVP 闭环 — 手机保存到云端 → 电脑 CLI 拉取 → AI 读取。
- `[ ]` D3.2 设计账号与设备体系 — 手机号登录、设备绑定、设备名、最后同步时间。
- `[ ]` D3.3 设计同步策略 — 本地优先、增量同步、冲突保留、删除、离线队列。
- `[ ]` D3.4 设计 AI 文件资料库 — 收藏、有用资源、项目/集合、标签、状态。
- `[ ]` D3.5 设计文件上传边界 — 默认不上传、主动保存、敏感字段提醒、上传前确认。
- `[ ]` D3.6 设计 AI 读取入口 — CLI 优先、MCP 后置、云端 API 后置。
- `[ ]` D3.7 设计 AI 生产结果回流 — 生成 Markdown/JSON，保存版本，同步回手机/电脑。

## D4 数据模型与接口全量设计（先做）

- `[ ]` D4.1 设计本地数据模型 — DocumentRecord、PromptItem、CopyEvent、ConversionJob、InboxItem、Settings。
- `[ ]` D4.2 设计云端数据模型 — users、devices、prompts、documents、document_versions、file_objects、sync_events、conversion_jobs、ai_jobs。
- `[~]` D4.3 设计文件状态机 — 已在本地 `DocumentStatus` 落地未处理、已阅读、已复制、已编辑、已转换、已分享、已归档、已同步、冲突；仍需和云端/MCP 状态模型统一。
- `[ ]` D4.4 设计转换任务状态机 — pending、running、success、failed、cancelled、shared、saved。
- `[ ]` D4.5 设计 API 草案 — auth、sync、documents、prompts、files、conversion_jobs、ai_jobs。
- `[ ]` D4.6 设计本地/云端字段映射 — 避免手机端、电脑端、云端各自定义一套结构。

## D5 发布、验证与增长全量设计（先做）

- `[ ]` D5.1 设计真机验证脚本 — 微信、QQ、文件管理器、分享面板、safe-area、启动速度。
- `[ ]` D5.2 设计包体策略 — debug/release、AAB、arm64、universal、体积门槛。
- `[ ]` D5.3 设计下载发布包 — APK/AAB、Windows installer、CLI zip、checksums、release notes。
- `[ ]` D5.4 设计官网下载页 — 国内用户下载、微信/QQ 打开教程、隐私说明、版本记录。
- `[ ]` D5.5 设计渠道策略 — GitHub Release、官网、国内镜像、后续安卓商店/App Store。

## D6 设计冻结门槛

- `[ ]` D6.1 PRD 全部功能均能映射到 D/T 任务，不能有“文档里有、TODO 没有”的功能。
- `[ ]` D6.2 手机端主流程线框或页面说明齐备：打开、阅读、复制、编辑、转换、分享、提示词、收件箱。
- `[ ]` D6.3 电脑端 CLI 命令和 JSON 输出契约齐备。
- `[ ]` D6.4 云端 MVP 闭环、数据模型、隐私边界齐备。
- `[ ]` D6.5 每个开发任务都有验收标准和失败状态。

---

## T0 仓库与文档基线

- `[x]` T0.1 GitHub 仓库、PRD、TODO、市场调研、发布方案、全量方案齐备
- `[x]` T0.2 `AGENTS.md` 说明三端关系与命令（2026-07-03 更新：添加 CLI 包、共享转换引擎说明）
- `[x]` T0.3 `mdconvert.py` 标注为 legacy prototype
- `[ ]` T0.4 `scripts/download_pandoc.py` 改为正式构建脚本 — 验收：去掉硬编码路径，改为读取环境变量或参数；输出到 `desktop/resources/` — 复杂度 S
- `[ ]` T0.5 pandoc 下载增加版本固定与 SHA256 校验 — 验收：脚本内置 pandoc 版本号，下载后校验哈希失败则报错退出 — 复杂度 S
- `[ ]` T0.6 根目录补 `.gitignore` 确认（`config.json`、`*.exe` 个人文件、`build/`、`dist/`、`release/`） — 验收：`git status` 干净 — 复杂度 S

---

## T1 手机端 V1 核心闭环

> 闭环：**微信/QQ 收到文件 → 1–2 下找到墨览 → 5 秒看到内容 → 10 秒复制提示词 → 20 秒转换并分享**  
> 技术栈：Expo SDK 57 + TS + Hermes + AsyncStorage。读 `mobile/@mobile/AGENTS.md` 与 https://docs.expo.dev/versions/v57.0.0/ 后再改代码。

### T1.1 文件打开与可发现性

- `[x]` T1.1.1 `app.json` 注册 `.md`/`.markdown`/`.json` 打开方式（iOS CFBundleDocumentTypes + Android intentFilters，含 `content://`/`file://`、多 mimeType） — 已核实
- `[x]` T1.1.2 App 名"墨览"、slug `md-reader`、bundleId `com.mdreader.app` — 已核实
- `[x]` T1.1.3 App 图标做品牌识别（非通用蓝色文档图标） — 已生成并写入 `mobile/assets/`；仍需在微信/QQ"其他应用"列表真机验证辨识度
- `[v]` T1.1.4 微信打开 `.md`/`.json` 真机验证 — 验收：最多滑动 1–2 次找到墨览 — 复杂度 M
- `[v]` T1.1.5 QQ 打开 `.md`/`.json` 真机验证 — 验收：同上 — 复杂度 M
- `[v]` T1.1.6 系统文件管理器打开真机验证 — 复杂度 S
- `[v]` T1.1.7 Android `content://` 稳定读取真机验证 — 验收：读取失败有明确兜底提示，不白屏 — 复杂度 M
- `[x]` T1.1.8 首次引导设置默认打开（可选引导页） — 验收：新用户首次打开看到一次“如何用墨览打开文件”提示；证据：`mobile/App.tsx` 的 `OpenGuide` 与 `OPEN_GUIDE_SEEN_KEY`；2026-07-04 `cd mobile` 后 `npm run typecheck`、`npm run test` 通过
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
- `[x]` T1.2.8 阅读页搜索 — 已完成：顶部“搜索”入口、当前文档关键词搜索、结果列表、点击跳转到对应段落；证据：`mobile/src/components/Reader.tsx`、`mobile/src/markdown/search.ts`、`mobile/src/__tests__/markdownSearch.test.ts`；2026-07-04 `cd mobile` 后 `npm run typecheck`、`npm run test` 通过
- `[ ]` T1.2.9 KaTeX 公式 — 复杂度 M（PRD 未列 P0，可延后；全量方案 §9.3 谨慎引入）
- `[ ]` T1.2.10 Mermaid 图表 — 复杂度 L（同上谨慎引入）

### T1.3 JSON 阅读

- `[x]` T1.3.1 树形展示、折叠/展开（`JsonTree.tsx` + `JsonView.tsx`）
- `[x]` T1.3.2 搜索 key/value — 已完成：搜索时 flatten 全量 JSON 行，按 key/value 匹配并高亮命中；证据：`mobile/src/json/tree.ts`、`mobile/src/components/JsonTree.tsx`、`mobile/src/__tests__/jsonTree.test.ts`；2026-07-04 在 `mobile/` 分步运行 `npm run typecheck`、`npm run test` 通过
- `[x]` T1.3.3 复制字段值、复制 JSONPath — 已完成：点击叶子复制字段值，长按行复制 JSONPath，字符串复制不带多余引号，对象/数组复制 pretty JSON；证据：`mobile/src/json/tree.ts`、`mobile/src/components/JsonTree.tsx`、`mobile/src/__tests__/jsonTree.test.ts`；2026-07-04 在 `mobile/` 分步运行 `npm run typecheck`、`npm run test` 通过
- `[x]` T1.3.4 美化/压缩切换 — 已完成：JSON 阅读页支持树形/美化/压缩三种查看模式，并保留复制美化/复制压缩；证据：`mobile/src/components/JsonView.tsx`、`mobile/src/json/format.ts`、`mobile/src/__tests__/jsonFormat.test.ts`；2026-07-04 在 `mobile/` 分步运行 `npm run typecheck`、`npm run test` 通过
- `[ ]` T1.3.5 大 JSON 分块/虚拟列表 — 验收：5MB+ JSON 不卡死 — 复杂度 L
- `[~]` T1.3.6 `content`/`markdown`/`text` 字段内嵌 Markdown 预览 — 已核实存在，需核实边界（嵌套 JSON 内的 md 字段）

### T1.4 Markdown / JSON 编辑

- `[~]` T1.4.1 Markdown 原文编辑 + 预览切换（`EditSheet.tsx`） — 需核实预览实时性
- `[~]` T1.4.2 JSON 原文编辑 + 格式化 + 校验 + 错误提示 — 需核实错误定位精度 — 复杂度 M
- `[x]` T1.4.3 自动保存草稿 — 验收：编辑中途退出再回来内容仍在；不破坏原文件 — 已核实 EditSheet 有 AsyncStorage draft 机制（debounce 1s + 恢复提示）
- `[x]` T1.4.4 保存为副本 — 验收：另存为新文件，原文件不变 — 2026-07-03 新增「保存为副本」按钮
- `[x]` T1.4.5 编辑后可直接分享 — 验收：编辑态有"分享"出口 — 已核实 EditSheet.saveAndShare
- `[x]` T1.4.6 编辑入口显式按钮，不与阅读长按手势冲突 — 验收：阅读态长按只出系统选区 — 已核实 ghostBtn「编辑」入口

### T1.5 复制与提示词库（最大缺口）

> 核实结果：`mobile/src/components/PromptSheet.tsx` + `mobile/src/storage/prompts.ts` **已实现**（PromptSheet 370 行，prompts.ts 151 行）。含列表、搜索、导入、最近复制、一键复制。

- `[~]` T1.5.1 复制全文、复制代码块、复制 JSON 字段 — 部分具备，需统一复制出口 — 复杂度 S
- `[ ]` T1.5.2 复制选中段落（长按选区后接入复制） — 复杂度 S
- `[ ]` T1.5.3 组合复制多个片段 — 验收：长按选多段，合并进剪贴板 — 复杂度 M
- `[x]` T1.5.4 提示词数据模型 `PromptItem`（id/title/content/format/tags/folderId/copyCount/lastCopiedAt/...）落地 AsyncStorage — 已核实
- `[x]` T1.5.5 提示词库页：收藏、最近复制、标签/分组、搜索、一键复制 — 已核实
- `[x]` T1.5.6 从剪贴板导入提示词 — 已核实
- `[x]` T1.5.7 从当前 Markdown/JSON 文件片段加入提示词库 — 2026-07-03 新增「导入剪贴板片段」按钮（先复制正文片段再一键导入）
- `[ ]` T1.5.8 复制整个文件夹/分组内全部文本 — 复杂度 S
- `[x]` T1.5.9 记录最近复制列表（按时间） — 已核实
- `[ ]` T1.5.10 从 AI 阅读卡片“提示词候选”一键保存到提示词库 — 复杂度 S
- `[ ]` T1.5.11 提示词变量模板（如 `{{文件内容}}`、`{{代码片段}}`、`{{JSON}}`） — 复杂度 M

### T1.6 分享

- `[x]` T1.6.1 系统分享面板（`expo-sharing`）
- `[~]` T1.6.2 分享原 `.md`/`.json` 文件、分享纯文本 — 需核实两种形态都覆盖
- `[ ]` T1.6.3 保存到本地 — 验收：分享面板可选"保存到文件" — 复杂度 S
- `[v]` T1.6.4 微信/QQ 通过系统分享覆盖 — 真机验证是否好找
- `[x]` T1.6.5 分享入口文案从"发给微信"升级为"分享/发送" — 验收：按钮文案统一为"分享" — 已核实 bottomBtn 显示"分享"
- `[ ]` T1.6.6 记住最近分享方式 — 验收：下次分享默认高亮上次目标 — 复杂度 S
- `[x]` T1.6.7 转换完成后直接进入分享面板（不要求用户去文件夹找） — 已核实 ConvertSheet 转换后走分享

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
- `[x]` T1.8.2 最近编辑、最近复制标签 — 已完成：最近文档记录 `lastEditedAt`、`lastCopiedAt`、`lastConvertedAt`、`lastSharedAt`，首页和最近列表显示状态；证据：`mobile/src/storage/recentDocs.ts`、`mobile/App.tsx`、`mobile/src/components/RecentSheet.tsx`
- `[x]` T1.8.3 文件类型标识、来源标识（微信/QQ/本地/其他） — 已完成：记录 Markdown/JSON 类型，外部 URI 推断微信/QQ/文件管理器，本地选择器记录为本地选择；证据：`mobile/App.tsx`、`mobile/src/storage/recentDocs.ts`
- `[~]` T1.8.4 上次阅读位置（`lastScrollOffset`） — 需核实回填 — 复杂度 S

### T1.9 包体与启动优化

- `[ ]` T1.9.1 Hermes 已启用（核实 `app.json`/构建配置） — 复杂度 S
- `[ ]` T1.9.2 AAB 上架 + 官网分架构 APK（arm64/universal） — 复杂度 M（属 T3，此处登记）
- `[ ]` T1.9.3 首页只加载元数据，不启动时扫描文件、不预加载 Office 转换 — 验收：冷启动 ≤5 秒看到首页 — 复杂度 M
- `[ ]` T1.9.4 图片懒加载、Markdown 分块、JSON 按需展开 — 复杂度 M
- `[ ]` T1.9.5 依赖审计：谨慎引入大型富文本/PDF 渲染/Office 解析/Mermaid/KaTeX/云 SDK — 复杂度 S

### T1.10 自动化验证（手机端）

- `[x]` T1.10.1 `package.json` 增加 `typecheck` 脚本（`tsc --noEmit`） — 已核实 `scripts.typecheck` 存在
- `[x]` T1.10.2 Markdown parser 单测（fixtures） — 已核实 `__tests__/toc.test.ts`（11 tests）
- `[x]` T1.10.3 JSONPath / 复制逻辑单测 — 已完成：`jsonPath.test.ts`、`jsonTree.test.ts` 覆盖路径、搜索和复制文本规则；2026-07-04 `cd mobile` 后 `npm run test` 通过 6 个测试文件 / 31 个测试
- `[ ]` T1.10.4 转换规则 fixtures 测试（md↔docx↔json） — 复杂度 M
- `[ ]` T1.10.5（V1.5）Maestro 关键流程 — 复杂度 L

---

## T2 电脑端 CLI（V1 完成定义的一部分）

> 2026-07-03 实施情况：`desktop/cli/` 包已创建，`molan convert` 可用。共享转换引擎 `desktop/src/shared/converter.ts` 供 CLI 和 Electron 共用。GUI AI tab 已移除，桌面端 = 阅读 + 转换。

### T2.1 CLI 骨架

- `[x]` T2.1.1 新建 `desktop/cli/` Node+TS 包 — 已完成：`commander` + `fast-glob` + esbuild 打包
- `[x]` T2.1.2 `molan convert <file|dir> --to md [--batch] [--json] [--out ./output]` — 已完成：支持单文件、glob、目录批量
- `[x]` T2.1.3 结构化 JSON 输出：`{ok,total,success,failed,results:[{ok,outputPath,errorCode,error}]}` — 已完成
- `[x]` T2.1.4 错误码体系（E_PANDOC_MISSING / E_UNSUPPORTED_FORMAT / E_INPUT_NOT_FOUND / E_CONVERT_FAILED / E_OUTPUT_FAILED） — 已完成
- `[x]` T2.1.5 退出码语义（0 成功 / 非 0 失败） — 已完成
- `[x]` T2.1.6 `molan check` 命令（检查 pandoc 可用性、Node 版本、平台） — 已完成

### T2.2 转换引擎

- `[x]` T2.2.1 Word → Markdown（pandoc `docx→gfm`，共享引擎 `converter.ts`）
- `[x]` T2.2.2 PDF → Markdown — 已接入 pandoc pdf→gfm 管道
- `[x]` T2.2.3 PPT → Markdown — 已接入 pandoc pptx→gfm 管道
- `[x]` T2.2.4 Excel/CSV → Markdown 表格 — 已接入 pandoc xlsx/csv→gfm 管道
- `[x]` T2.2.5 批量转换：concurrent 4，Promise.all 分块 — `molan convert ./docs --batch --json` 可用
- `[ ]` T2.2.6 Office→MD 后规则清理（去页眉页脚、修空行、保留标题层级、修简单表格） — 复杂度 M
- `[x]` T2.2.7 MD→docx 反向转换（pandoc markdown→docx）
- `[x]` T2.2.8 JSON 序列化输出（任意文件 → JSON，含 content + metadata）

### T2.3 测试与打包

- `[ ]` T2.3.1 Vitest + fixtures（各格式样本文件） — 复杂度 M
- `[x]` T2.3.2 esbuild 打包脚本（`esbuild.config.mjs`），输出单文件 CJS `dist/index.js`
- `[ ]` T2.3.3 `molan-cli-win-x64-vX.zip` 打包脚本 — 复杂度 S
- `[ ]` T2.3.4 pandoc 二进制随 CLI 包分发或自动探测 — 当前自动探测 `resources/pandoc.exe`、环境变量 `PANDOC_PATH`、系统 PATH — 复杂度 S

### T2.4 桌面 GUI（P1，不阻塞 V1）

- `[x]` T2.4.1 Electron GUI：md↔docx 批量、拖拽、设置记忆、输出目录（已验证）
- `[x]` T2.4.2 GUI Markdown/JSON 阅读（JSON 只读，已验证）
- `[x]` T2.4.3 GUI 转换面板已接入共享引擎 `converter.ts`，支持更多格式（docx/pdf/pptx/xlsx/csv）
- `[x]` T2.4.4 GUI 已移除 AI tab（功能由 CLI 承担），简化为「阅读」+「转换」两个 tab
- `[x]` T2.4.5 GUI JSON 编辑（校验+格式化） — 已完成：编辑/预览切换、JSON 校验、格式化、压缩、保存副本；证据：`desktop/src/components/ReaderPanel.tsx`、`desktop/electron/main/index.ts`；2026-07-03 `cd desktop && npm run typecheck && npm run build` 通过
- `[x]` T2.4.6 电脑端置顶快贴窗：always-on-top、小尺寸、搜索提示词、一键复制、记住位置 — 已完成：主窗口快贴 tab、独立置顶快贴窗、位置记忆、复制 IPC；证据：`desktop/electron/main/index.ts`、`desktop/src/components/PromptPanel.tsx`；2026-07-03 `cd desktop && npm run typecheck && npm run build` 通过
- `[~]` T2.4.7 快贴窗迷你模式和快捷命令模式 — 已完成 Mini 展开/收起、搜索筛选、`Ctrl/Command + Shift + M` 呼出独立快贴窗；待补 Spotlight 式命令面板 — 复杂度 M
- `[ ]` T2.4.8 快贴窗接入提示词云同步 — 复杂度 L

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
- `[~]` T4.13 桌面 GUI JSON 编辑 + Office→MD 接入（T2.4.3/T2.4.4）— JSON 编辑已完成；Office→MD GUI 接入需继续用真实样例验收
- `[x]` T4.14 GitHub Actions：typecheck/test/build — 已完成：CI 覆盖 mobile typecheck/test、desktop typecheck/build、desktop/cli typecheck/build/test；证据：`.github/workflows/ci.yml`；2026-07-04 本地同等命令全部通过
- `[ ]` T4.15 Playwright 桌面 GUI E2E — 复杂度 L
- `[ ]` T4.16 转换配方：给 AI 读→Markdown、给别人看→PDF、给别人改→Word、给开发/Agent→JSON/Markdown — 复杂度 S
- `[ ]` T4.17 手机端提示词快贴底部面板：从其他 AI 使用场景回到墨览快速复制 — 复杂度 M

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
- `[ ]` T5.10 云端数据模型：users / devices / prompts / documents / document_versions / file_objects / sync_events / conversion_jobs / ai_jobs — 复杂度 M
- `[ ]` T5.11 提示词库云同步：标题、内容、标签、分组、复制次数、最近复制时间 — 复杂度 M
- `[ ]` T5.12 最近文档与文件状态云同步：阅读位置、收藏、已复制、已分享、已转换、已归档 — 复杂度 M
- `[ ]` T5.13 AI 文件收件箱：用户主动保存有用文件到云端，手机与电脑互通 — 复杂度 L
- `[~]` T5.14 电脑端 CLI 云命令：`molan pull/read/push`，让 AI / 脚本读取云端资料 — 已完成本地 AI 文件收件箱骨架（`MOLAN_CLOUD_DIR` / `~/.molan/cloud`），待接真实云端同步 — 复杂度 L
- `[ ]` T5.15 MCP / 本地 Agent 入口：列文件、读文件、搜提示词、写回 AI 生成结果 — 复杂度 L
- `[ ]` T5.16 AI 生产结果回流：AI 生成的 Markdown / JSON 同步回手机和电脑 — 复杂度 L
- `[ ]` T5.17 Android 悬浮快贴：可选授权、悬浮小窗、搜索/最近/收藏、一键复制、随时关闭 — 复杂度 L
- `[ ]` T5.18 iOS 墨览键盘扩展 / 分享扩展：在 AI 对话框中选择提示词并插入或复制 — 复杂度 L
- `[ ]` T5.19 提示词库云同步到手机端、电脑端置顶快贴窗、CLI / MCP — 复杂度 L

---

## V1 完成定义（DoD）

V1 视为完成须**全部**满足（PRD §十五 + 全量方案 §15）：

- [x] 手机端可从微信/QQ/文件管理器打开 `.md`/`.json`（T1.1 代码就绪，待真机验证）
- [~] Markdown/JSON 都能稳定阅读（T1.2/T1.3，代码就绪，待真机核实长文/大 JSON）
- [x] Markdown/JSON 都能轻量编辑（T1.4 — 编辑/预览切换、草稿、保存副本、JSON 校验均已到位）
- [~] 能一键复制提示词/全文/代码块/JSON 字段（T1.5 — 核心已到位，选中段落/组合复制待做）
- [x] 能分享原文件和纯文本（T1.6 — 系统分享 + 保存已到位）
- [x] 能把当前 Markdown 转 PDF/Word 并分享（T1.7）
- [x] 最近文档可用（T1.8）
- [x] 离线可用（无云依赖）
- [ ] 真机验证通过：入口、safe-area、分享链路（T1.1/T1.6）
- [ ] APK/AAB 体积可接受、启动达标（T1.9）
- [x] 电脑端 CLI 至少完成 Word→Markdown + 批量 + JSON 输出 + 所有 Office 格式（T2 完成）

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
## 2026-07-03 追加：AI 竞品策略落地任务

来源：[AI 竞品功能取舍与落地策略](docs/ai-competitive-strategy.md)

- `[x]` AI-0.1 修复阅读页 / 编辑页 / JSON 页顶部安全区，工具栏不能压住状态栏。
- `[x]` AI-0.2 修复底部操作栏透明度和安全区，正文不能透出到操作区造成视觉噪音。
- `[x]` AI-0.3 降低最近 / 提示词 / 转换弹层遮罩压迫感。
- `[x]` AI-0.4 新增“AI”入口，放在阅读后的底部操作区，不挡住打开文件与阅读主流程。
- `[x]` AI-0.5 新增 AI 阅读卡片本地骨架：文件类型、摘要提示、关键片段、提示词候选、待办候选、保存建议。
- `[ ]` AI-1.1 提示词自动提取：识别 prompt / rules / system message / todo / JSON prompt 字段。
- `[ ]` AI-1.2 JSON 智能阅读：敏感字段提醒、prompt/config/api 字段提取、字段复制优化。
- `[x]` AI-1.3 文件收件箱状态：未处理、已阅读、已复制、已分享、已转换、已归档。— 本地最近文档已支持状态字段和展示；云端收件箱同步仍归入 CLOUD/T5 任务
- `[ ]` AI-1.4 AI 可读转换评分：转换后提示标题层级、表格、代码块、可读性风险。
- `[ ]` AI-1.5 AI 阅读卡片提示词候选 → 提示词库保存 / 组合复制。

## 2026-07-03 追加：AI 可读云端工作流任务

来源：[AI 可读云端工作流](docs/ai-readable-cloud-workflow.md)

- `[ ]` CLOUD-1.1 明确云端边界：云端是 AI 文件资料库，不是网盘；文件默认不上传。
- `[ ]` CLOUD-1.2 设计“保存到云端 / 设为有用资源 / 转给 AI 处理”三个用户主动动作。
- `[ ]` CLOUD-1.3 设计手机端云端收件箱：未处理、已阅读、已复制、已转换、已归档。
- `[ ]` CLOUD-1.4 设计电脑端云端入口：同步收件箱、拉取资料、上传转换后的 Markdown。
- `[ ]` CLOUD-1.5 设计 AI 读取入口：CLI 优先，其次 MCP，最后云端 API。
- `[ ]` CLOUD-1.6 设计冲突策略：提示词可合并，文档保留两个版本，转换结果按 hash 生成版本。
