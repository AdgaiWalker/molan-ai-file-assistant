import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nativeContractOutputPath, renderNativeContracts } from './generate-native-contracts.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const schemaPath = join(root, 'v1', 'file-contract.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
const lifecycleSchema = JSON.parse(readFileSync(join(root, 'v1', 'lifecycle.schema.json'), 'utf8'));
const lifecycleRules = JSON.parse(readFileSync(join(root, 'v1', 'lifecycle-rules.json'), 'utf8'));
const formatSchema = JSON.parse(readFileSync(join(root, 'v1', 'format-handlers.schema.json'), 'utf8'));
const formatRegistry = JSON.parse(readFileSync(join(root, 'v1', 'format-handlers.json'), 'utf8'));
const syncApi = JSON.parse(readFileSync(join(root, 'v1', 'sync-api.openapi.json'), 'utf8'));
const aiResultEnvelopeSchema = JSON.parse(readFileSync(join(root, 'v1', 'ai-result-envelope.schema.json'), 'utf8'));
const expectedDefinitions = ['document', 'documentVersion', 'fileObject', 'derivedArtifact', 'aiResult'];

if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
  throw new Error('核心契约必须使用 JSON Schema 2020-12');
}
if (schema.properties?.schemaVersion?.const !== '1.0.0') {
  throw new Error('schemaVersion 与 contracts/v1 不一致');
}
for (const definition of expectedDefinitions) {
  if (!schema.$defs?.[definition]) throw new Error(`核心契约缺少 $defs.${definition}`);
}
const schemaStates = lifecycleSchema.$defs?.lifecycleState?.enum ?? [];
if (JSON.stringify(schemaStates) !== JSON.stringify(lifecycleRules.states)) {
  throw new Error('生命周期 Schema 与规则文件的状态列表不一致');
}
const schemaErrors = lifecycleSchema.$defs?.errorCode?.enum ?? [];
if (JSON.stringify(schemaErrors) !== JSON.stringify(Object.keys(lifecycleRules.errors))) {
  throw new Error('生命周期 Schema 与规则文件的错误码列表不一致');
}
for (const state of lifecycleRules.states) {
  const targets = lifecycleRules.transitions[state];
  if (!Array.isArray(targets)) throw new Error(`生命周期缺少转移规则：${state}`);
  for (const target of targets) {
    if (!lifecycleRules.states.includes(target)) throw new Error(`生命周期包含未知目标：${state} -> ${target}`);
  }
}
if (formatSchema.properties?.schemaVersion?.const !== formatRegistry.schemaVersion) {
  throw new Error('格式能力 Schema 与注册表版本不一致');
}
const formatIds = new Set();
const extensions = new Set();
for (const handler of formatRegistry.handlers) {
  if (formatIds.has(handler.formatId)) throw new Error(`重复格式 ID：${handler.formatId}`);
  formatIds.add(handler.formatId);
  if (handler.limits.performanceTargetBytes > handler.limits.maxMobileReadBytes) {
    throw new Error(`格式性能目标超过读取上限：${handler.formatId}`);
  }
  for (const extension of handler.extensions) {
    if (extensions.has(extension)) throw new Error(`扩展名被多个格式占用：${extension}`);
    extensions.add(extension);
  }
}
if (!formatIds.has(formatRegistry.fallbackFormatId)) throw new Error('格式注册表的文本兜底不存在');
if (syncApi.openapi !== '3.1.0' || syncApi.info?.version !== '1.0.0') {
  throw new Error('同步 API 必须使用 OpenAPI 3.1.0 且版本与 contracts/v1 一致');
}
for (const path of ['/v1/auth/code/verify', '/v1/devices', '/v1/files/uploads', '/v1/sync/push', '/v1/sync/pull']) {
  if (!syncApi.paths?.[path]) throw new Error(`同步 API 缺少路径：${path}`);
}
if (syncApi.$defs?.errorResponse?.additionalProperties !== true) {
  throw new Error('同步传输错误结构必须允许客户端忽略新增字段');
}
if (aiResultEnvelopeSchema.properties?.schemaVersion?.const !== '1.0.0') {
  throw new Error('AI 结果包 Schema 版本与 contracts/v1 不一致');
}
for (const path of [
  'file-contract.schema.json#/$defs/documentId',
  'file-contract.schema.json#/$defs/versionId',
  'file-contract.schema.json#/$defs/artifactId',
]) {
  const refs = [
    aiResultEnvelopeSchema.properties?.sourceDocumentId?.oneOf?.[0]?.$ref,
    aiResultEnvelopeSchema.properties?.sourceVersionId?.oneOf?.[0]?.$ref,
    aiResultEnvelopeSchema.properties?.sourceArtifactId?.oneOf?.[0]?.$ref,
  ];
  if (!refs.includes(path)) throw new Error(`AI 结果包 Schema 缺少核心引用：${path}`);
}
if (readFileSync(nativeContractOutputPath, 'utf8') !== renderNativeContracts()) {
  throw new Error('KMP 生成契约已过期，请运行 npm run generate:native');
}

process.stdout.write(`核心契约检查通过：${expectedDefinitions.join(', ')}；${lifecycleRules.states.length} 个生命周期状态；${formatIds.size} 个格式处理器；OpenAPI ${syncApi.info.version}；AI 结果包 ${aiResultEnvelopeSchema.properties.schemaVersion.const}\n`);
