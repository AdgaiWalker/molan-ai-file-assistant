import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const api = JSON.parse(readFileSync(join(root, 'v1', 'sync-api.openapi.json'), 'utf8'));

test('同步 OpenAPI 覆盖账号、设备、文件、同步、删除恢复与冲突', () => {
  const operations = Object.values(api.paths).flatMap((path) =>
    Object.values(path).map((operation) => operation.operationId).filter(Boolean));
  assert.deepEqual(new Set(operations), new Set([
    'getHealth', 'requestLoginCode', 'verifyLoginCode', 'refreshSession', 'logout',
    'listDevices', 'revokeDevice', 'createFileUpload', 'uploadFilePart',
    'completeFileUpload', 'downloadFileObject', 'pushMutations', 'pullEvents',
    'deleteDocument', 'restoreDocument', 'listConflicts', 'resolveConflict',
  ]));
});

test('所有失败响应复用稳定错误结构', () => {
  const error = api.$defs.errorResponse;
  assert.deepEqual(error.required, ['ok', 'errorCode', 'error', 'requestId', 'retryable']);
  assert.equal(error.properties.ok.const, false);
  for (const code of [
    'E_AUTH_REQUIRED', 'E_ACCOUNT_DELETING', 'E_DEVICE_REVOKED', 'E_PERMISSION_DENIED', 'E_FILE_NOT_FOUND',
    'E_BASE_VERSION_CONFLICT', 'E_CLIENT_MUTATION_REUSED', 'E_FILE_TOO_LARGE',
    'E_RATE_LIMITED', 'E_INTERNAL',
  ]) assert.ok(api.$defs.errorCode.enum.includes(code), `缺少错误码 ${code}`);
});

test('传输对象显式允许忽略未知字段', () => {
  for (const name of [
    'deviceRegistration', 'device', 'requestLoginCodeRequest', 'verifyLoginCodeRequest',
    'authSessionResponse', 'createUploadRequest', 'syncMutation', 'syncPushRequest',
    'syncPullRequest', 'syncPullResponse', 'deleteDocumentRequest', 'conflict',
  ]) assert.equal(api.$defs[name].additionalProperties, true, `${name} 必须允许向前扩展字段`);
});

test('mutation 固定幂等键、基版本、重试次数和核心对象载荷', () => {
  const mutation = api.$defs.syncMutation;
  assert.deepEqual(mutation.required, [
    'clientMutationId', 'deviceId', 'documentId', 'versionId', 'baseVersionId',
    'operation', 'retryCount', 'payload',
  ]);
  assert.equal(mutation.properties.clientMutationId.$ref, '#/$defs/mutationId');
  assert.equal(mutation.properties.payload.$ref, 'lifecycle.schema.json#/$defs/syncPayload');
  assert.ok(api.$defs.syncPullResponse.properties.events.items.$ref.endsWith('#/$defs/syncEvent'));
});

test('文件上传支持分片恢复、哈希校验和内容元数据分离', () => {
  assert.ok(api.$defs.createUploadRequest.required.includes('contentHash'));
  assert.ok(api.$defs.createUploadRequest.required.includes('fileObjectId'));
  assert.ok(api.$defs.createUploadRequest.required.includes('role'));
  assert.ok(api.$defs.createUploadRequest.required.includes('format'));
  assert.ok(api.paths['/v1/files/uploads/{uploadId}/parts/{partNumber}'].put);
  assert.ok(api.paths['/v1/files/uploads/{uploadId}/complete'].post);
  assert.equal(
    api.$defs.fileObjectResponse.content['application/json'].schema.properties.fileObject.$ref,
    'file-contract.schema.json#/$defs/fileObject',
  );
});

test('同步 API 不重定义 CLI 结构化输出契约', () => {
  assert.equal(api.$defs.errorResponse.properties.outputPath, undefined);
  assert.equal(api.$defs.syncPullResponse.properties.outputPath, undefined);
  assert.equal(api.$defs.syncPullResponse.properties.errorCode, undefined);
});
