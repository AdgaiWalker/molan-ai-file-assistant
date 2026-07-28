import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pendingAiResultPath, type PendingAiResultSync } from '../../src/shared/pendingAiResultSync';
import { DesktopSyncClient } from './desktopSyncClient';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('电脑同步客户端', () => {
  it('登录失败时保留服务端的人类可读错误消息', async () => {
    const server = createServer((_request, response) => {
      json(response, { errorCode: 'E_AUTH_CODE_INVALID', error: '手机号格式无效' }, 400);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server unavailable');
    const root = await mkdtemp(path.join(tmpdir(), 'molan-desktop-sync-error-'));
    roots.push(root);
    try {
      const client = await DesktopSyncClient.open(root, {
        seal: (value) => Buffer.from(value, 'utf8'),
        open: (value) => value.toString('utf8'),
      });
      await expect(client.login({
        serverUrl: `http://127.0.0.1:${address.port}`,
        phoneNumber: '13800000000',
        code: '246810',
      })).rejects.toMatchObject({
        code: 'E_AUTH_CODE_INVALID',
        message: '手机号格式无效',
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('登录后拉取文档与版本，校验对象哈希并写入受控 SQLite 索引', async () => {
    const bytes = Buffer.from('# 来自手机\n\n同步正文。');
    const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const resultBytes = Buffer.from('# AI 摘要\n\n这是同步后的结果。');
    const resultHash = `sha256:${createHash('sha256').update(resultBytes).digest('hex')}`;
    const server = createServer((request, response) => route(request, response, bytes, contentHash, resultBytes, resultHash));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server unavailable');
    const root = await mkdtemp(path.join(tmpdir(), 'molan-desktop-sync-'));
    roots.push(root);
    try {
      const client = await DesktopSyncClient.open(root, {
        seal: (value) => Buffer.from(value, 'utf8'),
        open: (value) => value.toString('utf8'),
      });
      await client.login({ serverUrl: `http://127.0.0.1:${address.port}`, phoneNumber: '13800000000', code: '246810' });
      const snapshot = await client.sync();
      expect(snapshot.status).toMatchObject({ loggedIn: true, cursor: 'cur_3', errorCode: null });
      expect(snapshot.documents).toEqual([
        expect.objectContaining({ title: '手机同步.md', currentVersionId: 'ver_test', contentHash, aiResultCount: 1 }),
      ]);
      expect(client.readablePath('doc_test')).toContain(path.join('sync-inbox', 'objects'));
      expect(client.documentFamily('doc_test')?.aiResults).toEqual([
        expect.objectContaining({
          id: 'air_test',
          sourceVersionId: 'ver_test',
          resultType: 'summary',
          contentHash: resultHash,
        }),
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('同步前会先上传并推送待确认 AI 结果队列', async () => {
    const pushes: string[] = [];
    const uploads = new Map<string, { fileObjectId: string }>();
    const server = createServer(async (request, response) => {
      if (request.url === '/v1/auth/code/request') return json(response, { challengeId: 'challenge' });
      if (request.url === '/v1/auth/code/verify') {
        return json(response, {
          accessToken: 'access', refreshToken: 'refresh', expiresAt: '2026-07-21T16:00:00.000Z',
          device: { id: 'dev-desktop' },
        });
      }
      if (request.url === '/v1/files/uploads') {
        const body = JSON.parse(await readBody(request)) as Record<string, unknown>;
        const uploadId = `upl_${uploads.size + 1}`;
        uploads.set(uploadId, { fileObjectId: String(body.fileObjectId) });
        return json(response, { ok: true, uploadId, partSize: 4 * 1024 * 1024, uploadedParts: [], expiresAt: '2026-07-21T18:00:00.000Z' });
      }
      const partMatch = request.url?.match(/^\/v1\/files\/uploads\/(upl_[0-9]+)\/parts\/([0-9]+)$/);
      if (partMatch) {
        const bytes = Buffer.from(await readBinary(request));
        return json(response, {
          ok: true,
          partNumber: Number(partMatch[2]),
          etag: createHash('sha256').update(bytes).digest('hex'),
        });
      }
      const completeMatch = request.url?.match(/^\/v1\/files\/uploads\/(upl_[0-9]+)\/complete$/);
      if (completeMatch) {
        const upload = uploads.get(completeMatch[1]!);
        if (!upload) throw new Error('missing upload');
        return json(response, {
          ok: true,
          fileObject: { id: upload.fileObjectId },
        });
      }
      if (request.url === '/v1/sync/push') {
        const body = JSON.parse(await readBody(request)) as { mutations: Array<{ payload: { id: string } }> };
        pushes.push(body.mutations[0]!.payload.id);
        return json(response, {
          ok: true,
          results: [{
            clientMutationId: 'mut_ack',
            ok: true,
            event: { id: `evt_${pushes.length}`, cursor: `cur_${pushes.length}` },
            error: null,
          }],
        });
      }
      if (request.url === '/v1/sync/pull') return json(response, { ok: true, cursor: 'cur_0', hasMore: false, events: [] });
      if (request.url === '/v1/conflicts') return json(response, { ok: true, conflicts: [] });
      json(response, { errorCode: 'E_FILE_NOT_FOUND' }, 404);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server unavailable');
    const root = await mkdtemp(path.join(tmpdir(), 'molan-desktop-sync-push-'));
    roots.push(root);
    const syncRoot = path.join(root, 'sync-inbox');
    const sourcePath = path.join(root, 'source.md');
    const resultPath = path.join(root, 'result.md');
    const sourceBytes = Buffer.from('# 修订正文\n');
    const resultBytes = Buffer.from('# AI 摘要\n');
    await writeFile(sourcePath, sourceBytes);
    await writeFile(resultPath, resultBytes);
    const queue: PendingAiResultSync = {
      queueId: 'air_upload',
      createdAt: '2026-07-21T11:00:00.000Z',
      saveMode: 'new_document',
      document: {
        clientMutationId: 'mut_019bf130-1234-7123-8123-123456789abc',
        documentId: 'doc_upload',
        versionId: null,
        baseVersionId: null,
        operation: 'upsert',
        upload: null,
        payload: {
          id: 'doc_upload',
          sourceDeviceId: 'dev_local',
          title: '结果文档.md',
          originalFormat: 'markdown',
          currentVersionId: 'ver_upload',
          state: 'ai_result_ready',
          createdAt: '2026-07-21T11:00:00.000Z',
          updatedAt: '2026-07-21T11:00:00.000Z',
          deletedAt: null,
        },
      },
      version: {
        clientMutationId: 'mut_019bf131-1234-7123-8123-123456789abc',
        documentId: 'doc_upload',
        versionId: 'ver_upload',
        baseVersionId: null,
        operation: 'upsert',
        upload: {
          clientMutationId: 'mut_019bf132-1234-7123-8123-123456789abc',
          fileObjectId: 'obj_upload_original',
          role: 'original',
          format: 'markdown',
          mediaType: 'text/markdown',
          contentHash: `sha256:${createHash('sha256').update(sourceBytes).digest('hex')}`,
          sizeBytes: sourceBytes.length,
          localPath: sourcePath,
        },
        payload: {
          id: 'ver_upload',
          documentId: 'doc_upload',
          sourceDeviceId: 'dev_local',
          originalFormat: 'markdown',
          contentHash: `sha256:${createHash('sha256').update(sourceBytes).digest('hex')}`,
          sizeBytes: sourceBytes.length,
          fileObjectId: 'obj_upload_original',
          parentVersionId: null,
          createdAt: '2026-07-21T11:00:00.000Z',
          updatedAt: '2026-07-21T11:00:00.000Z',
          deletedAt: null,
        },
      },
      aiResult: {
        clientMutationId: 'mut_019bf133-1234-7123-8123-123456789abc',
        documentId: 'doc_upload',
        versionId: null,
        baseVersionId: null,
        operation: 'upsert',
        upload: {
          clientMutationId: 'mut_019bf134-1234-7123-8123-123456789abc',
          fileObjectId: 'obj_upload_result',
          role: 'ai_result',
          format: 'markdown',
          mediaType: 'text/markdown',
          contentHash: `sha256:${createHash('sha256').update(resultBytes).digest('hex')}`,
          sizeBytes: resultBytes.length,
          localPath: resultPath,
        },
        payload: {
          id: 'air_upload',
          documentId: 'doc_upload',
          sourceVersionId: 'ver_upload',
          sourceArtifactId: null,
          sourceDeviceId: 'dev_local',
          fileObjectId: 'obj_upload_result',
          resultType: 'summary',
          format: 'markdown',
          mediaType: 'text/markdown',
          contentHash: `sha256:${createHash('sha256').update(resultBytes).digest('hex')}`,
          sizeBytes: resultBytes.length,
          generatorName: 'codex',
          generatorVersion: '1',
          createdAt: '2026-07-21T11:00:00.000Z',
          updatedAt: '2026-07-21T11:00:00.000Z',
          deletedAt: null,
        },
      },
    };
    const queuePath = pendingAiResultPath(syncRoot, queue.queueId);
    await mkdir(path.dirname(queuePath), { recursive: true });
    await writeFile(queuePath, JSON.stringify(queue, null, 2), 'utf8');
    try {
      const client = await DesktopSyncClient.open(root, {
        seal: (value) => Buffer.from(value, 'utf8'),
        open: (value) => value.toString('utf8'),
      });
      await client.login({ serverUrl: `http://127.0.0.1:${address.port}`, phoneNumber: '13800000000', code: '246810' });
      const snapshot = await client.sync();
      expect(snapshot.status.cursor).toBe('cur_0');
      expect(pushes).toEqual(['doc_upload', 'ver_upload', 'air_upload']);
      await expect(readFile(queuePath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

function route(
  request: IncomingMessage,
  response: ServerResponse,
  bytes: Buffer,
  contentHash: string,
  resultBytes: Buffer,
  resultHash: string,
): void {
  if (request.url === '/v1/auth/code/request') return json(response, { challengeId: 'challenge' });
  if (request.url === '/v1/auth/code/verify') {
    return json(response, {
      accessToken: 'access', refreshToken: 'refresh', expiresAt: '2026-07-18T16:00:00.000Z',
      device: { id: 'dev-desktop' },
    });
  }
  if (request.url === '/v1/files/obj_test') {
    response.writeHead(200, { 'content-type': 'text/markdown', 'content-length': bytes.length });
    response.end(bytes);
    return;
  }
  if (request.url === '/v1/files/obj_result') {
    response.writeHead(200, { 'content-type': 'text/markdown', 'content-length': resultBytes.length });
    response.end(resultBytes);
    return;
  }
  if (request.url === '/v1/sync/pull') {
    return json(response, {
      ok: true,
      cursor: 'cur_3',
      hasMore: false,
      events: [
        {
          id: 'evt-doc', cursor: 'cur_1', operation: 'upsert', phase: 'committed',
          documentId: 'doc_test', updatedAt: '2026-07-18T15:00:00.000Z',
          payload: {
            id: 'doc_test', sourceDeviceId: 'dev_phone', title: '手机同步.md', originalFormat: 'markdown',
            currentVersionId: null, createdAt: '2026-07-18T15:00:00.000Z',
            updatedAt: '2026-07-18T15:00:00.000Z', deletedAt: null,
          },
        },
        {
          id: 'evt-ver', cursor: 'cur_2', operation: 'upsert', phase: 'committed',
          documentId: 'doc_test', updatedAt: '2026-07-18T15:00:00.000Z',
          payload: {
            id: 'ver_test', documentId: 'doc_test', sourceDeviceId: 'dev_phone', originalFormat: 'markdown',
            contentHash, sizeBytes: bytes.length, fileObjectId: 'obj_test', parentVersionId: null,
            createdAt: '2026-07-18T15:00:00.000Z', updatedAt: '2026-07-18T15:00:00.000Z', deletedAt: null,
          },
        },
        {
          id: 'evt-air', cursor: 'cur_3', operation: 'upsert', phase: 'committed',
          documentId: 'doc_test', updatedAt: '2026-07-18T15:05:00.000Z',
          payload: {
            id: 'air_test',
            sourceVersionId: 'ver_test',
            sourceArtifactId: null,
            sourceDeviceId: 'dev_desktop',
            fileObjectId: 'obj_result',
            resultType: 'summary',
            format: 'markdown',
            mediaType: 'text/markdown',
            contentHash: resultHash,
            sizeBytes: resultBytes.length,
            generatorName: 'codex',
            generatorVersion: '1.0.0-test',
            createdAt: '2026-07-18T15:05:00.000Z',
            updatedAt: '2026-07-18T15:05:00.000Z',
            deletedAt: null,
          },
        },
      ],
    });
  }
  if (request.url === '/v1/conflicts') return json(response, { ok: true, conflicts: [] });
  json(response, { errorCode: 'E_FILE_NOT_FOUND' }, 404);
}

function json(response: ServerResponse, value: unknown, status = 200): void {
  const body = JSON.stringify(value);
  response.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

async function readBinary(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
