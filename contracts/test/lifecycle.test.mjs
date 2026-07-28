import assert from 'node:assert/strict';
import test from 'node:test';
import { createEntityId } from '../src/core.mjs';
import {
  assertDocumentReadable,
  evaluateSyncEvent,
  initialLifecycle,
  lifecycleRules,
  metadataCommitFailure,
  transitionLifecycle,
} from '../src/lifecycle.mjs';

const t0 = '2026-07-16T02:00:00.000Z';
const t1 = '2026-07-16T02:00:01.000Z';
const entropy = Buffer.alloc(10, 7);
const ms = Date.parse(t0);
const docId = createEntityId('document', ms, entropy);
const deviceId = createEntityId('device', ms, entropy);
const versionA = createEntityId('version', ms, entropy);
const versionB = createEntityId('version', ms + 1, entropy);
const versionC = createEntityId('version', ms + 2, entropy);

function event(overrides = {}) {
  return {
    id: 'evt_019f673f-0100-7777-8777-070707070707',
    clientMutationId: 'mut_019f673f-0100-7777-8777-070707070707',
    deviceId,
    documentId: docId,
    versionId: versionB,
    baseVersionId: versionA,
    operation: 'upsert',
    phase: 'queued',
    cursor: null,
    retryCount: 0,
    payload: { documentId: docId },
    objectStorageRef: null,
    tombstone: null,
    errorCode: null,
    createdAt: t0,
    updatedAt: t0,
    ...overrides,
  };
}

test('正常主链只能按已登记转移，非法跳转有明确错误', () => {
  const opened = initialLifecycle(t0);
  const read = transitionLifecycle(opened, 'read', { updatedAt: t1 });
  assert.equal(read.state, 'read');
  assert.throws(() => transitionLifecycle(read, 'synced', { updatedAt: t1 }), /非法生命周期转移/);
});

test('失败与取消记录原状态、错误码、用户消息和恢复动作', () => {
  const collected = transitionLifecycle(initialLifecycle(t0), 'collected', { updatedAt: t1 });
  const failed = transitionLifecycle(collected, 'failed', { errorCode: 'E_SYNC_NETWORK', updatedAt: t1 });
  assert.deepEqual(
    { state: failed.state, recoveryState: failed.recoveryState, action: failed.recoveryAction },
    { state: 'failed', recoveryState: 'collected', action: 'retry' },
  );
  assert.equal(transitionLifecycle(failed, 'collected', { updatedAt: t1 }).state, 'collected');
  assert.throws(() => transitionLifecycle(failed, 'synced', { updatedAt: t1 }), /非法生命周期转移/);
});

test('冲突同时保留本地与传入版本，解决时必须显式选版本', () => {
  const collected = transitionLifecycle(initialLifecycle(t0), 'collected', { updatedAt: t1 });
  const conflict = transitionLifecycle(collected, 'conflict', {
    baseVersionId: null,
    localVersionId: versionA,
    incomingVersionId: versionB,
    updatedAt: t1,
  });
  assert.deepEqual(conflict.conflict.preservedVersionIds, [versionA, versionB].sort());
  assert.throws(() => transitionLifecycle(conflict, 'sync_pending', { updatedAt: t1 }), /resolvedVersionId/);
  assert.equal(
    transitionLifecycle(conflict, 'sync_pending', { resolvedVersionId: versionB, updatedAt: t1 }).state,
    'sync_pending',
  );
});

test('相同 clientMutationId 的同一事件幂等重放，不同载荷被拒绝', () => {
  const original = event({ phase: 'committed', cursor: '42', retryCount: 1, updatedAt: t1 });
  const replay = event();
  assert.equal(evaluateSyncEvent({ events: [original], currentVersionId: versionA }, replay).outcome, 'replayed');
  assert.deepEqual(
    evaluateSyncEvent({ events: [original], currentVersionId: versionA }, event({ versionId: versionA })),
    { outcome: 'failed', errorCode: 'E_CLIENT_MUTATION_REUSED', retryable: false },
  );
});

test('双端基版本不一致形成冲突并保留双方版本', () => {
  const result = evaluateSyncEvent({ events: [], currentVersionId: versionB }, event({ versionId: versionC }));
  assert.equal(result.outcome, 'conflict');
  assert.deepEqual(result.preservedVersionIds, [versionB, versionC].sort());
});

test('上传内容成功但元数据失败只重试元数据', () => {
  const storageRef = { provider: 's3-compatible', bucket: 'molan', objectKey: 'objects/hash', encryption: 'provider_managed' };
  const failed = metadataCommitFailure(event({ phase: 'content_uploaded' }), storageRef, t1);
  assert.equal(failed.phase, 'failed');
  assert.equal(failed.errorCode, 'E_SYNC_METADATA_COMMIT');
  assert.equal(failed.recoveryAction, 'retry_metadata');
  assert.equal(failed.objectStorageRef.objectKey, 'objects/hash');
});

test('删除 tombstone 使正文不可读，并发编辑保留为冲突候选', () => {
  const collected = transitionLifecycle(initialLifecycle(t0), 'collected', { updatedAt: t1 });
  const tombstone = { documentId: docId, deletedAt: t1, deletedByDeviceId: deviceId, baseVersionId: versionA };
  const deleted = transitionLifecycle(collected, 'deleted', { tombstone, updatedAt: t1 });
  assert.throws(
    () => assertDocumentReadable(deleted),
    (error) => error.code === 'E_DOCUMENT_DELETED' && error.recoveryAction === 'none',
  );
  const result = evaluateSyncEvent({ events: [], currentVersionId: versionA, tombstone }, event());
  assert.equal(result.outcome, 'conflict');
  assert.equal(result.tombstone, tombstone);
  assert.deepEqual(result.preservedVersionIds, [versionA, versionB].sort());
});

test('设备撤销后事件失败且不可自动重试', () => {
  assert.deepEqual(
    evaluateSyncEvent({ events: [], currentVersionId: versionA, revokedDeviceIds: [deviceId] }, event()),
    { outcome: 'failed', errorCode: 'E_DEVICE_REVOKED', retryable: false },
  );
});

test('规则文件覆盖所有状态和错误恢复信息', () => {
  assert.equal(new Set(lifecycleRules.states).size, lifecycleRules.states.length);
  for (const state of lifecycleRules.states) assert.ok(lifecycleRules.transitions[state]);
  for (const error of Object.values(lifecycleRules.errors)) {
    assert.equal(typeof error.retryable, 'boolean');
    assert.ok(error.userMessageKey);
    assert.ok(error.recoveryAction);
  }
});
