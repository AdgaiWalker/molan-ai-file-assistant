import { CONTRACT_VERSION } from './core.mjs';

const RESULT_TYPES = new Set(['summary', 'report', 'structured_json', 'new_document', 'revision']);
const FORMATS = new Set(['markdown', 'json']);
const SAVE_MODES = new Set(['draft', 'new_document', 'new_version']);
const CREATED_BY = new Set(['cli', 'mcp', 'cloud_api']);

export function validateAiResultEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI 结果必须是对象');
  }
  if (value.schemaVersion !== CONTRACT_VERSION) {
    throw new Error(`AI 结果契约版本不支持：${value.schemaVersion ?? 'missing'}`);
  }
  requireString(value, 'title');
  requireString(value, 'content');
  requireTimestamp(value, 'createdAt');
  requireEnum(value, 'resultType', RESULT_TYPES);
  requireEnum(value, 'format', FORMATS);
  requireEnum(value, 'saveMode', SAVE_MODES);
  requireEnum(value, 'createdBy', CREATED_BY);
  optionalString(value, 'modelName');
  optionalString(value, 'promptTextHash');
  optionalString(value, 'sourceDocumentId');
  optionalString(value, 'sourceVersionId');
  optionalString(value, 'sourceArtifactId');

  if (value.format === 'json') {
    try {
      JSON.parse(value.content);
    } catch {
      throw new Error('JSON 结果正文必须可被 JSON.parse');
    }
  }

  if (value.sourceVersionId && !value.sourceDocumentId) {
    throw new Error('存在 sourceVersionId 时必须同时提供 sourceDocumentId');
  }
  if (value.sourceArtifactId && !value.sourceVersionId) {
    throw new Error('存在 sourceArtifactId 时必须同时提供 sourceVersionId');
  }
  if (value.saveMode === 'new_version' && (!value.sourceDocumentId || !value.sourceVersionId)) {
    throw new Error('保存为新版本时必须提供来源文档和来源版本');
  }
  if (value.resultType === 'revision' && value.saveMode !== 'new_version') {
    throw new Error('revision 结果只能保存为 new_version');
  }
  if (value.resultType === 'new_document' && value.saveMode === 'new_version') {
    throw new Error('new_document 结果不能保存为 new_version');
  }

  return true;
}

function requireString(value, key) {
  if (typeof value[key] !== 'string' || value[key].trim() === '') {
    throw new Error(`AI 结果字段缺失：${key}`);
  }
}

function optionalString(value, key) {
  if (value[key] === undefined || value[key] === null) return;
  if (typeof value[key] !== 'string' || value[key].trim() === '') {
    throw new Error(`AI 结果字段无效：${key}`);
  }
}

function requireEnum(value, key, allowed) {
  if (!allowed.has(value[key])) {
    throw new Error(`AI 结果字段无效：${key}`);
  }
}

function requireTimestamp(value, key) {
  requireString(value, key);
  const time = Date.parse(value[key]);
  if (!Number.isFinite(time)) throw new Error(`AI 结果时间字段无效：${key}`);
}
