import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { afterEach, describe, expect, it } from 'vitest';
import type { InboxChange } from '../../src/shared/sync';
import { InboxIndex } from './inboxIndex';

const roots: string[] = [];
const moduleRequire = createRequire(import.meta.url);

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('电脑同步 SQLite 索引', () => {
  it('事件重复应用不覆盖既有版本，关闭重开后游标和关系仍存在', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'molan-inbox-'));
    roots.push(root);
    let index = await InboxIndex.open(root);
    const document = documentChange();
    const version = versionChange();
    await index.applyChanges([document, version], 'cur_2', '2026-07-18T15:00:00.000Z');
    await index.applyChanges([{ ...version, localPath: '/should-not-win' }], 'cur_2', '2026-07-18T15:00:01.000Z');
    expect(index.listDocuments()).toEqual([
      expect.objectContaining({ id: document.id, currentVersionId: version.id, contentHash: version.contentHash }),
    ]);
    expect(index.readableFile(document.id)?.localPath).toBe(version.localPath);
    expect(index.conflictVersionFile(version.id)).toEqual({
      title: document.title,
      format: version.originalFormat,
      localPath: version.localPath,
    });
    index.close();

    index = await InboxIndex.open(root);
    expect(index.cursor()).toBe('cur_2');
    expect(index.lastSyncAt()).toBe('2026-07-18T15:00:01.000Z');
    expect(index.listDocuments()).toHaveLength(1);
    index.close();
  });

  it('删除 tombstone 后文档不再从受控收件箱暴露', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'molan-inbox-'));
    roots.push(root);
    const index = await InboxIndex.open(root);
    const document = documentChange();
    await index.applyChanges([document, versionChange()], 'cur_2', '2026-07-18T15:00:00.000Z');
    await index.applyChanges([{
      eventId: 'evt-delete', cursor: 'cur_3', operation: 'delete', kind: 'state',
      documentId: document.id, state: 'deleted', updatedAt: '2026-07-18T15:01:00.000Z',
      deletedAt: '2026-07-18T15:01:00.000Z',
    }], 'cur_3', '2026-07-18T15:01:00.000Z');
    expect(index.listDocuments()).toEqual([]);
    expect(index.readableFile(document.id)).toBeNull();
    index.close();
  });

  it('v1 索引升级后可在同一文档链路查询原件、派生副本与 AI 结果', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'molan-inbox-'));
    roots.push(root);
    const legacy = legacyDocumentFixture();
    const artifactPath = path.join(root, 'readable.md');
    const resultPath = path.join(root, 'summary.md');
    await writeFile(artifactPath, '# 可读副本\n', 'utf-8');
    await writeFile(resultPath, '# 结果摘要\n', 'utf-8');
    await writeLegacyV1Index(root, legacy);

    let index = await InboxIndex.open(root);
    const unified = index as unknown as UnifiedInboxIndex;
    await unified.recordDerivedArtifact({
      id: 'art-test',
      documentId: legacy.document.id,
      sourceVersionId: legacy.version.id,
      sourceDeviceId: legacy.document.sourceDeviceId,
      fileObjectId: 'obj-artifact',
      format: 'markdown',
      mediaType: 'text/markdown',
      contentHash: `sha256:${'b'.repeat(64)}`,
      sizeBytes: 32,
      localPath: artifactPath,
      generatorName: 'pandoc',
      generatorVersion: '3.7.0',
      warnings: [],
      durationMs: 0,
      mediaDirectory: null,
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
      deletedAt: null,
    });
    await unified.recordAiResult({
      id: 'air-test',
      documentId: legacy.document.id,
      sourceVersionId: legacy.version.id,
      sourceArtifactId: 'art-test',
      sourceDeviceId: legacy.document.sourceDeviceId,
      fileObjectId: 'obj-result',
      resultType: 'summary',
      format: 'markdown',
      mediaType: 'text/markdown',
      contentHash: `sha256:${'c'.repeat(64)}`,
      sizeBytes: 24,
      localPath: resultPath,
      generatorName: 'codex',
      generatorVersion: '1',
      createdAt: '2026-07-19T09:05:00.000Z',
      updatedAt: '2026-07-19T09:05:00.000Z',
      deletedAt: null,
    });
    await unified.setAiReadAccess({
      scopeType: 'document',
      scopeKey: legacy.document.id,
      allowed: true,
      now: '2026-07-19T09:06:00.000Z',
    });
    await unified.recordAiReadAudit({
      documentId: legacy.document.id,
      sourceVersionId: legacy.version.id,
      sourceArtifactId: 'art-test',
      entrypoint: 'mcp',
      result: 'success',
      errorCode: null,
      readAt: '2026-07-19T09:07:00.000Z',
    });

    expect(unified.documentFamily(legacy.document.id)).toEqual({
      document: expect.objectContaining({
        id: legacy.document.id,
        currentVersionId: legacy.version.id,
      }),
      versions: [
        expect.objectContaining({
          id: legacy.version.id,
          fileObjectId: legacy.version.fileObjectId,
          localPath: legacy.fileObject.localPath,
          contentHash: legacy.version.contentHash,
        }),
      ],
      derivedArtifacts: [
        expect.objectContaining({
          id: 'art-test',
          sourceVersionId: legacy.version.id,
          fileObjectId: 'obj-artifact',
          localPath: artifactPath,
          generator: { name: 'pandoc', version: '3.7.0' },
        }),
      ],
      aiResults: [
        expect.objectContaining({
          id: 'air-test',
          sourceArtifactId: 'art-test',
          fileObjectId: 'obj-result',
          localPath: resultPath,
          generator: { name: 'codex', version: '1' },
        }),
      ],
    });
    expect(index.listDocuments()).toEqual([
      expect.objectContaining({
        id: legacy.document.id,
        readableFormat: 'markdown',
        readableSource: 'derived_artifact',
        versionCount: 1,
        derivedArtifactCount: 1,
        aiResultCount: 1,
        aiReadStatus: expect.objectContaining({
          allowed: true,
          scopeType: 'document',
          grantedAt: '2026-07-19T09:06:00.000Z',
          lastReadAt: '2026-07-19T09:07:00.000Z',
          lastReadVia: 'mcp',
          lastReadResult: 'success',
        }),
      }),
    ]);
    expect(unified.preferredReadableTarget(legacy.document.id)).toEqual(
      expect.objectContaining({
        readableSource: 'derived_artifact',
        outputPath: artifactPath,
      }),
    );
    index.close();

    index = await InboxIndex.open(root);
    expect((index as unknown as UnifiedInboxIndex).documentFamily(legacy.document.id)?.aiResults).toHaveLength(1);
    index.close();
  });

  it('同一来源文件重复转换时保留多次派生记录而不覆盖前次证据', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'molan-inbox-'));
    roots.push(root);
    const sourcePath = path.join(root, 'source.md');
    const outputA = path.join(root, 'artifact-a.json');
    const outputB = path.join(root, 'artifact-b.json');
    await writeFile(sourcePath, '# hello\n', 'utf-8');
    await writeFile(outputA, '{"step":1}\n', 'utf-8');
    await writeFile(outputB, '{"step":2}\n', 'utf-8');

    const index = await InboxIndex.open(root);
    const unified = index as unknown as UnifiedInboxIndex;
    const document = documentChange();
    const version = { ...versionChange(), localPath: sourcePath };
    await index.applyChanges([document, version], 'cur_2', '2026-07-20T10:00:00.000Z');

    const first = await unified.recordConversionArtifact({
      inputPath: sourcePath,
      outputPath: outputA,
      outputFormat: 'json',
      generatorName: 'molan-converter',
      generatorVersion: '1.0.0-test',
      warnings: ['json export'],
      durationMs: 11,
      mediaDirectory: null,
      createdAt: '2026-07-20T10:01:00.000Z',
    });
    const second = await unified.recordConversionArtifact({
      inputPath: sourcePath,
      outputPath: outputB,
      outputFormat: 'json',
      generatorName: 'molan-converter',
      generatorVersion: '1.0.0-test',
      warnings: ['retry'],
      durationMs: 15,
      mediaDirectory: null,
      createdAt: '2026-07-20T10:02:00.000Z',
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.id).not.toBe(second?.id);
    expect(unified.documentFamily(document.id)?.derivedArtifacts).toEqual([
      expect.objectContaining({
        id: second?.id,
        sourceVersionId: version.id,
        localPath: outputB,
        format: 'json',
        warnings: ['retry'],
        durationMs: 15,
      }),
      expect.objectContaining({
        id: first?.id,
        sourceVersionId: version.id,
        localPath: outputA,
        format: 'json',
        warnings: ['json export'],
        durationMs: 11,
      }),
    ]);
    index.close();
  });

  it('new_document 结果如果显式带来源版本，会保留来源关系而不是回写成自身版本', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'molan-inbox-'));
    roots.push(root);
    const sourcePath = path.join(root, 'source.md');
    await writeFile(sourcePath, '# 原文\n', 'utf-8');

    const index = await InboxIndex.open(root);
    const document = documentChange();
    const version = { ...versionChange(), localPath: sourcePath };
    await index.applyChanges([document, version], 'cur_2', '2026-07-21T11:00:00.000Z');

    const saved = await index.saveConfirmedAiResult({
      title: '独立摘要',
      format: 'markdown',
      content: '# 摘要\n',
      resultType: 'summary',
      saveMode: 'new_document',
      createdBy: 'cli',
      modelName: null,
      promptTextHash: null,
      sourceDocumentId: document.id,
      sourceVersionId: version.id,
      sourceArtifactId: null,
      createdAt: '2026-07-21T11:05:00.000Z',
    });

    expect(saved.sourceVersionId).toBe(version.id);
    expect(index.documentFamily(saved.documentId)?.aiResults).toEqual([
      expect.objectContaining({
        id: saved.aiResultId,
        sourceVersionId: version.id,
      }),
    ]);
    index.close();
  });
});

interface UnifiedInboxIndex {
  recordDerivedArtifact(input: {
    id: string;
    documentId: string;
    sourceVersionId: string;
    sourceDeviceId: string;
    fileObjectId: string;
    format: string;
    mediaType: string;
    contentHash: string;
    sizeBytes: number;
    localPath: string;
    generatorName: string;
    generatorVersion: string;
    warnings: string[];
    durationMs: number;
    mediaDirectory: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }): Promise<void>;
  recordAiResult(input: {
    id: string;
    documentId: string;
    sourceVersionId: string;
    sourceArtifactId: string | null;
    sourceDeviceId: string;
    fileObjectId: string;
    resultType: string;
    format: string;
    mediaType: string;
    contentHash: string;
    sizeBytes: number;
    localPath: string;
    generatorName: string;
    generatorVersion: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }): Promise<void>;
  setAiReadAccess(input: {
    scopeType: 'document' | 'collection';
    scopeKey: string;
    allowed: boolean;
    now: string;
  }): Promise<void>;
  recordAiReadAudit(input: {
    documentId: string;
    sourceVersionId: string | null;
    sourceArtifactId: string | null;
    entrypoint: string;
    result: 'success' | 'denied' | 'missing_readable';
    errorCode: string | null;
    readAt: string;
  }): Promise<void>;
  preferredReadableTarget(documentId: string): {
    readableSource: 'derived_artifact' | 'original';
    outputPath: string;
  } | null;
  documentFamily(documentId: string): {
    document: { id: string; currentVersionId: string | null };
    versions: Array<{ id: string; fileObjectId: string; localPath: string; contentHash: string }>;
    derivedArtifacts: Array<{
      id: string;
      sourceVersionId: string;
      fileObjectId: string;
      localPath: string;
      generator: { name: string; version: string };
      warnings: string[];
      durationMs: number;
    }>;
    aiResults: Array<{
      id: string;
      sourceArtifactId: string | null;
      fileObjectId: string;
      localPath: string;
      generator: { name: string; version: string };
    }>;
  } | null;
  recordConversionArtifact(input: {
    inputPath: string;
    outputPath: string;
    outputFormat: string;
    generatorName: string;
    generatorVersion: string;
    warnings: string[];
    durationMs: number;
    mediaDirectory: string | null;
    createdAt: string;
  }): Promise<{
    id: string;
    sourceVersionId: string;
  } | null>;
}

function documentChange(): Extract<InboxChange, { kind: 'document' }> {
  return {
    eventId: 'evt-document', cursor: 'cur_1', operation: 'upsert', kind: 'document',
    id: 'doc-test', sourceDeviceId: 'dev-phone', title: '同步样例.md', originalFormat: 'markdown',
    currentVersionId: null, state: 'synced', createdAt: '2026-07-18T14:00:00.000Z',
    updatedAt: '2026-07-18T14:00:00.000Z', deletedAt: null,
  };
}

function versionChange(): Extract<InboxChange, { kind: 'version' }> {
  return {
    eventId: 'evt-version', cursor: 'cur_2', operation: 'upsert', kind: 'version',
    id: 'ver-test', documentId: 'doc-test', sourceDeviceId: 'dev-phone', originalFormat: 'markdown',
    contentHash: `sha256:${'a'.repeat(64)}`, sizeBytes: 12, fileObjectId: 'obj-test',
    parentVersionId: null, createdAt: '2026-07-18T14:00:00.000Z',
    updatedAt: '2026-07-18T14:00:00.000Z', deletedAt: null,
    localPath: '/controlled/objects/a', conflict: false,
  };
}

function legacyDocumentFixture() {
  return {
    document: {
      id: 'doc-legacy',
      sourceDeviceId: 'dev-phone',
      title: '旧版索引样例.pdf',
      originalFormat: 'pdf',
      currentVersionId: 'ver-legacy',
      state: 'synced',
      createdAt: '2026-07-19T08:00:00.000Z',
      updatedAt: '2026-07-19T08:00:00.000Z',
      deletedAt: null,
    },
    version: {
      id: 'ver-legacy',
      documentId: 'doc-legacy',
      sourceDeviceId: 'dev-phone',
      originalFormat: 'pdf',
      contentHash: `sha256:${'a'.repeat(64)}`,
      sizeBytes: 128,
      fileObjectId: 'obj-legacy',
      parentVersionId: null,
      createdAt: '2026-07-19T08:00:00.000Z',
      updatedAt: '2026-07-19T08:00:00.000Z',
      deletedAt: null,
    },
    fileObject: {
      id: 'obj-legacy',
      contentHash: `sha256:${'a'.repeat(64)}`,
      sizeBytes: 128,
      localPath: '/controlled/originals/legacy.pdf',
      createdAt: '2026-07-19T08:00:00.000Z',
      updatedAt: '2026-07-19T08:00:00.000Z',
      deletedAt: null,
    },
  };
}

async function writeLegacyV1Index(
  root: string,
  fixture: ReturnType<typeof legacyDocumentFixture>,
): Promise<void> {
  await mkdir(root, { recursive: true });
  const SQL = await initSqlJs({
    locateFile: () => moduleRequire.resolve('sql.js/dist/sql-wasm.wasm'),
  });
  const database = new SQL.Database();
  database.exec(`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      source_device_id TEXT NOT NULL,
      title TEXT NOT NULL,
      original_format TEXT NOT NULL,
      current_version_id TEXT,
      state TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE file_objects (
      id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      local_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX file_objects_hash ON file_objects(content_hash);
    CREATE TABLE document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      source_device_id TEXT NOT NULL,
      original_format TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_object_id TEXT NOT NULL REFERENCES file_objects(id),
      parent_version_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX versions_document ON document_versions(document_id);
    CREATE TABLE sync_events (
      id TEXT PRIMARY KEY,
      cursor TEXT NOT NULL,
      document_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    PRAGMA user_version = 1;
  `);
  database.run(
    `INSERT INTO documents(
      id, source_device_id, title, original_format, current_version_id, state, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fixture.document.id,
      fixture.document.sourceDeviceId,
      fixture.document.title,
      fixture.document.originalFormat,
      fixture.document.currentVersionId,
      fixture.document.state,
      fixture.document.createdAt,
      fixture.document.updatedAt,
      fixture.document.deletedAt,
    ],
  );
  database.run(
    `INSERT INTO file_objects(
      id, content_hash, size_bytes, local_path, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      fixture.fileObject.id,
      fixture.fileObject.contentHash,
      fixture.fileObject.sizeBytes,
      fixture.fileObject.localPath,
      fixture.fileObject.createdAt,
      fixture.fileObject.updatedAt,
      fixture.fileObject.deletedAt,
    ],
  );
  database.run(
    `INSERT INTO document_versions(
      id, document_id, source_device_id, original_format, content_hash, size_bytes, file_object_id,
      parent_version_id, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fixture.version.id,
      fixture.version.documentId,
      fixture.version.sourceDeviceId,
      fixture.version.originalFormat,
      fixture.version.contentHash,
      fixture.version.sizeBytes,
      fixture.version.fileObjectId,
      fixture.version.parentVersionId,
      fixture.version.createdAt,
      fixture.version.updatedAt,
      fixture.version.deletedAt,
    ],
  );
  database.run(
    'INSERT INTO app_meta(key, value) VALUES (?, ?), (?, ?)',
    ['cursor', 'cur_legacy', 'last_sync_at', '2026-07-19T08:30:00.000Z'],
  );

  await writeFile(path.join(root, 'index.sqlite'), database.export());
  database.close();
}
