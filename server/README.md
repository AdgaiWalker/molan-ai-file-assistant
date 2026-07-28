# 墨览同步服务

本目录是 Gate D 的 Node.js/TypeScript 同步服务。元数据存 PostgreSQL，原始字节存独立对象目录；日志只记录请求 ID、用户/设备 ID、动作和结果，不记录文件正文、验证码或 token。

## 一键启动

需要 Docker Desktop 或兼容的 Docker Compose：

```bash
cd server
docker compose up --build --wait
curl http://127.0.0.1:43120/v1/health
```

停止但保留数据：

```bash
docker compose down
```

清理本地开发数据：

```bash
docker compose down --volumes
```

容器启动时先执行幂等迁移，再启动 HTTP 服务。PostgreSQL 使用 18.4，数据卷按 18+ 的 `/var/lib/postgresql/18/docker` 布局挂载；对象字节使用独立 `molan-objects` 卷。

## 本地验证

```bash
npm install
npm run typecheck
npm run build
npm test
npm run test:postgres:local
```

`test:postgres:local` 会启动临时的 PGlite PostgreSQL 线协议服务，执行迁移、登录、上传、连接池并发幂等同步、下载、删除和恢复后自动清理。它用于没有 Docker 的本机快速验证；发布门仍以 Compose 的 PostgreSQL 18.4 和 CI 服务容器为准。

没有 Docker 时，可用同一生产 HTTP 入口进行三端本地联调：

```bash
npm run dev:local
```

该命令先构建、启动内存数据库并迁移，再监听 `127.0.0.1:43120`；按 `Ctrl+C` 会依次关闭 HTTP 服务和数据库。对象字节写入已忽略的 `server/.local-sync/objects/`。

复制 `.env.example` 的变量即可脱离 Compose 连接现有 PostgreSQL。`MOLAN_LOCAL_AUTH_CODE` 只用于 D-003 本地验证码实现，不应部署到生产环境。
