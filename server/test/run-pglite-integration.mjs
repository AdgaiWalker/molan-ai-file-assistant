import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));
const vitestEntry = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const database = await PGlite.create();
const socketServer = new PGLiteSocketServer({
  db: database,
  host: '127.0.0.1',
  port: 0,
  maxConnections: 32,
});

let exitCode = 1;
try {
  await socketServer.start();
  const address = socketServer.getServerConn();
  const separator = address.lastIndexOf(':');
  const host = address.slice(0, separator);
  const port = address.slice(separator + 1);
  const child = spawn(
    process.execPath,
    [vitestEntry, 'run', 'test/postgres.integration.test.ts'],
    {
      cwd: serverRoot,
      env: {
        ...process.env,
        MOLAN_TEST_DATABASE_URL: `postgresql://postgres:postgres@${host}:${port}/postgres`,
        // PGlite Socket 将多个连接复用到单一 WASM 后端；覆盖应用连接池宽度即可。
        // PostgreSQL 18 CI 不设置该变量，继续执行默认的 20 路并发。
        MOLAN_PG_TEST_CONCURRENCY: process.env.MOLAN_PG_TEST_CONCURRENCY ?? '10',
      },
      stdio: 'inherit',
    },
  );
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`PostgreSQL integration test terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
} finally {
  await socketServer.stop();
  await database.close();
}

process.exitCode = exitCode;
