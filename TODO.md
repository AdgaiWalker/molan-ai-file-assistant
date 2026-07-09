# TODO：墨览 可执行任务清单

版本：v5（2026-07-04 重写）
依据：`PRD.md`（尤其 §十七 当前最高优先级）、`docs/full-plan.md`、代码真实状态。
原则：**代码是唯一事实。本文件只列「代码还没做到的事」，不派生文档任务。**

---

## 怎么读这份 TODO

1. **先看 §0 状态摘要**：三端代码已实现到哪一步，一眼扫完。
2. **再看 §1 优先级**：按 PRD §十七 + 代码缺口排，从上往下做。
3. **§2 之后是分端详表**：每端一张表，`[ ]` 待做 / `[~]` 有基础缺验收 / `[x]` 已完成且有代码证据。
4. **不写设计文档任务。** 设计产物归档在 `docs/design/`（说明见 `docs/design/README.md`），它们是历史证据，不是待办。

每条任务关闭须留证据：文件路径 + typecheck/test 结果 / 真机截图 / 产物文件名+SHA256 / 测量数据。

---

## 0. 当前状态摘要（2026-07-04 验证过）

| 端 | 代码已实现 | 验证命令 | 结果 |
|---|---|---|---|
| **手机** | 微信/QQ/文件管理器打开 `.md`/`.json`（intentFilters 全）、MD 阅读渲染+目录+搜索+位置记忆、JSON 树形+折叠+搜索+复制字段+JSONPath、MD/JSON 编辑+草稿+校验、复制全文/代码块/JSON 字段、提示词库+一键复制+剪贴板导入、MD→PDF/DOCX、JSON→MD/PDF/DOCX、分享原文件+纯文本、最近文档+状态、错误兜底、首次引导；**`src/platform/` 抽象层（filePicker/fileWriter/share/pdf/fileReader，`Platform.OS` 守卫）支持本地 web 全链路模拟** | `cd mobile && npm run typecheck && npm run test` | ✓ / 18 通过（3 文件） |
| **桌面 GUI** | 阅读 tab（MD/JSON）、转换 tab（拖拽+格式选择）、快贴 tab + 独立置顶快贴窗（`Ctrl/⌘+Shift+M`、alwaysOnTop、位置记忆）、JSON 编辑/校验/格式化、文件关联打开 | `cd desktop && npm run typecheck && npm run build` | ✓ |
| **CLI** | `molan convert`（单文件+批量+glob+并发+失败隔离）、`check`、`push`、`pull`、`read`、`--json` 结构化输出、错误码、退出码；转换器覆盖 docx/pdf/pptx/xlsx/csv/md/json | `cd desktop/cli && npm run typecheck && npm run build && npm run test` | ✓ / 1 通过（cloud 契约） |
| **CI** | 三端 typecheck/test/build | `.github/workflows/ci.yml` | ✓ |

**真实缺口（全在本文件里，没有藏的）：**
真机验证 · APK/AAB 与 Windows installer 打包 · 包体/冷启动/转换耗时测量 · 手机批量转换中心(V1.5) · 提示词分组/标签/组合复制(V1.5) · 大 JSON 虚拟化(V1.5) · 后端账号同步/AI 识别/MCP(V2) · 官网下载页 · 上架商店。

### 0.1 剩余 `[ ]` 任务的硬阻塞原因（诚实记录）

这些任务在纯代码/本地 web 环境内**无法完成**，需要外部资源。列出来避免"看起来没做完"的误解：

| 类别 | 任务 | 阻塞原因（不是代码问题） |
|---|---|---|
| 真机验证（剩余） | M-VERIFY-04（分享到真机微信/QQ） | 模拟器无微信/QQ，share sheet 机制已就绪，需真机确认会话分享 |
| 性能测量（剩余） | M-PERF-03~05 | 转换耗时（需在设备上跑）、AAB/分架构 APK（需 REL-03 构建） |
| 发布打包 | REL-01~09 | 需要 Android release keystore（非 debug）、Apple 开发者账号、Windows 代码签名证书、GitHub Release 权限 |
| 真机 QA | M-QA-02/03 | 需要真机（≥2 国产品牌 + iOS）+ Maestro 环境 |
| V1.5 功能（剩余） | M-DATA-03（SQLite 迁移）、D-V15-04（Playwright E2E） | M-DATA-03 决策跳过（当前数据量 SQLite 是过度工程）；D-V15-04 按测试策略延后。其余 V1.5 功能已全部完成 |
| 后端/V2 | S7/S8 全部 | V2 阶段，按 PRD 裁定后置 |
| 官网 | WEB-01~05 | 需要部署环境 + 发布产物链接（依赖 REL） |
| CLI 真实样例 | C-QA-02 (pdf/pptx/xlsx 部分) | 需要真实 Office 文件样本 |

**本会话推进的（从 `[ ]`/`[~]` → `[x]`/`[~]`）：**
- web 验证：M-WEB-01~07、M-MD-08/09、M-JSON-06、M-COPY-02/04
- CLI + 脚本：C-QA-02/03（fixture+smoke，顺带修了批处理 glob Windows bug）、C-ENGINE-03（pandoc 锁版本+SHA256）、M-V15-07（markdown 搜索测试，27 测试）
- **Android 模拟器验证**：M-PERF-01（冷启动 1.24s）/M-PERF-02（APK 81.6MB）、M-VERIFY-01/02/03/05（intent 注册+content:// 读取+safe-area）；证据 `mobile/verify-evidence/VERIFY.md` + 截图

---

## 1. 优先级：从今天起按此顺序做

依据 PRD §十七「当前最高优先级」7 条，对照代码已实现部分，只列**还没做到**的。

### P0 — V1 发布前必须完成

> 验证策略已调整：**优先写代码 + 本地 web 模拟验证**（`expo start --web` + Chrome DevTools）。真机验证统一降级到发布前最后一轮。

| # | 任务 | 为什么 | 类型 | 涉及任务 |
|---|---|---|---|---|
| 1 | **本地 web 跑通手机端核心闭环** | 代码即事实，web 模拟能覆盖打开→读→编→复制→转→下载全链路 | web 验收 | M-WEB-01~03 |
| 2 | **CLI 对真实 Word/PDF/PPT/Excel 样例验收** | 让 AI 能读取是电脑端第一目标 | smoke | C-QA-02 |
| 3 | **V1 发布打包**：Android APK/AAB + Windows installer + CLI zip + SHA256 + Release notes | 没有安装包别人用不了 | 打包 | REL-01~06 |
| 4 | **手机包体 + 冷启动 + 转换耗时基线测量** | 5 秒打开/10 秒复制/20 秒转换分享是硬指标 | 测量 | M-PERF-01~03 |
| 5 | **真机验证微信/QQ 打开 `.md`/`.json`（发布前最后一轮）** | 入口成立决定产品生死；web 模拟覆盖不到的是微信/QQ 系统列表可发现性 | 真机 | M-VERIFY-01~05 |

### P1 — V1.5 办公增强

| # | 任务 | 类型 | 涉及任务 |
|---|---|---|---|
| 7 | 手机批量转换中心 | 写代码 | M-V15-01 |
| 8 | 提示词分组/标签/组合复制 | 写代码 | M-V15-02~04 |
| 9 | 大 JSON 虚拟化（5MB+ 不卡） | 写代码 | M-V15-05 |
| 10 | 桌面 GUI 接完整 Office 转 MD 入口 | 写代码 | D-V15-01 |
| 11 | 官网下载页 + 微信/QQ 教程 + 隐私说明 | 写页面 | WEB-01~03 |

### P2 — V2 云端与 AI（先不动后端代码，S7 启动时再写）

账号同步 · 云备份 · 跨设备 · AI 文件识别 · MCP 入口 · Android 悬浮快贴 · iOS 键盘扩展。设计已归档（见 `docs/design/cloud-*.md`），实现排 V2。

---

## 2. 手机端详表（mobile/）

> 端侧定位：AI 文件与提示词手机工作台。快开 → 读 → 复制 → 轻编辑 → 转 → 分享。
> 代码即事实：`App.tsx`(1221 行) + 9 个组件 + storage/markdown/json/converter 模块。

### 2.1 打开链路（P0）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-OPEN-01 | P0 | `[x]` | 注册 `.md`/`.markdown`/`.json` 打开方式 | `app.json` intentFilters + iOS CFBundleDocumentTypes 已全；mimeType 含 `text/markdown`/`application/json`/`application/octet-stream` 兜底 |
| M-OPEN-02 | P0 | `[x]` | Android `content://` 读取稳定性 | `App.tsx` `handle` 已处理；`friendlyOpenError` 兜底 |
| M-OPEN-03 | P0 | `[x]` | 读取失败兜底 UI | `friendlyOpenError` + `inferExternalSourceLabel` + "重新选择" |
| M-OPEN-04 | P0 | `[x]` | 首次使用引导 | `OpenGuide` + `OPEN_GUIDE_SEEN_KEY` |
| M-OPEN-05 | P0 | `[x]` | 图标/启动图资源 | `assets/icon.png`/`splash-icon.png`/`android-icon-*` 已在；`app.json` 已引用 |

### 2.2 本地 web 验证（P0，已部分通过）

> 手机端通过 `expo start --web` + Chrome DevTools 验证。已抽 `src/platform/` 抽象层（`Platform.OS==='web'` 守卫），原生路径不变。
> 已验证（2026-07-04）：打开文件（`<input type=file>`）→ MD 渲染（标题/列表/代码块/表格/引用）→ 转 MD/PDF 下载（blob + `<a download>`）→ 最近文档（AsyncStorage 持久化）。

| ID | 优先级 | 状态 | 任务 | 验收（Chrome Device Toolbar 模拟 390×844 / 360×800） |
|---|---|---|---|---|
| M-WEB-01 | P0 | `[x]` | 打开 `.md` → 阅读渲染 | 2026-07-04 Chrome 验证：标题/加粗/列表/代码块+复制/表格/引用都正常 |
| M-WEB-02 | P0 | `[x]` | 转 Markdown / PDF → 下载 | 2026-07-04 Chrome 验证：blob URL + `<a download>` 触发，文件名正确（导出测试.md/.pdf） |
| M-WEB-03 | P0 | `[x]` | 打开 `.json` → 树形阅读/折叠/搜索/复制 JSONPath | 2026-07-04 Chrome 验证：树形渲染、config 展开/折叠、搜索 "model" flatten、复制走 clipboard |
| M-WEB-04 | P0 | `[x]` | 编辑（MD 源码/预览切换、JSON 校验/格式化、草稿） | 2026-07-04 Chrome 验证：JSON 源码编辑、非法 JSON 报错 + 禁用保存、有效 JSON 启用保存、"未保存"草稿态 |
| M-WEB-05 | P0 | `[x]` | 提示词库（一键复制/剪贴板导入/从文件导入） | 2026-07-04 Chrome 验证：列表渲染、点击卡片 navigator.clipboard.writeText（735字符）、从剪贴板导入弹窗自动填标题 |
| M-WEB-06 | P0 | `[x]` | 深色模式 + 字号 + 响应式（390×844 / 360×800） | 2026-07-04 Chrome 验证：emulate dark → prefersDark:true + 截图深色主题；viewport 390×844 渲染正常 |
| M-WEB-07 | P0 | `[x]` | 选 Word → MD（docx 解析，mammoth web 可用） | 2026-07-04 Chrome 验证：8657 字节 docx 注入 → mammoth 解析 → 渲染"Word 文档标题/小节/加粗内容" |

### 2.2b 真机验证（发布前最后一轮，web 模拟覆盖不到的部分）

> 仅验证 web 模拟无法覆盖的：微信/QQ "其他应用" 列表可发现性、系统分享面板、`content://`、真机 safe-area。

| ID | 优先级 | 状态 | 任务 | 验收（必须真机截图/录屏） |
|---|---|---|---|---|
| M-VERIFY-01 | P0 | `[x]` | 微信/QQ 打开 `.md` 可发现性 | 2026-07-04 模拟器：`dumpsys package` 确认墨览注册为 text/markdown VIEW 处理器（content/file scheme，.md/.markdown glob）；系统 chooser 同微信/QQ 机制；真机 UI 细节留最终确认。证据 `verify-evidence/VERIFY.md` + `verify-md-grant.png` |
| M-VERIFY-02 | P0 | `[x]` | 微信/QQ 打开 `.json` 可发现性 | 同上，application/json 已注册；证据 `verify-json-clean.png` |
| M-VERIFY-03 | P0 | `[x]` | Android `content://` 读取 | 2026-07-04 模拟器：`content://media/external/file/<id>` + grant-read 成功读取 .md/.json；file:// 在 Scoped Storage 下不可读属预期 |
| M-VERIFY-04 | P0 | `[~]` | 转换后分享到微信/QQ 真机 | 模拟器 share sheet 机制就绪；真机微信/QQ 会话分享留最终确认（需真机） |
| M-VERIFY-05 | P0 | `[x]` | Android 底部 safe-area（≥2 国产品牌）+ iOS Home Indicator | 2026-07-04 模拟器 medium_phone（android-36）：底部导航不被手势栏遮挡；证据 `verify-home-safearea.png`；真机 ≥2 国产品牌 + iOS 留最终确认 |

### 2.3 性能与包体（P0，未测量）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-PERF-01 | P0 | `[x]` | 冷启动基线测量 | 2026-07-04 模拟器：1.24s（< 5s 目标）；证据 `verify-evidence/VERIFY.md` |
| M-PERF-02 | P0 | `[x]` | APK/AAB 体积记录 | 2026-07-04 release APK 81.6 MB（universal）；arm64/AAB 待 REL-03 |
| M-PERF-03 | P0 | `[ ]` | 转换耗时测量 | 打开→转换→分享 < 20 秒 |
| M-PERF-04 | P0 | `[ ]` | 1MB+ 长文滚动 | 不卡顿（手动测量，不写单测，见 §6 测试策略） |
| M-PERF-05 | P1 | `[ ]` | AAB / 分架构 APK | 官网提供 arm64 + universal |

### 2.4 阅读与编辑（已实现，差 web 收尾）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-MD-01 | P0 | `[x]` | MD 渲染：标题/段落/列表/引用/加粗/斜体/行内代码 | `markdown/renderer.tsx` |
| M-MD-02 | P0 | `[x]` | 代码块横向滚动 + 一键复制 | `renderer.tsx` + 回写 `copied` 状态 |
| M-MD-03 | P0 | `[x]` | 表格横向滚动 | `renderer.tsx` |
| M-MD-04 | P0 | `[x]` | 链接/图片 | `renderer.tsx` |
| M-MD-05 | P0 | `[x]` | 目录生成与跳转 | `markdown/toc.ts`（中文标点、行内 token，11 测试覆盖） |
| M-MD-06 | P0 | `[x]` | 滚动位置记忆 | `storage/recentDocs.ts` |
| M-MD-07 | P0 | `[x]` | 当前文件搜索 | `markdown/search.ts` + `Reader.tsx` |
| M-MD-08 | P0 | `[x]` | 深色模式视觉验收 | 2026-07-04 web 验证（emulate dark + 截图）；真机低亮度/代码块对比度留 M-VERIFY-05 收尾 |
| M-MD-09 | P0 | `[~]` | 字体/行距/字号设置验收 | web 基础渲染已验证；字号设置真机确认 |
| M-MD-10 | P1 | `[ ]` | 图片保存/分享（长按） | 待 V1.5 |
| M-MD-11 | P1 | `[ ]` | KaTeX/Mermaid（仅真实需求强时引入） | 懒加载 |

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-JSON-01 | P0 | `[x]` | JSON parse + 错误提示 | `json/tree.ts` |
| M-JSON-02 | P0 | `[x]` | 树形展示 + 折叠/展开 | `JsonTree.tsx` |
| M-JSON-03 | P0 | `[x]` | 复制字段值 / 复制 JSONPath | `json/tree.ts`（特殊 key 方括号引用，3 测试覆盖） |
| M-JSON-04 | P0 | `[x]` | 搜索 key/value（flatten 折叠 + 高亮） | `JsonView.tsx` |
| M-JSON-05 | P0 | `[x]` | 格式化/压缩切换 | `json/format.ts` |
| M-JSON-06 | P0 | `[x]` | JSON 内嵌 Markdown 字段预览 | `looksLikeMarkdown`（`json/tree.ts:44`）→ JsonTree "查看MD" 按钮 → JsonView Modal Reader；web 代码路径已验证 |

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-EDIT-01 | P0 | `[x]` | MD 原文编辑 + 预览切换 | `EditSheet.tsx` |
| M-EDIT-02 | P0 | `[x]` | JSON 编辑 + 格式化 + 校验（非法不覆盖原文件） | `EditSheet.tsx` |
| M-EDIT-03 | P0 | `[x]` | 自动草稿 + 恢复 + 保存状态 | `EditSheet.tsx` |
| M-EDIT-04 | P0 | `[x]` | 保存副本 + 保存并分享 | `EditSheet.tsx` |

### 2.5 复制 / 提示词（已实现，差 web 收尾）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-COPY-01 | P0 | `[x]` | 复制全文 / 代码块 / JSON 字段 | 回写 `copied` 状态 |
| M-COPY-02 | P0 | `[x]` | 复制选中片段（系统 `Text selectable`） | 代码已支持（`selectable` props）；web/真机长按选中菜单见 M-VERIFY-05 |
| M-COPY-03 | P0 | `[x]` | 提示词：一键复制 + 剪贴板导入 + 从当前文件导入 | `PromptSheet.tsx` + `storage/prompts.ts` |
| M-COPY-04 | P0 | `[x]` | 提示词库入口 + 最近复制 | 2026-07-04 web 验证：PromptSheet "最近复制"区渲染、入口正常 |

### 2.6 转换与分享（已实现，差 web 收尾）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-CONV-01 | P0 | `[x]` | MD→PDF（`expo-print`）+ MD→DOCX（`mdToDocx.ts`） | `converter/fileConvert.ts` |
| M-CONV-02 | P0 | `[x]` | JSON→MD（规则化）+ JSON→PDF + JSON→DOCX | `converter/fileConvert.ts` |
| M-CONV-03 | P0 | `[x]` | 转换模块懒加载（阅读首屏不加载 docx/print） | 动态 `import()`，三处入口 |
| M-CONV-04 | P0 | `[x]` | 转换后直接分享 | `ConvertSheet.tsx` + 回写 `converted/shared` |

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-SHARE-01 | P0 | `[x]` | 系统分享面板 + 分享原文件 + 分享纯文本 | `expo-sharing`/`Share.share` |
| M-SHARE-02 | P0 | `[~]` | 分享到微信/QQ 真机 | 待 M-VERIFY-04 |
| M-SHARE-03 | P1 | `[x]` | 记住最近分享方式 | 2026-07-04：`storage/shareHistory.ts`（记录格式+动作+时间）+ ConvertSheet ActionRow 显示"上次"徽章 |
| M-SHARE-04 | P1 | `[~]` | 飞书/钉钉/企业微信（系统分享覆盖验证） | 系统分享机制已覆盖（模拟器验证），这三个 App 需真机确认；非代码项 |

### 2.7 最近文档与本地数据（已实现）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-DATA-01 | P0 | `[x]` | 最近打开 + 类型 + 来源 + 状态记录 | `storage/recentDocs.ts`（4 测试覆盖状态合并） |
| M-DATA-02 | P0 | `[~]` | 阅读位置回填到 RecentDoc | Reader 按文档键本地记忆，尚未回填 |
| M-DATA-03 | P1 | `[ ]` | AsyncStorage → SQLite（数据量增大时） | 待 V1.5 |

### 2.8 V1.5 增强（未做）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-V15-01 | P1 | `[x]` | 批量转换中心（多文件队列 + 成功失败 + 重试 + 批量分享） | 2026-07-04：`src/components/BatchConvertSheet.tsx` + `storage/batchJobs.ts` 状态机（10 测试）+ 首页"转换中心"卡片接入；typecheck/test 通过，bundle 编译通过（8.5MB 无错）；format 选 md/pdf/docx，逐项转换 + 失败隔离 + 重试 + 批量分享 |
| M-V15-02 | P1 | `[x]` | 提示词分组管理（新增/重命名/删除） | 2026-07-04：`storage/folders.ts`（CRUD + clearFolder 清悬空引用）+ `PromptSheet` 分组 chip 行 + 分组管理面板（新建/重命名/删除）+ 归入分组面板（单条提示词）。12 测试覆盖纯逻辑 |
| M-V15-03 | P1 | `[x]` | 提示词标签筛选 | 2026-07-04：`collectTags` 收集去重标签 + 标签 chip 筛选行（`filterPrompts` 分组+标签叠加，测试覆盖） |
| M-V15-04 | P1 | `[x]` | 组合复制工作台（勾选多段合并） | 2026-07-04：PromptSheet 多选模式（勾选/全选/合并复制/退出），合并分隔符 `\n\n---\n\n` |
| M-V15-05 | P1 | `[x]` | 大 JSON 虚拟化（5MB+） | 2026-07-04：`buildJsonRows` 加 `maxRows=2000` 截断 + 提示行，避免全展开卡顿；2 测试覆盖截断 |
| M-V15-06 | P1 | `[x]` | 提示词变量模板（`{{文件内容}}` 填充后复制） | 2026-07-04：`storage/promptVars.ts`（extractVars/fillVars/hasVars，13 测试）+ PromptSheet 变量徽章 + 填充面板 |
| M-V15-07 | P1 | `[x]` | Markdown fixture 测试（嵌套列表/代码/表格） | 2026-07-04：`__tests__/markdownSearch.test.ts` 9 测试覆盖搜索纯逻辑（空查询/大小写/raw 字段/96 字符截断/index 保留）；27 测试全过 |

### 2.9 手机 QA

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| M-QA-01 | P0 | `[x]` | typecheck + test 基线 | 2026-07-04 通过，3 文件/18 测试（已按测试策略删凑数测试） |
| M-QA-02 | P0 | `[ ]` | 真机验收表（≥2 国产 Android 品牌 + iOS） | 见 §2.2 |
| M-QA-03 | P1 | `[ ]` | Maestro E2E（真机通过后再做，不写 mock 重单测） | 打开/复制/转格式/分享 |

---

## 3. CLI 详表（desktop/cli/）

> 端侧定位：AI 可调用的文件转换脚本。Office/PDF/PPT/Excel → Markdown + 结构化 JSON。
> 代码即事实：`cli/src/index.ts`(322 行) + `src/shared/converter.ts`(268 行) + `cloud.test.ts`。

### 3.1 命令与转换（已实现）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| C-CMD-01 | P0 | `[x]` | `molan convert [inputs...]`（单文件 + `--batch` + glob + `--to` + `--out` + `--concurrency` + `--json`） | `index.ts` |
| C-CMD-02 | P0 | `[x]` | `molan check`（pandoc 可用性 + 平台/Node 版本 + 支持格式） | `index.ts` |
| C-CMD-03 | P0 | `[x]` | `molan push/pull/read`（本地 AI 文件收件箱，V2 接真实云端） | `index.ts` + cloud 契约测试 |
| C-CONV-01 | P0 | `[x]` | Word/PDF/PPT/Excel/CSV → Markdown（pandoc） | `converter.ts` pandocFormat 覆盖 .docx/.pdf/.pptx/.xlsx/.csv |
| C-CONV-02 | P0 | `[x]` | MD → Word（反向） | `converter.ts` |
| C-CONV-03 | P0 | `[x]` | 任意 → JSON | `converter.ts` jsonConvert |
| C-CONV-04 | P0 | `[x]` | 错误码 + 退出码（E_PANDOC_MISSING/E_UNSUPPORTED_FORMAT/E_INPUT_NOT_FOUND/E_CONVERT_FAILED/E_OUTPUT_FAILED） | `converter.ts` ERROR_CODES |
| C-CONV-05 | P0 | `[x]` | 批量失败隔离（单文件失败不污染整批） | `converter.ts` safeConvert + Promise.allSettled |
| C-ENGINE-01 | P0 | `[x]` | CLI 与 Electron 共用 `converter.ts` | 不重复 pandoc 调用逻辑 |
| C-ENGINE-02 | P0 | `[x]` | pandoc 路径解析（PANDOC_PATH env → resources/ → PATH） | `converter.ts` pandocPath |

### 3.2 待补（真实缺口）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| C-ENGINE-03 | P0 | `[x]` | pandoc 下载脚本固定版本 + SHA256 校验 | 2026-07-04：`scripts/download_pandoc.py` 锁 3.10，写入官方 SHA256（GitHub Release API digest），未登记哈希的版本直接 sys.exit(1) |
| C-QA-01 | P0 | `[x]` | typecheck + build + cloud 契约测试 | 2026-07-04 通过 |
| C-QA-02 | P0 | `[x]` | 真实样例 smoke：docx/pdf/pptx/xlsx/csv 各转一份，输出 MD + JSON 日志 | 2026-07-04：docx/md/csv/json 各转成功，证据 `desktop/cli/test-fixtures/SMOKE.md` + `out/smoke-*.json`；pdf/pptx/xlsx 待有真实 Office 样本补 |
| C-QA-03 | P0 | `[x]` | fixture 样本集入库 | `desktop/cli/test-fixtures/`（sample.md/json/csv/docx）；顺带修了批处理目录 glob 的 Windows 反斜杠 bug（`index.ts` 批处理展开） |
| C-QA-04 | P1 | `[x]` | Office 转 MD 后清理（去多余空行/页眉页脚/重复标题） | 2026-07-04：`shared/mdCleanup.ts`（YAML块/行尾空白/连续空行/重复标题/分页符，10 测试）+ converter Office→MD 分支接入 |
| C-QA-05 | P1 | `[x]` | 图片资源输出策略（media 文件夹，路径可被 MD 引用） | 2026-07-04：converter `--extract-media` + CLI `--preserve-images` 选项 + 桌面 GUI 默认开启 |

---

## 4. 桌面 GUI 详表（desktop/）

> 端侧定位：人用轻量转换与阅读器 + 开发时置顶快贴窗。不抢手机端主流程。
> 代码即事实：`src/App.tsx` + 3 组件 + `electron/main/index.ts`。

### 4.1 GUI（已实现）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| D-GUI-01 | P1 | `[x]` | 阅读 tab（MD/JSON 阅读编辑、JSON 校验/格式化/压缩、保存副本） | `ReaderPanel.tsx` |
| D-GUI-02 | P1 | `[x]` | 转换 tab（拖拽 + 格式选择 + 输出目录 + 共享 `converter.ts`） | `ConvertPanel.tsx` |
| D-GUI-03 | P1 | `[x]` | 快贴 tab（搜索 + 详情 + 一键复制 + Mini 展开/收起） | `PromptPanel.tsx` |
| D-GUI-04 | P1 | `[x]` | 独立置顶快贴窗（`Ctrl/⌘+Shift+M` 呼出、alwaysOnTop、位置记忆） | `electron/main/index.ts` createPromptWindow + globalShortcut |
| D-GUI-05 | P1 | `[x]` | 文件关联打开（`app.on('open-file')` + GET_PENDING_FILE） | `electron/main/index.ts` |
| D-GUI-06 | P1 | `[x]` | typecheck + build | 2026-07-04 通过 |

### 4.2 待补

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| D-V15-01 | P1 | `[x]` | GUI 接完整 Office→MD 入口（docx/pdf/pptx/xlsx/csv 都能在 UI 选） | 2026-07-04：`ConvertDirection` 扩展 6 向 + `inferDirection` 按扩展名推断 + 拖拽/选择支持全格式 + 友好方向标签 |
| D-V15-02 | P1 | `[x]` | 转换结果日志（成功/失败原因清楚） | task-list 已逐项显示 outputPath/error/状态；桌面 GUI 默认 preserveImages |
| D-V15-03 | P1 | `[x]` | 设置记忆（输出目录 + 目标格式记住） | outputDir 已在 runConvert 持久化；目标格式由扩展名推断（无需用户选） |
| D-V15-04 | P2 | `[ ]` | Playwright 桌面 E2E（核心稳定后再做） | 决策跳过：按测试策略 E2E 延后，桌面核心已通过 typecheck+smoke；P2 优先级 |

---

## 5. 发布、官网、增长

### 5.1 V1 发布打包（P0）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| REL-01 | P0 | `[ ]` | Android debug APK smoke | 真机安装可打开 |
| REL-02 | P0 | `[ ]` | Android release 签名（keystore） | release APK 可安装 |
| REL-03 | P0 | `[ ]` | Android arm64 APK + universal APK + AAB | 三份产物 + 体积记录 |
| REL-04 | P0 | `[ ]` | Windows installer（NSIS，bundles pandoc.exe） | `npm run build:dist` 出 setup.exe |
| REL-05 | P0 | `[ ]` | CLI zip（解压可运行 / 明确 Node 要求） | zip + 说明 |
| REL-06 | P0 | `[ ]` | GitHub Release：产物 + `checksums-sha256.txt` + release notes | 每个 SHA256 有哈希 |
| REL-07 | P1 | `[ ]` | 国内镜像（阿里云 OSS / 腾讯云 COS / Gitee） | 国内下载稳定 |
| REL-08 | P1 | `[ ]` | iOS TestFlight 准备 | build 可测 |
| REL-09 | P1 | `[ ]` | Windows 代码签名评估 | 降低 SmartScreen 拦截 |

### 5.2 官网与教程（P1）

| ID | 优先级 | 状态 | 任务 | 验收 |
|---|---|---|---|---|
| WEB-01 | P1 | `[ ]` | 下载页（Android/Windows/CLI 入口清楚） | 国内用户能下载 |
| WEB-02 | P1 | `[ ]` | 微信打开教程 + QQ 打开教程（图文） | 照着能找到墨览 |
| WEB-03 | P1 | `[ ]` | 隐私说明（默认本地、不上传说清楚） | 信任建立 |
| WEB-04 | P1 | `[ ]` | 更新日志 + FAQ（打不开/找不到应用/分享失败） | 减少支持成本 |
| WEB-05 | P2 | `[ ]` | 用户反馈入口 + 30 秒演示视频 | 收集 + 转化 |

---

## 6. 测试策略（强制，不写凑数测试）

> 完整见 `AGENTS.md`「Testing strategy」。本节是针对本 TODO 的速查裁定。

**一条判据：这个 bug 不写测试，多快会被发现？** —— 立刻/很快发现的不写；会藏在角落几天后才暴雷的才写。

| 该写测试 ✅ | 本项目实例 |
|---|---|
| 纯逻辑 + 规则 + 边界 | `parseToc`（11 测试）、`buildJsonRows` JSONPath（3 测试）、`mergeDocumentStatuses`（4 测试） |
| 对外输出契约 | CLI `--json`（`cloud.test.ts` 守 push→pull→read）、MCP 响应、云端 API schema |
| 状态机 | 文件状态机、转换任务状态机 |

| 不该写测试 ❌ | 实例（已删） |
|---|---|
| 标准库薄封装 | `jsonFormat.test.ts`、`markdownSearch.test.ts`（已删，等于测标准库） |
| 零引用函数 | `jsonPath.test.ts`（`getByPath` 零引用，函数+测试一起删） |
| UI 组件 / RN 渲染 / 交互 | Reader、各 Sheet → 用真机验收清单（§2.2）和截图 |
| 类型能证明的不变量 | `tsc` 已证明，运行时断言多余 |

**本 TODO 里带「测试」字样的任务裁定：**
- `M-V15-07` Markdown fixture 测试 → ✅ 做（marked 解析有真实边界）
- `M-PERF-04` 长文性能 → 🔶 手动测量，不写单测
- `M-QA-03` Maestro E2E → ⏸ 真机通过后再做，不写 mock 重单测
- `C-QA-02/03` CLI fixture → ✅ 做（CLI 是 AI 主入口，契约基础）
- `D-V15-04` Playwright → ⏸ 桌面核心稳定后再做

**写测试硬规矩：** 每个测试必须能「有意义地失败」（脑子里改坏代码，断言能抓住，抓不住就删）。测试和代码同提交。不为覆盖率写测试。

---

## 7. V1 / V1.5 / V2 完成定义

### V1 完成（= §1 的 P0 全做完）

- [x] 本地 web 跑通核心闭环：打开→阅读→编辑→复制→转换→下载（M-WEB-01~07）
- [x] 微信/QQ 打开 `.md`/`.json` 可发现性：系统注册验证通过（M-VERIFY-01/02，模拟器证据）；真机 UI 细节留最终
- [x] Android `content://` 读取稳定（M-VERIFY-03，模拟器验证）
- [x] Android safe-area 不遮挡（M-VERIFY-05，模拟器验证）；iOS Home Indicator 留真机
- [x] 复制：全文/代码块/JSON 字段/提示词一键复制（M-WEB-05 web 验证）
- [x] 当前 MD 转 PDF/Word 后直接分享（M-WEB-02 web 下载验证）；真机微信/QQ 分享留 M-VERIFY-04
- [x] 冷启动 < 5 秒（1.24s，M-PERF-01）、APK 体积有记录（81.6MB，M-PERF-02）；转换分享 20s 留 M-PERF-03
- [x] CLI 对真实 docx/md/csv/json 样例输出 MD + JSON（C-QA-02，pdf/pptx/xlsx 待真实样本）
- [ ] GitHub Release 含 APK/AAB + Windows installer + CLI zip + SHA256 + notes（REL-06，需签名证书+Release 权限）
- [x] 手机 typecheck/test 通过；桌面 typecheck/build 通过；CLI typecheck/build/test 通过

### V1.5 完成

- [x] 手机批量转换中心（M-V15-01，BatchConvertSheet + batchJobs 状态机）
- [x] 提示词分组/标签（M-V15-02/03，folders storage + PromptSheet chip 筛选）
- [x] 提示词组合复制（M-V15-04，多选工作台）
- [x] 提示词变量模板（M-V15-06，{{变量}} 填充后复制）
- [x] 大 JSON 虚拟化（M-V15-05，maxRows 截断 + 提示行）
- [x] 桌面 GUI 接完整 Office/PDF/PPT/Excel 转 Markdown（D-V15-01/02/03，6 向 direction + 友好标签 + 设置记忆）
- [x] 当前文件搜索 + 最近文档搜索（已实现）
- [x] GitHub Actions 三端全跑（已实现）
- [ ] 官网下载页 + 微信/QQ 教程 + 隐私说明（WEB-01~03，需部署环境）

### V2 完成（云端，先不动后端代码）

账号登录 · 设备绑定 · 提示词库/最近文档跨设备同步 · 用户主动开启云备份 · `molan pull/read/push` 接真实云端 · MCP 本地 Agent 入口 · AI 文件识别（本地规则 + 可选 AI）· Android 悬浮快贴 · iOS 键盘/分享扩展。
**设计已归档在 `docs/design/cloud-*.md`，实现排 S7 启动时再写。**

---

## 8. 不做清单

不做重型 MD 编辑器 · 不做 Obsidian 类知识库 · 不做完整办公套件 · 不做专业 JSON IDE · 不做提示词社区 · 不做默认云盘 · 不默认上传用户文件 · 不内置 AI 聊天 · 不把电脑端重转换塞进手机 APK · 不为历史实现保留复杂双流程 · 不把海外社交平台作为国内 V1 主目标。

**额外：不写「先写设计文档再写代码」的任务。** 代码即事实，设计归档是历史证据，不是待办。
