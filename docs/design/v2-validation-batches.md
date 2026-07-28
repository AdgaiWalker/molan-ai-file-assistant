# 墨览 V2 外部验收批次

版本：v1

日期：2026-07-21

用途：把剩余外部批次压成可直接执行的清单，避免真机、真实 AI 客户端、弱网或发布环境到位后还要临时组织样例、命令和证据字段。

预检命令：

```bash
node scripts/v2_validation_preflight.mjs
node scripts/v2_validation_preflight.mjs --json
node scripts/v2_validation_report.mjs --list
node scripts/v2_validation_report.mjs --batch gate_d_sync
```

该脚本会校验两套固定样例：

- `fixtures/mobile-reading/SHA256SUMS`
- `desktop/cli/test-fixtures/SHA256SUMS`

并确认 D-010 / E-007 / F-005 / B/C 真机批次要引用的本地证据目录都存在。

需要实际填写记录时，使用：

```bash
node scripts/v2_validation_report.mjs --batch mobile_true_device
node scripts/v2_validation_report.mjs --batch gate_d_sync
node scripts/v2_validation_report.mjs --batch gate_e_ai_read
node scripts/v2_validation_report.mjs --batch gate_f_result_return
node scripts/v2_validation_report.mjs --batch release_dry_run
```

如果希望一次性把当前仍未完成的外部批次草稿全部准备好，直接执行：

```bash
node scripts/prepare_mobile_true_device_wave.mjs --out default
node scripts/prepare_sync_ai_wave.mjs --out default
node scripts/prepare_remaining_external_work.mjs
node scripts/prepare_remaining_external_work.mjs --write-summary
node scripts/remaining_dependency_matrix.mjs --out default
node scripts/remaining_todo_fast_path.mjs
```

其中 `node scripts/prepare_mobile_true_device_wave.mjs --out default` 会先跑外部批次预检，再一次性生成 B/C 真机批次模板，并固定样例与来源矩阵。

其中 `node scripts/prepare_sync_ai_wave.mjs --out default` 会先跑外部批次预检，再一次性生成 D-010 / E-007 / F-005 的三份模板，并把默认执行顺序固定为 `D-010 → E-007 → F-005`。

其中 `node scripts/remaining_dependency_matrix.mjs --out default` 会把剩余任务改按“真实外部条件”分组，方便在开始前先判断是先补正式身份、先借真机，还是先搭同步 / AI 联调环境最划算。

如需落盘：

```bash
node scripts/v2_validation_report.mjs --batch gate_d_sync --out docs/tmp/d010-report.md
node scripts/v2_validation_report.mjs --batch gate_d_sync --out default
```

默认 `--out default` 会写到 `docs/validation-runs/2026-07-21/<batch>/`，并同时创建同目录下的 `evidence/` 目录。

注意：这里生成的是“待执行模板”，不是完成证据；只有把真实执行结果、证据路径和结论填进去后，才允许据此关闭对应任务。

## 1. 批次 A：移动真机

对应任务：

- B-002 / B-004 / B-008 / B-009
- C-002 / C-004 / C-008 / C-009

固定样例：

- `fixtures/mobile-reading/markdown/normal.md`
- `fixtures/mobile-reading/json/normal.json`
- `fixtures/mobile-reading/text/utf8.txt`
- `fixtures/mobile-reading/markdown/large-1mb.md`
- `fixtures/mobile-reading/json/large-5mb.json`

真机来源：

- Android：微信、QQ、浏览器、文件管理器
- iPhone / iPad：微信、QQ、Safari、“文件”App、系统分享面板

每条证据都必须填写 [TODO.md](/Users/happy/Desktop/molan-ai-file-assistant/TODO.md) 的 13.2 模板。

## 2. 批次 B：Gate D 外部批次

对应任务：

- D-010

固定样例：

- `fixtures/mobile-reading/markdown/normal.md`
- `fixtures/mobile-reading/json/normal.json`
- `fixtures/mobile-reading/text/utf8.txt`
- `desktop/cli/test-fixtures/sample.docx`
- `desktop/cli/test-fixtures/sample.pdf`
- `desktop/cli/test-fixtures/sample.xlsx`
- `desktop/cli/test-fixtures/sample.pptx`

必跑环境：

- PostgreSQL 18 Compose
- Android 真机
- iPhone / iPad 真机
- 弱网 / 长离线 / 多端冲突环境

执行顺序：

1. `docker compose up --build --wait`
2. Android 收集 Markdown / JSON
3. iOS 收集 TXT
4. 桌面 pull 确认三端对象、哈希、版本一致
5. 再补 docx / pdf / xlsx / pptx 同步
6. 注入断网、设备撤销、双端冲突、删除恢复
7. 录屏并填写 13.3 跨端模板

本地证据目录：

- `native/androidApp/verify-evidence/`
- `native/iosApp/verify-evidence/`
- `desktop/verify-evidence/`

## 3. 批次 C：Gate E 外部批次

对应任务：

- E-007

固定样例：

- `desktop/cli/test-fixtures/sample.docx`
- `desktop/cli/test-fixtures/sample.pdf`

主链：

1. 手机收集 docx / pdf 原件
2. 同步到桌面真实收件箱
3. 转出 Markdown 派生副本
4. 在桌面授权 AI 读取
5. 通过一种真实 AI 客户端走 `CLI` 或 `MCP`
6. 记录读取日志或完整录屏

必须保留的证据：

- 原件 hash
- 派生 Markdown 路径或 hash
- 授权前拒绝
- 授权后可读
- 撤回后立即再次拒绝

## 4. 批次 D：Gate F 外部批次

对应任务：

- F-005

固定样例：

- `desktop/cli/test-fixtures/sample.docx`
- `desktop/cli/test-fixtures/sample.pdf`
- `fixtures/mobile-reading/json/normal.json`

主链：

1. 用真实 AI 客户端读取已授权样例
2. 生成摘要 / Markdown / JSON 结果
3. 用 `molan write-result` 或 MCP `write_result` 写回
4. 确认写成新版本或独立文档
5. 桌面推送 `air_` 事件
6. Android / iOS 收到并打开结果
7. 从结果回到来源，再执行复制 / 分享 / 保存副本

必须保留的证据：

- 结果 ID
- 来源文档 / 来源版本
- 手机端结果卡片与来源跳转录屏
- Android / iOS 各一条完整录屏

## 5. 批次 E：发布前官网 / 渠道

对应任务：

- G-006
- G-007

要求：

- 官网只允许两类入口：真实链接，或明确“准备中”
- 下载页、隐私说明、固定样例、CLI 源码、仓库入口均已公开
- 一旦公开 Android / TestFlight / Windows / macOS 真实渠道，需把链接、SHA256、教程截图、更新日志一起补齐

当前已完成：

- 官网“当前下载与发布状态”区块
- 真实 GitHub / CLI / 隐私 / 样例链接
- 发布与回滚清单骨架

## 6. 结束条件

只有同时满足下列条件，才允许把剩余外部项改成 `[x]`：

- 真机 / 真实 AI 客户端 / PostgreSQL 18 批次的录屏、日志和 hash 证据真实存在；
- 证据使用的样例与 `SHA256SUMS` 一致；
- 对应任务模板已填写；
- `TODO.md`、官网状态和相关 README 已同步。
