import { describe, expect, it } from 'vitest';
import {
  SyncService,
  type ConflictRecord,
  type DocumentHead,
  type SyncEvent,
  type SyncMutation,
  type SyncRepository,
} from '../src/sync.js';

class MemorySyncRepository implements SyncRepository {
  events: Array<{ sequence: number; userId: string; payloadHash: string; event: SyncEvent }> = [];
  heads = new Map<string, DocumentHead>();
  versions = new Map<string, Record<string, unknown>>();
  conflictRecords = new Map<string, ConflictRecord & { userId: string }>();

  async eventByMutation(userId: string, mutationId: string) {
    const item = this.events.find((row) => row.userId === userId && row.event.clientMutationId === mutationId);
    return item ? { payloadHash: item.payloadHash, event: item.event } : null;
  }
  async documentHead(userId: string, documentId: string) { return this.heads.get(`${userId}:${documentId}`) ?? null; }
  async commit(
    userId: string,
    mutation: SyncMutation,
    payloadHash: string,
    rawEvent: Omit<SyncEvent, 'cursor'>,
    conflict: ConflictRecord | null,
  ) {
    const sequence = this.events.length + 1;
    const event = { ...rawEvent, cursor: `cur_${sequence}` };
    this.events.push({ sequence, userId, payloadHash, event });
    const key = `${userId}:${mutation.documentId}`;
    const head = this.heads.get(key) ?? { currentVersionId: null, deletedAt: null };
    if (mutation.versionId) this.versions.set(mutation.versionId, mutation.payload);
    if (mutation.operation === 'upsert' && mutation.versionId && !conflict) {
      head.currentVersionId = mutation.versionId;
      head.deletedAt = null;
    } else if (mutation.operation === 'delete') {
      head.deletedAt = rawEvent.createdAt;
    } else if (mutation.operation === 'restore') {
      head.deletedAt = null;
    }
    this.heads.set(key, head);
    if (conflict) this.conflictRecords.set(conflict.id, { ...conflict, userId });
    return event;
  }
  async pull(userId: string, after: number, limit: number) {
    const all = this.events.filter((row) => row.userId === userId && row.sequence > after);
    const page = all.slice(0, limit);
    return { events: page.map((row) => row.event), lastSequence: page.at(-1)?.sequence ?? after, hasMore: all.length > limit };
  }
  async conflicts(userId: string) { return [...this.conflictRecords.values()].filter((item) => item.userId === userId && !item.resolvedAt); }
  async resolveConflict(userId: string, id: string, resolution: NonNullable<ConflictRecord['resolution']>, now: string) {
    const item = this.conflictRecords.get(id);
    if (!item || item.userId !== userId) return null;
    item.resolution = resolution;
    item.resolvedAt = now;
    return item;
  }
}

const deviceId = 'dev_019bf123-1234-7123-8123-123456789abc';
const documentId = 'doc_019bf123-1234-7123-8123-123456789abc';
const version1 = 'ver_019bf123-1234-7123-8123-123456789abc';
const version2 = 'ver_019bf124-1234-7123-8123-123456789abc';
const context = { userId: 'usr_test', deviceId, sessionId: 'ses_test' };

function mutation(id: string, versionId: string | null, baseVersionId: string | null, operation: SyncMutation['operation'] = 'upsert'): SyncMutation {
  return {
    clientMutationId: id,
    deviceId,
    documentId,
    versionId,
    baseVersionId,
    operation,
    retryCount: 0,
    payload: versionId ? { id: versionId, documentId, contentHash: `sha256:${'a'.repeat(64)}` } : { documentId },
  };
}

describe('增量同步与冲突', () => {
  it('同一 mutation 重放 100 次只产生一个事件和一个版本', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const item = mutation('mut_019bf123-1234-7123-8123-123456789abc', version1, null);
    for (let index = 0; index < 100; index += 1) {
      const result = await service.push(context, deviceId, [item], `req-${index}`);
      expect(result.ok).toBe(true);
      expect(result.results[0]?.event?.id).toBe(repository.events[0]?.event.id);
    }
    expect(repository.events).toHaveLength(1);
    expect(repository.versions.size).toBe(1);
    expect((await service.pull(context, deviceId, null, 10)).events[0]?.payload).toEqual(item.payload);
  });

  it('同一幂等键换载荷逐项失败且不阻塞其他 mutation', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    const id = 'mut_019bf123-1234-7123-8123-123456789abc';
    await service.push(context, deviceId, [mutation(id, version1, null)], 'req-1');
    const result = await service.push(context, deviceId, [
      mutation(id, version2, version1),
      mutation('mut_019bf124-1234-7123-8123-123456789abc', version2, version1),
    ], 'req-2');
    expect(result.ok).toBe(false);
    expect(result.results[0]?.error?.errorCode).toBe('E_CLIENT_MUTATION_REUSED');
    expect(result.results[1]?.ok).toBe(true);
  });

  it('双端旧基版本和删除后编辑都保留传入版本并生成冲突', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    await service.push(context, deviceId, [mutation('mut_019bf121-1234-7123-8123-123456789abc', version1, null)], 'req-1');
    const conflict = await service.push(context, deviceId, [mutation('mut_019bf122-1234-7123-8123-123456789abc', version2, null)], 'req-2');
    expect(conflict.results[0]?.event).toMatchObject({ phase: 'conflict', errorCode: 'E_BASE_VERSION_CONFLICT' });
    expect(repository.versions.has(version1)).toBe(true);
    expect(repository.versions.has(version2)).toBe(true);
    expect((await service.listConflicts(context))).toHaveLength(1);

    await service.push(context, deviceId, [mutation('mut_019bf125-1234-7123-8123-123456789abc', null, version1, 'delete')], 'req-3');
    const afterDelete = await service.push(context, deviceId, [mutation('mut_019bf126-1234-7123-8123-123456789abc', version2, version1)], 'req-4');
    expect(afterDelete.results[0]?.event?.phase).toBe('conflict');
  });

  it('游标分页有序、不漏不重，错误游标被拒绝', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    await service.push(context, deviceId, [mutation('mut_019bf121-1234-7123-8123-123456789abc', version1, null)], 'req-1');
    await service.push(context, deviceId, [mutation('mut_019bf122-1234-7123-8123-123456789abc', null, version1, 'archive')], 'req-2');
    const first = await service.pull(context, deviceId, null, 1);
    const second = await service.pull(context, deviceId, first.cursor, 1);
    expect(first.hasMore).toBe(true);
    expect(new Set([...first.events, ...second.events].map((event) => event.id)).size).toBe(2);
    await expect(service.pull(context, deviceId, 'bad', 10)).rejects.toMatchObject({ code: 'E_FILE_NOT_FOUND' });
  });

  it('AI 结果事件可作为非版本 upsert 进入事件流且不改写文档头', async () => {
    const repository = new MemorySyncRepository();
    const service = new SyncService(repository);
    await service.push(context, deviceId, [mutation('mut_019bf121-1234-7123-8123-123456789abc', version1, null)], 'req-1');
    const aiResultMutation: SyncMutation = {
      clientMutationId: 'mut_019bf127-1234-7123-8123-123456789abc',
      deviceId,
      documentId,
      versionId: null,
      baseVersionId: null,
      operation: 'upsert',
      retryCount: 0,
      payload: {
        id: 'air_019bf127-1234-7123-8123-123456789abc',
        documentId,
        sourceVersionId: version1,
        sourceArtifactId: null,
        sourceDeviceId: deviceId,
        fileObjectId: 'obj_019bf127-1234-7123-8123-123456789abc',
        resultType: 'summary',
        format: 'markdown',
        mediaType: 'text/markdown',
        contentHash: `sha256:${'b'.repeat(64)}`,
        sizeBytes: 12,
        generatorName: 'codex',
        generatorVersion: '1',
        createdAt: '2026-07-21T10:00:00.000Z',
        updatedAt: '2026-07-21T10:00:00.000Z',
        deletedAt: null,
      },
    };
    const result = await service.push(context, deviceId, [aiResultMutation], 'req-air');
    expect(result.ok).toBe(true);
    expect(result.results[0]?.event).toMatchObject({
      documentId,
      versionId: null,
      operation: 'upsert',
      payload: {
        id: 'air_019bf127-1234-7123-8123-123456789abc',
        sourceVersionId: version1,
      },
    });
    expect(await repository.documentHead(context.userId, documentId)).toEqual({
      currentVersionId: version1,
      deletedAt: null,
    });
  });
});
