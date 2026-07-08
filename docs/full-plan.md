# 全量方案：墨览 AI 文件与提示词助手

版本：v3（2026-07-04 重写）
依据：`PRD.md`、`TODO.md`、代码真实状态。
市场：国内优先。总体目标：**把散落文件整理成 AI 能读、人能用的内容。**

> 本文件只回答两个问题：**产品做什么、不做什么（§1-§3）**，以及**从今天代码状态走到最终发布要怎么走（§4）**。
> 设计产物已归档在 `docs/design/`（说明见 `docs/design/README.md`），本文件不再复述设计阶段。

---

## 1. 产品边界：两个端，两条链路

墨览不是万能工具，只打通两条链路：

| 端 | 定位 | 第一目标 | 不承担 |
|---|---|---|---|
| 手机 App | AI 文件与提示词手机工作台 | 快开 → 读 → 复制 → 轻编辑 → 转 → 分享 | 完整办公套件、重型知识库、内置 AI 聊天 |
| 电脑 CLI + GUI | AI 可调用的文件转换 + 开发快贴窗 | Office/PDF/PPT/Excel → MD 给 AI 读；开发时置顶快贴 | 手机端社交分享主流程 |

两条链路：

```
手机：微信/QQ/本地 → 打开 → 阅读 → 复制/轻编辑 → 转 PDF/Word/原文件 → 分享
电脑：Word/PDF/Excel/PPT → Markdown → AI 读取/处理/复用
```

### 不做清单（裁死边界）

不做重型 MD 编辑器 · 不做 Obsidian 类知识库 · 不做完整办公套件 · 不做专业 JSON IDE · 不做提示词社区 · 不做默认云盘 · 不默认上传用户文件 · 不内置 AI 聊天 · 不把电脑端重转换塞进手机 APK · 不为历史实现保留复杂双流程。

机会不在于功能比别人多，而在于：**在国内社交软件里收到 AI 文件时，比所有工具都快。**

---

## 2. 核心原则

1. **阅读优先** —— 文件打开后先阅读，识别/推荐/备份/AI 都不能挡在阅读之前。
2. **离线优先** —— V1 不依赖后端。打开/阅读/编辑/复制/最近文档/提示词/轻转换/分享全本地。云备份/同步/AI 后置且用户主动开启。
3. **Markdown / JSON 双核心** —— 两者都一等：能读、能改、能复制、能分享。
4. **复制是高频动作** —— 提示词/代码块/JSON 字段复制优先级高于转换。
5. **转换服务分享和 AI 读取** —— 手机转换服务"给别人看/改"；电脑转换服务"让 AI 能读"。
6. **React / TypeScript 优先** —— 迎合 AI 辅助开发。手机轻 RN、电脑 Node/Electron、未来后端尽量 TS。
7. **云端先设计后实现** —— V1 不做后端，但数据模型/文件状态/同步边界/隐私已定（归档 `docs/design/cloud-*.md`），上云时不推翻本地结构。

---

## 3. 技术选型

### 3.1 手机（mobile/）

```
React Native / Expo SDK 57 + TypeScript + Hermes
marked（MD 渲染）+ 自研 JSON Tree + AsyncStorage
expo-document-picker / expo-file-system / expo-sharing / react-native-safe-area-context
转换：mammoth(docx→md) / docx(md→docx) / expo-print(md→PDF) —— 全本地，懒加载
```

策略：轻 RN，不把 Office/PDF/PPT/Excel 重转换塞进手机包；重转换下沉电脑 CLI。AAB/分架构 APK 控制下载体积。转换模块懒加载，阅读首屏优先。

### 3.2 电脑 CLI（desktop/cli/）

```
Node.js + TypeScript + commander + fast-glob + execa
Pandoc（Office/PDF/PPT/Excel → MD）+ 共享 converter.ts
输出结构化 JSON（ok/results/outputPath/errorCode/error），AI 可解析
```

命令：`molan convert | check | push | pull | read`。脚本优先，GUI 后置，输出稳定，错误可读。

### 3.3 电脑 GUI（desktop/）

```
Electron + Vite + React + TypeScript
阅读/转换/快贴 三 tab + 独立置顶快贴窗（Ctrl/⌘+Shift+M, alwaysOnTop）
共享 converter.ts，与 CLI 结果一致
```

### 3.4 后端（V2，S7 才动）

Node.js + TypeScript + PostgreSQL/Supabase + 对象存储。用户主动开启云备份。S7 启动前不写后端代码，CLI 的 push/pull/read 本地模拟保持契约稳定。

---

## 4. 实施路线：从今天代码状态走到最终发布

> 代码现状已验证（2026-07-04 三端 typecheck/test/build 通过）。下面是**还差什么**，按顺序做。
> 完整任务清单见 `TODO.md`。本节是路线图，不重复任务条目。

```
当前代码（核心闭环已就绪）
  → V1：真机验证 + 性能基线 + 打包发布
  → V1.5：办公增强（批量/搜索/提示词管理/大 JSON 虚拟化）
  → V2：云端与 AI（账号/同步/AI 识别/MCP/悬浮快贴/键盘扩展）
  → V3：上架商店 + 团队化 + 长期运营
```

### 阶段 V1 — 核心闭环发布（P0）

**目标：手机端能从微信/QQ/文件管理器打开 `.md`/`.json`，读完能复制/转/分享；电脑 CLI 能让 AI 读取 Office；产出可下载安装包。**

代码已实现的部分（无需重做）：
- 手机：打开链路、MD/JSON 阅读+编辑+草稿+校验、复制（全文/代码块/JSON 字段）、提示词库、MD→PDF/DOCX、JSON→MD/PDF/DOCX、分享（原文件+纯文本）、最近文档、错误兜底、首次引导。
- CLI：5 命令、转换覆盖 docx/pdf/pptx/xlsx/csv/md/json、批量失败隔离、JSON 输出、错误码。
- 桌面 GUI：3 tab + 置顶快贴窗 + 文件关联。

V1 还要做的（真实缺口，全是验证/测量/打包）：
1. **真机验证** —— 微信/QQ/文件管理器打开、复制、转换分享、safe-area、`content://`。代码就绪，差真机证据（TODO §2.2）。
2. **性能基线** —— 冷启动 < 5s、转换分享 < 20s、APK/AAB 体积（TODO §2.3）。
3. **CLI 真实样例验收** —— 对真实 Word/PDF/PPT/Excel 输出 MD + JSON（TODO C-QA-02/03）。
4. **打包发布** —— Android APK/AAB + Windows installer（NSIS + pandoc）+ CLI zip + SHA256 + GitHub Release（TODO §5.1）。

V1 完成定义（全勾才算关）：
- 微信/QQ 打开 `.md`/`.json` 最多滑 1-2 下找到墨览，5 秒看到内容
- 复制 10 秒内、转换分享 20 秒内（真机证据）
- CLI 对真实 Office 样例输出可用
- GitHub Release 含安装包 + 校验 + notes

### 阶段 V1.5 — 办公增强（P1）

手机批量转换中心 · 提示词分组/标签/组合复制/变量模板 · 大 JSON 虚拟化 · 桌面 GUI 接完整 Office→MD · 官网下载页 + 微信/QQ 教程 + 隐私说明 · E2E（真机通过后做 Maestro，桌面稳定后做 Playwright）。

### 阶段 V2 — 云端与 AI（P2，先不动后端代码）

账号 + 设备 · 提示词库/最近文档跨设备同步 · 用户主动开启云备份（默认不上传）· `molan pull/read/push` 接真实云端 · MCP 本地 Agent 入口（列文件/读文件/搜提示词/写回结果）· AI 文件识别（先本地规则：PRD/README/提示词/API JSON/日志，可选 AI）· Office→MD 后 AI 清理 · Android 悬浮快贴 · iOS 键盘/分享扩展 · AI 生产结果回流。

设计已归档：`cloud-mvp-loop.md` / `cloud-account-device-system.md` / `cloud-sync-strategy.md` / `cloud-file-upload-boundary.md` / `ai-file-library.md` / `ai-read-entrypoints.md` / `ai-result-return-flow.md`。

### 阶段 V3 — 上架与增长（P3）

国内安卓商店 · App Store/Google Play · 微软商店评估 · 团队空间/权限/订阅 · 崩溃监控/反馈/版本策略。

---

## 5. PRD 冲突裁定（决策记录，不再复议）

| 冲突 | 裁定 |
|---|---|
| 批量转换中心归属（PRD §十七 列最高优先级，§七/§十八 归 V1.5） | **归 V1.5**。§十七 #7 应理解为"V1.5 起步项"。V1 先做"当前文件转换后直接分享" |
| 电脑端是否进 V1（§十二 说"不进 V1 主线"，§十八.8 纳入 V1） | §十二 指桌面 GUI 体验不进主线；**CLI 脚本（Word→MD + 批量 + JSON 输出）属 V1** |
| JSON 转办公格式（§七 P0 列 JSON→PDF/MD/Word，§十八.1 排 V1.5） | **V1 只做 JSON→Markdown（规则化），JSON→PDF/Word 排 V1.5**，避免低质量文档 |

---

## 6. 公共契约（跨端稳定接口，不能随意改名）

| 契约 | 必须保留 | 验收 |
|---|---|---|
| CLI 命令 | `molan convert / check / pull / read / push` | 失败有明确错误码 |
| CLI JSON 输出 | `ok` / `results` / `outputPath` / `errorCode` / `error` | AI 可解析下一步 |
| 手机端文件状态 | 未处理 / 已阅读 / 已复制 / 已编辑 / 已转换 / 已分享 / 已归档 / 已同步 / 冲突 | 最近文档、收件箱、云端一致 |
| 转换任务状态 | pending / running / success / failed / cancelled / shared / saved | 手机/桌面/CLI 一致 |

---

## 7. 默认假设

- 当前选定 UI（低饱和 Apple 玻璃质感）是 V1 基线，不再用微信系统页替代 App UI。
- 默认中文表达。
- 没有明确要求时，不写为历史包袱服务的兼容代码。
- 云端不是 V1 阻塞项，但已完整规划。
- 手机端悬浮功能 = Android 系统级悬浮快贴；iOS 用键盘/分享扩展实现相近目标。
- **代码是事实，文档是证据。设计阶段已结束，进入实现阶段。不再写"先设计后开发"的任务。**
