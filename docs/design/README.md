# 设计与契约文档索引

日期：2026-07-16

`PRD.md` 是产品、业务流程、平台职责、目标架构和技术栈的唯一事实源。`TODO.md` 只定义实现顺序。

本目录只保留无法合理塞进总纲、并且会直接用于实现或验收的细节。历史 UI 方案、阶段矩阵、冻结总结和重复全量方案已经删除。

如果本目录文档与 `PRD.md` 冲突，以 `PRD.md` 为准，并在实际开发对应阶段先修正文档再写代码。

## 跨端契约

这些文档将在 `TODO.md` 阶段 A 重新核对并冻结：

| 文档 | 作用 |
|---|---|
| `mobile-reading-acceptance-matrix.md` | 旧移动端行为、迁移取舍、失败路径和原生验收基线 |
| `desktop-cli-command-contract.md` | CLI 命令、JSON 输出、错误码和退出码 |
| `conversion-job-state-machine.md` | 转换任务状态 |

文件生命周期、格式能力、本地/云端模型与 API 旧稿因不再符合原生移动端和派生文件关系而删除；它们将在阶段 A 按 `PRD.md §§5-8` 重新建立。

## 同步与 AI 实现细节

| 文档 | 作用 |
|---|---|
| `cloud-account-device-system.md` | 账号和设备关系 |
| `cloud-sync-strategy.md` | 离线队列、增量同步与冲突 |
| `cloud-file-upload-boundary.md` | 文件上传和隐私边界 |
| `ai-read-entrypoints.md` | CLI、MCP、本地 API 和云端 API 的读取入口 |
| `ai-result-return-flow.md` | AI 结果与来源文件的关联和回流 |

## 转换、隐私与验收

| 文档 | 作用 |
|---|---|
| `conversion-recipes.md` | 不同用途对应的目标格式和转换规则 |
| `permission-privacy-principles.md` | 权限触发、告知、上传和删除边界 |
| `key-metrics-design.md` | 手机阅读、同步和 AI 读取的测量口径 |
| `website-download-page.md` | 官网下载、教程、隐私和 FAQ 内容要求 |
| `release-operations-checklist.md` | 发布、监控、回滚和测试版本演练清单 |
| `v2-validation-batches.md` | D/E/F 外部批次与移动真机批次的可执行 runbook |

固定跨端阅读样例位于根目录 `fixtures/mobile-reading/`，由生成脚本和 `SHA256SUMS` 保证字节一致。

## 清理规则

- 已被 `PRD.md` 或更具体契约完整覆盖的总结文档直接删除；
- 不保留“仅作历史参考”的 UI 和流程副本；
- 契约被替代后删除旧契约，不并行维护两个版本；
- 删除前用全文搜索确认代码、测试和文档没有继续引用。
