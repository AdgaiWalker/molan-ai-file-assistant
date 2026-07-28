import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateAiResultEnvelope } from '../src/ai-result.mjs';
import { CONTRACT_VERSION, sha256Bytes } from '../src/core.mjs';

function envelope(overrides = {}) {
  return {
    schemaVersion: CONTRACT_VERSION,
    sourceDocumentId: 'doc_019c0f90-1234-7123-8123-123456789abc',
    sourceVersionId: 'ver_019c0f90-1234-7123-8123-123456789abc',
    sourceArtifactId: null,
    title: '需求摘要',
    resultType: 'summary',
    format: 'markdown',
    content: '# 摘要\n\n这里是结果。',
    saveMode: 'draft',
    createdBy: 'cli',
    modelName: 'gpt-5.6',
    promptTextHash: sha256Bytes(Buffer.from('summarize')),
    createdAt: '2026-07-21T10:00:00.000Z',
    ...overrides,
  };
}

test('Markdown 摘要草稿通过契约校验', () => {
  assert.equal(validateAiResultEnvelope(envelope()), true);
});

test('结构化 JSON 结果要求正文可被 JSON.parse', () => {
  assert.equal(
    validateAiResultEnvelope(envelope({
      resultType: 'structured_json',
      format: 'json',
      content: '{"summary":"ok","items":[1,2,3]}',
    })),
    true,
  );
  assert.throws(
    () => validateAiResultEnvelope(envelope({
      resultType: 'structured_json',
      format: 'json',
      content: '{broken json}',
    })),
    /JSON 结果正文必须可被 JSON\.parse/,
  );
});

test('revision 结果必须绑定来源并保存为新版本', () => {
  assert.equal(
    validateAiResultEnvelope(envelope({
      resultType: 'revision',
      saveMode: 'new_version',
    })),
    true,
  );
  assert.throws(
    () => validateAiResultEnvelope(envelope({
      resultType: 'revision',
      saveMode: 'draft',
    })),
    /revision 结果只能保存为 new_version/,
  );
  assert.throws(
    () => validateAiResultEnvelope(envelope({
      resultType: 'revision',
      saveMode: 'new_version',
      sourceDocumentId: null,
      sourceVersionId: null,
    })),
    /保存为新版本时必须提供来源文档和来源版本/,
  );
});

test('new_document 结果不能伪装成 new_version', () => {
  assert.throws(
    () => validateAiResultEnvelope(envelope({
      resultType: 'new_document',
      saveMode: 'new_version',
    })),
    /new_document 结果不能保存为 new_version/,
  );
});

test('AI 结果 Schema 固定版本并引用核心 ID 定义', () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const schema = JSON.parse(readFileSync(join(root, 'v1', 'ai-result-envelope.schema.json'), 'utf8'));
  assert.equal(schema.properties.schemaVersion.const, CONTRACT_VERSION);
  assert.equal(schema.properties.sourceDocumentId.oneOf[0].$ref, 'file-contract.schema.json#/$defs/documentId');
  assert.equal(schema.properties.sourceVersionId.oneOf[0].$ref, 'file-contract.schema.json#/$defs/versionId');
});
