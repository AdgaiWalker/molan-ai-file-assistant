import { createHash, randomBytes as systemRandomBytes } from 'node:crypto';

export const CONTRACT_VERSION = '1.0.0';

export const ENTITY_PREFIXES = Object.freeze({
  document: 'doc',
  version: 'ver',
  fileObject: 'obj',
  artifact: 'art',
  aiResult: 'air',
  device: 'dev',
});

export function formatTimestamp(timestampMs) {
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0) {
    throw new TypeError('timestampMs 必须是非负安全整数');
  }
  return new Date(timestampMs).toISOString();
}

export function createEntityId(entity, timestampMs = Date.now(), entropy = systemRandomBytes(10)) {
  const prefix = ENTITY_PREFIXES[entity];
  if (!prefix) throw new TypeError(`未知实体类型：${entity}`);
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0 || timestampMs > 0xffffffffffff) {
    throw new TypeError('UUIDv7 时间必须是 48 位非负 Unix 毫秒');
  }
  const random = Buffer.from(entropy);
  if (random.byteLength !== 10) throw new TypeError('UUIDv7 entropy 必须是 10 字节');

  const bytes = Buffer.alloc(16);
  let time = BigInt(timestampMs);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(time & 0xffn);
    time >>= 8n;
  }
  bytes[6] = 0x70 | (random[0] & 0x0f);
  bytes[7] = random[1];
  bytes[8] = 0x80 | (random[2] & 0x3f);
  random.copy(bytes, 9, 3, 10);

  const hex = bytes.toString('hex');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return `${prefix}_${uuid}`;
}

export function sha256Bytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function sortForCanonicalJson(value, seen) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new TypeError('不能序列化循环引用');
  seen.add(value);
  const sorted = Array.isArray(value)
    ? value.map((item) => sortForCanonicalJson(item, seen))
    : Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, sortForCanonicalJson(value[key], seen)]),
      );
  seen.delete(value);
  return sorted;
}

export function canonicalJson(value) {
  return JSON.stringify(sortForCanonicalJson(value, new Set()));
}

export function decideVersionImport({ documentId, currentVersionId, versions, contentHash }) {
  const duplicate = versions.find(
    (version) => version.documentId === documentId && version.contentHash === contentHash,
  );
  if (duplicate) {
    return Object.freeze({ action: 'reuse_existing', versionId: duplicate.id });
  }
  return Object.freeze({ action: 'create_version', parentVersionId: currentVersionId ?? null });
}

function indexUnique(items, label, globalIds) {
  const index = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== 'string') throw new Error(`${label} 存在无效实体`);
    if (index.has(item.id) || globalIds.has(item.id)) throw new Error(`重复实体 ID：${item.id}`);
    index.set(item.id, item);
    globalIds.add(item.id);
  }
  return index;
}

function requireReference(index, id, message) {
  const value = index.get(id);
  if (!value) throw new Error(`${message}：${id}`);
  return value;
}

function claimFileObject(claims, fileObjectId, ownerId) {
  const existing = claims.get(fileObjectId);
  if (existing) throw new Error(`FileObject ${fileObjectId} 被 ${existing} 与 ${ownerId} 共同占用`);
  claims.set(fileObjectId, ownerId);
}

export function assertContractSemantics(snapshot) {
  if (snapshot?.schemaVersion !== CONTRACT_VERSION) {
    throw new Error(`不支持的契约版本：${snapshot?.schemaVersion ?? 'missing'}`);
  }
  const globalIds = new Set();
  const documents = indexUnique(snapshot.documents ?? [], 'documents', globalIds);
  const versions = indexUnique(snapshot.versions ?? [], 'versions', globalIds);
  const fileObjects = indexUnique(snapshot.fileObjects ?? [], 'fileObjects', globalIds);
  const artifacts = indexUnique(snapshot.derivedArtifacts ?? [], 'derivedArtifacts', globalIds);
  const aiResults = indexUnique(snapshot.aiResults ?? [], 'aiResults', globalIds);
  const fileClaims = new Map();
  const documentHashes = new Set();

  for (const document of documents.values()) {
    if (document.currentVersionId !== null) {
      const current = requireReference(versions, document.currentVersionId, 'Document.currentVersionId 不存在');
      if (current.documentId !== document.id) throw new Error(`当前版本不属于文档：${document.id}`);
    }
  }

  for (const version of versions.values()) {
    requireReference(documents, version.documentId, 'DocumentVersion.documentId 不存在');
    const fileObject = requireReference(fileObjects, version.fileObjectId, '原文件对象不存在');
    if (fileObject.role !== 'original') throw new Error(`版本必须引用 original FileObject：${version.id}`);
    if (fileObject.contentHash !== version.contentHash || fileObject.sizeBytes !== version.sizeBytes) {
      throw new Error(`版本与 FileObject 的哈希或大小不一致：${version.id}`);
    }
    if (version.parentVersionId !== null) {
      if (version.parentVersionId === version.id) throw new Error(`版本不能以自身为父版本：${version.id}`);
      const parent = requireReference(versions, version.parentVersionId, '父版本不存在');
      if (parent.documentId !== version.documentId) throw new Error(`父版本属于其他文档：${version.id}`);
      if (Date.parse(parent.createdAt) > Date.parse(version.createdAt)) {
        throw new Error(`父版本创建时间晚于子版本：${version.id}`);
      }
    }
    const hashKey = `${version.documentId}:${version.contentHash}`;
    if (documentHashes.has(hashKey)) throw new Error(`同一文档存在重复内容版本：${version.documentId}`);
    documentHashes.add(hashKey);
    claimFileObject(fileClaims, version.fileObjectId, version.id);
  }

  for (const fileObject of fileObjects.values()) {
    if (fileObject.localRef === null && fileObject.objectStorageRef === null) {
      throw new Error(`FileObject 至少需要一个本地或对象存储引用：${fileObject.id}`);
    }
  }

  for (const artifact of artifacts.values()) {
    requireReference(documents, artifact.documentId, 'DerivedArtifact.documentId 不存在');
    const sourceVersion = requireReference(versions, artifact.sourceVersionId, '派生物来源版本不存在');
    if (sourceVersion.documentId !== artifact.documentId) throw new Error(`派生物来源版本属于其他文档：${artifact.id}`);
    const fileObject = requireReference(fileObjects, artifact.fileObjectId, '派生文件对象不存在');
    if (fileObject.role !== 'derived_artifact') throw new Error(`派生物必须引用 derived_artifact FileObject：${artifact.id}`);
    if (fileObject.format !== artifact.format) throw new Error(`派生物与 FileObject 格式不一致：${artifact.id}`);
    claimFileObject(fileClaims, artifact.fileObjectId, artifact.id);
  }

  for (const result of aiResults.values()) {
    requireReference(documents, result.documentId, 'AiResult.documentId 不存在');
    const sourceVersion = requireReference(versions, result.sourceVersionId, 'AI 结果来源版本不存在');
    if (sourceVersion.documentId !== result.documentId) throw new Error(`AI 结果来源版本属于其他文档：${result.id}`);
    if (result.sourceArtifactId !== null) {
      const sourceArtifact = requireReference(artifacts, result.sourceArtifactId, 'AI 结果来源派生物不存在');
      if (sourceArtifact.documentId !== result.documentId || sourceArtifact.sourceVersionId !== result.sourceVersionId) {
        throw new Error(`AI 结果来源派生物关系不一致：${result.id}`);
      }
    }
    const fileObject = requireReference(fileObjects, result.fileObjectId, 'AI 结果文件对象不存在');
    if (fileObject.role !== 'ai_result') throw new Error(`AI 结果必须引用 ai_result FileObject：${result.id}`);
    if (fileObject.format !== result.format) throw new Error(`AI 结果与 FileObject 格式不一致：${result.id}`);
    claimFileObject(fileClaims, result.fileObjectId, result.id);
  }

  return true;
}
