# Gate D 服务端验证记录

日期：2026-07-18。

- `pnpm run typecheck`：通过；
- `pnpm run build`：生成 `dist/index.js`；
- `pnpm test`：5 个测试文件、20 项测试通过，PostgreSQL 18 专用集成测试在未配置数据库时明确跳过；
- `pnpm run test:postgres:local`：临时启动 PGlite PostgreSQL 线协议服务，迁移后完成登录、上传、10 路连接池并发幂等、游标拉取、全端删除、下载拒绝、恢复和下载校验，1 项端到端测试通过；
- 覆盖健康检查、迁移、账号删除中拒绝、登录/refresh 重放、设备撤销、日志脱敏、分片恢复、空文件、哈希损坏拒绝、过期会话与孤立对象清理、100 次幂等重放、游标分页、删除与冲突；
- `compose.yaml` 固定 PostgreSQL 18.4，数据库卷与对象卷分离，启动命令为 `docker compose up --build --wait`。
- CI 的 PostgreSQL 18.4 服务容器执行同一集成测试，且不降低默认 20 路并发。

当前主机未安装 Docker、Podman、Colima 或本地 PostgreSQL 18，因此尚未产生 Compose 健康检查、停止、卷清理和真实 PostgreSQL 18 运行证据；D-002、D-004、D-005 仍保持 `[~]`。PGlite 只作为开发测试夹具，不替代发布数据库证据。
