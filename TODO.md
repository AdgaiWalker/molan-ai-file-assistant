# TODO：墨览 全量可执行任务拆解

版本：v4  
日期：2026-07-04  
依据：`PRD.md`、`docs/full-plan.md`、当前工作区实现状态  
目标：从 0 到发布、增长、云端 AI、团队化，把墨览完整做完。  

> 本文件是唯一任务源（合并自原 `TODO.md` 的 D 层设计任务 + 原 `executable-todo.md` 的 S 层开发阶段）。每个任务都要能被领取、开发、验证、关闭。

## 0. 执行口径

### 0.1 产品一句话

墨览的最终目标是：**把微信、QQ、电脑、本地、GitHub 等地方散落的 Markdown / JSON / Office 文件整理成 AI 能读取、人能阅读、能编辑、能转换、能分享的内容。**

### 0.2 端侧定位

| 端 | 定位 | 第一目标 | 不承担 |
|---|---|---|---|
| 手机 App | AI 文件与提示词手机工作台 | 快速打开、阅读、复制、轻编辑、转格式、分享 | 不做完整办公套件，不做重型知识库 |
| 电脑 CLI | AI 可调用的文件转换脚本 | Word / PDF / Excel / PPT 转 Markdown 给 AI 读取 | 不做复杂 UI |
| 电脑 GUI | 人用轻量转换与阅读器 | 批量转换、轻阅读、轻编辑 | 不抢手机端主流程 |
| 后端 | 可选备份、同步、AI 识别 | 用户主动开启的数据找回与增强 | V1 不默认上传 |

### 0.3 优先级定义

| 优先级 | 含义 | 关闭标准 |
|---|---|---|
| P0 | 不做就不能成立 | V1 必须完成并验证 |
| P1 | 显著提升办公效率 | V1.5 完成 |
| P2 | 云端、AI、跨设备增强 | V2 完成 |
| P3 | 团队、商业化、生态 | V3 或更晚 |

### 0.4 状态标记

| 标记 | 含义 |
|---|---|
| `[x]` | 已完成且有代码或文档证据 |
| `[~]` | 已有基础，但还缺验收、边界或体验补齐 |
| `[v]` | 需要真机或真实环境验证 |
| `[ ]` | 待做 |
| `[!]` | 风险项，必须在进入下一阶段前处理 |

### 0.5 全局原则

- 阅读先于识别：打开文件后先看到内容，识别、推荐、备份、AI 增强都不能挡住阅读。
- 离线优先：V1 的打开、阅读、编辑、复制、最近文档、提示词、基础转换、分享都本地完成。
- 国内优先：微信、QQ 是 P0；飞书、钉钉、企业微信、百度网盘、夸克网盘是 P1；海外社交平台先走系统分享。
- TypeScript 优先：移动端、桌面端、CLI、未来后端尽量统一 TypeScript。
- 手机轻、电脑重：手机保留轻转换；Office / PDF / PPT / Excel 的重转换主要交给电脑 CLI。
- 不默认上传：云备份、AI 识别、同步必须用户主动开启。
- 不写无意义兼容代码：没有明确历史包袱时，直接按当前目标实现。
- 真机优先验收：Chrome/Expo Web 可用于 UI 调试，但微信/QQ 打开、分享、可发现性、safe-area 必须真机验证。

### 0.6 选定 UI 基线

本轮选用低饱和 Apple 玻璃质感 UI 作为后续设计和开发基准。

| 端 | 基准图 | 设计裁定 |
|---|---|---|
| 手机端 | `docs/assets/selected-mobile-ui.png` | 首页、Markdown 阅读、JSON 阅读、编辑、提示词快贴、转换中心、AI 可读卡片、云端收件箱按此视觉方向推进 |
| 电脑端 | `docs/assets/selected-desktop-ui.png` | 置顶快贴窗、Mini 模式、快捷命令、提示词详情、拖拽转换、AI/CLI 连接状态按此视觉方向推进 |

视觉原则：

- 低饱和、玻璃质感、白银色基调，蓝色只用于主动作。
- 阅读区域必须保持高对比，玻璃效果只服务层级，不干扰正文。
- 手机端不把微信/系统打开页当作 App UI，只把它们作为入口场景证据。
- 电脑端不做完整办公套件，核心是置顶快贴 + 转换 + AI/CLI 连接。

### 0.7 PRD 冲突裁定（决策记录，不再复议）

这三条是对 PRD 内部矛盾的最终裁定，后续开发按此执行：

1. **批量转换中心归属**：PRD §十七 列其为"当前最高优先级 #7"，但 §七 与 §十八 明确归入 V1.5。**裁定归 S6（V1.5）**，V1 先做"当前文件转换后直接分享"。§十七 的 #7 应理解为"V1.5 起步项"而非 V1 阻塞项。
2. **电脑端是否进 V1**：PRD §十二 称"电脑端不进入 V1 主线"，但 §十八.8 与 full-plan §15 把电脑端 CLI 脚本纳入 V1 完成定义。**裁定：§十二 指桌面 GUI 体验不进 V1 主线；CLI 脚本（Word→MD + 批量 + JSON 输出）属 V1（S2）**，因为它是 AI 工作流补充而非手机端社交分享主流程。
3. **JSON 转办公格式**：PRD §七 P0 列 JSON→PDF/MD/Word，但 §十八.1 把 JSON 转文档排到 V1.5。**裁定**：V1 只做 JSON→Markdown（规则化），JSON→PDF/Word 排 S6，避免低质量文档。

### 0.8 设计任务层（D0-D6，先于开发完成）

本项目坚持"先全量设计，再分端开发"。下面的 D 层任务是设计产出，必须在进入对应 S 开发阶段前完成。D 层与 S 层的对应关系见 §1 阶段总览。

**D0 全量产品设计基线**
- `[x]` D0.1 重写一版"端到端使用场景地图" — 证据：`docs/design/end-to-end-scenario-map.md` 覆盖微信/QQ 收文件、本地电脑创建、GitHub 下载、Office 转换、提示词复制、AI 读取、结果回流，并映射 PRD 核心场景。
- `[x]` D0.2 输出"功能边界裁定表" — 证据：`docs/design/feature-boundary-decision-table.md` 明确做什么、不做什么、V1/V1.5/V2/V3 分界，并保留 PRD 冲突裁定。
- `[x]` D0.3 输出"用户任务优先级矩阵" — 证据：`docs/design/user-task-priority-matrix.md` 按频率、价值、风险、实现成本排序 V1/V1.5/V2/V3 主要 PRD 功能，并映射 TODO 阶段。
- `[x]` D0.4 输出"关键指标设计" — 证据：`docs/design/key-metrics-design.md` 定义 5 秒看到内容、10 秒复制、20 秒转换分享、1-2 次滑动找到 App、云同步成功率、AI 可读取成功率和证据模板。
- `[x]` D0.5 输出"权限与隐私设计原则" — 证据：`docs/design/permission-privacy-principles.md` 定义文件默认本地、主动上传、敏感字段提醒、删除与撤回、云端可见性和权限触发时机。
- `[x]` D0.6 输出"全量信息架构 IA" — 证据：`docs/design/information-architecture.md` 覆盖首页、阅读页、编辑页、提示词库、最近文档、转换中心、AI 卡片、云端收件箱、设置和电脑端入口。

**D1 手机端 UX / UI 全量设计**
- `[v]` D1.1 设计微信/QQ/文件管理器打开文件流程 — 证据：`docs/design/mobile-open-flow.md` 已补微信/QQ/文件管理器流程图、失败状态和真机验证脚本；当前 `adb devices` 无连接设备，仍需补微信/QQ 真机截图或录屏后改 `[x]`。
- `[v]` D1.2 设计 Markdown 阅读页 — 证据：`docs/design/mobile-markdown-reader-page.md` 已补页面结构、完整状态表和真机验收脚本；当前无连接设备，仍需补真机截图/录屏后改 `[x]`。
- `[x]` D1.3 设计 JSON 阅读页 — 证据：`docs/design/mobile-json-reader-page.md` 覆盖树形、搜索、折叠、复制字段、复制 JSONPath、pretty/minify、Markdown 字段预览、大 JSON 状态和 JSONPath 规则。
- `[x]` D1.4 设计编辑流程 — 证据：`docs/design/mobile-edit-flow.md` 覆盖 Markdown 编辑/预览、JSON 格式化/校验、错误提示、草稿恢复、保存副本、保存并分享，并明确非法 JSON 不覆盖原文件。
- `[x]` D1.5 设计复制系统 — 证据：`docs/design/mobile-copy-system.md` 覆盖全文、选中段落、代码块、JSON 字段、JSONPath、多段组合复制、复制后动作建议、反馈和隐私边界。
- `[x]` D1.6 设计提示词库 — 证据：`docs/design/mobile-prompt-library.md` 覆盖最近复制、收藏、标签/分组、搜索、一键复制、剪贴板导入、从当前文件导入、片段导入和隐私边界。
- `[x]` D1.7 设计分享流程 — 证据：`docs/design/mobile-share-flow.md` 覆盖原文件、纯文本、PDF、Word、最近分享目标、微信/QQ/系统面板、保存到本地、失败状态和真机验收脚本。
- `[x]` D1.8 设计当前文件转换流程 — 证据：`docs/design/mobile-current-file-conversion.md` 覆盖 Markdown→PDF/Word、JSON→Markdown/PDF/Word、转换中、失败、成功后分享、输出命名和验收脚本。
- `[x]` D1.9 设计批量转换中心 — 证据：`docs/design/mobile-batch-conversion-center.md` 覆盖添加多文件、输出格式、队列、失败重试、结果分享/保存，并明确归 V1.5。
- `[x]` D1.10 设计最近文档与文件收件箱 — 证据：`docs/design/mobile-recent-inbox.md` 覆盖本地来源、类型、状态、最近动作、搜索、收藏、归档、云端标识与完整收件箱结构。
- `[x]` D1.11 设计 AI 阅读卡片 — 文件类型、摘要、提示词候选、待办、敏感字段、保存建议、转给 AI 处理。证据：`docs/design/mobile-ai-reading-card.md` 覆盖卡片结构、文件类型识别、提示词/待办提取、敏感字段提醒、保存建议、V2 转给 AI 处理隐私边界；与 PRD “AI 阅读卡片 / 文件不默认上传”一致。
- `[x]` D1.12 设计设置页 — 默认打开指引、云同步开关、隐私说明、缓存管理、导出数据。证据：`docs/design/mobile-settings-page.md` 覆盖入口、微信/QQ 默认打开指引、云同步默认关闭、隐私说明、缓存清理、数据导出 JSON 边界；与 PRD 本地优先、文件不默认上传一致。
- `[ ]` D1.13 输出手机端全量页面状态表 — 空态、加载、错误、无权限、离线、大文件、转换失败、同步冲突。
- `[ ]` D1.14 输出手机端视觉规范 — 图标、字号、间距、按钮层级、安全区、浅深色、Android/iOS 适配。
- `[ ]` D1.15 设计 App 外快贴平台方案 — Android 悬浮快贴、iOS 键盘扩展/分享扩展、权限说明、关闭入口、隐私边界。
- `[ ]` D1.16 设计转换配方 — 给 AI 读→Markdown、给别人看→PDF、给别人改→Word、给开发/Agent→JSON 或 Markdown。

**D2 电脑端 / CLI 全量设计**
- `[ ]` D2.1 设计 CLI 命令体系 — `molan convert/check/pull/read/push` 的参数、输出、错误码、退出码。
- `[ ]` D2.2 设计 Office/PDF/PPT/Excel→Markdown 转换规则 — 标题、表格、图片、代码、分页、元数据、失败策略。
- `[ ]` D2.3 设计批量转换输出结构 — 成功/失败列表、输出路径、hash、可读性评分、AI 下一步建议。
- `[ ]` D2.4 设计桌面 GUI 阅读与转换 — 拖拽、队列、输出目录、阅读预览、JSON 编辑、错误恢复。
- `[ ]` D2.5 设计电脑端与云端收件箱交互 — 拉取手机保存文件、上传转换结果、打开本地输出。
- `[ ]` D2.6 设计 AI 调用说明 — Codex/Claude Code/Cursor 如何通过 CLI 读取资料。
- `[ ]` D2.7 设计电脑端置顶快贴窗 — 侧边置顶、迷你模式、快捷命令模式、提示词详情、复制后回到开发窗口。

**D3 云端与 AI 工作流全量设计**
- `[ ]` D3.1 设计云端 MVP 闭环 — 手机保存到云端 → 电脑 CLI 拉取 → AI 读取。
- `[ ]` D3.2 设计账号与设备体系 — 手机号登录、设备绑定、设备名、最后同步时间。
- `[ ]` D3.3 设计同步策略 — 本地优先、增量同步、冲突保留、删除、离线队列。
- `[ ]` D3.4 设计 AI 文件资料库 — 收藏、有用资源、项目/集合、标签、状态。
- `[ ]` D3.5 设计文件上传边界 — 默认不上传、主动保存、敏感字段提醒、上传前确认。
- `[ ]` D3.6 设计 AI 读取入口 — CLI 优先、MCP 后置、云端 API 后置。
- `[ ]` D3.7 设计 AI 生产结果回流 — 生成 Markdown/JSON，保存版本，同步回手机/电脑。

**D4 数据模型与接口全量设计**
- `[ ]` D4.1 设计本地数据模型 — DocumentRecord、PromptItem、CopyEvent、ConversionJob、InboxItem、Settings。
- `[ ]` D4.2 设计云端数据模型 — users、devices、prompts、documents、document_versions、file_objects、sync_events、conversion_jobs、ai_jobs。
- `[~]` D4.3 设计文件状态机 — 已在本地 `DocumentStatus` 落地未处理、已阅读、已复制、已编辑、已转换、已分享、已归档、已同步、冲突；仍需和云端/MCP 状态模型统一。
- `[ ]` D4.4 设计转换任务状态机 — pending、running、success、failed、cancelled、shared、saved。
- `[ ]` D4.5 设计 API 草案 — auth、sync、documents、prompts、files、conversion_jobs、ai_jobs。
- `[ ]` D4.6 设计本地/云端字段映射 — 避免手机端、电脑端、云端各自定义一套结构。

**D5 发布、验证与增长全量设计**
- `[ ]` D5.1 设计真机验证脚本 — 微信、QQ、文件管理器、分享面板、safe-area、启动速度。
- `[ ]` D5.2 设计包体策略 — debug/release、AAB、arm64、universal、体积门槛。
- `[ ]` D5.3 设计下载发布包 — APK/AAB、Windows installer、CLI zip、checksums、release notes。
- `[ ]` D5.4 设计官网下载页 — 国内用户下载、微信/QQ 打开教程、隐私说明、版本记录。
- `[ ]` D5.5 设计渠道策略 — GitHub Release、官网、国内镜像、后续安卓商店/App Store。

**D6 设计冻结门槛（全部满足才能进入 S1+ 开发）**
- `[ ]` D6.1 PRD 全部功能均能映射到 D/S 任务，不能有"文档里有、TODO 没有"的功能。
- `[ ]` D6.2 手机端主流程线框或页面说明齐备：打开、阅读、复制、编辑、转换、分享、提示词、收件箱。
- `[ ]` D6.3 电脑端 CLI 命令和 JSON 输出契约齐备。
- `[ ]` D6.4 云端 MVP 闭环、数据模型、隐私边界齐备。
- `[ ]` D6.5 每个开发任务都有验收标准和失败状态。

## 1. 阶段总览

| 阶段 | 优先级 | 阶段名 | 核心产物 | 完成后用户能得到什么 |
|---|---|---|---|---|
| S0 | P0 | 项目基线 | PRD、方案、任务、仓库、隐私边界 | 项目能被持续开发 |
| S1 | P0 | 手机 V1 核心闭环 | Android/iOS App MVP | 微信/QQ 文件能打开、读、复制、改、转、分享 |
| S2 | P0 | 电脑 CLI | `molan convert` | AI 能调用脚本把 Office 转 Markdown |
| S3 | P1 | 桌面 GUI 与置顶快贴 | Electron GUI、Prompt 快贴窗 | 人可以批量转换、轻阅读、开发时快速复制提示词 |
| S4 | P0 | 质量与发布 | APK/AAB、Windows installer、CLI zip、Release | 别人能下载使用 |
| S5 | P1 | 官网与分发增长 | 官网、教程、国内镜像 | 普通用户能找到、安装、学会使用 |
| S6 | P1 | V1.5 办公增强 | 批量转换、搜索、提示词管理增强 | 办公效率更高 |
| S7 | P2 | 后端、备份、AI 识别 | 账号、备份、同步、AI 文件理解 | 文件可找回、可跨设备、可智能整理 |
| S8 | P3 | 团队与商业化 | 团队空间、权限、订阅 | 从个人工具走向团队工具 |
| S9 | P3 | 长期运营 | 监控、反馈、版本策略、商店运营 | 产品可长期维护 |

## 2. 从当前到最终完成路线

### 2.1 总路线

> 这不是只做某个阶段，而是从当前代码状态一直做到 PRD 全部闭环。每一阶段完成后继续进入下一阶段，直到手机端、电脑端、云端、发布和长期维护都闭合。

| 顺序 | 阶段 | 任务组 | 完成判断 |
|---|---|---|---|
| 1 | UI 基线冻结 | 采用 `selected-mobile-ui.png` 与 `selected-desktop-ui.png`，补齐缺失状态图 | 所有开发任务引用同一套视觉基准 |
| 2 | 设计补全 | D0-D6：场景、流程、页面、状态、数据、接口、权限、验收 | PRD 每一条都有设计任务与验收 |
| 3 | 手机 V1 补齐 | 微信/QQ 打开、阅读、复制、编辑、转换、分享、最近文档、提示词 | 真机证明 5 秒打开、10 秒复制、20 秒转换分享 |
| 4 | 手机质量关 | 长文、大 JSON、safe-area、包体、冷启动、离线 | APK/AAB 可安装，关键机型验证通过 |
| 5 | 电脑 CLI 完成 | Office/PDF/PPT/Excel → Markdown、批量、JSON 输出、错误码、打包 | AI/agent 可直接调用 `molan convert` |
| 6 | 电脑 GUI 完成 | 阅读/编辑/转换、拖拽队列、JSON 校验、设置记忆 | 人用桌面端可批量转换和轻阅读 |
| 7 | 电脑置顶快贴完成 | always-on-top、Mini、快捷命令、提示词详情、复制回前台窗口 | 开发时不打断工作流即可复制提示词 |
| 8 | V1 发布 | Android APK/AAB、Windows installer、CLI zip、校验、Release notes | 外部用户可下载安装 |
| 9 | 官网与教程 | 下载页、微信/QQ 打开教程、隐私说明、FAQ、国内镜像 | 国内用户能找到并学会使用 |
| 10 | V1.5 办公增强 | 批量转换、格式配方、文件搜索、收藏、标签、长图导出 | 办公分享和批量处理效率显著提升 |
| 11 | Android 悬浮快贴 / iOS 扩展 | Android 悬浮窗、iOS 键盘/分享扩展 | 手机端 AI 工具外部复制粘贴闭环成立 |
| 12 | 云端 MVP | 登录、设备、提示词同步、文件收件箱、用户主动保存 | 手机文件可到电脑，电脑结果可回手机 |
| 13 | AI 读取闭环 | CLI `pull/read/push`、MCP、AI 可读评分、生产结果回流 | AI 能读取、处理、写回 Markdown/JSON |
| 14 | 上架与增长 | 国内安卓商店、App Store/Google Play、微软商店评估 | 普通用户可从主流渠道安装 |
| 15 | 团队化 | 团队空间、权限、项目集合、审计、订阅 | 从个人工具扩展到团队场景 |
| 16 | 长期运营 | 崩溃监控、性能监控、反馈、版本策略、数据导出 | 产品可维护、可迭代、可退出 |

### 2.2 当前最高优先级执行顺序

> 这是从今天开始最该做的顺序。后面的全量清单覆盖所有阶段，但实际执行先按这里走。

| 顺序 | 任务 | 原因 | 关闭证据 |
|---|---|---|---|
| 1 | 真机验证微信/QQ 打开 `.md` / `.json` | 核心入口决定产品是否成立 | 视频或截图记录：最多滑动 1-2 下找到墨览 |
| 2 | 手机端复制闭环补齐 | 用户高频是复制提示词 | 全文、代码块、JSON 字段、提示词一键复制都可用 |
| 3 | 手机端分享与当前文件转换闭环 | 办公转发场景必须成立 | 转 PDF/Word 后直接调起分享 |
| 4 | 手机端启动与包体基线测量 | 快速打开和体积是市场体验关键 | 冷启动、APK/AAB 大小有记录 |
| 5 | 电脑 CLI Word/PDF/PPT/Excel 转 MD 验收 | 最终目的之一是让 AI 能读取 | CLI 对真实样例输出 Markdown + JSON 日志 |
| 6 | 发布产物打包 | 没有安装包就无法给别人用 | GitHub Release 草稿或正式发布 |
| 7 | 官网/下载页 | 解决下载和使用教程 | 一个可访问下载页 |
| 8 | V1.5 批量转换中心 | 办公效率提升 | 多文件转换、失败重试、结果分享 |
| 9 | 云备份与历史记录方案 | 解决散落文件找回 | 后端设计和隐私方案通过 |
| 10 | AI 识别和清理 | 从工具进入 AI 文件助手 | 本地规则 + 可选 AI 处理链路 |

## 3. S0 项目基线

### S0.1 产品与文档

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S0-PD-001 | P0 | `[x]` | 明确产品总目标 | 无 | `PRD.md` | 有手机端、电脑端的一句话定位 |
| S0-PD-002 | P0 | `[x]` | 明确国内市场优先 | 无 | `docs/market-research.md` | 微信、QQ、国内办公场景写入策略 |
| S0-PD-003 | P0 | `[x]` | 明确离线优先 | 无 | `PRD.md` / `docs/full-plan.md` | V1 不依赖后端 |
| S0-PD-004 | P0 | `[x]` | 明确 Markdown / JSON 双核心 | 无 | `PRD.md` | 二者都支持阅读、编辑、复制、分享 |
| S0-PD-005 | P0 | `[x]` | 明确电脑端脚本定位 | 无 | `PRD.md` / `docs/full-plan.md` | 电脑端偏 CLI 和轻 GUI |
| S0-PD-006 | P0 | `[x]` | 明确技术栈方向 | 无 | `docs/full-plan.md` | TypeScript、React Native、Electron、Node CLI |
| S0-PD-007 | P0 | `[x]` | 拆解旧里程碑任务 | S0-PD-001 | `TODO.md` | M1-M8 已并入分层任务 |
| S0-PD-008 | P0 | `[x]` | 生成全量方案 | S0-PD-001 | `docs/full-plan.md` | 含架构、数据、流程、发布 |
| S0-PD-009 | P0 | `[x]` | 生成全量可执行任务清单 | S0-PD-007 | `TODO.md` | 本文件存在且覆盖所有阶段（已合并 D 层设计任务） |
| S0-PD-010 | P1 | `[ ]` | 建立任务状态更新规则 | S0-PD-009 | 文档章节或 issue 模板 | 每次完成开发后更新状态和证据 |

### S0.2 仓库与安全边界

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S0-REPO-001 | P0 | `[x]` | 建立 GitHub 仓库 | 无 | GitHub repo | 远端存在 |
| S0-REPO-002 | P0 | `[~]` | 清理三端项目边界 | S0-REPO-001 | `AGENTS.md` / README | root、mobile、desktop、desktop/cli 职责清楚 |
| S0-REPO-003 | P0 | `[!]` | 禁止读取/提交敏感文件 | 无 | `.gitignore` / `AGENTS.md` | `config.json` 等不进入 Git |
| S0-REPO-004 | P0 | `[~]` | 检查工作区脏改动来源 | S0-REPO-001 | git status 记录 | 明确哪些是用户改动、哪些是当前改动 |
| S0-REPO-005 | P0 | `[ ]` | 补基础 Issue/PR 模板 | S0-PD-009 | `.github/ISSUE_TEMPLATE` / `.github/pull_request_template.md` | 新任务能按端、优先级、验收填写 |
| S0-REPO-006 | P1 | `[ ]` | 补贡献说明 | S0-REPO-005 | `CONTRIBUTING.md` | 可说明如何运行三端项目 |
| S0-REPO-007 | P1 | `[ ]` | 补许可证与第三方许可说明 | S0-REPO-001 | `LICENSE` / `NOTICE.md` | pandoc、依赖许可清晰 |

### S0.3 构建基线

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S0-BUILD-001 | P0 | `[x]` | 手机端 typecheck 命令 | mobile 项目 | `mobile/package.json` | 2026-07-03 `npm run typecheck` 通过 |
| S0-BUILD-002 | P0 | `[x]` | 手机端 test 命令 | mobile 项目 | `mobile/package.json` | 2026-07-03 `npm run test` 通过 |
| S0-BUILD-003 | P0 | `[x]` | 桌面 GUI typecheck 命令 | desktop 项目 | `desktop/package.json` | `npm run typecheck` 可执行 |
| S0-BUILD-004 | P0 | `[x]` | 桌面 CLI build/typecheck 命令 | desktop/cli 项目 | `desktop/cli/package.json` | 2026-07-04 `cd desktop/cli && npm run typecheck && npm run build && npm run test` 分步通过 |
| S0-BUILD-005 | P1 | `[x]` | 根目录统一命令说明 | S0-BUILD-001 | README | 已在 `README.md` 写明 mobile、desktop、desktop/cli 常用命令与 CI 验收 |
| S0-BUILD-006 | P1 | `[x]` | CI 基线 | S0-BUILD-001 | GitHub Actions | `.github/workflows/ci.yml` 已覆盖 mobile typecheck/test、desktop typecheck/build、desktop/cli typecheck/build/test |

## 4. S1 手机 V1 核心闭环

阶段目标：**微信/QQ 收到 `.md` / `.json` 文件后，用户能快速找到墨览，打开后直接阅读，能复制提示词或片段，能轻编辑，能转 PDF/Word，能分享到微信/QQ 或其他 App。**

### S1.1 手机端工程准备

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-ENG-001 | P0 | `[x]` | 使用 Expo SDK 57 + TypeScript | 无 | `mobile/package.json` | 依赖版本与 Expo 57 匹配 |
| S1-ENG-002 | P0 | `[v]` | 开发前阅读 Expo 57 文档 | S1-ENG-001 | 记录链接 | 涉及 Expo API 改动前确认版本文档 |
| S1-ENG-003 | P0 | `[~]` | Android/iOS app identity 配置 | S1-ENG-001 | `mobile/app.json` | bundle id、slug、display name 正确 |
| S1-ENG-004 | P0 | `[ ]` | App 图标与启动图 | S1-ENG-003 | `mobile/assets` | 在微信/QQ 打开列表中醒目可辨 |
| S1-ENG-005 | P0 | `[~]` | Hermes 与构建配置核实 | S1-ENG-001 | app/build 配置 | 构建包启用 Hermes 或说明原因 |
| S1-ENG-006 | P0 | `[ ]` | 不启动扫描文件 | S1-ENG-001 | 启动逻辑 | 冷启动只读必要元数据 |
| S1-ENG-007 | P0 | `[ ]` | 首屏错误边界 | S1-ENG-001 | error boundary | 读取异常不白屏 |

### S1.2 微信/QQ 打开链路

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-OPEN-001 | P0 | `[~]` | 注册 `.md` / `.markdown` 打开方式 | S1-ENG-003 | app config | Android/iOS 能识别 Markdown 文件 |
| S1-OPEN-002 | P0 | `[~]` | 注册 `.json` 打开方式 | S1-ENG-003 | app config | Android/iOS 能识别 JSON 文件 |
| S1-OPEN-003 | P0 | `[v]` | 微信 `.md` 打开真机验证 | S1-OPEN-001 | 验证记录 | 最多滑动 1-2 下找到墨览 |
| S1-OPEN-004 | P0 | `[v]` | 微信 `.json` 打开真机验证 | S1-OPEN-002 | 验证记录 | 同上 |
| S1-OPEN-005 | P0 | `[v]` | QQ `.md` 打开真机验证 | S1-OPEN-001 | 验证记录 | 同上 |
| S1-OPEN-006 | P0 | `[v]` | QQ `.json` 打开真机验证 | S1-OPEN-002 | 验证记录 | 同上 |
| S1-OPEN-007 | P0 | `[v]` | Vivo / OPPO / Xiaomi / Redmi Android 机型验证 | S1-OPEN-003 | 机型矩阵 | safe-area、导航栏、打开列表都可用 |
| S1-OPEN-008 | P0 | `[v]` | iOS 文件打开验证 | S1-OPEN-003 | iPhone 验证记录 | 分享面板/其他应用能找到 |
| S1-OPEN-009 | P0 | `[v]` | Android `content://` 读取稳定性 | S1-OPEN-003 | 代码 + 验证记录 | 微信/QQ 缓存文件可读取，不出现空内容 |
| S1-OPEN-010 | P0 | `[x]` | 读取失败兜底 | S1-OPEN-009 | 错误 UI | 已根据微信/QQ/外部应用/文件管理器/本地选择器给出来源化错误提示，并提供“重新选择”；证据：`mobile/App.tsx` 的 `friendlyOpenError`、`inferExternalSourceLabel`；2026-07-04 `cd mobile` 后 `npm run typecheck`、`npm run test` 通过 |
| S1-OPEN-011 | P1 | `[x]` | 首次使用引导 | S1-OPEN-003 | 引导文案/页 | 已新增首次弹层，说明微信/QQ 里“更多打开方式/其他应用”选择墨览，以及读取失败时先保存到本地；证据：`mobile/App.tsx` 的 `OpenGuide` 与 `OPEN_GUIDE_SEEN_KEY` |

### S1.3 阅读器：首页与阅读页

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-READ-001 | P0 | `[~]` | 文件打开后直达阅读页 | S1-OPEN-001 | App 路由 | 不先弹导入、上传、识别 |
| S1-READ-002 | P0 | `[~]` | 首页展示最近文档和提示词入口 | S1-ENG-001 | 首页 UI | 主动打开 App 时可快速继续 |
| S1-READ-003 | P0 | `[~]` | 阅读页操作面板 | S1-READ-001 | 按钮组 | 复制、编辑、分享、转格式入口清楚 |
| S1-READ-004 | P0 | `[v]` | Android 安全区适配 | S1-READ-003 | UI 调整 | 底部按钮不被导航栏遮挡 |
| S1-READ-005 | P0 | `[v]` | iOS Home Indicator 适配 | S1-READ-003 | UI 调整 | 底部按钮不被遮挡 |
| S1-READ-006 | P0 | `[ ]` | 深色模式视觉验收 | S1-READ-003 | 主题样式 | 低亮度可读，代码块对比度足够 |
| S1-READ-007 | P0 | `[ ]` | 字体、行距、字号设置验收 | S1-READ-003 | 设置项 | 长文阅读不拥挤 |
| S1-READ-008 | P1 | `[x]` | 阅读页搜索 | S1-READ-001 | 搜索 UI | 已支持当前 Markdown 文档关键词搜索、结果列表、点击跳转；证据：`mobile/src/components/Reader.tsx`、`mobile/src/markdown/search.ts`（搜索为字符串 includes 薄封装，按测试策略不单测）；2026-07-04 `cd mobile` 后 `npm run typecheck`、`npm run test` 通过 |

### S1.4 Markdown 阅读

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-MD-001 | P0 | `[~]` | 标题/段落/列表/引用渲染 | S1-READ-001 | Markdown renderer | 常见 README 可正常阅读 |
| S1-MD-002 | P0 | `[~]` | 加粗/斜体/删除线/行内代码渲染 | S1-MD-001 | renderer | 样式正确 |
| S1-MD-003 | P0 | `[~]` | 代码块横向滚动 | S1-MD-001 | code block UI | 长代码不挤压页面 |
| S1-MD-004 | P0 | `[~]` | 代码块一键复制 | S1-MD-003 | copy button | 点击后剪贴板正确 |
| S1-MD-005 | P0 | `[~]` | 表格横向滚动 | S1-MD-001 | table UI | 宽表不破版 |
| S1-MD-006 | P0 | `[~]` | 链接点击与长按复制 | S1-MD-001 | link actions | 不误触编辑 |
| S1-MD-007 | P0 | `[~]` | 图片展示 | S1-MD-001 | image component | 本地/远程图片可展示 |
| S1-MD-008 | P1 | `[ ]` | 图片保存/分享 | S1-MD-007 | image actions | 长按可保存或分享 |
| S1-MD-009 | P0 | `[~]` | 目录生成和跳转 | S1-MD-001 | TOC | PRD 类长文可快速跳转 |
| S1-MD-010 | P0 | `[~]` | 滚动位置记忆 | S1-READ-001 | storage | 再打开回到上次位置 |
| S1-MD-011 | P0 | `[ ]` | 1MB+ 长文性能测试 | S1-MD-001 | 测试样例 | 滚动不卡顿，不崩溃 |
| S1-MD-012 | P1 | `[ ]` | KaTeX 公式支持 | S1-MD-001 | 渲染插件 | 仅在真实需求强时引入 |
| S1-MD-013 | P1 | `[ ]` | Mermaid 支持 | S1-MD-001 | 渲染插件 | 懒加载，不影响首屏 |

### S1.5 JSON 阅读

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-JSON-001 | P0 | `[~]` | JSON parse 与错误提示 | S1-READ-001 | JSON reader | 非法 JSON 能指出错误 |
| S1-JSON-002 | P0 | `[~]` | 树形展示 | S1-JSON-001 | JSON tree | 对象/数组/字符串/数字/布尔/null 展示清楚 |
| S1-JSON-003 | P0 | `[~]` | 折叠/展开 | S1-JSON-002 | tree interaction | 大结构不一次性铺满 |
| S1-JSON-004 | P0 | `[x]` | 复制字段值 | S1-JSON-002 | copy action | 已支持点击叶子复制字段值，字符串不带多余引号，对象/数组复制 pretty JSON；证据：`mobile/src/json/tree.ts`、`mobile/src/__tests__/jsonTree.test.ts` |
| S1-JSON-005 | P0 | `[x]` | 复制 JSONPath | S1-JSON-002 | path action | 已支持长按行复制 JSONPath，特殊 key 使用方括号引用；证据：`mobile/src/json/tree.ts`、`mobile/src/__tests__/jsonTree.test.ts` |
| S1-JSON-006 | P0 | `[~]` | JSON 内嵌 Markdown 字段预览 | S1-JSON-002 | preview | `content` / `markdown` / `text` 字段可阅读 |
| S1-JSON-007 | P1 | `[x]` | JSON 搜索 | S1-JSON-002 | search | 已支持 key/value 搜索，搜索时 flatten 折叠结构并高亮命中；证据：`mobile/src/components/JsonView.tsx`、`mobile/src/json/tree.ts`、`mobile/src/__tests__/jsonTree.test.ts` |
| S1-JSON-008 | P1 | `[ ]` | 大 JSON 虚拟化 | S1-JSON-002 | virtual tree | 5MB+ JSON 不冻结 |
| S1-JSON-009 | P1 | `[x]` | 格式化/压缩切换 | S1-JSON-001 | action | 已支持树形/美化/压缩查看模式和美化/压缩复制；证据：`mobile/src/components/JsonView.tsx`、`mobile/src/json/format.ts`（格式化为 JSON.parse/stringify 薄封装，按测试策略不单测）；2026-07-04 在 `mobile/` 分步运行 `npm run typecheck`、`npm run test` 通过 |

### S1.6 编辑

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-EDIT-001 | P0 | `[~]` | Markdown 原文编辑 | S1-MD-001 | edit sheet/page | 可修改文本 |
| S1-EDIT-002 | P0 | `[~]` | Markdown 预览切换 | S1-EDIT-001 | preview toggle | 编辑后预览一致 |
| S1-EDIT-003 | P0 | `[~]` | JSON 原文编辑 | S1-JSON-001 | edit UI | 可修改 JSON |
| S1-EDIT-004 | P0 | `[~]` | JSON 校验与错误提示 | S1-EDIT-003 | validation | 非法 JSON 不覆盖原有效文件 |
| S1-EDIT-005 | P0 | `[~]` | 自动草稿 | S1-EDIT-001 | local draft | 退出后可恢复 |
| S1-EDIT-006 | P0 | `[~]` | 保存为副本 | S1-EDIT-001 | save copy | 原文件不被破坏 |
| S1-EDIT-007 | P0 | `[~]` | 编辑后直接分享 | S1-EDIT-001 | share action | 不用先回阅读页找入口 |
| S1-EDIT-008 | P1 | `[ ]` | 编辑历史版本 | S1-EDIT-005 | local versions | 可回退上一个版本 |

### S1.7 复制与提示词

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-COPY-001 | P0 | `[~]` | 复制全文 | S1-READ-001 | copy action | 当前文件全部内容进剪贴板 |
| S1-COPY-002 | P0 | `[~]` | 复制代码块 | S1-MD-003 | copy action | 代码内容准确 |
| S1-COPY-003 | P0 | `[x]` | 复制 JSON 字段 | S1-JSON-004 | copy action | 字段值准确；证据：`mobile/src/json/tree.ts`、`mobile/src/__tests__/jsonTree.test.ts` |
| S1-COPY-004 | P0 | `[ ]` | 复制选中片段 | S1-READ-001 | selection action | 长按选中后可复制 |
| S1-COPY-005 | P1 | `[ ]` | 组合复制多个片段 | S1-COPY-004 | selection tray | 多段合并复制 |
| S1-PROMPT-001 | P0 | `[~]` | 提示词数据模型 | S1-COPY-001 | storage | title/content/tags/folder/copyCount/lastCopiedAt |
| S1-PROMPT-002 | P0 | `[~]` | 提示词库入口 | S1-PROMPT-001 | prompt sheet/page | 首页或阅读页可进入 |
| S1-PROMPT-003 | P0 | `[~]` | 提示词一键复制 | S1-PROMPT-001 | copy button | 戳一下复制 |
| S1-PROMPT-004 | P0 | `[~]` | 从剪贴板导入提示词 | S1-PROMPT-001 | import action | 剪贴板文本可入库 |
| S1-PROMPT-005 | P0 | `[~]` | 从当前文件加入提示词 | S1-PROMPT-001 | import action | 可把文件片段加入库 |
| S1-PROMPT-006 | P1 | `[ ]` | 文件夹/分组全文复制 | S1-PROMPT-001 | batch copy | 一个文件夹所有提示词一键复制 |
| S1-PROMPT-007 | P1 | `[ ]` | 标签、收藏、最近复制增强 | S1-PROMPT-001 | list filters | 常用提示词能快速找到 |
| S1-PROMPT-008 | P2 | `[ ]` | 提示词变量模板 | S1-PROMPT-001 | template fields | `{变量}` 可填写后复制 |

### S1.8 分享

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-SHARE-001 | P0 | `[~]` | 系统分享面板 | S1-READ-001 | share action | 可分享到任意系统目标 |
| S1-SHARE-002 | P0 | `[~]` | 分享原文件 | S1-SHARE-001 | temp file | `.md` / `.json` 原格式可分享 |
| S1-SHARE-003 | P0 | `[~]` | 分享纯文本 | S1-SHARE-001 | text share | 对方不用 App 也能看 |
| S1-SHARE-004 | P0 | `[v]` | 分享到微信真机验证 | S1-SHARE-001 | 验证记录 | 能选会话发送 |
| S1-SHARE-005 | P0 | `[v]` | 分享到 QQ 真机验证 | S1-SHARE-001 | 验证记录 | 能选会话发送 |
| S1-SHARE-006 | P1 | `[ ]` | 记住最近分享方式 | S1-SHARE-001 | share record | 下次提示最近目标 |
| S1-SHARE-007 | P1 | `[ ]` | 飞书/钉钉/企业微信分享体验验证 | S1-SHARE-001 | 验证记录 | 系统分享可覆盖 |

### S1.9 当前文件转换

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-CONV-001 | P0 | `[~]` | Markdown 转 PDF | S1-MD-001 | PDF output | 当前文件可生成 PDF |
| S1-CONV-002 | P0 | `[~]` | Markdown 转 Word | S1-MD-001 | DOCX output | 当前文件可生成 Word |
| S1-CONV-003 | P0 | `[~]` | JSON 转 Markdown | S1-JSON-001 | MD output | 结构化输出可读 |
| S1-CONV-004 | P0 | `[~]` | 转换后直接分享 | S1-SHARE-001 | convert share flow | 不要求用户去文件夹找 |
| S1-CONV-005 | P0 | `[ ]` | 转换模块懒加载 | S1-CONV-001 | dynamic import | 阅读首屏不加载重模块 |
| S1-CONV-006 | P1 | `[ ]` | JSON 转 PDF | S1-CONV-003 | PDF output | 规则化文档可读 |
| S1-CONV-007 | P1 | `[ ]` | JSON 转 Word | S1-CONV-003 | DOCX output | 规则化文档可编辑 |
| S1-CONV-008 | P1 | `[ ]` | 长图导出 | S1-MD-001 | image output | 适合聊天转发 |

### S1.10 最近文档与本地数据

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-DATA-001 | P0 | `[x]` | 最近打开记录 | S1-READ-001 | local storage | 首页和最近列表显示最近文档；证据：`mobile/src/storage/recentDocs.ts`、`mobile/App.tsx` |
| S1-DATA-002 | P0 | `[~]` | 文件类型记录 | S1-DATA-001 | DocumentRecord | 已记录 markdown/json；Office/PDF/Excel/PPT 进入后续转换中心和云端文件对象 |
| S1-DATA-003 | P0 | `[~]` | 文件来源记录 | S1-DATA-001 | source field | 已记录/推断 wechat、qq、fileManager、documentPicker、recent、other；GitHub/browser 具体来源待云端或导入入口补齐 |
| S1-DATA-004 | P0 | `[~]` | 阅读位置记录 | S1-DATA-001 | lastScrollOffset | 再打开可恢复 |
| S1-DATA-005 | P1 | `[x]` | 最近编辑/最近复制记录 | S1-DATA-001 | activity fields | 已记录最近复制、编辑、转换、分享时间和状态，并在首页/最近列表展示；证据：`mobile/src/storage/recentDocs.ts`、`mobile/src/components/RecentSheet.tsx` |
| S1-DATA-006 | P1 | `[ ]` | 本地数据库从 AsyncStorage 迁移到 SQLite | S1-DATA-001 | migration | 数据量增加后仍稳定 |
| S1-DATA-007 | P2 | `[ ]` | 历史浏览记录备份 | S6-BACKUP-001 | backend sync | 用户主动开启后可找回 |

### S1.11 手机性能、包体、体验指标

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-PERF-001 | P0 | `[ ]` | 冷启动基线测量 | S1-ENG-001 | 性能记录 | 点击到首页或阅读内容小于 5 秒 |
| S1-PERF-002 | P0 | `[ ]` | APK/AAB 体积基线测量 | S1-ENG-001 | 包体记录 | 记录 universal、arm64 大小 |
| S1-PERF-003 | P0 | `[ ]` | 首屏依赖审计 | S1-PERF-001 | 依赖列表 | 阅读首屏只加载必要模块 |
| S1-PERF-004 | P0 | `[ ]` | 大 Markdown 压测 | S1-MD-011 | 样例 + 结果 | 1MB+ 可读 |
| S1-PERF-005 | P0 | `[ ]` | 大 JSON 压测 | S1-JSON-008 | 样例 + 结果 | 5MB+ 不崩溃 |
| S1-PERF-006 | P0 | `[ ]` | 转换耗时测量 | S1-CONV-001 | 性能记录 | 打开到转换分享小于 20 秒 |
| S1-PERF-007 | P1 | `[ ]` | AAB / 分架构 APK 策略 | S1-PERF-002 | 构建脚本 | 官网下载提供 arm64 与 universal |

### S1.12 手机端验证命令与验收

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S1-QA-001 | P0 | `[x]` | TypeScript 检查 | S1-ENG-001 | 命令记录 | 2026-07-04 `cd mobile && npm run typecheck` 通过 |
| S1-QA-002 | P0 | `[x]` | 单元测试 | S1-ENG-001 | 命令记录 | 2026-07-04 `cd mobile` 后 `npm run test` 通过，3 个测试文件 / 18 个测试（已按测试策略删除凑数测试） |
| S1-QA-003 | P0 | `[ ]` | Markdown fixture 测试 | S1-MD-001 | tests | 标题、代码、表格、链接覆盖 |
| S1-QA-004 | P0 | `[x]` | JSONPath/复制测试 | S1-JSON-005 | tests | JSONPath 生成、搜索、复制文本规则已覆盖；证据：`mobile/src/__tests__/jsonTree.test.ts`（原 `jsonPath.test.ts` 测的 getByPath 函数零引用，已连同测试删除） |
| S1-QA-005 | P0 | `[v]` | Android 真机验收表 | S1-OPEN-003 | 验收表 | 至少覆盖 2 个国产 Android 品牌 |
| S1-QA-006 | P0 | `[v]` | iOS 真机验收表 | S1-OPEN-008 | 验收表 | iPhone 打开/分享/safe-area 通过 |
| S1-QA-007 | P1 | `[ ]` | Maestro 移动端 E2E | S1-QA-005 | e2e | 打开、复制、转格式、分享自动化 |

## 5. S2 电脑 CLI：让 AI 能读取

阶段目标：**让 AI 或 agent 能调用脚本，把 Word / PDF / Excel / PPT 等办公文件转成 Markdown，并得到可机器读取的 JSON 日志。**

### S2.1 CLI 骨架

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S2-CLI-001 | P0 | `[~]` | 建立 `desktop/cli` Node + TypeScript 包 | S0-BUILD-004 | CLI package | `npm run build` 可执行 |
| S2-CLI-002 | P0 | `[~]` | `molan check` | S2-CLI-001 | check command | 输出 Node、平台、pandoc 可用性 |
| S2-CLI-003 | P0 | `[~]` | `molan convert <file>` 单文件转换 | S2-CLI-001 | convert command | 能输出 Markdown |
| S2-CLI-004 | P0 | `[~]` | `--out` 输出目录 | S2-CLI-003 | option | 输出位置可控 |
| S2-CLI-005 | P0 | `[~]` | `--json` 结构化输出 | S2-CLI-003 | JSON output | AI 可解析 ok/errorCode/output |
| S2-CLI-006 | P0 | `[~]` | 退出码规范 | S2-CLI-003 | exit codes | 成功 0，失败非 0 |
| S2-CLI-007 | P0 | `[~]` | 错误码体系 | S2-CLI-005 | error map | 输入不存在、格式不支持、pandoc 缺失等清楚 |
| S2-CLI-008 | P0 | `[~]` | 文件夹/Glob 批量转换 | S2-CLI-003 | batch mode | `molan convert ./docs --batch --json` 可用 |
| S2-CLI-009 | P0 | `[ ]` | 并发与失败隔离 | S2-CLI-008 | runner | 一个文件失败不影响其他文件 |
| S2-CLI-010 | P1 | `[ ]` | CLI 帮助文档 | S2-CLI-001 | README section | 常见命令可复制 |

### S2.2 转换能力

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S2-CONV-001 | P0 | `[~]` | Word `.docx` 转 Markdown | S2-CLI-003 | converter | 真实 docx 可转 |
| S2-CONV-002 | P0 | `[~]` | PDF 转 Markdown | S2-CLI-003 | converter | 文本型 PDF 可转，扫描件明确提示需 OCR |
| S2-CONV-003 | P0 | `[~]` | PPT/PPTX 转 Markdown | S2-CLI-003 | converter | 保留页标题与正文 |
| S2-CONV-004 | P0 | `[~]` | Excel/XLSX 转 Markdown | S2-CLI-003 | converter | 每 sheet 输出表格 |
| S2-CONV-005 | P0 | `[~]` | CSV 转 Markdown | S2-CLI-003 | converter | 输出表格 |
| S2-CONV-006 | P0 | `[~]` | Markdown 转 Word | S2-CLI-003 | converter | 反向转换可用 |
| S2-CONV-007 | P1 | `[ ]` | Office 转 Markdown 后清理 | S2-CONV-001 | cleanup | 去多余空行、页眉页脚、重复标题 |
| S2-CONV-008 | P1 | `[ ]` | 图片资源输出策略 | S2-CONV-001 | media folder | 图片路径可被 Markdown 引用 |
| S2-CONV-009 | P1 | `[ ]` | OCR 后置方案 | S2-CONV-002 | design doc | 扫描 PDF 不在 V1 强做 |
| S2-CONV-010 | P1 | `[ ]` | 表格大文件策略 | S2-CONV-004 | chunking | 大表不生成不可读长行 |

### S2.3 转换引擎与依赖

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S2-ENGINE-001 | P0 | `[~]` | 共享转换引擎 | S2-CLI-003 | `converter.ts` | CLI 与 Electron 复用 |
| S2-ENGINE-002 | P0 | `[~]` | pandoc 探测 | S2-ENGINE-001 | resolver | 支持 resources、环境变量、PATH |
| S2-ENGINE-003 | P0 | `[ ]` | pandoc 下载脚本固定版本 | S2-ENGINE-002 | script | 版本可追踪 |
| S2-ENGINE-004 | P0 | `[ ]` | pandoc SHA256 校验 | S2-ENGINE-003 | script | 校验失败退出 |
| S2-ENGINE-005 | P1 | `[ ]` | LibreOffice 探测 | S2-CONV-003 | resolver | 需要时用于 PPT/Office 更稳转换 |
| S2-ENGINE-006 | P1 | `[ ]` | 转换日志文件 | S2-CLI-005 | logs | 便于定位失败文件 |

### S2.4 CLI 测试与验收

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S2-QA-001 | P0 | `[ ]` | fixture 样本集 | S2-CONV-001 | test fixtures | docx/pdf/pptx/xlsx/csv/md/json 样本齐备 |
| S2-QA-002 | P0 | `[x]` | CLI typecheck | S2-CLI-001 | 命令记录 | 2026-07-03 `cd desktop/cli && npm run typecheck` 通过 |
| S2-QA-003 | P0 | `[x]` | CLI build | S2-CLI-001 | 命令记录 | 2026-07-03 `cd desktop/cli && npm run build` 通过 |
| S2-QA-004 | P0 | `[~]` | CLI 单测 | S2-QA-001 | tests | 2026-07-03 `npm run test` 通过云命令测试；待补转换 fixtures |
| S2-QA-005 | P0 | `[ ]` | 真实文件 smoke test | S2-CONV-001 | 输出样例 | 样例文件转出 Markdown |
| S2-QA-006 | P1 | `[ ]` | Windows 无 Node 使用方案 | S2-CLI-001 | package | 普通用户可直接运行 |

## 6. S3 桌面 GUI

阶段目标：**给人用的轻量桌面转换器和阅读器，不替代手机端主流程，不做重型编辑器。**

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S3-GUI-001 | P1 | `[~]` | Electron + Vite + React GUI | desktop 项目 | GUI app | `npm run dev` 可启动 |
| S3-GUI-002 | P1 | `[~]` | 阅读 tab | S3-GUI-001 | UI | Markdown/JSON 可读 |
| S3-GUI-003 | P1 | `[~]` | 转换 tab | S3-GUI-001 | UI | 选择文件、输出目录、格式 |
| S3-GUI-004 | P1 | `[~]` | 拖拽批量转换 | S3-GUI-003 | interaction | 多文件加入队列 |
| S3-GUI-005 | P1 | `[~]` | GUI 接共享转换引擎 | S2-ENGINE-001 | IPC | GUI 与 CLI 结果一致 |
| S3-GUI-006 | P1 | `[x]` | JSON 编辑与校验 | S3-GUI-002 | editor | 已支持编辑/预览切换、格式化、压缩、校验、保存副本；证据：`desktop/src/components/ReaderPanel.tsx`、`desktop/electron/main/index.ts`；2026-07-03 `cd desktop && npm run typecheck && npm run build` 通过 |
| S3-GUI-007 | P1 | `[ ]` | 转换结果日志 | S3-GUI-003 | UI | 成功/失败原因清楚 |
| S3-GUI-008 | P1 | `[ ]` | 设置记忆 | S3-GUI-003 | storage | 输出目录和目标格式记住 |
| S3-GUI-009 | P1 | `[x]` | 桌面 GUI typecheck 验收 | S3-GUI-001 | 命令记录 | 2026-07-03 `cd desktop && npm run typecheck` 通过 |
| S3-GUI-010 | P1 | `[x]` | 桌面 GUI build 验收 | S3-GUI-001 | 命令记录 | 2026-07-03 `cd desktop && npm run build` 通过 |
| S3-GUI-011 | P2 | `[ ]` | Playwright 桌面 E2E | S3-GUI-001 | tests | 转换、阅读、错误提示自动化 |
| S3-GUI-012 | P1 | `[x]` | 电脑端快贴 tab | S3-GUI-001 | UI | 已支持搜索、提示词详情、一键复制、Mini 展开/收起；证据：`desktop/src/components/PromptPanel.tsx` |
| S3-GUI-013 | P1 | `[x]` | 独立置顶快贴窗 | S3-GUI-012 | IPC + Electron window | 已支持独立窄小浮窗、always-on-top、位置记忆、`Ctrl/Command + Shift + M` 呼出；证据：`desktop/electron/main/index.ts`、`desktop/src/App.tsx`；2026-07-03 `cd desktop && npm run typecheck && npm run build` 通过 |

## 7. S4 发布准备

阶段目标：**让别人可以稳定下载、安装、验证文件来源，且知道怎么用。**

### S4.1 Android / iOS 发布

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S4-MOBREL-001 | P0 | `[ ]` | Android debug APK smoke | S1-QA-001 | APK | 真机安装打开 |
| S4-MOBREL-002 | P0 | `[ ]` | Android release 签名 | S4-MOBREL-001 | keystore 配置 | release APK 可安装 |
| S4-MOBREL-003 | P0 | `[ ]` | Android arm64 APK | S4-MOBREL-002 | APK | 体积记录 |
| S4-MOBREL-004 | P0 | `[ ]` | Android universal APK | S4-MOBREL-002 | APK | 兼容下载 |
| S4-MOBREL-005 | P0 | `[ ]` | Android AAB | S4-MOBREL-002 | AAB | 上架准备 |
| S4-MOBREL-006 | P1 | `[ ]` | iOS TestFlight 准备 | S1-QA-006 | build | TestFlight 可测 |
| S4-MOBREL-007 | P1 | `[ ]` | 国内安卓商店材料 | S4-MOBREL-002 | icon/截图/文案/隐私 | 可提交 |

### S4.2 Windows / CLI 发布

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S4-WINREL-001 | P0 | `[ ]` | Windows installer | S3-GUI-010 | NSIS exe | 可安装运行 |
| S4-WINREL-002 | P0 | `[ ]` | CLI zip | S2-QA-003 | zip | 解压即可运行或有明确 Node 要求 |
| S4-WINREL-003 | P0 | `[ ]` | pandoc 随包策略 | S2-ENGINE-002 | resources | 安装后无需用户手动找 pandoc |
| S4-WINREL-004 | P1 | `[ ]` | Windows 代码签名评估 | S4-WINREL-001 | 方案 | 降低安装拦截 |

### S4.3 Release 与校验

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S4-REL-001 | P0 | `[ ]` | 版本号规则 | S4-MOBREL-001 | 文档 | `v0.1.0` 等规则清楚 |
| S4-REL-002 | P0 | `[ ]` | Release notes 模板 | S4-REL-001 | `release-notes.md` | 变更、已知问题、下载链接 |
| S4-REL-003 | P0 | `[ ]` | SHA256 校验文件 | S4-MOBREL-003 | `checksums-sha256.txt` | 每个产物有哈希 |
| S4-REL-004 | P0 | `[ ]` | GitHub Release | S4-REL-002 | Release 页面 | 附 APK/AAB/installer/CLI zip/checksum |
| S4-REL-005 | P1 | `[ ]` | 国内镜像上传 | S4-REL-004 | OSS/COS/Gitee | 国内下载稳定 |
| S4-REL-006 | P1 | `[ ]` | 回滚策略 | S4-REL-004 | 文档 | 发布失败可撤回 |

## 8. S5 官网、教程与增长

阶段目标：**让普通用户知道这是什么、怎么下载、怎么从微信/QQ 打开文件、为什么可以放心用。**

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S5-WEB-001 | P1 | `[ ]` | 官网下载页 | S4-REL-004 | web page | Android/Windows/CLI 下载入口清楚 |
| S5-WEB-002 | P1 | `[ ]` | 微信打开教程 | S1-OPEN-003 | 图文教程 | 用户照着能找到 App |
| S5-WEB-003 | P1 | `[ ]` | QQ 打开教程 | S1-OPEN-005 | 图文教程 | 用户照着能找到 App |
| S5-WEB-004 | P1 | `[ ]` | 隐私说明 | S0-PD-003 | privacy page | 默认本地、不上传说清楚 |
| S5-WEB-005 | P1 | `[ ]` | 更新日志 | S4-REL-002 | changelog | 每版变化清楚 |
| S5-WEB-006 | P1 | `[ ]` | 常见问题 | S1-OPEN-010 | FAQ | 文件打不开、找不到应用、分享失败有答案 |
| S5-WEB-007 | P2 | `[ ]` | 用户反馈入口 | S5-WEB-001 | issue/form | 可收集问题 |
| S5-WEB-008 | P2 | `[ ]` | 演示视频 | S5-WEB-002 | video | 30 秒展示微信打开到复制分享 |

## 9. S6 V1.5 办公增强

阶段目标：**从“当前文件处理”升级为“办公批量处理”，但仍保持手机轻量。**

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S6-BATCH-001 | P1 | `[ ]` | 手机批量转换中心 | S1-CONV-001 | page | 多文件加入队列 |
| S6-BATCH-002 | P1 | `[ ]` | 批量 MD 转 PDF/Word | S6-BATCH-001 | converter | 成功/失败列表 |
| S6-BATCH-003 | P1 | `[ ]` | 批量 JSON 转 MD/PDF/Word | S6-BATCH-001 | converter | 规则化输出 |
| S6-BATCH-004 | P1 | `[ ]` | 失败重试 | S6-BATCH-001 | action | 单个任务可重跑 |
| S6-BATCH-005 | P1 | `[ ]` | 转换结果批量分享 | S6-BATCH-001 | share action | 多文件分享或打包分享 |
| S6-BATCH-006 | P1 | `[ ]` | 格式推荐 | S1-CONV-001 | recommendation | 给人看推荐 PDF，继续编辑推荐 Word，给 AI 推荐 MD |
| S6-SEARCH-001 | P1 | `[x]` | 当前文件搜索 | S1-READ-001 | search UI | Markdown 当前文件搜索结果可跳转；证据：`mobile/src/components/Reader.tsx`、`mobile/src/markdown/search.ts` |
| S6-SEARCH-002 | P1 | `[x]` | 最近文档搜索 | S1-DATA-001 | search UI | 可通过标题/来源/类型/状态查找；证据：`mobile/src/components/RecentSheet.tsx` |
| S6-PROMPT-001 | P1 | `[ ]` | 提示词分组管理 | S1-PROMPT-001 | folders | 可新增/重命名/删除分组 |
| S6-PROMPT-002 | P1 | `[ ]` | 提示词标签管理 | S1-PROMPT-001 | tags | 可按标签筛选 |
| S6-PROMPT-003 | P1 | `[ ]` | 组合复制工作台 | S1-COPY-005 | UI | 勾选多个片段后合并复制 |
| S6-PROMPT-004 | P1 | `[ ]` | 提示词变量模板 | S1-PROMPT-001 | template UI | `{{文件内容}}`、`{{代码片段}}`、`{{JSON}}` 可填充后复制 |
| S6-PROMPT-005 | P1 | `[ ]` | 从 AI 可读卡片保存提示词候选 | S7-AI-002 | action | 推荐提示词一键入库 |
| S6-FLOAT-001 | P2 | `[ ]` | Android 悬浮快贴权限引导 | S1-PROMPT-001 | permission flow | 用户主动授权，能随时关闭 |
| S6-FLOAT-002 | P2 | `[ ]` | Android 悬浮小窗服务 | S6-FLOAT-001 | Foreground Service + WindowManager | 其他 App 上方可唤出小窗 |
| S6-FLOAT-003 | P2 | `[ ]` | 悬浮小窗搜索与最近提示词 | S6-FLOAT-002 | floating UI | 可搜索、查看最近、收藏 |
| S6-FLOAT-004 | P2 | `[ ]` | 悬浮小窗一键复制 | S6-FLOAT-003 | clipboard action | 复制后可回到当前 AI App |
| S6-FLOAT-005 | P2 | `[ ]` | 悬浮小窗隐私边界 | S6-FLOAT-002 | privacy UI | 不默认读取输入框，不默认上传剪贴板 |
| S6-IOS-001 | P2 | `[ ]` | iOS 键盘扩展设计与实现 | S1-PROMPT-001 | keyboard extension | AI 对话框内可选提示词复制或插入 |
| S6-IOS-002 | P2 | `[ ]` | iOS 分享扩展 | S1-OPEN-008 | share extension | 从其他 App 分享文本/文件到墨览 |
| S6-OFFICE-001 | P1 | `[ ]` | 桌面 GUI 接完整 Office 转 MD | S2-CONV-001 | GUI | GUI 支持 docx/pdf/pptx/xlsx/csv |
| S6-OFFICE-002 | P1 | `[x]` | 桌面 GUI JSON 编辑 | S3-GUI-006 | GUI | JSON 可校验、格式化、压缩并保存副本 |
| S6-QA-001 | P1 | `[x]` | GitHub Actions 全量检查 | S0-BUILD-006 | CI | 每次 push / PR 跑 mobile typecheck/test、desktop typecheck/build、desktop/cli typecheck/build/test |
| S6-QA-002 | P1 | `[ ]` | 移动端 E2E | S1-QA-007 | Maestro | 打开、复制、分享路径自动化 |
| S6-QA-003 | P1 | `[ ]` | 桌面端 E2E | S3-GUI-011 | Playwright | 转换与阅读路径自动化 |

## 10. S7 V2 后端、备份与 AI

阶段目标：**在不破坏离线优先和隐私信任的前提下，提供历史找回、跨设备同步、AI 文件识别和整理。**

### S7.1 后端与账号

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S7-BACKEND-001 | P2 | `[ ]` | 后端技术选型 | S0-PD-006 | design doc | Node.js + TypeScript，数据库/对象存储明确 |
| S7-BACKEND-002 | P2 | `[ ]` | 账号体系 | S7-BACKEND-001 | auth | 用户可登录/退出 |
| S7-BACKEND-003 | P2 | `[ ]` | 本地优先同步模型 | S7-BACKEND-001 | sync design | 离线可用，联网后同步 |
| S7-BACKEND-004 | P2 | `[ ]` | 加密与隐私策略 | S7-BACKEND-001 | security doc | 默认不上传，用户主动开启 |
| S7-BACKEND-005 | P2 | `[ ]` | 数据删除与导出 | S7-BACKEND-002 | API/UI | 用户能删除云端数据 |

### S7.2 备份与历史

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S7-BACKUP-001 | P2 | `[ ]` | 最近文档云备份 | S7-BACKEND-003 | API + client | 换设备能找回历史 |
| S7-BACKUP-002 | P2 | `[ ]` | 提示词库云备份 | S7-BACKEND-003 | API + client | 提示词跨设备恢复 |
| S7-BACKUP-003 | P2 | `[ ]` | 文件内容备份选项 | S7-BACKEND-004 | setting | 用户明确选择才上传文件内容 |
| S7-BACKUP-004 | P2 | `[ ]` | 历史版本 | S7-BACKUP-003 | versioning | 可恢复旧版本 |
| S7-BACKUP-005 | P2 | `[ ]` | 冲突处理 | S7-BACKEND-003 | conflict UI | 多端编辑不覆盖 |

### S7.3 AI 文件识别与整理

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S7-AI-001 | P2 | `[ ]` | 本地规则识别 | S1-READ-001 | classifier | PRD/README/提示词/API JSON/日志可识别 |
| S7-AI-002 | P2 | `[ ]` | 操作建议 | S7-AI-001 | suggestion UI | 不阻断阅读，只推荐复制/转格式/加入提示词 |
| S7-AI-003 | P2 | `[ ]` | 可选 AI 识别 | S7-BACKEND-001 | AI service | 用户开启后分析文件类型 |
| S7-AI-004 | P2 | `[ ]` | Office 转 MD 后 AI 清理 | S2-CONV-007 | cleanup service | 标题、表格、噪声更适合 AI 读取 |
| S7-AI-005 | P2 | `[ ]` | JSON 结构解释 | S1-JSON-001 | explain UI | 解释字段含义和可复制路径 |
| S7-AI-006 | P2 | `[ ]` | 语义搜索 | S7-BACKUP-001 | index/search | 按意思查历史文件 |
| S7-AI-007 | P2 | `[ ]` | AI App 跳转追问 | S1-COPY-001 | deep link/share | 复制片段后可跳指定 AI 工具 |
| S7-AI-008 | P2 | `[~]` | 电脑端 CLI 云命令 `molan pull` | S7-BACKEND-003 | CLI command | 已支持本地 AI 文件收件箱列表；待接真实云端 |
| S7-AI-009 | P2 | `[~]` | 电脑端 CLI 云命令 `molan read` | S7-AI-008 | CLI command | 已支持按 id/title 读取本地 Markdown/JSON；待接真实云端 |
| S7-AI-010 | P2 | `[~]` | 电脑端 CLI 云命令 `molan push` | S7-AI-008 | CLI command | 已支持保存本地文件到 AI 文件收件箱；待接真实云端并同步回手机 |
| S7-AI-011 | P2 | `[ ]` | MCP 本地 Agent 入口 | S7-AI-009 | MCP server | 可列文件、读文件、搜提示词、写回结果 |
| S7-AI-012 | P2 | `[ ]` | AI 可读转换评分 | S2-CONV-007 | scorer | 标题层级、表格、代码块、噪声风险可提示 |
| S7-AI-013 | P2 | `[ ]` | AI 生产结果回流 | S7-AI-010 | sync flow | AI 生成 Markdown/JSON 同步到手机和电脑 |

## 11. S8 V3 团队、商业化与生态

阶段目标：**当个人工具跑通后，再做团队资源沉淀和商业化。**

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S8-TEAM-001 | P3 | `[ ]` | 团队空间 | S7-BACKEND-002 | workspace | 团队成员共享文件/提示词 |
| S8-TEAM-002 | P3 | `[ ]` | 权限模型 | S8-TEAM-001 | roles | owner/admin/member/viewer |
| S8-TEAM-003 | P3 | `[ ]` | 团队提示词库 | S8-TEAM-001 | prompt sharing | 团队可复用 |
| S8-TEAM-004 | P3 | `[ ]` | 审计日志 | S8-TEAM-002 | audit log | 文件和提示词变更可追踪 |
| S8-BIZ-001 | P3 | `[ ]` | 定价策略 | S7-BACKEND-002 | pricing doc | 免费/个人高级/团队版边界 |
| S8-BIZ-002 | P3 | `[ ]` | 支付方案 | S8-BIZ-001 | payment | 国内支付优先 |
| S8-BIZ-003 | P3 | `[ ]` | 企业部署评估 | S8-TEAM-001 | enterprise doc | 私有化需求是否值得做 |
| S8-ECO-001 | P3 | `[ ]` | 插件/脚本扩展点 | S2-CLI-001 | plugin design | 转换规则可扩展 |
| S8-ECO-002 | P3 | `[ ]` | 与 AI IDE/Agent 集成 | S2-CLI-001 | examples | Codex/Claude Code/Cursor 可调用示例 |

## 12. S9 长期运营与维护

阶段目标：**发布后能持续修问题、控质量、收反馈、迭代。**

| ID | 优先级 | 状态 | 任务 | 依赖 | 交付物 | 验收 |
|---|---|---|---|---|---|---|
| S9-OPS-001 | P1 | `[ ]` | 崩溃与错误收集方案 | S4-REL-004 | design | 默认不上传文件内容 |
| S9-OPS-002 | P1 | `[ ]` | 反馈入口 | S5-WEB-007 | issue/form | 用户能反馈打不开/分享失败 |
| S9-OPS-003 | P1 | `[ ]` | 版本兼容公告 | S4-REL-002 | changelog | 老版本升级说明 |
| S9-OPS-004 | P1 | `[ ]` | 回归测试清单 | S1-QA-005 | checklist | 每次发版验证入口、阅读、复制、转换、分享 |
| S9-OPS-005 | P2 | `[ ]` | 真实用户场景样本库 | S5-WEB-007 | anonymized fixtures | 不含隐私，覆盖 PRD/README/API JSON/提示词 |
| S9-OPS-006 | P2 | `[ ]` | 商店评论与问题整理 | S4-MOBREL-007 | ops doc | 高频问题进入 TODO |
| S9-OPS-007 | P2 | `[ ]` | 依赖升级节奏 | S0-BUILD-006 | policy | Expo/RN/Electron 升级有计划 |

## 13. V1 完成定义

V1 只在以下全部成立时关闭：

- [ ] 微信能打开 `.md`，最多滑动 1-2 下找到墨览。
- [ ] 微信能打开 `.json`，最多滑动 1-2 下找到墨览。
- [ ] QQ 能打开 `.md`，最多滑动 1-2 下找到墨览。
- [ ] QQ 能打开 `.json`，最多滑动 1-2 下找到墨览。
- [ ] Android `content://` 文件可稳定读取。
- [ ] iOS 文件打开、分享、Home Indicator 不遮挡。
- [ ] Markdown 常见语法阅读稳定。
- [ ] JSON 可树形阅读、复制字段、复制 JSONPath。
- [ ] Markdown / JSON 都能轻编辑，非法 JSON 不覆盖原文件。
- [ ] 全文、代码块、JSON 字段、提示词都能一键复制。
- [ ] 当前 Markdown 能转 PDF / Word，并能直接分享。
- [ ] 原文件和纯文本能通过系统分享发送给微信/QQ。
- [~] 最近文档可用，能记录类型、时间、状态；阅读位置目前由 Reader 按文档键本地记录，尚未回填到 RecentDoc。
- [ ] 核心功能离线可用。
- [ ] 手机端 typecheck/test 通过。
- [ ] APK/AAB 体积和冷启动有记录，冷启动到内容目标小于 5 秒。
- [ ] 电脑 CLI 能完成 Word/PDF/PPT/Excel/CSV 到 Markdown 的基础转换。
- [ ] 电脑 CLI 支持批量转换、JSON 输出、错误码、非 0 退出码。
- [ ] GitHub Release 至少包含 Android APK、Windows installer 或 CLI zip、checksum、release notes。

## 14. V1.5 完成定义

- [ ] 手机端有批量转换中心。
- [ ] 批量转换能显示成功/失败、支持失败重试。
- [ ] JSON 能转 Markdown/PDF/Word。
- [x] 当前文件搜索和最近文档搜索可用。
- [ ] 提示词分组、标签、组合复制可用。
- [ ] 桌面 GUI 支持完整 Office/PDF/PPT/Excel 转 Markdown。
- [x] GitHub Actions 跑 typecheck/test/build。
- [ ] 官网下载页、微信/QQ 教程、隐私说明可用。

## 15. V2 完成定义

- [ ] 用户可主动开启云备份。
- [ ] 默认本地，不默认上传文件内容。
- [ ] 最近文档、提示词库可跨设备恢复。
- [ ] Android 悬浮快贴可主动授权、搜索提示词、一键复制、随时关闭。
- [ ] iOS 键盘扩展或分享扩展可服务提示词复制/导入。
- [ ] 电脑端 CLI 支持 `molan pull/read/push`。
- [ ] MCP 本地 Agent 入口可列文件、读文件、搜提示词、写回结果。
- [ ] AI 可读转换评分可提示标题、表格、代码块、噪声风险。
- [ ] AI 生成的 Markdown / JSON 可回流到手机和电脑。
- [ ] 文件内容备份有明确开关和删除能力。
- [ ] 本地规则识别可判断 PRD、README、提示词、API JSON、日志等类型。
- [ ] AI 识别只做建议，不阻断阅读。
- [ ] Office 转 Markdown 后可选 AI 清理。
- [ ] JSON 结构解释和语义搜索进入可用状态。

## 16. 不做清单

- 不做重型 Markdown 编辑器。
- 不做 Obsidian 类知识库。
- 不做完整办公套件。
- 不做专业 JSON IDE。
- 不做提示词社区。
- 不做默认云盘。
- 不默认上传用户文件。
- 不内置通用 AI 聊天。
- 不把电脑端重转换塞进手机 APK。
- 不为了历史实现保留复杂双流程。
- 不把海外社交平台作为国内 V1 主目标。

## 17. 每次任务关闭时必须补的证据

| 类型 | 必须证据 |
|---|---|
| 代码任务 | 文件路径、关键实现点、typecheck/test 结果 |
| 真机任务 | 机型、系统版本、来源 App、操作步骤、结果截图或视频 |
| 转换任务 | 输入样例、输出文件、失败样例、错误信息 |
| 发布任务 | 产物文件名、大小、SHA256、下载链接 |
| 文档任务 | 文档路径、更新章节、与 PRD 是否一致 |
| 性能任务 | 测量设备、包体大小、冷启动时间、转换耗时 |

## 18. 下一轮开发建议

按这个顺序推进，不要跳：

1. 先跑 `git status`，保护现有工作区改动。
2. 手机端跑 `npm run typecheck` 和 `npm run test`，记录当前基线。
3. 桌面端跑 `npm run typecheck`。
4. CLI 跑 `npm run typecheck`、`npm run build`、`molan check`。
5. 做微信/QQ 真机打开验证，先确认入口是否成立。
6. 如果入口不成立，优先修 app identity、intent filters、mimeType、图标、名称。
7. 如果入口成立，补复制闭环和分享闭环。
8. 做 APK/AAB 体积和冷启动记录。
9. 用真实 Word/PDF/PPT/Excel 样例验收 CLI 转 Markdown。
10. 再进入 Release 打包和官网下载页。

## 19. 公共契约、验证计划与默认假设

### 19.1 公共契约

这些契约属于跨端稳定接口，后续实现不能随意改名或改变语义：

| 契约 | 必须保留 / 扩展 | 验收 |
|---|---|---|
| CLI 命令 | `molan convert`、`molan check`、`molan pull`、`molan read`、`molan push` | 帮助文档可见，命令失败有明确错误码 |
| CLI JSON 输出 | `ok`、`results`、`outputPath`、`errorCode`、`error` | AI / agent 可解析下一步 |
| MCP 入口 | 列文件、读文件、搜提示词、写回 AI 生成结果 | 本地 Agent 可通过 MCP 使用云端 / 本地资料 |
| 云端数据概念 | users、devices、prompts、documents、document_versions、file_objects、sync_events、conversion_jobs、ai_jobs | 手机、电脑、后端不各自定义一套概念 |
| 手机端文件状态 | 未处理、已阅读、已复制、已编辑、已转换、已分享、已归档、已同步、冲突 | 最近文档、云端收件箱、AI 文件收件箱状态一致 |

### 19.2 验证计划

| 验证类型 | 必做检查 | 通过标准 |
|---|---|---|
| 文档一致性 | 搜索 `selected-mobile-ui`、`selected-desktop-ui` | `TODO.md`、`docs/full-plan.md` 均引用 |
| 文档一致性 | 搜索 Android 悬浮快贴、iOS 键盘扩展、置顶快贴窗、MCP、`molan pull/read/push` | 全量任务和完成定义均覆盖 |
| 手机产品验收 | 微信 / QQ 打开 `.md` / `.json` | 最多滑动 1-2 下找到墨览，5 秒内看到内容 |
| 手机产品验收 | 复制和转换分享 | 10 秒内复制提示词，20 秒内转换并分享 |
| 电脑 CLI 验收 | 真实 Word / PDF / PPT / Excel 样例转换 | 输出 Markdown + AI 可读 JSON 日志 |
| 桌面端验收 | 置顶快贴窗 | always-on-top、复制、快捷命令、Mini 模式可用 |
| 发布验收 | APK/AAB、Windows installer、CLI zip、checksum、release notes | 外部用户可下载、校验、安装 |
| 官网验收 | 下载页、微信/QQ 教程、隐私说明 | 国内用户能找到、安装、理解默认本地原则 |

### 19.3 默认假设

- 当前选定 UI 就是最终设计基线，后续不再用微信系统页替代 App UI。
- 默认中文表达。
- 没有明确要求时，不写为了历史包袱服务的兼容代码。
- 云端不是 V1 阻塞项，但必须完整规划到最终完成。
- 手机端悬浮功能指 Android 系统级悬浮快贴；iOS 用键盘扩展或分享扩展实现相近目标。

## 20. 测试判断规则（写不写测试的判据）

> 完整策略见 `AGENTS.md` 的「Testing strategy (enforced)」。本节是针对本 TODO 全量任务的速查裁定，新 AI 接手时按此执行，不要再凭感觉写测试。

### 20.1 一条核心判据

**"这个 bug 不写测试，多快会被发现？"** —— 答案是"立刻/很快"的不写；答案是"会藏在某个角落，几天后才暴雷"的才写。

### 20.2 该写测试的（写完代码立刻写）

| 代码类型 | 本项目实例 | 为什么该测 |
|---|---|---|
| 纯逻辑 + 规则 + 边界 | `parseToc`（中文标点、行内 token 递归）、`mergeDocumentStatuses`（unprocessed 去重顺序）、`buildJsonRows`（JSONPath 引号 key / 数组下标） | 无 UI、无副作用、断了不会立刻报错，但状态/路径会错乱 |
| 对外输出契约 | CLI `--json` 输出（`cloud.test.ts` 守 push→pull→read）、MCP 响应、云端 API schema | 消费者是 AI，AI 不会告诉你它读不懂；改字段名会悄悄断掉整条工作流 |
| 状态机 | 文件状态机（D4.3）、转换任务状态机（D4.4） | 状态转移错了，UI 还能跑，但用户看到的状态标签会错 |

### 20.3 不该写测试的（写了是浪费，会拖慢）

| 代码类型 | 本项目实例 | 为什么不该测 |
|---|---|---|
| 标准库薄封装 | `JSON.parse`/`stringify` 包一层（已删 `jsonFormat.test.ts`）、字符串 `includes` 搜索（已删 `markdownSearch.test.ts`） | 坏了立刻崩；类型已保证结构；测它等于测标准库 |
| 零引用函数 | `getByPath`（已删 `jsonPath.test.ts`） | 函数本身就该删，不是"测它" |
| UI 组件 / 交互 / RN 渲染 | Reader、各 Sheet、JsonView 的渲染 | mock 成本 > 抓 bug 收益；用真机验收清单（§S1.12）和截图 |
| 类型能证明的不变量 | 函数返回类型、props 接口 | `tsc` 已经证明了，运行时断言多余 |

### 20.4 针对 TODO 里具体测试任务的裁定

下表是本 TODO 里带"测试/fixture/E2E"字样的任务，**新 AI 按此裁定执行，不要默认全做**：

| 任务 ID | 任务 | 裁定 | 理由 |
|---|---|---|---|
| S1-QA-003 | Markdown fixture 测试 | ✅ **做** | marked 解析有真实边界（嵌套列表、代码块、表格），属于纯逻辑，值得 fixture 覆盖 |
| S1-MD-011 | 1MB+ 长文性能测试 | 🔶 **改做手动测量** | 这是性能验收不是单测；用真机 + 计时记录，不写 vitest 单测 |
| S1-QA-007 | Maestro 移动端 E2E | ⏸ **延后** | E2E 框架成本高，V1 用真机验收清单（S1-QA-005/006）；真机通过后再考虑 |
| S2-QA-001 | CLI fixture 样本集 | ✅ **做** | docx/pdf/pptx/xlsx 样本是 CLI 契约测试的基础，必须有 |
| S2-QA-004 | CLI 单测 | ✅ **做**（补 fixture 部分） | `cloud.test.ts` 已守契约，待补的是转换 fixtures 的回归 |
| S2-QA-005 | 真实文件 smoke test | ✅ **做** | CLI 转换是 AI 主入口，必须对真实样例验证输出 |
| S3-GUI-011 | Playwright 桌面 E2E | ⏸ **延后** | 桌面 GUI 是 P1，E2E 等核心转换/阅读稳定后再做 |
| S1-QA-002 | 单元测试基线 | ✅ **保持** | 当前 3 文件/18 测试是合理基线；不要为了"覆盖率"再加凑数测试 |

### 20.5 写测试时的硬规矩

1. **每个测试必须能"有意义地失败"**：写完后在脑子里把被测代码改坏，确认断言会抓住。抓不住就删测试。
2. **测试和代码同提交**：纯逻辑/契约测试不是事后补的，它是你第一次运行这段代码的方式。
3. **不为了覆盖率写测试**：项目没有覆盖率门槛，也不设。覆盖率是凑数测试的温床。
4. **遇到拿不准的，先问判据**：如果某个测试候选不知道该不该写，回 20.1 那个问题；还定不了，看 AGENTS.md 完整策略。
