# B-001～B-008 模拟器验收记录

- 日期：2026-07-16；
- 环境：Android Emulator 36.6.11、Android 16 / API 36、ARM64 `medium_phone`；
- 开发 Application ID：`com.molan.reader.dev`；
- 构建：`:androidApp:assembleDebug` 通过；
- 测试：`:androidApp:testDebugUnitTest` 通过；覆盖启动状态、重复 Intent、编码、搜索、Markdown 块、JSON 解析/JSONPath/截断/搜索/深度保护和收集版本规则；
- 冷启动：卸载旧包后安装 Debug APK，`LaunchState: COLD`，首屏可见，`TotalTime: 2241ms`；
- 主题：亮色、暗色均检查首页和系统栏；暗色状态栏问题在验收中发现并修复；
- 进程重建：阅读页退到后台并杀死进程后，冷进程重新创建，仍恢复阅读路由；
- 失败路径：初始化异常进入错误页并可重试；无文件状态在首页和阅读占位页均明确呈现。

## B-002 外部入口

- `ACTION_VIEW` 冷启动打开 UTF-8 TXT：`TotalTime: 2431ms`，正文可见；
- 相同 URI 重复 Intent 直接交给现有 `singleTop` Activity，返回后首页无白屏；
- `ACTION_SEND` 的 `EXTRA_STREAM` 成功读取正文；
- Storage Access Framework 选择 `content://` 文档后，文件名与正文均正确；
- 权限失效、来源删除、超限、解码失败和未知错误均进入可重试错误页；
- 尚缺 Android 真机和微信/QQ/浏览器入口，统一留给 B-009。

## B-003～B-006 阅读与操作

- GBK 固定样例自动识别为 `TEXT · GBK`，中文无乱码；UTF-8/BOM/UTF-16 与二进制控制字节由同一解码策略处理；
- 伪装 TXT 的二进制固定样例被拒绝，未进入纯文本阅读器；
- Markdown 固定样例原生渲染标题、行内样式、链接、列表、引用、表格、代码块和有效本地 PNG，冷启动 `TotalTime: 1709ms`；表格/代码横向滚动，代码可复制，链接打开前确认；图片支持相对 `file://`、授权 `content://`、HTTPS 和受限 data URI，超限、无权限或解码失败显示占位；
- JSON 固定样例支持树形按需展开、原文、美化、压缩、路径/值复制和 Markdown 字段预览；非法样例定位到第 3 行第 18 列并保留原文；
- 5,243,566 字节 JSON 冷启动先出现进度，轮询到树形正文约 2100ms；数组 5014 项默认折叠；`TOTAL PSS` 约 107430KB、`TOTAL RSS` 约 198752KB，无 ANR；
- 编辑自动草稿、取消后恢复、JSON 无效时禁止保存、保存副本和系统分享均已走端到端；保存后的 `normal-副本.json` 与原样例 SHA-256 同为 `51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98`；
- 大于 1MB 的内容明确保持只读，避免在编辑器中造成卡顿。

## B-007 本地收集与 B-008 恢复

- Room 数据库 schema v1 已生成到 `androidApp/schemas/`；原始字节保存到应用受控 `files/objects/`，数据库只保存关系和路径；
- 首次收集约 2468ms；删除外部来源并杀进程后，仍从受控副本离线打开；
- 同一来源同一哈希重复收集不新增对象；同一来源改为不同内容后创建新版本，两个对象均保留；
- 本地文件库支持最近、已收集、归档、搜索、打开和状态显示；未收集文件不会入库；
- `RUNNING_CRITICAL` 内存回收通知后页面可用；锁定横屏后仍显示正确文件，`am kill` 后恢复到同一已收集文档；
- 尚缺中低端真机的启动、峰值内存和系统回收记录，B-008/B-009 保持待真机验收。

## D-006 同步代码验收

- WorkManager 仅处理用户明确点击“同步到电脑”后写入 Room 的队列；退出登录取消唯一后台任务，阅读不等待网络；
- token 用 Android Keystore AES-GCM 保存，Room 从 v1→v2→v3→v4 均使用显式迁移，没有破坏性回退；
- 支持 4 MB 分片上传、旋转 refresh、分页 pull、远端对象流式下载和 SHA-256/大小复核；
- pull 会重建远端 Document/Version/FileObject，冲突保留双方版本；当前设备、云端、所有设备删除与恢复在操作前说明影响；
- 冲突卡片可分别把当前版本和传入版本的原始对象交给系统分享面板，文件名包含版本 ID 后缀，未暴露受控目录路径；
- `:androidApp:assembleDebug :androidApp:testDebugUnitTest` 通过，登录默认不上传历史文件的界面见 `android-emulator-sync-opt-in.png`；
- 当前主机没有可运行的 PostgreSQL/Docker 服务，断网恢复、进程终止与真实三端链路尚未验收，D-006 保持 `[~]`。

## D-010 本地三端实链（2026-07-19）

- Android 16 模拟器登录本地线协议服务，使用系统文件选择器打开并明确收集 `d010-android.md`（292 B）和 `d010-android-live.json`（167 B）；两份原始 SHA-256 分别为 `4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5` 与 `51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98`。
- 上传实际经过 create upload、分片 PUT、complete、sync push/pull 和 conflicts；Electron 随后下载相同对象并显示相同格式和字节数。
- 首轮实链发现 Worker 与前台各自创建 Room 导致状态写入后界面不刷新；数据库改为进程级单例后，第二份文件在当前页面内直接从“等待同步”变为“已同步”，无需重启。
- 截图：`d010-android-live-sync.png`。真机、长断网和网络切换仍待外部验收。

证据：

- `android-emulator-home-light.png`
- `android-emulator-home-dark.png`
- `android-emulator-action-view-txt.png`
- `android-emulator-saf-txt.png`
- `android-emulator-gbk-search-reader.png`
- `android-emulator-binary-rejected.png`
- `android-emulator-markdown-structured.png`
- `android-emulator-markdown-local-image.png`
- `android-emulator-json-tree.png`
- `android-emulator-json-invalid.png`
- `android-emulator-json-large-5mb.png`
- `android-emulator-editor-json.png`
- `android-emulator-editor-invalid-json.png`
- `android-emulator-draft-restored.png`
- `android-emulator-save-copy-success.png`
- `android-emulator-system-share.png`
- `android-emulator-collection-success.png`
- `android-emulator-local-library.png`
- `android-emulator-library-offline-reopen.png`
- `android-emulator-landscape-recovery.png`
- `android-emulator-process-recovery.png`
