import { afterEach, describe, expect, it } from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { rm } from 'node:fs/promises';
import { InboxIndex } from '../../electron/main/inboxIndex';
import type { InboxChange } from '../../src/shared/sync';

const cli = path.resolve(__dirname, '../dist/index.js');
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('molan mcp readonly server', () => {
  it('完成 initialize -> tools/list -> tools/call 基础握手并暴露读取/写回工具', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-mcp-'));
    roots.push(root);
    const syncRoot = path.join(root, 'sync-inbox');
    await seedAuthorizedPdf(syncRoot, 'doc_019bf123-1234-7123-8123-123456789bca', '项目汇报.pdf');

    const session = startMcpServer(syncRoot);
    try {
      const initialize = await session.request({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'vitest', version: '1.0.0' },
        },
      });
      expect(initialize.result).toEqual(expect.objectContaining({
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
      }));

      session.notify({ jsonrpc: '2.0', method: 'notifications/initialized' });

      const tools = await session.request({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });
      expect(tools.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
        'list_documents',
        'read_document',
        'search_documents',
        'get_document_versions',
        'write_result',
      ]);
      expect(Object.fromEntries(tools.result.tools.map((tool: { name: string; annotations?: unknown }) => [
        tool.name,
        tool.annotations,
      ]))).toEqual({
        list_documents: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        read_document: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        search_documents: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        get_document_versions: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        write_result: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      });
    } finally {
      await session.close();
    }
  });

  it('只列授权集合、可读取授权派生 Markdown，并拒绝路径遍历与未授权读取', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-mcp-'));
    roots.push(root);
    const syncRoot = path.join(root, 'sync-inbox');
    const authorizedId = 'doc_019bf123-1234-7123-8123-123456789bcb';
    const unauthorizedId = 'doc_019bf123-1234-7123-8123-123456789bcc';
    await seedAuthorizedPdf(syncRoot, authorizedId, '周报.pdf');
    await seedUnauthorizedMarkdown(syncRoot, unauthorizedId, '机密笔记.md');

    const session = startMcpServer(syncRoot);
    try {
      await initializeSession(session);

      const listed = await callTool(session, 'list_documents', {});
      expect(listed.isError).toBe(false);
      expect(listed.structuredContent.documents).toEqual([
        expect.objectContaining({
          id: authorizedId,
          title: '周报.pdf',
          aiReadable: true,
        }),
      ]);
      expect(JSON.stringify(listed.structuredContent)).not.toContain('local_path');
      expect(JSON.stringify(listed.structuredContent)).not.toContain('/var/');

      const read = await callTool(session, 'read_document', { documentId: authorizedId });
      expect(read.isError).toBe(false);
      expect(read.structuredContent).toEqual(expect.objectContaining({
        id: authorizedId,
        title: '周报.pdf',
        kind: 'markdown',
        content: expect.stringContaining('来自授权派生副本'),
        readableSource: 'derived_artifact',
        auditResult: 'success',
      }));
      expect(JSON.stringify(read.structuredContent)).not.toContain('outputPath');

      const unauthorized = await callTool(session, 'read_document', { documentId: unauthorizedId });
      expect(unauthorized.isError).toBe(true);
      expect(unauthorized.structuredContent).toEqual(expect.objectContaining({
        ok: false,
        errorCode: 'E_AI_READ_NOT_ALLOWED',
      }));

      const traversal = await callTool(session, 'read_document', { documentId: '../../etc/passwd' });
      expect(traversal.isError).toBe(true);
      expect(traversal.structuredContent).toEqual(expect.objectContaining({
        ok: false,
        errorCode: 'E_SYNC_DOCUMENT_NOT_FOUND',
      }));
    } finally {
      await session.close();
    }
  });

  it('支持 search_documents 和 get_document_versions，并只返回授权文档的非路径化元数据', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-mcp-'));
    roots.push(root);
    const syncRoot = path.join(root, 'sync-inbox');
    const authorizedId = 'doc_019bf123-1234-7123-8123-123456789bcd';
    await seedAuthorizedPdf(syncRoot, authorizedId, 'Roadmap.pdf');

    const session = startMcpServer(syncRoot);
    try {
      await initializeSession(session);

      const search = await callTool(session, 'search_documents', { query: 'road' });
      expect(search.isError).toBe(false);
      expect(search.structuredContent.documents).toEqual([
        expect.objectContaining({
          id: authorizedId,
          title: 'Roadmap.pdf',
        }),
      ]);

      const versions = await callTool(session, 'get_document_versions', { documentId: authorizedId });
      expect(versions.isError).toBe(false);
      expect(versions.structuredContent).toEqual(expect.objectContaining({
        documentId: authorizedId,
        versions: [
          expect.objectContaining({
            id: expect.stringMatching(/^ver_/),
            originalFormat: 'pdf',
          }),
        ],
        derivedArtifacts: [
          expect.objectContaining({
            id: expect.stringMatching(/^art_/),
            format: 'markdown',
            generator: { name: 'pandoc', version: '3.7.0' },
          }),
        ],
      }));
      expect(JSON.stringify(versions.structuredContent)).not.toContain('localPath');
    } finally {
      await session.close();
    }
  });
});

async function initializeSession(session: McpSession): Promise<void> {
  await session.request({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'vitest', version: '1.0.0' },
    },
  });
  session.notify({ jsonrpc: '2.0', method: 'notifications/initialized' });
}

async function callTool(session: McpSession, name: string, args: Record<string, unknown>) {
  const response = await session.request({
    jsonrpc: '2.0',
    id: session.nextId(),
    method: 'tools/call',
    params: {
      name,
      arguments: args,
    },
  });
  return response.result;
}

async function seedAuthorizedPdf(syncRoot: string, documentId: string, title: string): Promise<void> {
  const root = path.dirname(syncRoot);
  const originalPath = path.join(root, `${title}.bin`);
  const artifactPath = path.join(root, `${title}.ai.md`);
  fs.writeFileSync(originalPath, `%PDF-${title}`, 'utf-8');
  fs.writeFileSync(artifactPath, `# ${title}\n\n来自授权派生副本。`, 'utf-8');

  const index = await InboxIndex.open(syncRoot);
  const versionId = documentId.replace(/^doc_/, 'ver_');
  const artifactId = documentId.replace(/^doc_/, 'art_');
  const baseObjectId = documentId.replace(/^doc_/, 'obj_');
  const artifactObjectId = `${baseObjectId}1`;
  const document = documentChange(documentId, title, 'pdf');
  const version = versionChange(versionId, documentId, baseObjectId, originalPath, 'pdf');
  await index.applyChanges([document, version], 'cur_2', '2026-07-21T12:00:00.000Z');
  await index.recordDerivedArtifact({
    id: artifactId,
    documentId,
    sourceVersionId: versionId,
    sourceDeviceId: document.sourceDeviceId,
    fileObjectId: artifactObjectId,
    format: 'markdown',
    mediaType: 'text/markdown',
    contentHash: `sha256:${'b'.repeat(64)}`,
    sizeBytes: fs.statSync(artifactPath).size,
    localPath: artifactPath,
    generatorName: 'pandoc',
    generatorVersion: '3.7.0',
    warnings: [],
    durationMs: 12,
    mediaDirectory: null,
    createdAt: '2026-07-21T12:01:00.000Z',
    updatedAt: '2026-07-21T12:01:00.000Z',
    deletedAt: null,
  });
  await index.setAiReadAccess({
    scopeType: 'document',
    scopeKey: documentId,
    allowed: true,
    now: '2026-07-21T12:02:00.000Z',
  });
  index.close();
}

async function seedUnauthorizedMarkdown(syncRoot: string, documentId: string, title: string): Promise<void> {
  const root = path.dirname(syncRoot);
  const sourcePath = path.join(root, title);
  fs.writeFileSync(sourcePath, '# only local\n\nstill denied', 'utf-8');
  const index = await InboxIndex.open(syncRoot);
  const versionId = documentId.replace(/^doc_/, 'ver_');
  const objectId = documentId.replace(/^doc_/, 'obj_');
  await index.applyChanges(
    [documentChange(documentId, title, 'markdown'), versionChange(versionId, documentId, objectId, sourcePath, 'markdown')],
    'cur_2',
    '2026-07-21T12:10:00.000Z',
  );
  index.close();
}

function documentChange(id: string, title: string, originalFormat: string): Extract<InboxChange, { kind: 'document' }> {
  return {
    eventId: `evt-${id}`,
    cursor: 'cur_1',
    operation: 'upsert',
    kind: 'document',
    id,
    sourceDeviceId: 'dev_019bf123-1234-7123-8123-123456789abc',
    title,
    originalFormat,
    currentVersionId: null,
    state: 'synced',
    createdAt: '2026-07-21T11:59:00.000Z',
    updatedAt: '2026-07-21T11:59:00.000Z',
    deletedAt: null,
  };
}

function versionChange(
  id: string,
  documentId: string,
  fileObjectId: string,
  localPath: string,
  originalFormat: string,
): Extract<InboxChange, { kind: 'version' }> {
  return {
    eventId: `evt-${id}`,
    cursor: 'cur_2',
    operation: 'upsert',
    kind: 'version',
    id,
    documentId,
    sourceDeviceId: 'dev_019bf123-1234-7123-8123-123456789abc',
    originalFormat,
    contentHash: `sha256:${'a'.repeat(64)}`,
    sizeBytes: fs.statSync(localPath).size,
    fileObjectId,
    parentVersionId: null,
    createdAt: '2026-07-21T11:59:00.000Z',
    updatedAt: '2026-07-21T11:59:00.000Z',
    deletedAt: null,
    localPath,
    conflict: false,
  };
}

interface McpSession {
  request(message: Record<string, unknown>): Promise<any>;
  notify(message: Record<string, unknown>): void;
  close(): Promise<void>;
  nextId(): number;
}

function startMcpServer(syncRoot: string): McpSession {
  const proc = spawn(process.execPath, [cli, 'mcp', '--sync-root', syncRoot], {
    cwd: path.dirname(path.dirname(cli)),
    env: { ...process.env, MOLAN_CLOUD_DIR: path.join(path.dirname(syncRoot), 'cloud') },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let nextId = 10;
  let buffer = '';
  const queue: Array<(value: any) => void> = [];

  proc.stdout.setEncoding('utf-8');
  proc.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const newline = buffer.indexOf('\n');
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const resolve = queue.shift();
      if (resolve) resolve(JSON.parse(line));
    }
  });

  return {
    request(message) {
      return new Promise((resolve) => {
        queue.push(resolve);
        proc.stdin.write(`${JSON.stringify(message)}\n`);
      });
    },
    notify(message) {
      proc.stdin.write(`${JSON.stringify(message)}\n`);
    },
    async close() {
      proc.stdin.end();
      await new Promise<void>((resolve) => {
        proc.once('exit', () => resolve());
      });
    },
    nextId() {
      nextId += 1;
      return nextId;
    },
  };
}
