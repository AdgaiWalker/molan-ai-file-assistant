import { createHash } from 'node:crypto';
import type { AuthContext } from './auth.js';
import { ApiError } from './errors.js';
import { newEntityId } from './ids.js';
import type { LocalObjectStorage } from './storage.js';

export type FileRole = 'original' | 'derived_artifact' | 'ai_result';

export interface CreateUploadInput {
  clientMutationId: string;
  fileObjectId: string;
  role: FileRole;
  format: string;
  contentHash: string;
  sizeBytes: number;
  mediaType: string;
}

export interface UploadRecord extends CreateUploadInput {
  id: string;
  userId: string;
  deviceId: string;
  requestHash: string;
  status: 'uploading' | 'complete' | 'failed';
  expiresAt: string;
  createdAt: string;
}

export interface UploadPart {
  uploadId: string;
  partNumber: number;
  etag: string;
  sizeBytes: number;
  objectKey: string;
}

export interface StoredFileObject {
  id: string;
  userId: string;
  sourceDeviceId: string;
  role: FileRole;
  format: string;
  mediaType: string;
  contentHash: string;
  sizeBytes: number;
  objectKey: string;
  etag: string;
  aiReadAllowed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface FileRepository {
  uploadByMutation(userId: string, mutationId: string): Promise<UploadRecord | null>;
  objectByHash(userId: string, contentHash: string, role: FileRole): Promise<StoredFileObject | null>;
  createUpload(record: UploadRecord): Promise<UploadRecord>;
  upload(userId: string, uploadId: string): Promise<UploadRecord | null>;
  savePart(part: UploadPart): Promise<void>;
  parts(uploadId: string): Promise<UploadPart[]>;
  completeUpload(uploadId: string, object: StoredFileObject): Promise<StoredFileObject>;
  fileObject(userId: string, fileObjectId: string): Promise<StoredFileObject | null>;
  expiredUploads(before: string): Promise<UploadRecord[]>;
  deleteUpload(uploadId: string): Promise<void>;
  activeObjectKeys(): Promise<string[]>;
}

export class FileService {
  constructor(
    private readonly repository: FileRepository,
    private readonly storage: LocalObjectStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createUpload(context: AuthContext, input: CreateUploadInput) {
    validateCreateUpload(input);
    const requestHash = hashJson(input);
    const existing = await this.repository.uploadByMutation(context.userId, input.clientMutationId);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ApiError(409, 'E_CLIENT_MUTATION_REUSED', '同一幂等键对应了不同上传载荷', false);
      }
      return this.uploadResponse(existing, await this.repository.parts(existing.id));
    }
    const object = await this.repository.objectByHash(context.userId, input.contentHash, input.role);
    if (object) {
      return {
        ok: true as const,
        uploadId: `complete-${object.id}`,
        partSize: UploadPartBytes,
        uploadedParts: [],
        expiresAt: object.updatedAt,
        alreadyComplete: true,
        fileObjectId: object.id,
      };
    }
    const now = this.now();
    const record: UploadRecord = {
      ...input,
      id: newEntityId('upl_', now.getTime()),
      userId: context.userId,
      deviceId: context.deviceId,
      requestHash,
      status: 'uploading',
      expiresAt: new Date(now.getTime() + UploadLifetimeMillis).toISOString(),
      createdAt: now.toISOString(),
    };
    const stored = await this.repository.createUpload(record);
    if (stored.requestHash !== requestHash) {
      throw new ApiError(409, 'E_CLIENT_MUTATION_REUSED', '同一幂等键对应了不同上传载荷', false);
    }
    return this.uploadResponse(stored, await this.repository.parts(stored.id));
  }

  async uploadPart(context: AuthContext, uploadId: string, partNumber: number, bytes: Buffer) {
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > MaximumParts) {
      throw new ApiError(400, 'E_FILE_NOT_FOUND', '分片编号无效', false);
    }
    if (bytes.length === 0 || bytes.length > UploadPartBytes) {
      throw new ApiError(413, 'E_FILE_TOO_LARGE', '分片大小无效', false);
    }
    const upload = await this.requiredUpload(context.userId, uploadId);
    if (upload.status !== 'uploading' || Date.parse(upload.expiresAt) <= this.now().getTime()) {
      throw new ApiError(409, 'E_FILE_NOT_FOUND', '上传会话已结束或过期', false);
    }
    const objectKey = `uploads/${context.userId}/${uploadId}/${partNumber}.part`;
    const stored = await this.storage.write(objectKey, bytes);
    const part = { uploadId, partNumber, objectKey, ...stored };
    await this.repository.savePart(part);
    return { ok: true as const, partNumber, etag: stored.etag, sizeBytes: stored.sizeBytes };
  }

  async completeUpload(
    context: AuthContext,
    uploadId: string,
    submitted: Array<{ partNumber: number; etag: string }>,
  ): Promise<StoredFileObject> {
    const upload = await this.requiredUpload(context.userId, uploadId);
    if (upload.status === 'complete') {
      const existing = await this.repository.fileObject(context.userId, upload.fileObjectId);
      if (existing) return existing;
    }
    const parts = await this.repository.parts(uploadId);
    validateCompletion(parts, submitted, upload.sizeBytes);
    const stageKey = `staging/${context.userId}/${uploadId}`;
    const completed = await this.storage.compose(parts.map((part) => part.objectKey), stageKey);
    const expectedHash = upload.contentHash.slice('sha256:'.length);
    if (completed.sizeBytes !== upload.sizeBytes || completed.etag !== expectedHash) {
      await this.storage.remove(stageKey);
      throw new ApiError(422, 'E_HASH_MISMATCH', '上传内容的大小或 SHA-256 与声明不一致', false);
    }
    const objectKey = `objects/${expectedHash}`;
    await this.storage.move(stageKey, objectKey);
    const now = this.now().toISOString();
    const object: StoredFileObject = {
      id: upload.fileObjectId,
      userId: context.userId,
      sourceDeviceId: upload.deviceId,
      role: upload.role,
      format: upload.format,
      mediaType: upload.mediaType,
      contentHash: upload.contentHash,
      sizeBytes: upload.sizeBytes,
      objectKey,
      etag: completed.etag,
      aiReadAllowed: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    try {
      return await this.repository.completeUpload(uploadId, object);
    } finally {
      await Promise.all(parts.map((part) => this.storage.remove(part.objectKey).catch(() => undefined)));
    }
  }

  async download(context: AuthContext, fileObjectId: string) {
    const object = await this.repository.fileObject(context.userId, fileObjectId);
    if (!object || object.deletedAt) throw new ApiError(404, 'E_OBJECT_MISSING', '文件对象不存在', false);
    try {
      const info = await this.storage.info(object.objectKey);
      return { ...object, path: info.path };
    } catch {
      throw new ApiError(404, 'E_OBJECT_MISSING', '文件对象内容缺失', false);
    }
  }

  async cleanupOrphans(graceMillis = OrphanGraceMillis) {
    const now = this.now();
    const expired = await this.repository.expiredUploads(now.toISOString());
    for (const upload of expired) {
      const parts = await this.repository.parts(upload.id);
      await Promise.all(parts.map((part) => this.storage.remove(part.objectKey).catch(() => undefined)));
      await this.storage.remove(`staging/${upload.userId}/${upload.id}`).catch(() => undefined);
      await this.repository.deleteUpload(upload.id);
    }
    const active = new Set(await this.repository.activeObjectKeys());
    const objects = await this.storage.entries('objects');
    const orphaned = objects.filter((object) => !active.has(object.key) && now.getTime() - object.modifiedAt >= graceMillis);
    await Promise.all(orphaned.map((object) => this.storage.remove(object.key)));
    return { expiredUploads: expired.length, orphanedObjects: orphaned.length };
  }

  private async requiredUpload(userId: string, uploadId: string): Promise<UploadRecord> {
    const upload = await this.repository.upload(userId, uploadId);
    if (!upload) throw new ApiError(404, 'E_FILE_NOT_FOUND', '上传会话不存在', false);
    return upload;
  }

  private uploadResponse(upload: UploadRecord, parts: UploadPart[]) {
    return {
      ok: true as const,
      uploadId: upload.id,
      partSize: UploadPartBytes,
      uploadedParts: parts.map((part) => part.partNumber),
      expiresAt: upload.expiresAt,
      alreadyComplete: upload.status === 'complete',
    };
  }
}

export function publicFileObject(object: StoredFileObject) {
  return {
    id: object.id,
    sourceDeviceId: object.sourceDeviceId,
    role: object.role,
    format: object.format,
    mediaType: object.mediaType,
    contentHash: object.contentHash,
    sizeBytes: object.sizeBytes,
    localRef: null,
    objectStorageRef: {
      provider: 'molan-local',
      bucket: 'objects',
      objectKey: object.objectKey,
      etag: object.etag,
      encryption: 'provider_managed',
    },
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
    deletedAt: object.deletedAt,
  };
}

function validateCreateUpload(input: CreateUploadInput): void {
  if (!/^mut_[0-9a-f-]{36}$/.test(input.clientMutationId) || !/^obj_[0-9a-f-]{36}$/.test(input.fileObjectId) ||
      !/^sha256:[0-9a-f]{64}$/.test(input.contentHash) || !Number.isSafeInteger(input.sizeBytes) ||
      input.sizeBytes < 0 || input.sizeBytes > MaximumFileBytes ||
      !['original', 'derived_artifact', 'ai_result'].includes(input.role) ||
      !/^[a-z0-9][a-z0-9._+-]{0,63}$/.test(input.format) || !input.mediaType) {
    throw new ApiError(400, 'E_FILE_NOT_FOUND', '上传参数无效', false);
  }
}

function validateCompletion(
  parts: UploadPart[],
  submitted: Array<{ partNumber: number; etag: string }>,
  expectedSize: number,
): void {
  const ordered = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const requested = [...submitted].sort((a, b) => a.partNumber - b.partNumber);
  if ((expectedSize > 0 && ordered.length === 0) || ordered.length !== requested.length || ordered.some((part, index) =>
    part.partNumber !== requested[index]?.partNumber || part.etag !== requested[index]?.etag)) {
    throw new ApiError(409, 'E_HASH_MISMATCH', '分片清单与已上传内容不一致', false);
  }
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value, Object.keys(value as object).sort())).digest('hex');
}

const UploadPartBytes = 4 * 1024 * 1024;
const MaximumParts = 256;
const MaximumFileBytes = 1024 * 1024 * 1024;
const UploadLifetimeMillis = 24 * 60 * 60 * 1_000;
const OrphanGraceMillis = 60 * 60 * 1_000;
