import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_VERSION,
  assertContractSemantics,
  canonicalJson,
  createEntityId,
  decideVersionImport,
  formatTimestamp,
  sha256Bytes,
} from '../src/core.mjs';

const entropy = Buffer.from('00010203040506070809', 'hex');
const timestampMs = Date.parse('2026-07-16T01:02:03.004Z');
const timestamp = formatTimestamp(timestampMs);

function id(entity, offset) {
  const bytes = Buffer.from(entropy);
  bytes[9] = offset;
  return createEntityId(entity, timestampMs + offset, bytes);
}

function validSnapshot() {
  const deviceId = id('device', 1);
  const documentId = id('document', 2);
  const versionId = id('version', 3);
  const originalObjectId = id('fileObject', 4);
  const artifactId = id('artifact', 5);
  const artifactObjectId = id('fileObject', 6);
  const resultId = id('aiResult', 7);
  const resultObjectId = id('fileObject', 8);
  const originalHash = sha256Bytes(Buffer.from('original'));
  const artifactHash = sha256Bytes(Buffer.from('# readable'));
  const resultHash = sha256Bytes(Buffer.from('# summary'));
  const localRef = { kind: 'app_private', locator: 'objects/example' };
  const baseFile = {
    sourceDeviceId: deviceId,
    mediaType: 'text/markdown',
    localRef,
    objectStorageRef: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  return {
    schemaVersion: CONTRACT_VERSION,
    documents: [{
      id: documentId,
      sourceDeviceId: deviceId,
      title: '项目汇报',
      originalFormat: 'pdf',
      currentVersionId: versionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }],
    versions: [{
      id: versionId,
      documentId,
      sourceDeviceId: deviceId,
      originalFormat: 'pdf',
      contentHash: originalHash,
      sizeBytes: 8,
      fileObjectId: originalObjectId,
      parentVersionId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }],
    fileObjects: [
      { ...baseFile, id: originalObjectId, role: 'original', format: 'pdf', mediaType: 'application/pdf', contentHash: originalHash, sizeBytes: 8 },
      { ...baseFile, id: artifactObjectId, role: 'derived_artifact', format: 'markdown', contentHash: artifactHash, sizeBytes: 10 },
      { ...baseFile, id: resultObjectId, role: 'ai_result', format: 'markdown', contentHash: resultHash, sizeBytes: 9 },
    ],
    derivedArtifacts: [{
      id: artifactId,
      documentId,
      sourceVersionId: versionId,
      sourceDeviceId: deviceId,
      fileObjectId: artifactObjectId,
      format: 'markdown',
      generator: { name: 'pandoc', version: '3.7.0' },
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }],
    aiResults: [{
      id: resultId,
      documentId,
      sourceVersionId: versionId,
      sourceArtifactId: artifactId,
      sourceDeviceId: deviceId,
      fileObjectId: resultObjectId,
      resultType: 'summary',
      format: 'markdown',
      generator: { name: 'agent', version: '1' },
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }],
  };
}

test('UUIDv7 ID 使用唯一实体前缀、时间和固定位', () => {
  const documentId = createEntityId('document', timestampMs, entropy);
  assert.equal(documentId, createEntityId('document', timestampMs, entropy));
  assert.match(documentId, /^doc_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(createEntityId('version', timestampMs, entropy).slice(4), documentId.slice(4));
  assert.throws(() => createEntityId('unknown', timestampMs, entropy), /未知实体类型/);
});

test('哈希以原始字节计算并使用固定外部表示', () => {
  assert.equal(
    sha256Bytes(Buffer.from('abc')),
    'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('规范 JSON 序列化递归排序对象键但保留数组顺序', () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 }, list: [{ d: 4, c: 5 }] }), '{"a":{"b":3,"y":2},"list":[{"c":5,"d":4}],"z":1}');
});

test('同文档同哈希复用版本，不同内容以当前版本为父版本', () => {
  const documentId = id('document', 10);
  const currentVersionId = id('version', 11);
  const versions = [{ id: currentVersionId, documentId, contentHash: 'sha256:existing' }];
  assert.deepEqual(
    decideVersionImport({ documentId, currentVersionId, versions, contentHash: 'sha256:existing' }),
    { action: 'reuse_existing', versionId: currentVersionId },
  );
  assert.deepEqual(
    decideVersionImport({ documentId, currentVersionId, versions, contentHash: 'sha256:new' }),
    { action: 'create_version', parentVersionId: currentVersionId },
  );
});

test('完整对象关系通过语义校验', () => {
  assert.equal(assertContractSemantics(validSnapshot()), true);
});

test('父版本必须存在且属于同一文档', () => {
  const snapshot = validSnapshot();
  snapshot.versions[0].parentVersionId = id('version', 42);
  assert.throws(() => assertContractSemantics(snapshot), /父版本不存在/);
});

test('原文件、派生副本和 AI 结果不能复用 FileObject', () => {
  const snapshot = validSnapshot();
  snapshot.derivedArtifacts[0].fileObjectId = snapshot.versions[0].fileObjectId;
  snapshot.fileObjects[0].role = 'derived_artifact';
  assert.throws(() => assertContractSemantics(snapshot), /版本必须引用 original/);
});

test('同一文档不允许出现重复内容版本', () => {
  const snapshot = validSnapshot();
  const original = snapshot.versions[0];
  const duplicateObject = {
    ...snapshot.fileObjects[0],
    id: id('fileObject', 50),
    localRef: { kind: 'app_private', locator: 'objects/duplicate' },
  };
  snapshot.fileObjects.push(duplicateObject);
  snapshot.versions.push({
    ...original,
    id: id('version', 51),
    fileObjectId: duplicateObject.id,
    parentVersionId: original.id,
  });
  assert.throws(() => assertContractSemantics(snapshot), /重复内容版本/);
});

test('JSON Schema 可解析且包含五类核心定义', () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const schema = JSON.parse(readFileSync(join(root, 'v1', 'file-contract.schema.json'), 'utf8'));
  assert.equal(schema.properties.schemaVersion.const, CONTRACT_VERSION);
  assert.deepEqual(
    Object.keys(schema.$defs).filter((key) => ['document', 'documentVersion', 'fileObject', 'derivedArtifact', 'aiResult'].includes(key)).sort(),
    ['aiResult', 'derivedArtifact', 'document', 'documentVersion', 'fileObject'],
  );
});
