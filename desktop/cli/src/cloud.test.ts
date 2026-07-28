import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { InboxIndex } from '../../electron/main/inboxIndex';
import type { InboxChange } from '../../src/shared/sync';

const cli = path.resolve(__dirname, '../dist/index.js');

function run(args: string[], cwd: string, envOverrides: Record<string, string>) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env, ...envOverrides },
    encoding: 'utf-8',
  });
}

function runJson(args: string[], cwd: string, envOverrides: Record<string, string>) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    env: { ...process.env, ...envOverrides },
    encoding: 'utf-8',
  });
  const output = result.stdout?.trim() || result.stderr?.trim() || '{}';
  return {
    status: result.status,
    body: JSON.parse(output),
  };
}

describe('molan cloud commands', () => {
  it('pushes, pulls, and reads a document as AI-readable JSON', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-'));
    const cloudDir = path.join(root, 'cloud');
    const file = path.join(root, 'sample.md');
    fs.writeFileSync(file, '# Hello\n\nAI readable content.', 'utf-8');

    const push = JSON.parse(run(['push', file, '--json'], root, { MOLAN_CLOUD_DIR: cloudDir }));
    expect(push.ok).toBe(true);
    expect(push.results[0].title).toBe('sample.md');

    const pull = JSON.parse(run(['pull', '--json'], root, { MOLAN_CLOUD_DIR: cloudDir }));
    expect(pull.ok).toBe(true);
    expect(pull.results[0].id).toBe(push.results[0].id);

    const read = JSON.parse(run(['read', push.results[0].id, '--json'], root, { MOLAN_CLOUD_DIR: cloudDir }));
    expect(read.ok).toBe(true);
    expect(read.results[0].content).toContain('AI readable content');
  });

  it('pull/read 在 synced 模式下读取真实桌面收件箱并优先返回 Markdown 派生副本', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-sync-'));
    const syncRoot = path.join(root, 'sync-inbox');
    const originalPath = path.join(root, 'report.pdf');
    const artifactPath = path.join(root, 'report.ai.md');
    fs.writeFileSync(originalPath, '%PDF-1.4 fake', 'utf-8');
    fs.writeFileSync(artifactPath, '# 可读副本\n\n来自真实收件箱。', 'utf-8');

    const index = await InboxIndex.open(syncRoot);
    const document = syncedDocumentChange();
    const version = syncedVersionChange(originalPath);
    await index.applyChanges([document, version], 'cur_2', '2026-07-21T09:00:00.000Z');
    await index.recordDerivedArtifact({
      id: 'art_019bf123-1234-7123-8123-123456789abd',
      documentId: document.id,
      sourceVersionId: version.id,
      sourceDeviceId: document.sourceDeviceId,
      fileObjectId: 'obj_019bf123-1234-7123-8123-123456789abe',
      format: 'markdown',
      mediaType: 'text/markdown',
      contentHash: `sha256:${'b'.repeat(64)}`,
      sizeBytes: fs.statSync(artifactPath).size,
      localPath: artifactPath,
      generatorName: 'pandoc',
      generatorVersion: '3.7.0',
      warnings: [],
      durationMs: 42,
      mediaDirectory: null,
      createdAt: '2026-07-21T09:01:00.000Z',
      updatedAt: '2026-07-21T09:01:00.000Z',
      deletedAt: null,
    });
    await index.setAiReadAccess({
      scopeType: 'document',
      scopeKey: document.id,
      allowed: true,
      now: '2026-07-21T09:02:00.000Z',
    });
    index.close();

    const pull = JSON.parse(run(
      ['pull', '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(pull.ok).toBe(true);
    expect(pull.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      title: document.title,
      kind: 'markdown',
    }));

    const read = JSON.parse(run(
      ['read', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(read.ok).toBe(true);
    expect(read.results[0].content).toContain('来自真实收件箱');
    expect(read.results[0].outputPath).toBe(artifactPath);
  });

  it('push 在 synced 模式下把本地 Markdown 导入真实收件箱并可继续 pull/read', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-sync-push-'));
    const syncRoot = path.join(root, 'sync-inbox');
    const file = path.join(root, 'notes.md');
    fs.writeFileSync(file, '# 同步导入\n\n来自 CLI push。', 'utf-8');

    const push = JSON.parse(run(
      ['push', file, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(push.ok).toBe(true);
    expect(push.results[0]).toEqual(expect.objectContaining({
      title: 'notes.md',
      kind: 'markdown',
      source: 'synced',
    }));

    const authorize = JSON.parse(run(
      ['authorize', push.results[0].id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(authorize.ok).toBe(true);

    const pull = JSON.parse(run(
      ['pull', '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(pull.ok).toBe(true);
    expect(pull.results[0].id).toBe(push.results[0].id);

    const read = JSON.parse(run(
      ['read', push.results[0].id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    ));
    expect(read.ok).toBe(true);
    expect(read.results[0].content).toContain('来自 CLI push');
  });

  it('synced read 默认拒绝正文，授权后记录审计，撤回后立即再次拒绝', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-sync-auth-'));
    const syncRoot = path.join(root, 'sync-inbox');
    const originalPath = path.join(root, 'private.pdf');
    const artifactPath = path.join(root, 'private.ai.md');
    fs.writeFileSync(originalPath, '%PDF-1.4 private', 'utf-8');
    fs.writeFileSync(artifactPath, '# 授权副本\n\n只有授权后才能读。', 'utf-8');

    const index = await InboxIndex.open(syncRoot);
    const document = {
      ...syncedDocumentChange(),
      id: 'doc_019bf123-1234-7123-8123-123456789acc',
      title: '机密汇报.pdf',
    };
    const version = {
      ...syncedVersionChange(originalPath),
      id: 'ver_019bf123-1234-7123-8123-123456789acc',
      documentId: document.id,
      fileObjectId: 'obj_019bf123-1234-7123-8123-123456789acc',
    };
    await index.applyChanges([document, version], 'cur_2', '2026-07-21T10:00:00.000Z');
    await index.recordDerivedArtifact({
      id: 'art_019bf123-1234-7123-8123-123456789acd',
      documentId: document.id,
      sourceVersionId: version.id,
      sourceDeviceId: document.sourceDeviceId,
      fileObjectId: 'obj_019bf123-1234-7123-8123-123456789ace',
      format: 'markdown',
      mediaType: 'text/markdown',
      contentHash: `sha256:${'d'.repeat(64)}`,
      sizeBytes: fs.statSync(artifactPath).size,
      localPath: artifactPath,
      generatorName: 'pandoc',
      generatorVersion: '3.7.0',
      warnings: [],
      durationMs: 21,
      mediaDirectory: null,
      createdAt: '2026-07-21T10:01:00.000Z',
      updatedAt: '2026-07-21T10:01:00.000Z',
      deletedAt: null,
    });
    index.close();

    const beforeGrant = runJson(
      ['pull', '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(beforeGrant.status).toBe(0);
    expect(beforeGrant.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      aiReadable: false,
      aiGrantScope: null,
      lastReadAt: null,
    }));

    const denied = runJson(
      ['read', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(denied.status).toBe(1);
    expect(denied.body).toEqual(expect.objectContaining({
      ok: false,
      errorCode: 'E_AI_READ_NOT_ALLOWED',
    }));

    const authorize = runJson(
      ['authorize', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(authorize.status).toBe(0);
    expect(authorize.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      allowed: true,
      scopeType: 'document',
    }));

    const grantedRead = runJson(
      ['read', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(grantedRead.status).toBe(0);
    expect(grantedRead.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      content: expect.stringContaining('只有授权后才能读'),
      auditResult: 'success',
    }));

    const afterRead = runJson(
      ['pull', '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(afterRead.status).toBe(0);
    expect(afterRead.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      aiReadable: true,
      aiGrantScope: 'document',
      lastReadVia: 'cli',
      lastReadResult: 'success',
      lastReadVersionId: version.id,
      lastReadArtifactId: 'art_019bf123-1234-7123-8123-123456789acd',
    }));
    expect(typeof afterRead.body.results[0].lastReadAt).toBe('string');

    const revoke = runJson(
      ['revoke', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(revoke.status).toBe(0);
    expect(revoke.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      allowed: false,
      scopeType: 'document',
    }));

    const deniedAgain = runJson(
      ['read', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(deniedAgain.status).toBe(1);
    expect(deniedAgain.body.errorCode).toBe('E_AI_READ_NOT_ALLOWED');
  });

  it('集合级授权可让 synced 文档继承 AI 可读权限', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'molan-cli-sync-collection-'));
    const syncRoot = path.join(root, 'sync-inbox');
    const sourcePath = path.join(root, 'all-hands.md');
    fs.writeFileSync(sourcePath, '# 全员可读\n\n集合授权。', 'utf-8');

    const index = await InboxIndex.open(syncRoot);
    const document = {
      ...syncedDocumentChange(),
      id: 'doc_019bf123-1234-7123-8123-123456789ad0',
      title: 'all-hands.md',
      originalFormat: 'markdown',
    };
    const version = {
      ...syncedVersionChange(sourcePath),
      id: 'ver_019bf123-1234-7123-8123-123456789ad0',
      documentId: document.id,
      fileObjectId: 'obj_019bf123-1234-7123-8123-123456789ad0',
      originalFormat: 'markdown',
    };
    await index.applyChanges([document, version], 'cur_2', '2026-07-21T11:00:00.000Z');
    index.close();

    const authorizeCollection = runJson(
      ['authorize', 'all', '--scope', 'collection', '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(authorizeCollection.status).toBe(0);
    expect(authorizeCollection.body.results[0]).toEqual(expect.objectContaining({
      allowed: true,
      scopeType: 'collection',
      scopeKey: 'all',
    }));

    const read = runJson(
      ['read', document.id, '--source', 'synced', '--sync-root', syncRoot, '--json'],
      root,
      { MOLAN_CLOUD_DIR: path.join(root, 'cloud') },
    );
    expect(read.status).toBe(0);
    expect(read.body.results[0]).toEqual(expect.objectContaining({
      id: document.id,
      content: expect.stringContaining('集合授权'),
      auditResult: 'success',
    }));
  });
});

function syncedDocumentChange(): Extract<InboxChange, { kind: 'document' }> {
  return {
    eventId: 'evt-document-sync',
    cursor: 'cur_1',
    operation: 'upsert',
    kind: 'document',
    id: 'doc_019bf123-1234-7123-8123-123456789abc',
    sourceDeviceId: 'dev_019bf123-1234-7123-8123-123456789abc',
    title: '项目汇报.pdf',
    originalFormat: 'pdf',
    currentVersionId: null,
    state: 'synced',
    createdAt: '2026-07-21T08:59:00.000Z',
    updatedAt: '2026-07-21T08:59:00.000Z',
    deletedAt: null,
  };
}

function syncedVersionChange(localPath: string): Extract<InboxChange, { kind: 'version' }> {
  return {
    eventId: 'evt-version-sync',
    cursor: 'cur_2',
    operation: 'upsert',
    kind: 'version',
    id: 'ver_019bf123-1234-7123-8123-123456789abc',
    documentId: 'doc_019bf123-1234-7123-8123-123456789abc',
    sourceDeviceId: 'dev_019bf123-1234-7123-8123-123456789abc',
    originalFormat: 'pdf',
    contentHash: `sha256:${'a'.repeat(64)}`,
    sizeBytes: fs.statSync(localPath).size,
    fileObjectId: 'obj_019bf123-1234-7123-8123-123456789abc',
    parentVersionId: null,
    createdAt: '2026-07-21T08:59:00.000Z',
    updatedAt: '2026-07-21T08:59:00.000Z',
    deletedAt: null,
    localPath,
    conflict: false,
  };
}
