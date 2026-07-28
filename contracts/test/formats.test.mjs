import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { decodeTextBytes, detectFormat, formatRegistry } from '../src/formats.mjs';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const fixture = (...parts) => readFileSync(join(repoRoot, 'fixtures', 'mobile-reading', ...parts));

test('探测优先级为强签名、扩展名、兼容 MIME、内容、文本兜底', () => {
  const fakePdf = Buffer.from('%PDF-1.7\nnot really a document');
  assert.equal(detectFormat({ fileName: 'wrong.txt', mimeType: 'text/plain', bytes: fakePdf }).formatId, 'pdf');
  assert.equal(detectFormat({ fileName: 'note.md', mimeType: 'application/json', bytes: Buffer.from('# title') }).formatId, 'markdown');
  assert.equal(detectFormat({ fileName: '', mimeType: 'application/json', bytes: Buffer.from('{"ok":true}') }).formatId, 'json');
  assert.equal(detectFormat({ fileName: 'unknown', mimeType: '', bytes: Buffer.from('plain') }).formatId, 'text');
});

test('扩展名或 MIME 与内容不符时给出警告而不静默改写', () => {
  const invalid = detectFormat({ fileName: 'broken.json', mimeType: 'text/plain', bytes: fixture('json', 'invalid.json') });
  assert.equal(invalid.formatId, 'json');
  assert.deepEqual([...invalid.warnings].sort(), ['W_INVALID_JSON', 'W_MIME_MISMATCH']);
  const text = detectFormat({ fileName: 'note.txt', mimeType: 'application/json', bytes: Buffer.from('not json') });
  assert.equal(text.formatId, 'text');
  assert.ok(text.warnings.includes('W_MIME_MISMATCH'));
});

test('UTF-8 BOM、UTF-16 BOM 与 GBK 有唯一编码结果', () => {
  assert.equal(decodeTextBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x61])).encoding, 'utf-8-bom');
  assert.equal(decodeTextBytes(Buffer.from([0xff, 0xfe, 0x41, 0x00])).encoding, 'utf-16le-bom');
  assert.equal(decodeTextBytes(Buffer.from([0xfe, 0xff, 0x00, 0x41])).encoding, 'utf-16be-bom');
  const gbk = detectFormat({ fileName: 'gbk.txt', mimeType: 'text/plain', bytes: fixture('text', 'gbk.txt') });
  assert.equal(gbk.status, 'supported');
  assert.equal(gbk.encoding, 'gbk');
});

test('未知可解码文本走纯文本兜底，无扩展名不影响', () => {
  const result = detectFormat({ fileName: 'no-extension', mimeType: 'application/octet-stream', bytes: fixture('names', 'no-extension') });
  assert.deepEqual({ status: result.status, formatId: result.formatId, reader: result.reader, source: result.source }, { status: 'supported', formatId: 'text', reader: 'text', source: 'fallback' });
});

test('伪装成 TXT 的二进制和未知 ZIP 容器被拒绝', () => {
  assert.equal(
    detectFormat({ fileName: 'disguised.txt', mimeType: 'text/plain', bytes: fixture('binary', 'disguised-as-text.txt') }).errorCode,
    'E_BINARY_CONTENT',
  );
  assert.equal(
    detectFormat({ fileName: 'archive.bin', mimeType: 'application/octet-stream', bytes: fixture('binary', 'unsupported.bin') }).errorCode,
    'E_UNSUPPORTED_FORMAT',
  );
});

test('5MB JSON 在限制内，超过文本上限返回稳定错误', () => {
  assert.equal(
    detectFormat({ fileName: 'large.json', mimeType: 'application/json', bytes: fixture('json', 'large-5mb.json') }).status,
    'supported',
  );
  const tooLarge = Buffer.alloc(8 * 1024 * 1024 + 1, 0x61);
  const result = detectFormat({ fileName: 'large.txt', mimeType: 'text/plain', bytes: tooLarge });
  assert.equal(result.errorCode, 'E_FILE_TOO_LARGE');
  assert.equal(result.formatId, 'text');
});

test('新增文本格式只注册处理器，不修改探测主流程', () => {
  const yamlHandler = {
    ...formatRegistry.handlers.find((handler) => handler.formatId === 'text'),
    formatId: 'yaml',
    extensions: ['yaml', 'yml'],
    mimeTypes: ['application/yaml'],
  };
  const registry = { ...formatRegistry, handlers: [...formatRegistry.handlers, yamlHandler] };
  const result = detectFormat({ fileName: 'config.yaml', mimeType: 'application/yaml', bytes: Buffer.from('name: molan\n'), registry });
  assert.equal(result.formatId, 'yaml');
  assert.equal(result.reader, 'text');
  assert.equal(result.source, 'extension');
});

test('PDF 与 Office 只声明系统预览/收集和电脑转换', () => {
  for (const formatId of ['pdf', 'docx', 'pptx', 'xlsx']) {
    const handler = formatRegistry.handlers.find((candidate) => candidate.formatId === formatId);
    assert.equal(handler.mobileAction, 'preview_or_collect');
    assert.equal(handler.capabilities.mobileConvert, false);
    assert.equal(handler.capabilities.desktopConvert, true);
  }
});
