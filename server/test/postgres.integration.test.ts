import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService, type AuthContext, type DeviceRegistration } from '../src/auth.js';
import { PostgresDatabase } from '../src/database.js';
import { FileService } from '../src/files.js';
import { newEntityId } from '../src/ids.js';
import { migrateDatabase } from '../src/migrate.js';
import { PostgresAuthRepository } from '../src/postgres-auth.js';
import { PostgresFileRepository } from '../src/postgres-files.js';
import { PostgresSyncRepository } from '../src/postgres-sync.js';
import { LocalObjectStorage } from '../src/storage.js';
import { SyncService, type SyncMutation } from '../src/sync.js';

const databaseUrl = process.env['MOLAN_TEST_DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
const repositoryRoot = resolve(process.cwd(), '..');

const acceptanceFixtures = [
  {
    path: 'fixtures/mobile-reading/markdown/normal.md',
    format: 'markdown',
    mediaType: 'text/markdown',
    sizeBytes: 292,
    sha256: '4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5',
  },
  {
    path: 'fixtures/mobile-reading/json/normal.json',
    format: 'json',
    mediaType: 'application/json',
    sizeBytes: 167,
    sha256: '51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98',
  },
  {
    path: 'fixtures/mobile-reading/text/utf8.txt',
    format: 'text',
    mediaType: 'text/plain',
    sizeBytes: 77,
    sha256: '1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014',
  },
  {
    path: 'desktop/cli/test-fixtures/sample.docx',
    format: 'docx',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 36_796,
    sha256: '032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570',
  },
  {
    path: 'desktop/cli/test-fixtures/sample.pdf',
    format: 'pdf',
    mediaType: 'application/pdf',
    sizeBytes: 1_722,
    sha256: '84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9',
  },
  {
    path: 'desktop/cli/test-fixtures/sample.xlsx',
    format: 'xlsx',
    mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 4_941,
    sha256: '6c8972a832dfa8bfed1015ca9799fd7bcad3a4dfeb00b867584460057b2a5119',
  },
  {
    path: 'desktop/cli/test-fixtures/sample.pptx',
    format: 'pptx',
    mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 29_172,
    sha256: '1deaac9db9546da9337535d0121f843b842db340d9f915fd9fb7fb202cef71d6',
  },
] as const;

suite('PostgreSQL 同步端到端', () => {
  const database = new PostgresDatabase(databaseUrl!);
  let objectRoot = '';

  beforeAll(async () => {
    await migrateDatabase(database);
    await database.pool.query(`
      TRUNCATE conflicts, sync_events, document_versions, documents, upload_parts,
               upload_sessions, file_objects, auth_sessions, devices, auth_challenges, users
      RESTART IDENTITY CASCADE
    `);
    objectRoot = await mkdtemp(join(tmpdir(), 'molan-pg-objects-'));
  }, 30_000);

  afterAll(async () => {
    await database.close();
    if (objectRoot) await rm(objectRoot, { recursive: true, force: true });
  }, 30_000);

  it('登录、上传、并发幂等同步、删除和恢复保持数据库与对象一致', async () => {
    const auth = new AuthService(new PostgresAuthRepository(database.pool), '246810');
    const challenge = await auth.requestCode('+8613800000099');
    const tokens = await auth.verify(challenge.challengeId, '246810', {
      installationId: 'postgres-integration-device', name: 'PG 集成测试',
      type: 'desktop', platform: 'linux', appVersion: '0.1.0-test',
    });
    const context = await auth.authenticate(`Bearer ${tokens.accessToken}`);
    const storage = new LocalObjectStorage(objectRoot);
    const files = new FileService(new PostgresFileRepository(database.pool), storage);
    const sync = new SyncService(new PostgresSyncRepository(database.pool));
    const bytes = Buffer.from('# PostgreSQL roundtrip');
    const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const objectId = newEntityId('obj_');
    const upload = await files.createUpload(context, {
      clientMutationId: newEntityId('mut_'), fileObjectId: objectId, role: 'original',
      format: 'markdown', contentHash: hash, sizeBytes: bytes.length, mediaType: 'text/markdown',
    });
    const part = await files.uploadPart(context, upload.uploadId, 1, bytes);
    const object = await files.completeUpload(context, upload.uploadId, [part]);
    expect((await files.download(context, object.id)).sizeBytes).toBe(bytes.length);

    const now = new Date().toISOString();
    const documentId = newEntityId('doc_');
    const versionId = newEntityId('ver_');
    const documentMutation: SyncMutation = {
      clientMutationId: newEntityId('mut_'), deviceId: context.deviceId, documentId,
      versionId: null, baseVersionId: null, operation: 'upsert', retryCount: 0,
      payload: {
        id: documentId, sourceDeviceId: context.deviceId, title: 'PG.md', originalFormat: 'markdown',
        currentVersionId: null, createdAt: now, updatedAt: now, deletedAt: null,
      },
    };
    const versionMutation: SyncMutation = {
      clientMutationId: newEntityId('mut_'), deviceId: context.deviceId, documentId,
      versionId, baseVersionId: null, operation: 'upsert', retryCount: 0,
      payload: {
        id: versionId, documentId, sourceDeviceId: context.deviceId, originalFormat: 'markdown',
        contentHash: hash, sizeBytes: bytes.length, fileObjectId: object.id,
        parentVersionId: null, createdAt: now, updatedAt: now, deletedAt: null,
      },
    };
    expect((await sync.push(context, context.deviceId, [documentMutation], 'req-doc')).ok).toBe(true);
    const concurrency = Number(process.env['MOLAN_PG_TEST_CONCURRENCY'] ?? 20);
    const concurrent = await Promise.all(Array.from({ length: concurrency }, (_, index) =>
      sync.push(context, context.deviceId, [versionMutation], `req-version-${index}`)));
    expect(concurrent.every((result) => result.results[0]?.ok)).toBe(true);
    expect(new Set(concurrent.map((result) => result.results[0]!.event!.id)).size).toBe(1);
    expect((await sync.pull(context, context.deviceId, null, 100)).events).toHaveLength(2);

    const deletion: SyncMutation = {
      clientMutationId: newEntityId('mut_'), deviceId: context.deviceId, documentId,
      versionId: null, baseVersionId: versionId, operation: 'delete', retryCount: 0,
      payload: { documentId, scope: 'all_devices' },
    };
    await sync.push(context, context.deviceId, [deletion], 'req-delete');
    await expect(files.download(context, object.id)).rejects.toMatchObject({ code: 'E_OBJECT_MISSING' });
    await sync.push(context, context.deviceId, [{
      ...deletion, clientMutationId: newEntityId('mut_'), operation: 'restore', payload: { documentId },
    }], 'req-restore');
    await expect(files.download(context, object.id)).resolves.toMatchObject({ contentHash: hash });
  }, 60_000);

  it('七类原件在三设备离线补传后保持哈希，且撤销、冲突、删除恢复均留下事件', async () => {
    const authRepository = new PostgresAuthRepository(database.pool);
    let clock = new Date('2026-07-26T02:00:00.000Z');
    const auth = new AuthService(authRepository, '246810', () => clock);
    const login = async (registration: DeviceRegistration) => {
      const challenge = await auth.requestCode('+8613800000199');
      const tokens = await auth.verify(challenge.challengeId, '246810', registration);
      clock = new Date(clock.getTime() + 61_000);
      return {
        tokens,
        context: await auth.authenticate(`Bearer ${tokens.accessToken}`),
      };
    };
    const android = await login({
      installationId: 'android-simulator-api36',
      name: 'Android API 36 模拟器',
      type: 'phone',
      platform: 'android',
      appVersion: '0.1.0-acceptance',
    });
    const ios = await login({
      installationId: 'ios-simulator-iphone17pro',
      name: 'iPhone 17 Pro 模拟器',
      type: 'phone',
      platform: 'ios',
      appVersion: '0.1.0-acceptance',
    });
    const desktop = await login({
      installationId: 'desktop-local-acceptance',
      name: 'macOS 本地桌面端',
      type: 'desktop',
      platform: 'macos',
      appVersion: '0.1.0-acceptance',
    });

    const pending = await Promise.all(acceptanceFixtures.map(async (fixture, index) => {
      const bytes = await readFile(resolve(repositoryRoot, fixture.path));
      const digest = createHash('sha256').update(bytes).digest('hex');
      expect(bytes).toHaveLength(fixture.sizeBytes);
      expect(digest).toBe(fixture.sha256);
      return {
        fixture,
        bytes,
        source: index % 2 === 0 ? android.context : ios.context,
        documentId: newEntityId('doc_'),
        versionId: newEntityId('ver_'),
      };
    }));

    // 客户端先离线形成持久队列；“服务重启”后重新创建服务与仓储，再统一补传。
    const restartedFiles = new FileService(new PostgresFileRepository(database.pool), new LocalObjectStorage(objectRoot));
    const restartedSync = new SyncService(new PostgresSyncRepository(database.pool), () => clock);
    const synced: Array<{
      documentId: string;
      versionId: string;
      objectId: string;
      versionMutation: SyncMutation;
      source: AuthContext;
    }> = [];

    for (const item of pending) {
      const contentHash = `sha256:${item.fixture.sha256}`;
      const requestedObjectId = newEntityId('obj_');
      const upload = await restartedFiles.createUpload(item.source, {
        clientMutationId: newEntityId('mut_'),
        fileObjectId: requestedObjectId,
        role: 'original',
        format: item.fixture.format,
        contentHash,
        sizeBytes: item.bytes.length,
        mediaType: item.fixture.mediaType,
      });
      const part = await restartedFiles.uploadPart(item.source, upload.uploadId, 1, item.bytes);
      const object = await restartedFiles.completeUpload(item.source, upload.uploadId, [part]);
      const downloaded = await restartedFiles.download(desktop.context, object.id);
      const downloadedBytes = await readFile(downloaded.path);
      expect(createHash('sha256').update(downloadedBytes).digest('hex')).toBe(item.fixture.sha256);

      const now = clock.toISOString();
      const documentMutation: SyncMutation = {
        clientMutationId: newEntityId('mut_'),
        deviceId: item.source.deviceId,
        documentId: item.documentId,
        versionId: null,
        baseVersionId: null,
        operation: 'upsert',
        retryCount: 1,
        payload: {
          id: item.documentId,
          sourceDeviceId: item.source.deviceId,
          title: item.fixture.path.split('/').at(-1)!,
          originalFormat: item.fixture.format,
          currentVersionId: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      };
      const versionMutation: SyncMutation = {
        clientMutationId: newEntityId('mut_'),
        deviceId: item.source.deviceId,
        documentId: item.documentId,
        versionId: item.versionId,
        baseVersionId: null,
        operation: 'upsert',
        retryCount: 1,
        payload: {
          id: item.versionId,
          documentId: item.documentId,
          sourceDeviceId: item.source.deviceId,
          originalFormat: item.fixture.format,
          contentHash,
          sizeBytes: item.bytes.length,
          fileObjectId: object.id,
          parentVersionId: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      };
      expect((await restartedSync.push(item.source, item.source.deviceId, [
        documentMutation,
        versionMutation,
      ], `offline-recovery-${item.fixture.format}`)).ok).toBe(true);
      synced.push({
        documentId: item.documentId,
        versionId: item.versionId,
        objectId: object.id,
        versionMutation,
        source: item.source,
      });
    }

    const desktopPull = await restartedSync.pull(desktop.context, desktop.context.deviceId, null, 100);
    expect(desktopPull.events).toHaveLength(acceptanceFixtures.length * 2);
    expect(new Set(desktopPull.events.map((event) => event.deviceId))).toEqual(
      new Set([android.context.deviceId, ios.context.deviceId]),
    );

    const first = synced[0]!;
    const uploadChangedVersion = async (context: AuthContext, suffix: string) => {
      const bytes = Buffer.from(`修改版本：${suffix}`);
      const digest = createHash('sha256').update(bytes).digest('hex');
      const upload = await restartedFiles.createUpload(context, {
        clientMutationId: newEntityId('mut_'),
        fileObjectId: newEntityId('obj_'),
        role: 'original',
        format: 'markdown',
        contentHash: `sha256:${digest}`,
        sizeBytes: bytes.length,
        mediaType: 'text/markdown',
      });
      const part = await restartedFiles.uploadPart(context, upload.uploadId, 1, bytes);
      const object = await restartedFiles.completeUpload(context, upload.uploadId, [part]);
      const versionId = newEntityId('ver_');
      const now = clock.toISOString();
      const mutation: SyncMutation = {
        clientMutationId: newEntityId('mut_'),
        deviceId: context.deviceId,
        documentId: first.documentId,
        versionId,
        baseVersionId: first.versionId,
        operation: 'upsert',
        retryCount: 0,
        payload: {
          id: versionId,
          documentId: first.documentId,
          sourceDeviceId: context.deviceId,
          originalFormat: 'markdown',
          contentHash: `sha256:${digest}`,
          sizeBytes: bytes.length,
          fileObjectId: object.id,
          parentVersionId: first.versionId,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      };
      return mutation;
    };
    const desktopEdit = await uploadChangedVersion(desktop.context, 'desktop');
    const androidEdit = await uploadChangedVersion(android.context, 'android');
    expect((await restartedSync.push(desktop.context, desktop.context.deviceId, [desktopEdit], 'desktop-edit'))
      .results[0]?.event?.phase).toBe('committed');
    expect((await restartedSync.push(android.context, android.context.deviceId, [androidEdit], 'android-conflict'))
      .results[0]?.event).toMatchObject({
        phase: 'conflict',
        errorCode: 'E_BASE_VERSION_CONFLICT',
      });
    const [conflict] = await restartedSync.listConflicts(desktop.context);
    expect(conflict).toMatchObject({
      documentId: first.documentId,
      remoteVersionId: androidEdit.versionId,
    });
    await expect(restartedSync.resolveConflict(desktop.context, conflict!.id, 'save_copy')).resolves.toMatchObject({
      resolution: 'save_copy',
    });
    const versionCount = await database.pool.query<{ count: string }>(
      'SELECT count(*) FROM document_versions WHERE document_id = $1',
      [first.documentId],
    );
    expect(Number(versionCount.rows[0]!.count)).toBe(3);

    const deleted = synced[1]!;
    const deletion: SyncMutation = {
      clientMutationId: newEntityId('mut_'),
      deviceId: android.context.deviceId,
      documentId: deleted.documentId,
      versionId: null,
      baseVersionId: deleted.versionId,
      operation: 'delete',
      retryCount: 0,
      payload: { documentId: deleted.documentId, scope: 'all_devices' },
    };
    expect((await restartedSync.push(android.context, android.context.deviceId, [deletion], 'delete')).ok).toBe(true);
    await expect(restartedFiles.download(desktop.context, deleted.objectId)).rejects.toMatchObject({
      code: 'E_OBJECT_MISSING',
    });
    const restoration: SyncMutation = {
      ...deletion,
      clientMutationId: newEntityId('mut_'),
      operation: 'restore',
      payload: { documentId: deleted.documentId },
    };
    expect((await restartedSync.push(android.context, android.context.deviceId, [restoration], 'restore')).ok).toBe(true);
    await expect(restartedFiles.download(desktop.context, deleted.objectId)).resolves.toMatchObject({
      contentHash: `sha256:${acceptanceFixtures[1].sha256}`,
    });

    const replay = await Promise.all(synced.map((item, index) =>
      restartedSync.push(item.source, item.source.deviceId, [item.versionMutation], `replay-${index}`)));
    expect(replay.every((result) => result.results[0]?.ok)).toBe(true);
    const eventsAfterRecovery = await restartedSync.pull(desktop.context, desktop.context.deviceId, null, 100);
    expect(eventsAfterRecovery.events.filter((event) => event.phase === 'conflict')).toHaveLength(1);
    expect(eventsAfterRecovery.events.map((event) => event.operation)).toEqual(
      expect.arrayContaining(['upsert', 'delete', 'restore']),
    );

    await auth.revokeDevice(desktop.context, ios.context.deviceId);
    await expect(auth.authenticate(`Bearer ${ios.tokens.accessToken}`)).rejects.toMatchObject({
      code: 'E_DEVICE_REVOKED',
    });
  }, 90_000);
});
