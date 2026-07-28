import { createServer as createNetServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { close, createApp, listen } from '../src/app.js';
import { JsonLogger } from '../src/logger.js';

const healthy = { check: async () => true, close: async () => undefined };

describe('同步服务骨架', () => {
  it('健康检查同时验证数据库和对象存储', async () => {
    const lines: string[] = [];
    const app = createApp({
      database: healthy,
      objectStorage: { check: async () => true },
      logger: new JsonLogger('info', (line) => lines.push(line)),
    });
    const port = await listen(app, '127.0.0.1', 0);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ ok: true, database: 'up', objectStorage: 'up' });
      expect(lines.join('\n')).not.toContain('authorization');
    } finally {
      await close(app);
    }
  });

  it('数据库和对象存储故障返回稳定可重试错误', async () => {
    for (const failure of [
      { database: false, storage: true, code: 'E_DATABASE_UNAVAILABLE' },
      { database: true, storage: false, code: 'E_STORAGE_UNAVAILABLE' },
    ]) {
      const app = createApp({
        database: { check: async () => failure.database, close: async () => undefined },
        objectStorage: { check: async () => failure.storage },
        logger: new JsonLogger('error', () => undefined),
      });
      const port = await listen(app, '127.0.0.1', 0);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/v1/health`);
        expect(response.status).toBe(503);
        expect(await response.json()).toMatchObject({ ok: false, errorCode: failure.code, retryable: true });
      } finally {
        await close(app);
      }
    }
  });

  it('重复监听同一端口会明确失败', async () => {
    const blocker = createNetServer();
    await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
    const address = blocker.address();
    if (!address || typeof address === 'string') throw new Error('测试端口不可用');
    const app = createApp({ database: healthy, objectStorage: { check: async () => true }, logger: new JsonLogger('error', () => undefined) });
    try {
      await expect(listen(app, '127.0.0.1', address.port)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    } finally {
      blocker.close();
      await close(app);
    }
  });

  it('结构化日志拒绝正文、token和验证码字段', () => {
    const lines: string[] = [];
    const logger = new JsonLogger('debug', (line) => lines.push(line));
    logger.write('info', 'audit', {
      requestId: 'req-1',
      content: 'private file content',
      accessToken: 'secret-access',
      refreshToken: 'secret-refresh',
      code: '246810',
    });
    expect(lines[0]).toContain('req-1');
    expect(lines[0]).not.toContain('private file content');
    expect(lines[0]).not.toContain('secret-access');
    expect(lines[0]).not.toContain('246810');
  });
});
