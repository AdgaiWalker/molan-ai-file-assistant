import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './core.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
export const lifecycleRules = Object.freeze(
  JSON.parse(readFileSync(join(root, 'v1', 'lifecycle-rules.json'), 'utf8')),
);

function nowOrThrow(updatedAt) {
  if (typeof updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(updatedAt)) {
    throw new TypeError('updatedAt 必须是 UTC RFC 3339 毫秒时间');
  }
  return updatedAt;
}

function assertKnownState(state) {
  if (!lifecycleRules.states.includes(state)) throw new TypeError(`未知生命周期状态：${state}`);
}

export function initialLifecycle(updatedAt) {
  return Object.freeze({
    state: lifecycleRules.initialState,
    errorCode: null,
    recoveryState: null,
    userMessageKey: null,
    recoveryAction: null,
    conflict: null,
    tombstone: null,
    updatedAt: nowOrThrow(updatedAt),
  });
}

export function transitionLifecycle(record, targetState, context = {}) {
  assertKnownState(record.state);
  assertKnownState(targetState);
  const updatedAt = nowOrThrow(context.updatedAt);

  let allowedTargets = lifecycleRules.transitions[record.state];
  if (record.state === 'failed' || record.state === 'cancelled') {
    allowedTargets = record.recoveryState ? [record.recoveryState] : [];
  }
  if (!allowedTargets.includes(targetState)) {
    throw new Error(`非法生命周期转移：${record.state} -> ${targetState}`);
  }

  if (targetState === 'failed') {
    const error = lifecycleRules.errors[context.errorCode];
    if (!error) throw new Error(`失败状态缺少已登记错误码：${context.errorCode ?? 'missing'}`);
    return Object.freeze({
      ...record,
      state: 'failed',
      errorCode: context.errorCode,
      recoveryState: record.state,
      userMessageKey: error.userMessageKey,
      recoveryAction: error.recoveryAction,
      conflict: null,
      updatedAt,
    });
  }

  if (targetState === 'cancelled') {
    const error = lifecycleRules.errors.E_CANCELLED;
    return Object.freeze({
      ...record,
      state: 'cancelled',
      errorCode: 'E_CANCELLED',
      recoveryState: record.state,
      userMessageKey: error.userMessageKey,
      recoveryAction: error.recoveryAction,
      conflict: null,
      updatedAt,
    });
  }

  if (targetState === 'conflict') {
    const { baseVersionId = null, localVersionId, incomingVersionId } = context;
    if (!localVersionId || !incomingVersionId || localVersionId === incomingVersionId) {
      throw new Error('冲突必须保留两个不同版本');
    }
    const error = lifecycleRules.errors.E_BASE_VERSION_CONFLICT;
    return Object.freeze({
      ...record,
      state: 'conflict',
      errorCode: 'E_BASE_VERSION_CONFLICT',
      recoveryState: record.state === 'deleted' ? 'deleted' : 'sync_pending',
      userMessageKey: error.userMessageKey,
      recoveryAction: error.recoveryAction,
      conflict: Object.freeze({
        baseVersionId,
        localVersionId,
        incomingVersionId,
        preservedVersionIds: Object.freeze([localVersionId, incomingVersionId].sort()),
        resolution: 'unresolved',
      }),
      updatedAt,
    });
  }

  if (targetState === 'deleted') {
    if (!context.tombstone) throw new Error('删除状态必须携带 tombstone');
    return Object.freeze({
      ...record,
      state: 'deleted',
      errorCode: null,
      recoveryState: null,
      userMessageKey: null,
      recoveryAction: null,
      conflict: null,
      tombstone: Object.freeze({ ...context.tombstone }),
      updatedAt,
    });
  }

  if (record.state === 'conflict' && !context.resolvedVersionId && targetState !== 'deleted') {
    throw new Error('解决冲突必须指定 resolvedVersionId');
  }

  return Object.freeze({
    ...record,
    state: targetState,
    errorCode: null,
    recoveryState: null,
    userMessageKey: null,
    recoveryAction: null,
    conflict: null,
    tombstone: targetState === 'deleted' ? record.tombstone : null,
    updatedAt,
  });
}

export function assertDocumentReadable(record) {
  if (record.state === 'deleted' || record.tombstone !== null) {
    const error = new Error('文档已删除，正文不可读取');
    error.code = 'E_DOCUMENT_DELETED';
    error.recoveryAction = lifecycleRules.errors.E_DOCUMENT_DELETED.recoveryAction;
    throw error;
  }
  return true;
}

function sameMutation(left, right) {
  const ignored = new Set(['id', 'phase', 'cursor', 'retryCount', 'errorCode', 'updatedAt']);
  const select = (event) => Object.fromEntries(Object.entries(event).filter(([key]) => !ignored.has(key)));
  return canonicalJson(select(left)) === canonicalJson(select(right));
}

export function evaluateSyncEvent({ events, currentVersionId, tombstone = null, revokedDeviceIds = [] }, event) {
  const existing = events.find((candidate) => candidate.clientMutationId === event.clientMutationId);
  if (existing) {
    if (!sameMutation(existing, event)) {
      return Object.freeze({ outcome: 'failed', errorCode: 'E_CLIENT_MUTATION_REUSED', retryable: false });
    }
    return Object.freeze({ outcome: 'replayed', event: existing });
  }
  if (revokedDeviceIds.includes(event.deviceId)) {
    return Object.freeze({ outcome: 'failed', errorCode: 'E_DEVICE_REVOKED', retryable: false });
  }
  if (event.operation === 'upsert' && tombstone !== null) {
    return Object.freeze({
      outcome: 'conflict',
      errorCode: 'E_BASE_VERSION_CONFLICT',
      tombstone,
      preservedVersionIds: Object.freeze([currentVersionId, event.versionId].filter(Boolean).sort()),
    });
  }
  if (event.operation === 'upsert' && event.baseVersionId !== currentVersionId) {
    return Object.freeze({
      outcome: 'conflict',
      errorCode: 'E_BASE_VERSION_CONFLICT',
      tombstone: null,
      preservedVersionIds: Object.freeze([currentVersionId, event.versionId].filter(Boolean).sort()),
    });
  }
  return Object.freeze({ outcome: 'accepted', event });
}

export function metadataCommitFailure(event, objectStorageRef, updatedAt) {
  if (!objectStorageRef) throw new Error('元数据提交失败前必须已有上传对象引用');
  return Object.freeze({
    ...event,
    phase: 'failed',
    objectStorageRef: Object.freeze({ ...objectStorageRef }),
    retryCount: event.retryCount + 1,
    errorCode: 'E_SYNC_METADATA_COMMIT',
    recoveryAction: lifecycleRules.errors.E_SYNC_METADATA_COMMIT.recoveryAction,
    updatedAt: nowOrThrow(updatedAt),
  });
}
