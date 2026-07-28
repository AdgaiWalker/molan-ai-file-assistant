import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));
const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const database = await PGlite.create();
const socketServer = new PGLiteSocketServer({
  db: database,
  host: '127.0.0.1',
  port: Number(process.env.MOLAN_LOCAL_DATABASE_PORT ?? 54320),
  maxConnections: 10,
});

let service;
let exitCode = 1;
try {
  await socketServer.start();
  const databaseUrl = `postgresql://postgres:postgres@${socketServer.getServerConn()}/postgres`;
  const env = {
    ...process.env,
    MOLAN_DATABASE_URL: databaseUrl,
    MOLAN_OBJECT_DIR: process.env.MOLAN_OBJECT_DIR ?? `${serverRoot}/.local-sync/objects`,
  };
  const migrationCode = await run(entry, ['migrate'], env);
  if (migrationCode !== 0) throw new Error('本地数据库迁移失败');
  service = spawn(process.execPath, [entry, 'serve'], { cwd: serverRoot, env, stdio: 'inherit' });
  const stop = (signal) => service?.kill(signal);
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
  exitCode = await childExit(service);
} finally {
  if (service && service.exitCode === null) service.kill('SIGTERM');
  await socketServer.stop();
  await database.close();
}

process.exitCode = exitCode;

function run(modulePath, args, env) {
  const child = spawn(process.execPath, [modulePath, ...args], {
    cwd: serverRoot,
    env,
    stdio: 'inherit',
  });
  return childExit(child);
}

function childExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal === 'SIGINT' || signal === 'SIGTERM') {
        resolve(0);
        return;
      }
      if (signal) {
        reject(new Error(`子进程被 ${signal} 终止`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}
