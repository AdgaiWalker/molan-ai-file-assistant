import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileService, type FileRepository, type StoredFileObject, type UploadPart, type UploadRecord } from '../src/files.js';
import { LocalObjectStorage } from '../src/storage.js';

class MemoryFileRepository implements FileRepository {
  uploads = new Map<string, UploadRecord>();
  partRecords = new Map<string, UploadPart>();
  objects = new Map<string, StoredFileObject>();

  async uploadByMutation(userId: string, mutationId: string) {
    return [...this.uploads.values()].find((item) => item.userId === userId && item.clientMutationId === mutationId) ?? null;
  }
  async objectByHash(userId: string, hash: string, role: StoredFileObject['role']) {
    return [...this.objects.values()].find((item) => item.userId === userId && item.contentHash === hash && item.role === role) ?? null;
  }
  async createUpload(record: UploadRecord) {
    const existing = await this.uploadByMutation(record.userId, record.clientMutationId);
    if (existing) return existing;
    this.uploads.set(record.id, record);
    return record;
  }
  async upload(userId: string, uploadId: string) { const item = this.uploads.get(uploadId); return item?.userId === userId ? item : null; }
  async savePart(part: UploadPart) { this.partRecords.set(`${part.uploadId}:${part.partNumber}`, part); }
  async parts(uploadId: string) { return [...this.partRecords.values()].filter((item) => item.uploadId === uploadId).sort((a, b) => a.partNumber - b.partNumber); }
  async completeUpload(uploadId: string, object: StoredFileObject) {
    this.objects.set(object.id, object);
    const upload = this.uploads.get(uploadId)!;
    upload.status = 'complete';
    return object;
  }
  async fileObject(userId: string, objectId: string) { const item = this.objects.get(objectId); return item?.userId === userId ? item : null; }
  async expiredUploads(before: string) { return [...this.uploads.values()].filter((item) => item.status !== 'complete' && item.expiresAt <= before); }
  async deleteUpload(uploadId: string) { this.uploads.delete(uploadId); }
  async activeObjectKeys() { return [...this.objects.values()].map((item) => item.objectKey); }
}

const context = { userId: 'usr_test', deviceId: 'dev_019bf123-1234-7123-8123-123456789abc', sessionId: 'ses_test' };

function hash(bytes: Buffer) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function input(bytes: Buffer, mutation = 'mut_019bf123-1234-7123-8123-123456789abc') {
  return {
    clientMutationId: mutation,
    fileObjectId: 'obj_019bf123-1234-7123-8123-123456789abc',
    role: 'original' as const,
    format: 'markdown',
    contentHash: hash(bytes),
    sizeBytes: bytes.length,
    mediaType: 'text/markdown',
  };
}

async function fixture() {
  const repository = new MemoryFileRepository();
  const directory = await mkdtemp(join(tmpdir(), 'molan-objects-'));
  const storage = new LocalObjectStorage(directory);
  return { repository, storage, service: new FileService(repository, storage) };
}

describe('文件对象上传下载', () => {
  it('分片中断后用同一幂等键恢复并校验完整 SHA-256', async () => {
    const bytes = Buffer.from('hello molan sync');
    const { service } = await fixture();
    const created = await service.createUpload(context, input(bytes));
    const first = await service.uploadPart(context, created.uploadId, 1, bytes.subarray(0, 6));
    const resumed = await service.createUpload(context, input(bytes));
    expect(resumed.uploadedParts).toEqual([1]);
    const second = await service.uploadPart(context, created.uploadId, 2, bytes.subarray(6));
    const object = await service.completeUpload(context, created.uploadId, [first, second]);
    expect(object.contentHash).toBe(hash(bytes));
    const downloaded = await service.download(context, object.id);
    expect(downloaded.sizeBytes).toBe(bytes.length);
  });

  it('同一幂等键换载荷会失败，同哈希新请求直接复用对象', async () => {
    const bytes = Buffer.from('same content');
    const { service } = await fixture();
    const created = await service.createUpload(context, input(bytes));
    await expect(service.createUpload(context, { ...input(bytes), sizeBytes: bytes.length + 1 }))
      .rejects.toMatchObject({ code: 'E_CLIENT_MUTATION_REUSED' });
    const part = await service.uploadPart(context, created.uploadId, 1, bytes);
    const object = await service.completeUpload(context, created.uploadId, [part]);
    const dedup = await service.createUpload(context, input(bytes, 'mut_019bf124-1234-7123-8123-123456789abc'));
    expect(dedup).toMatchObject({ alreadyComplete: true, fileObjectId: object.id });
  });

  it('损坏或缺失分片不能提交为对象', async () => {
    const bytes = Buffer.from('expected bytes');
    const { service } = await fixture();
    const created = await service.createUpload(context, input(bytes));
    const part = await service.uploadPart(context, created.uploadId, 1, Buffer.from('corrupt bytes'));
    await expect(service.completeUpload(context, created.uploadId, [part])).rejects.toMatchObject({ code: 'E_HASH_MISMATCH' });
  });

  it('空文件不需要伪造分片即可完成并下载', async () => {
    const bytes = Buffer.alloc(0);
    const { service } = await fixture();
    const created = await service.createUpload(context, input(bytes));
    const object = await service.completeUpload(context, created.uploadId, []);
    expect(object).toMatchObject({ sizeBytes: 0, contentHash: hash(bytes) });
    await expect(service.download(context, object.id)).resolves.toMatchObject({ sizeBytes: 0 });
  });

  it('清理过期分片和未提交对象，不删除仍被元数据引用的对象', async () => {
    const bytes = Buffer.from('orphan cleanup');
    const { service, repository, storage } = await fixture();
    const expired = await service.createUpload(context, input(bytes));
    await service.uploadPart(context, expired.uploadId, 1, bytes);
    repository.uploads.get(expired.uploadId)!.expiresAt = '2000-01-01T00:00:00.000Z';
    await storage.write('objects/orphan', Buffer.from('unreferenced'));
    const result = await service.cleanupOrphans(0);
    expect(result).toEqual({ expiredUploads: 1, orphanedObjects: 1 });
    expect(repository.uploads.has(expired.uploadId)).toBe(false);

    const active = await service.createUpload(context, input(bytes, 'mut_019bf124-1234-7123-8123-123456789abc'));
    const part = await service.uploadPart(context, active.uploadId, 1, bytes);
    const object = await service.completeUpload(context, active.uploadId, [part]);
    await service.cleanupOrphans(0);
    await expect(storage.info(object.objectKey)).resolves.toMatchObject({ sizeBytes: bytes.length });
  });
});
