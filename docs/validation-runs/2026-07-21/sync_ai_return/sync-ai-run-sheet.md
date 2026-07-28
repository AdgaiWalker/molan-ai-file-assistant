# 同步 / AI 读取 / 结果回流逐项执行清单

日期：2026-07-21

用途：把 D-010 / E-007 / F-005 的真实联调拆成逐行执行项。真实 PostgreSQL 18、桌面端、真机和 AI 客户端到位后，按本表逐行补日志、录屏、hash 和结论；本表为空模板时不算完成证据。

## 汇总

- 执行行数：18
- 分组数：3
- 覆盖任务：D-010、E-007、F-005

## 分组

| 批次 | 任务 | 行数 |
| --- | --- | ---: |
| Gate D 外部批次（D-010） | D-010 | 8 |
| Gate E 外部批次（E-007） | E-007 | 5 |
| Gate F 外部批次（F-005） | F-005 | 5 |

## 执行表

| ID | 任务 | 阶段 | 环境 | 样例 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- | --- |
| d01-postgres-compose-health | D-010 | D-010 环境启动 | server/ PostgreSQL 18 Compose + desktop/ + Android/iOS 真机 | 无 | 健康检查返回数据库和对象存储可用；日志不含正文、token 或私密路径。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres-compose-health.txt` |
| d02-android-collect-markdown-json | D-010 | D-010 Android 收集上传 | Android 真机 + 真实同步服务 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 生成稳定 Document / Version / FileObject；同 hash 不重复上传；失败可重试。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/android-sync-start.mp4` |
| d03-ios-collect-text | D-010 | D-010 iOS 收集上传 | iPhone 真机 + 真实同步服务 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | App Group / 受控目录交接后可离线读；上传后版本关系与 Android 语义一致。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/ios-sync-start.mp4` |
| d04-desktop-pull-three-device | D-010 | D-010 桌面拉取 | desktop/ 真实收件箱 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98<br><br>fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 三份对象在桌面收件箱可见；重启桌面后索引仍可读；游标不重复消费。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/desktop-three-device-sync.png` |
| d05-office-pdf-sync | D-010 | D-010 Office / PDF 同步 | Android 或 iOS 真机 + desktop/ 转换读取 | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>desktop/cli/test-fixtures/sample.xlsx<br>4941 B<br>6c8972a832dfa8bfed1015ca9799fd7bcad3a4dfeb00b867584460057b2a5119<br><br>desktop/cli/test-fixtures/sample.pptx<br>29172 B<br>1deaac9db9546da9337535d0121f843b842db340d9f915fd9fb7fb202cef71d6 | 桌面能看到原件，保留来源关系；Office/PDF hash 与固定样例一致。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/desktop-office-objects.png` |
| d06-weak-network-long-offline | D-010 | D-010 弱网 / 长离线 | Android/iOS 真机 + 可控网络 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98<br><br>fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 队列不丢、不乱序；恢复后对象、版本、hash 与本地状态一致。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/weak-network-log.txt` |
| d07-device-revoke-delete-restore | D-010 | D-010 设备撤销 / 删除恢复 | 服务端设备列表 + Android/iOS/desktop | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 被撤销设备立即拒绝；删除后不可读，恢复后版本关系仍正确。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/device-revoke-delete-restore-log.txt` |
| d08-conflict-resolution | D-010 | D-010 双端冲突 | Android + iOS 或 desktop 双端并发 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 不静默覆盖；冲突双方均可追溯；最终解除冲突后同步收敛。 | `docs/validation-runs/2026-07-21/gate_d_sync/evidence/conflict-resolution-log.txt` |
| e01-sync-source-docx-pdf | E-007 | E-007 原件同步 | 手机真机 + desktop/ 真实收件箱 | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9 | 桌面看到原件 ID、版本 ID、hash；原件默认不可被 AI 直接读取。 | `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-source-docs.png` |
| e02-generate-markdown-derivatives | E-007 | E-007 派生副本 | desktop/ converter + inbox | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9 | 派生对象与来源版本关联稳定；Markdown 内容可供授权读取。 | `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-derivatives.png` |
| e03-ai-read-before-authorize | E-007 | E-007 授权前拒绝 | 真实 AI 客户端（CLI 或 MCP） | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9 | 读取被拒绝；审计记录不包含正文、token 或私密路径。 | `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-authorize-before.png` |
| e04-ai-read-after-authorize | E-007 | E-007 授权后可读 | 真实 AI 客户端（CLI 或 MCP） | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9 | 授权后可读；返回内容来自派生 Markdown；记录客户端名称、入口和日志。 | `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-success.mp4` |
| e05-ai-read-after-revoke | E-007 | E-007 撤回后拒绝 | 真实 AI 客户端（CLI 或 MCP） | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9 | 撤回立即生效；再次读取被拒绝；审计链路可解释。 | `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-revoked.mp4` |
| f01-ai-generate-result | F-005 | F-005 AI 生成结果 | 真实 AI 客户端 + 已授权来源 | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 结果明确关联来源文档与来源版本；结果内容不覆盖原件。 | `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ai-client-generate-result.mp4` |
| f02-write-result | F-005 | F-005 写回桌面 | desktop/ CLI 或 MCP | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 写回成功返回结果 ID；保存为新版本或独立文档；失败路径有明确错误。 | `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-write-result-log.txt` |
| f03-air-event-desktop | F-005 | F-005 结果事件 | desktop/ + sync server | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | `air_` 事件含结果 ID、来源文档、来源版本；不会泄漏正文到日志。 | `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-air-event-log.txt` |
| f04-android-result-return | F-005 | F-005 Android 回流 | Android 真机 | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。 | `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/android-result-open.mp4` |
| f05-ios-result-return | F-005 | F-005 iOS 回流 | iPhone 真机 | desktop/cli/test-fixtures/sample.docx<br>36796 B<br>032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570<br><br>desktop/cli/test-fixtures/sample.pdf<br>1722 B<br>84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9<br><br>fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。 | `docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ios-result-open.mp4` |

## 每行填写字段

### d01-postgres-compose-health

```text
行项：d01-postgres-compose-health
任务：D-010
阶段：D-010 环境启动
环境：server/ PostgreSQL 18 Compose + desktop/ + Android/iOS 真机

样例：
- 无

动作：启动 PostgreSQL 18 Compose，同步服务完成迁移和健康检查，再启动桌面端与移动端登录会话。
验收点：健康检查返回数据库和对象存储可用；日志不含正文、token 或私密路径。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/postgres-compose-health.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d02-android-collect-markdown-json

```text
行项：d02-android-collect-markdown-json
任务：D-010
阶段：D-010 Android 收集上传
环境：Android 真机 + 真实同步服务

样例：
- fixtures/mobile-reading/markdown/normal.md / 292 B / 4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：Android 收集 Markdown 与 JSON，显式入库并等待上传完成。
验收点：生成稳定 Document / Version / FileObject；同 hash 不重复上传；失败可重试。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/android-sync-start.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d03-ios-collect-text

```text
行项：d03-ios-collect-text
任务：D-010
阶段：D-010 iOS 收集上传
环境：iPhone 真机 + 真实同步服务

样例：
- fixtures/mobile-reading/text/utf8.txt / 77 B / 1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014

动作：iOS 收集 TXT，显式入库并等待上传完成。
验收点：App Group / 受控目录交接后可离线读；上传后版本关系与 Android 语义一致。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/ios-sync-start.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d04-desktop-pull-three-device

```text
行项：d04-desktop-pull-three-device
任务：D-010
阶段：D-010 桌面拉取
环境：desktop/ 真实收件箱

样例：
- fixtures/mobile-reading/markdown/normal.md / 292 B / 4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
- fixtures/mobile-reading/text/utf8.txt / 77 B / 1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014

动作：桌面 pull 同步 Android / iOS 上传对象，确认原件、版本、hash 与来源关系。
验收点：三份对象在桌面收件箱可见；重启桌面后索引仍可读；游标不重复消费。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/desktop-three-device-sync.png

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d05-office-pdf-sync

```text
行项：d05-office-pdf-sync
任务：D-010
阶段：D-010 Office / PDF 同步
环境：Android 或 iOS 真机 + desktop/ 转换读取

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- desktop/cli/test-fixtures/sample.xlsx / 4941 B / 6c8972a832dfa8bfed1015ca9799fd7bcad3a4dfeb00b867584460057b2a5119
- desktop/cli/test-fixtures/sample.pptx / 29172 B / 1deaac9db9546da9337535d0121f843b842db340d9f915fd9fb7fb202cef71d6

动作：补 docx / pdf / xlsx / pptx 原件同步，桌面端确认原件对象和可派生关系。
验收点：桌面能看到原件，保留来源关系；Office/PDF hash 与固定样例一致。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/desktop-office-objects.png

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d06-weak-network-long-offline

```text
行项：d06-weak-network-long-offline
任务：D-010
阶段：D-010 弱网 / 长离线
环境：Android/iOS 真机 + 可控网络

样例：
- fixtures/mobile-reading/markdown/normal.md / 292 B / 4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
- fixtures/mobile-reading/text/utf8.txt / 77 B / 1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014

动作：执行弱网、断网排队、一周长离线等价压测或可解释缩短版，并恢复同步。
验收点：队列不丢、不乱序；恢复后对象、版本、hash 与本地状态一致。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/weak-network-log.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d07-device-revoke-delete-restore

```text
行项：d07-device-revoke-delete-restore
任务：D-010
阶段：D-010 设备撤销 / 删除恢复
环境：服务端设备列表 + Android/iOS/desktop

样例：
- fixtures/mobile-reading/markdown/normal.md / 292 B / 4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5

动作：撤销设备后验证拒绝同步；执行删除、恢复并观察三端最终状态。
验收点：被撤销设备立即拒绝；删除后不可读，恢复后版本关系仍正确。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/device-revoke-delete-restore-log.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### d08-conflict-resolution

```text
行项：d08-conflict-resolution
任务：D-010
阶段：D-010 双端冲突
环境：Android + iOS 或 desktop 双端并发

样例：
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：制造双端编辑 / 删除冲突，拉取后确认双方版本保留和冲突状态。
验收点：不静默覆盖；冲突双方均可追溯；最终解除冲突后同步收敛。
建议证据：docs/validation-runs/2026-07-21/gate_d_sync/evidence/conflict-resolution-log.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### e01-sync-source-docx-pdf

```text
行项：e01-sync-source-docx-pdf
任务：E-007
阶段：E-007 原件同步
环境：手机真机 + desktop/ 真实收件箱

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9

动作：手机收集 docx / pdf 原件并同步到桌面真实收件箱。
验收点：桌面看到原件 ID、版本 ID、hash；原件默认不可被 AI 直接读取。
建议证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-source-docs.png

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### e02-generate-markdown-derivatives

```text
行项：e02-generate-markdown-derivatives
任务：E-007
阶段：E-007 派生副本
环境：desktop/ converter + inbox

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9

动作：桌面生成 Markdown 派生副本，记录来源版本与派生对象 hash。
验收点：派生对象与来源版本关联稳定；Markdown 内容可供授权读取。
建议证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-derivatives.png

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### e03-ai-read-before-authorize

```text
行项：e03-ai-read-before-authorize
任务：E-007
阶段：E-007 授权前拒绝
环境：真实 AI 客户端（CLI 或 MCP）

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9

动作：未授权状态下让 AI 客户端读取派生正文。
验收点：读取被拒绝；审计记录不包含正文、token 或私密路径。
建议证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-authorize-before.png

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### e04-ai-read-after-authorize

```text
行项：e04-ai-read-after-authorize
任务：E-007
阶段：E-007 授权后可读
环境：真实 AI 客户端（CLI 或 MCP）

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9

动作：授权 AI 读取，再通过真实 AI 客户端走 CLI 或 MCP 读取正文。
验收点：授权后可读；返回内容来自派生 Markdown；记录客户端名称、入口和日志。
建议证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-success.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### e05-ai-read-after-revoke

```text
行项：e05-ai-read-after-revoke
任务：E-007
阶段：E-007 撤回后拒绝
环境：真实 AI 客户端（CLI 或 MCP）

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9

动作：撤回授权后立即再次读取同一对象。
验收点：撤回立即生效；再次读取被拒绝；审计链路可解释。
建议证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-revoked.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### f01-ai-generate-result

```text
行项：f01-ai-generate-result
任务：F-005
阶段：F-005 AI 生成结果
环境：真实 AI 客户端 + 已授权来源

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：真实 AI 客户端读取已授权样例，生成 Markdown / JSON 结果。
验收点：结果明确关联来源文档与来源版本；结果内容不覆盖原件。
建议证据：docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ai-client-generate-result.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### f02-write-result

```text
行项：f02-write-result
任务：F-005
阶段：F-005 写回桌面
环境：desktop/ CLI 或 MCP

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：通过 `molan write-result` 或 MCP `write_result` 写回结果。
验收点：写回成功返回结果 ID；保存为新版本或独立文档；失败路径有明确错误。
建议证据：docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-write-result-log.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### f03-air-event-desktop

```text
行项：f03-air-event-desktop
任务：F-005
阶段：F-005 结果事件
环境：desktop/ + sync server

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：桌面推送 `air_` 事件并确认同步服务可拉取。
验收点：`air_` 事件含结果 ID、来源文档、来源版本；不会泄漏正文到日志。
建议证据：docs/validation-runs/2026-07-21/gate_f_result_return/evidence/desktop-air-event-log.txt

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### f04-android-result-return

```text
行项：f04-android-result-return
任务：F-005
阶段：F-005 Android 回流
环境：Android 真机

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：Android 拉到结果卡片，打开结果并回到来源。
验收点：结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。
建议证据：docs/validation-runs/2026-07-21/gate_f_result_return/evidence/android-result-open.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### f05-ios-result-return

```text
行项：f05-ios-result-return
任务：F-005
阶段：F-005 iOS 回流
环境：iPhone 真机

样例：
- desktop/cli/test-fixtures/sample.docx / 36796 B / 032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570
- desktop/cli/test-fixtures/sample.pdf / 1722 B / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
- fixtures/mobile-reading/json/normal.json / 167 B / 51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98

动作：iOS 拉到结果卡片，打开结果并回到来源。
验收点：结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。
建议证据：docs/validation-runs/2026-07-21/gate_f_result_return/evidence/ios-result-open.mp4

执行环境 / 版本：
输入文档 ID / 版本 / hash：
输出对象 / 事件 ID：
命令或入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```


