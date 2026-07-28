import { resolve } from 'node:path';

export interface ServerConfig {
  host: string;
  port: number;
  databaseUrl: string;
  objectDirectory: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  localAuthCode: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env['MOLAN_SERVER_PORT'] ?? '43120');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('MOLAN_SERVER_PORT 无效');
  const logLevel = env['MOLAN_LOG_LEVEL'] ?? 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) throw new Error('MOLAN_LOG_LEVEL 无效');
  const localAuthCode = env['MOLAN_LOCAL_AUTH_CODE'] ?? '246810';
  if (!/^[0-9]{6}$/.test(localAuthCode)) throw new Error('MOLAN_LOCAL_AUTH_CODE 必须为 6 位数字');
  return {
    host: env['MOLAN_SERVER_HOST'] ?? '127.0.0.1',
    port,
    databaseUrl: env['MOLAN_DATABASE_URL'] ?? 'postgres://molan:molan-local@127.0.0.1:54320/molan',
    objectDirectory: resolve(env['MOLAN_OBJECT_DIR'] ?? './data/objects'),
    logLevel: logLevel as ServerConfig['logLevel'],
    localAuthCode,
  };
}
