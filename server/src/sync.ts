import { createHash } from 'node:crypto';
import type { AuthContext } from './auth.js';
import { ApiError, errorBody } from './errors.js';
import { newEntityId } from './ids.js';

export type SyncOperation = 'upsert' | 'delete' | 'archive' | 'restore';

export interface SyncMutation {
  clientMutationId: string;
  deviceId: string;
  documentId: string;
  versionId: string | null;
  baseVersionId: string | null;
  operation: SyncOperation;
  retryCount: number;
  payload: Record<string, unknown>;
}

export interface SyncEvent {
  id: string;
  clientMutationId: string;
  deviceId: string;
  documentId: string;
  versionId: string | null;
  baseVersionId: string | null;
  operation: SyncOperation;
  phase: 'committed' | 'conflict';
  cursor: string;
  retryCount: number;
  payload: Record<string, unknown>;
  objectStorageRef: Record<string, unknown> | null;
  tombstone: Record<string, unknown> | null;
  errorCode: 'E_BASE_VERSION_CONFLICT' | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentHead {
  currentVersionId: string | null;
  deletedAt: string | null;
}

export interface ConflictRecord {
  id: string;
  documentId: string;
  localVersionId: string;
  remoteVersionId: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: 'keep_local' | 'keep_remote' | 'save_copy' | 'manual_merge' | null;
}

export interface SyncRepository {
  eventByMutation(userId: string, mutationId: string): Promise<{ payloadHash: string; event: SyncEvent } | null>;
  documentHead(userId: string, documentId: string): Promise<DocumentHead | null>;
  commit(
    userId: string,
    mutation: SyncMutation,
    payloadHash: string,
    event: Omit<SyncEvent, 'cursor'>,
    conflict: ConflictRecord | null,
  ): Promise<SyncEvent>;
  pull(userId: string, afterSequence: number, limit: number): Promise<{ events: SyncEvent[]; lastSequence: number; hasMore: boolean }>;
  conflicts(userId: string): Promise<ConflictRecord[]>;
  resolveConflict(userId: string, conflictId: string, resolution: NonNullable<ConflictRecord['resolution']>, now: string): Promise<ConflictRecord | null>;
}

export class SyncService {
  constructor(
    private readonly repository: SyncRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async push(context: AuthContext, deviceId: string, mutations: SyncMutation[], requestId: string) {
    if (deviceId !== context.deviceId || mutations.length < 1 || mutations.length > 100) {
      throw new ApiError(400, 'E_PERMISSION_DENIED', '同步设备或批次无效', false);
    }
    const results = [];
    for (const mutation of mutations) {
      try {
        results.push({ clientMutationId: mutation.clientMutationId, ok: true, event: await this.apply(context, mutation), error: null });
      } catch (error) {
        const failure = error instanceof ApiError ? error : new ApiError(500, 'E_INTERNAL', '同步提交失败', true);
        results.push({ clientMutationId: mutation.clientMutationId, ok: false, event: null, error: errorBody(failure, requestId) });
      }
    }
    return { ok: results.every((item) => item.ok), results };
  }

  async pull(context: AuthContext, deviceId: string, cursor: string | null, limit: number) {
    if (deviceId !== context.deviceId || !Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ApiError(400, 'E_PERMISSION_DENIED', '拉取参数无效', false);
    }
    const sequence = parseCursor(cursor);
    const result = await this.repository.pull(context.userId, sequence, limit);
    return { ok: true as const, cursor: `cur_${result.lastSequence}`, events: result.events, hasMore: result.hasMore };
  }

  async listConflicts(context: AuthContext) {
    return this.repository.conflicts(context.userId);
  }

  async resolveConflict(
    context: AuthContext,
    conflictId: string,
    resolution: NonNullable<ConflictRecord['resolution']>,
  ) {
    if (!['keep_local', 'keep_remote', 'save_copy', 'manual_merge'].includes(resolution)) {
      throw new ApiError(400, 'E_BASE_VERSION_CONFLICT', '冲突解决方式无效', false);
    }
    const result = await this.repository.resolveConflict(context.userId, conflictId, resolution, this.now().toISOString());
    if (!result) throw new ApiError(404, 'E_DOCUMENT_NOT_FOUND', '冲突不存在', false);
    return result;
  }

  private async apply(context: AuthContext, mutation: SyncMutation): Promise<SyncEvent> {
    validateMutation(mutation);
    if (mutation.deviceId !== context.deviceId) throw new ApiError(403, 'E_PERMISSION_DENIED', '不能代替其他设备提交事件', false);
    const payloadHash = stableHash(mutation);
    const previous = await this.repository.eventByMutation(context.userId, mutation.clientMutationId);
    if (previous) {
      if (previous.payloadHash !== payloadHash) {
        throw new ApiError(409, 'E_CLIENT_MUTATION_REUSED', '同一幂等键对应不同同步载荷', false);
      }
      return previous.event;
    }
    const head = await this.repository.documentHead(context.userId, mutation.documentId);
    const contentMutation = mutation.operation === 'upsert' && mutation.versionId !== null;
    const conflictDetected = contentMutation && head !== null &&
      (head.deletedAt !== null || head.currentVersionId !== mutation.baseVersionId);
    const now = this.now().toISOString();
    const conflict = conflictDetected ? {
      id: newEntityId('con_', Date.parse(now)),
      documentId: mutation.documentId,
      localVersionId: head!.currentVersionId ?? mutation.baseVersionId ?? mutation.versionId!,
      remoteVersionId: mutation.versionId!,
      detectedAt: now,
      resolvedAt: null,
      resolution: null,
    } satisfies ConflictRecord : null;
    const tombstone = mutation.operation === 'delete' ? {
      documentId: mutation.documentId,
      deletedAt: now,
      deletedByDeviceId: mutation.deviceId,
      baseVersionId: mutation.baseVersionId,
    } : null;
    const event = {
      id: newEntityId('evt_', Date.parse(now)),
      clientMutationId: mutation.clientMutationId,
      deviceId: mutation.deviceId,
      documentId: mutation.documentId,
      versionId: mutation.versionId,
      baseVersionId: mutation.baseVersionId,
      operation: mutation.operation,
      phase: conflict ? 'conflict' as const : 'committed' as const,
      retryCount: mutation.retryCount,
      payload: mutation.payload,
      objectStorageRef: objectStorageRef(mutation.payload),
      tombstone,
      errorCode: conflict ? 'E_BASE_VERSION_CONFLICT' as const : null,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.commit(context.userId, mutation, payloadHash, event, conflict);
  }
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}

function validateMutation(mutation: SyncMutation): void {
  if (!/^mut_[0-9a-f-]{36}$/.test(mutation.clientMutationId) ||
      !/^dev_[0-9a-f-]{36}$/.test(mutation.deviceId) ||
      !/^doc_[0-9a-f-]{36}$/.test(mutation.documentId) ||
      (mutation.versionId !== null && !/^ver_[0-9a-f-]{36}$/.test(mutation.versionId)) ||
      (mutation.baseVersionId !== null && !/^ver_[0-9a-f-]{36}$/.test(mutation.baseVersionId)) ||
      !['upsert', 'delete', 'archive', 'restore'].includes(mutation.operation) ||
      !Number.isInteger(mutation.retryCount) || mutation.retryCount < 0 || mutation.retryCount > 1_000) {
    throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步事件字段无效', false);
  }
}

function objectStorageRef(payload: Record<string, unknown>): Record<string, unknown> | null {
  const value = payload['objectStorageRef'];
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseCursor(cursor: string | null): number {
  if (cursor === null) return 0;
  const match = cursor.match(/^cur_([0-9]+)$/);
  if (!match) throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步游标无效', false);
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value)) throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步游标无效', false);
  return value;
}
