# 设计文档索引

日期：2026-07-04

## 目录约定

`docs/design/` 分两层：

- **顶层**：仍然有效的契约、冻结、策略、云端/AI 设计。代码或未来阶段直接依赖，不要改名或删。
- **`archive/`**：手机端 / 桌面端的 UI、页面、流程类设计文档。这些是「先全量设计，再分端开发」阶段的产物，**代码已是事实，以代码为准**，文档仅保留作为历史参考和 TODO 证据链。

> 看到任何 `archive/` 下文档与代码冲突时，**以代码为准**。不要再按归档文档去「实现」一遍。

## 顶层文档分类

### 契约 / 冻结（跨端稳定接口，代码依赖）

| 文档 | 作用 |
|---|---|
| `desktop-cli-command-contract.md` | `molan convert/check/pull/read/push` 参数、JSON 输出、错误码、退出码 |
| `desktop-cli-contract-freeze.md` | CLI 契约冻结门槛汇总 |
| `file-state-machine.md` | 文件状态机（手机/桌面/CLI/云端/MCP 统一） |
| `conversion-job-state-machine.md` | 转换任务状态机 |
| `local-data-model.md` | 本地数据模型（DocumentRecord 等） |
| `cloud-data-model.md` | 云端 9 个数据概念（TODO §19.1） |
| `cloud-api-draft.md` | 云端 API 草案 |
| `local-cloud-field-mapping.md` | 本地/云端字段映射 |
| `cloud-design-freeze.md` | 云端设计冻结门槛汇总 |

### 策略 / 发布 / 验收（未来阶段输入）

| 文档 | 对应阶段 |
|---|---|
| `end-to-end-scenario-map.md` / `feature-boundary-decision-table.md` / `user-task-priority-matrix.md` / `information-architecture.md` | D0 基线 |
| `key-metrics-design.md` / `permission-privacy-principles.md` / `development-task-acceptance-index.md` | D0/D5 |
| `package-size-strategy.md` / `release-package-design.md` / `release-channel-strategy.md` / `website-download-page.md` | S4/S5 发布 |
| `conversion-recipes.md` | S1.9 / S6 转换 |

### 云端 / AI 工作流（V2，S7+ 才动）

| 文档 | 作用 |
|---|---|
| `cloud-mvp-loop.md` | 云端 MVP 闭环 |
| `cloud-account-device-system.md` | 账号设备 |
| `cloud-sync-strategy.md` | 同步策略 |
| `cloud-file-upload-boundary.md` | 上传边界（隐私） |
| `ai-file-library.md` / `ai-read-entrypoints.md` / `ai-result-return-flow.md` | AI 读取与回流 |

## archive/ 下是什么

22 个手机端 + 桌面端 UI / 流程设计文档。覆盖：首页、Markdown/JSON 阅读、编辑、复制、提示词、分享、转换、AI 卡片、最近文档、设置、批量转换、桌面 GUI、置顶快贴、Office 转换规则等。

这些文档对应的 UI **已经按设计基线图实现**（见 `mobile/src/components/`、`mobile/App.tsx`、`desktop/src/components/`）。归档不是废弃，是声明「设计阶段结束，进入实现阶段」。

## 如何对待 TODO 里的证据指针

TODO D1.x / D2.x 的证据仍指向 `docs/design/archive/xxx.md`，作为「设计任务已完成」的记录。这是历史证据，不要改回 `[ ]`，也不要删指针——它们证明 D 层设计阶段闭环了。
