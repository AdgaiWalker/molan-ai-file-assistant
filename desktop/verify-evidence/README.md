# 电脑同步收件箱验证记录

日期：2026-07-18；环境：macOS、Electron 33.4.11。

- `npm run typecheck`：通过；
- `npm test`：4 个测试文件、17 项测试通过；
- `npm run build`：主进程、preload、renderer 生产构建通过；
- HTTP 集成测试完成本地验证码登录、游标 pull、对象流式下载、SHA-256/大小校验和 SQLite 关系查询；
- SQLite 索引关闭重开后保留游标、文档/版本/对象关系，重复事件不覆盖首次结果，删除后受控读取失败；
- 冲突的当前版本与传入版本可分别通过主进程保存对话框导出；renderer 只传版本 ID，不接收受控目录路径；
- 真实 Electron 生产构建启动后，系统安全存储与 SQL.js WASM 正常初始化，登录页不会暴露受控本地路径。

截图：`desktop-sync-inbox-logged-out.png`。

尚缺真实 PostgreSQL 服务与 Android/iOS 的跨端、断网、冲突及重启验收，D-008 保持 `[~]`。

## D-010 本地三端实链（2026-07-19）

- 真实 Electron 生产预览登录与 Android/iOS 相同测试账号，首次 pull 显示 Android Markdown（292 B）和 JSON（167 B），再次 pull 显示 iOS TXT（77 B）；受控对象均经 SHA-256 与大小复核后才进入 SQLite 索引。
- 停止 HTTP/数据库服务并完整退出 Electron 后重新启动，三份文件仍从 SQLite 和受控对象目录离线显示，登录设备、游标和上次同步时间保留。
- 截图：`d010-android-to-desktop.jpg`、`d010-three-device-inbox.jpg`、`d010-offline-restart.jpg`。
- 该证据使用 PGlite PostgreSQL 线协议本地夹具；PostgreSQL 18 Compose、真机、冲突和长断网矩阵仍待完成，因此 D-008/D-010 保持 `[~]`。
