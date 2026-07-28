import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { InboxIndex } from '../../electron/main/inboxIndex';
import type { InboxChange } from '../../src/shared/sync';

const cli = path.resolve(__dirname, '../dist/index.js');
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('molan AI result commands', () => {
  it('write-result 先写草稿，再 confirm-result 写成新版本且不覆盖原版本', async () => {
    const root = makeRoot('molan-cli-result-');
    const syncRoot = path.join(root, 'sync-inbox');
    const sourcePath = path.join(root, 'report.md');
    fs.writeFileSync(sourcePath, '# 原文\n\n需要摘要。', 'utf-8');

    const { document, version } = await seedMarkdownDocument(syncRoot, sourcePath, '项目周报.md');

    const draft = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '项目周报摘要',
        '--format', 'markdown',
        '--result-type', 'summary',
        '--save-mode', 'new_version',
        '--document', document.id,
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '# 摘要\n\n这是 AI 结果。',
    );
    expect(draft.status).toBe(0);
    expect(draft.body).toEqual(expect.objectContaining({
      ok: true,
      confirmed: false,
      draftId: expect.any(String),
      saveMode: 'new_version',
      sourceDocumentId: document.id,
      sourceVersionId: version.id,
    }));

    const confirm = runJson(
      ['confirm-result', draft.body.draftId, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
    );
    expect(confirm.status).toBe(0);
    expect(confirm.body).toEqual(expect.objectContaining({
      ok: true,
      confirmed: true,
      documentId: document.id,
      sourceVersionId: version.id,
      versionId: expect.any(String),
      aiResultId: expect.any(String),
    }));

    const index = await InboxIndex.open(syncRoot);
    const family = index.documentFamily(document.id);
    index.close();
    expect(family?.document.currentVersionId).toBe(confirm.body.versionId);
    expect(family?.document.currentVersionId).not.toBe(version.id);
    expect(family?.versions[0]).toEqual(expect.objectContaining({
      id: confirm.body.versionId,
      parentVersionId: version.id,
      originalFormat: 'markdown',
    }));
    expect(family?.aiResults[0]).toEqual(expect.objectContaining({
      id: confirm.body.aiResultId,
      sourceVersionId: version.id,
      resultType: 'summary',
      format: 'markdown',
    }));
  });

  it('write-result 对非法 JSON 正文返回稳定错误', async () => {
    const root = makeRoot('molan-cli-result-json-');
    const syncRoot = path.join(root, 'sync-inbox');

    const result = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '结构化提取',
        '--format', 'json',
        '--result-type', 'structured_json',
        '--save-mode', 'draft',
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '{broken json}',
    );
    expect(result.status).toBe(1);
    expect(result.body).toEqual(expect.objectContaining({
      ok: false,
      errorCode: 'E_AI_RESULT_JSON_INVALID',
    }));
  });

  it('write-result 可把合法 JSON 结果确认写成独立文档', async () => {
    const root = makeRoot('molan-cli-result-json-ok-');
    const syncRoot = path.join(root, 'sync-inbox');

    const result = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '结构化提取',
        '--format', 'json',
        '--result-type', 'structured_json',
        '--save-mode', 'new_document',
        '--confirm',
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '{"summary":"ok","items":[1,2,3]}',
    );
    expect(result.status).toBe(0);
    expect(result.body).toEqual(expect.objectContaining({
      ok: true,
      confirmed: true,
      saveMode: 'new_document',
    }));

    const index = await InboxIndex.open(syncRoot);
    const created = index.listDocuments().find((item) => item.title === '结构化提取');
    const family = created ? index.documentFamily(created.id) : null;
    index.close();
    expect(created?.originalFormat).toBe('json');
    expect(family?.aiResults[0]).toEqual(expect.objectContaining({
      format: 'json',
      resultType: 'structured_json',
    }));
  });

  it('confirm-result 遇到来源版本漂移时拒绝覆盖并返回冲突', async () => {
    const root = makeRoot('molan-cli-result-conflict-');
    const syncRoot = path.join(root, 'sync-inbox');
    const sourcePath = path.join(root, 'source.md');
    fs.writeFileSync(sourcePath, '# 原文\n', 'utf-8');
    const { document, version } = await seedMarkdownDocument(syncRoot, sourcePath, '冲突样例.md');

    const draft = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '冲突摘要',
        '--format', 'markdown',
        '--result-type', 'summary',
        '--save-mode', 'new_version',
        '--document', document.id,
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '# 摘要\n\n等待确认。',
    );
    expect(draft.status).toBe(0);

    const nextPath = path.join(root, 'updated.md');
    fs.writeFileSync(nextPath, '# 新版本\n', 'utf-8');
    const index = await InboxIndex.open(syncRoot);
    await index.applyChanges([
      {
        ...syncedVersionChange(nextPath),
        eventId: 'evt-ver-conflict',
        cursor: 'cur_3',
        id: 'ver_019c18b0-1234-7123-8123-123456789abc',
        documentId: document.id,
        parentVersionId: version.id,
        fileObjectId: 'obj_019c18b0-1234-7123-8123-123456789abc',
      },
    ], 'cur_3', '2026-07-21T12:00:00.000Z');
    index.close();

    const confirm = runJson(
      ['confirm-result', draft.body.draftId, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
    );
    expect(confirm.status).toBe(1);
    expect(confirm.body).toEqual(expect.objectContaining({
      ok: false,
      errorCode: 'E_AI_RESULT_SOURCE_CONFLICT',
    }));
  });

  it('discard-result 会删除待确认草稿并阻止后续 confirm', async () => {
    const root = makeRoot('molan-cli-result-discard-');
    const syncRoot = path.join(root, 'sync-inbox');

    const draft = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '临时草稿',
        '--format', 'markdown',
        '--result-type', 'report',
        '--save-mode', 'new_document',
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '# 草稿\n\n待取消。',
    );
    expect(draft.status).toBe(0);

    const discarded = runJson(
      ['discard-result', draft.body.draftId, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
    );
    expect(discarded.status).toBe(0);
    expect(discarded.body).toEqual(expect.objectContaining({
      ok: true,
      discarded: true,
      draftId: draft.body.draftId,
    }));

    const confirm = runJson(
      ['confirm-result', draft.body.draftId, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
    );
    expect(confirm.status).toBe(1);
    expect(confirm.body).toEqual(expect.objectContaining({
      ok: false,
      errorCode: 'E_AI_RESULT_DRAFT_NOT_FOUND',
    }));
  });

  it('write-result 使用同一个 requestId 时返回同一份草稿，避免重复写入', async () => {
    const root = makeRoot('molan-cli-result-idempotent-');
    const syncRoot = path.join(root, 'sync-inbox');

    const first = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '幂等摘要',
        '--format', 'markdown',
        '--result-type', 'summary',
        '--save-mode', 'new_document',
        '--request-id', 'req-fixed-001',
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '# 摘要\n\n第一次。',
    );
    const second = runJson(
      [
        'write-result',
        '--stdin',
        '--title', '幂等摘要',
        '--format', 'markdown',
        '--result-type', 'summary',
        '--save-mode', 'new_document',
        '--request-id', 'req-fixed-001',
        '--source', 'synced',
        '--sync-root', syncRoot,
        '--json',
      ],
      root,
      '# 摘要\n\n第一次。',
    );

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(first.body.draftId).toBe(second.body.draftId);
  });

  it('MCP write_result 可直接确认写成独立结果文档', async () => {
    const root = makeRoot('molan-mcp-result-');
    const syncRoot = path.join(root, 'sync-inbox');
    const client = spawn(process.execPath, [cli, 'mcp', '--sync-root', syncRoot], {
      cwd: root,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    try {
      const initialize = await sendRpc(client, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });
      expect(initialize.result.serverInfo.name).toBe('molan-mcp');

      client.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

      const writeResult = await sendRpc(client, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'write_result',
          arguments: {
            title: '独立总结',
            format: 'markdown',
            resultType: 'new_document',
            saveMode: 'new_document',
            content: '# 总结\n\n来自 MCP。',
            confirmed: true,
          },
        },
      });
      expect(writeResult.result.isError).toBe(false);
      expect(writeResult.result.structuredContent).toEqual(expect.objectContaining({
        ok: true,
        confirmed: true,
        title: '独立总结',
        saveMode: 'new_document',
      }));

      const index = await InboxIndex.open(syncRoot);
      const documents = index.listDocuments();
      const created = documents.find((item) => item.title === '独立总结');
      const family = created ? index.documentFamily(created.id) : null;
      index.close();
      expect(created).toBeTruthy();
      expect(family?.aiResults).toHaveLength(1);
    } finally {
      client.kill('SIGTERM');
    }
  });
});

function makeRoot(prefix: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function seedMarkdownDocument(syncRoot: string, localPath: string, title: string) {
  const index = await InboxIndex.open(syncRoot);
  const document = {
    ...syncedDocumentChange(),
    title,
  };
  const version = syncedVersionChange(localPath);
  await index.applyChanges([document, version], 'cur_2', '2026-07-21T11:00:00.000Z');
  index.close();
  return { document, version };
}

function runJson(args: string[], cwd: string, stdinText?: string) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env },
    input: stdinText,
    encoding: 'utf-8',
  });
  const output = result.stdout?.trim() || result.stderr?.trim() || '{}';
  return {
    status: result.status,
    body: JSON.parse(output),
  };
}

async function sendRpc(child: ReturnType<typeof spawn>, payload: Record<string, unknown>) {
  if (!child.stdin || !child.stdout) throw new Error('MCP child stdio unavailable');
  const stdout = child.stdout;
  const expectedId = payload.id;
  const promise = new Promise<any>((resolve, reject) => {
    let buffer = '';
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        const response = JSON.parse(line);
        if (response.id === expectedId) {
          stdout.off('data', onData);
          resolve(response);
          return;
        }
      }
    };
    stdout.on('data', onData);
    child.once('error', reject);
  });
  child.stdin.write(`${JSON.stringify(payload)}\n`);
  return promise;
}

function syncedDocumentChange(): Extract<InboxChange, { kind: 'document' }> {
  return {
    eventId: 'evt-doc',
    cursor: 'cur_1',
    operation: 'upsert',
    kind: 'document',
    id: 'doc_019c18a0-1234-7123-8123-123456789abc',
    sourceDeviceId: 'dev_phone',
    title: '示例文档.md',
    originalFormat: 'markdown',
    currentVersionId: null,
    state: 'synced',
    createdAt: '2026-07-21T11:00:00.000Z',
    updatedAt: '2026-07-21T11:00:00.000Z',
    deletedAt: null,
  };
}

function syncedVersionChange(localPath: string): Extract<InboxChange, { kind: 'version' }> {
  const bytes = fs.readFileSync(localPath);
  const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  return {
    eventId: 'evt-ver',
    cursor: 'cur_2',
    operation: 'upsert',
    kind: 'version',
    id: 'ver_019c18a0-1234-7123-8123-123456789abc',
    documentId: 'doc_019c18a0-1234-7123-8123-123456789abc',
    sourceDeviceId: 'dev_phone',
    originalFormat: 'markdown',
    contentHash,
    sizeBytes: bytes.length,
    fileObjectId: 'obj_019c18a0-1234-7123-8123-123456789abc',
    parentVersionId: null,
    createdAt: '2026-07-21T11:00:00.000Z',
    updatedAt: '2026-07-21T11:00:00.000Z',
    deletedAt: null,
    localPath,
    conflict: false,
  };
}
