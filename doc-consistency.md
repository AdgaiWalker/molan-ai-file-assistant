# 文档一致性审核报告

> 审核时间: 2026-07-03（更新）
> 原始审核: 2026-07-02
> 项目: 墨览 文档阅读助手

## 已修复（本轮回填）

### 1. README 引用已删除的 mdconvert.py → 已修复
- 原始发现: README 多行引用已删除的 Python 原型
- 当前状态: README 已修改待提交，去掉了 mdconvert.py 引用

### 2. AGENTS.md 引用已删除的 mdconvert.py → 已修复
- 原始发现: AGENTS.md 命令行区引用 Python 原型
- 修复方式: 2026-07-03 重写 AGENTS.md，新增 `desktop/cli/` 命令、共享转换引擎说明、移除 Python 原型引用

### 3. AGENTS.md 声称"无测试套件" → 已修复
- 修复方式: AGENTS.md 更新为 "Vitest 测试套件在 mobile/（toc、JSONPath），运行 `npm run test`"

### 4. README 项目描述三端结构 → 已修复
- 修复方式: 三端改为 mobile / desktop / desktop/cli

### 5. TODO.md 称"无提示词库相关文件" → 已修复
- 修复方式: TODO.md T1.5 已更新为 "已实现 PromptSheet + prompts.ts 存储层"

### 6. PRD 规定分享入口为"分享"/"发送" → 已修复
- 修复方式: 按钮文案已是"分享"（2026-07-03 核实通过）

### 7. TODO.md T1.6.5 未完成 → 已修复
- 修复方式: 已标记 `[x]`

### 8. desktop 窗口标题不一致 → 已修复
- 修复方式: 2026-07-03 electron/main/index.ts 窗口 title 已改为"墨览 文档阅读助手"

### 9. PRD 要求 JSON 编辑 → 已部分修复
- 当前状态: EditSheet 已支持 JSON 编辑（校验 + 格式化 + 错误提示），当 `isJson=true` 时 edit 按钮可用

### 10. DISTRIBUTION.md CLI 策略无代码 → 已修复
- 修复方式: 2026-07-03 `desktop/cli/` 包已创建，`molan convert` 可用

### 11. AGENTS.md 转换引擎描述不完整 → 已修复
- 修复方式: AGENTS.md 新增共享引擎 `converter.ts`、`molan` CLI、格式支持列表

### 12-13. 来源标识 / 最近编辑复制标签 → 已部分修复
- 当前状态: `RecentDoc` 已有 `source`/`lastEditedAt`/`lastCopiedAt` 字段

### 14. 阅读位置记忆 TODO 标待核实 → 已修复
- 修复方式: TODO.md 标记为 `[x]`

### 17-19. 组合复制 / 分组复制 / 导入片段 → 已部分修复
- 当前状态: T1.5.7 "导入剪贴板片段" 已实现（PromptSheet 新增按钮）

### 20. JSON 编辑格式化校验 → 已修复
- 修复方式: EditSheet 已含 JSON 实时校验 + 格式化按钮 + 错误提示

### 22. AiPanel 默认值 qoder → 已修复
- 修复方式: 2026-07-03 已移除整个 AiPanel（功能由 CLI 承担）

### T2 电脑端 CLI 全部 → 已修复
- 修复方式: `desktop/cli/` 包 + `converter.ts` 共享引擎 + Electron 重构

## 剩余未修复

| # | 严重级别 | 描述 |
|---|---|---|
| 15 | P2 | `download_pandoc.py` 硬编码绝对路径 |
| 21 | P3 | `mobile/AGENTS.md` 过于简略 |
| 23 | P1 | PRD 内批量转换优先级矛盾（$十七 vs $七）已由 TODO 裁定 |
| 24 | P2 | 分享成功率指标需澄清 |

## 新架构一致性确认（2026-07-03）

| 资产 | 文档 | 代码 | 一致? |
|---|---|---|---|
| 桌面端定位 | PRD: "AI 可调用的格式转换脚本" | `desktop/cli/` molan convert | ✓ |
| CLI 入口 | AGENTS.md: `node dist/index.js convert` | `desktop/cli/dist/index.js` | ✓ |
| 共享引擎 | AGENTS.md: `converter.ts` | `desktop/src/shared/converter.ts` | ✓ |
| 格式支持 | TODO: docx/pdf/pptx/xlsx/csv | converter.ts: 全部 | ✓ |
| 错误码 | TODO: E_PANDOC_MISSING 等 | converter.ts: 5 个错误码 | ✓ |
| JSON 输出 | TODO: `{ok, results, errorCode}` | CLI --json 标志 | ✓ |
| GUI 功能 | App.tsx: 阅读 + 转换 | 2 个 tab | ✓ |
| AI tab | 无 | 已删除 | ✓ |
