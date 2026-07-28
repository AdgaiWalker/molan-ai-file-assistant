import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const longName = `${'超长文件名'.repeat(14)}.md`;
const fixtureImage = readFileSync(join(root, '../../mobile/assets/favicon.png'));

function largeJson() {
  const payload = '0123456789abcdef'.repeat(64);
  const items = Array.from({ length: 5014 }, (_, id) => ({ id, text: payload }));
  const bytes = Buffer.from(`${JSON.stringify({ kind: 'large-json', items })}\n`);
  if (bytes.byteLength <= 5 * 1024 * 1024) throw new Error('大 JSON 样例必须严格超过 5 MiB');
  return bytes;
}

function largeMarkdown() {
  const section = '## 性能段落\n\n这是用于长文滚动、搜索和位置恢复的确定性 Markdown 内容。\n\n- 第一项\n- 第二项\n\n```txt\n0123456789abcdef0123456789abcdef\n```\n\n';
  const bytes = Buffer.from(`# 1 MiB Markdown 性能样例\n\n${section.repeat(9000)}`);
  if (bytes.byteLength <= 1024 * 1024) throw new Error('大 Markdown 样例必须严格超过 1 MiB');
  return bytes;
}

const fixtures = new Map([
  ['markdown/normal.md', Buffer.from(`# 墨览阅读样例\n\n普通段落包含 **加粗**、*斜体* 和 [外部链接](https://example.com)。\n\n## 列表与引用\n\n- 第一项\n- 第二项\n\n> 这是一段引用。\n\n| 列 A | 列 B |\n|---|---|\n| 中文 | 123 |\n\n\`\`\`ts\nconst message = 'hello molan';\n\`\`\`\n\n![墨览图标](image.png)\n`)],
  ['markdown/image.png', fixtureImage],
  ['markdown/empty.md', Buffer.alloc(0)],
  ['markdown/malformed.md', Buffer.from('# 未闭合语法\n\n**粗体没有结束\n\n[链接没有结束](https://example.com\n\n```js\nconst unfinished = true;\n')],
  ['markdown/large-1mb.md', largeMarkdown()],
  ['json/normal.json', Buffer.from(`${JSON.stringify({ name: '墨览', version: 1, enabled: true, nested: { markdown: '# 字段标题\n\n- 项目' }, items: [1, null, '三'] }, null, 2)}\n`)],
  ['json/invalid.json', Buffer.from('{\n  "name": "墨览",\n  "items": [1, 2,],\n  "missingEnd": true\n')],
  ['json/large-5mb.json', largeJson()],
  ['text/utf8.txt', Buffer.from('UTF-8 文本样例\n第二行包含中文、emoji 📄 和制表符\t结束。\n')],
  ['text/gbk.txt', Buffer.from([0x47, 0x42, 0x4b, 0x3a, 0x20, 0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4, 0x0d, 0x0a])],
  ['names/中文 文件 名.md', Buffer.from('# 中文与空格文件名\n\n应使用 Markdown 阅读器。\n')],
  ['names/file with spaces.json', Buffer.from('{"filename":"contains spaces"}\n')],
  [`names/${longName}`, Buffer.from('# 超长文件名\n\n文件名接近常见文件系统限制，但不超过 255 UTF-8 字节。\n')],
  ['names/no-extension', Buffer.from('无扩展名但可可靠解码的 UTF-8 文本。\n')],
  ['binary/disguised-as-text.txt', Buffer.from([0x00, 0x01, 0x02, 0x7f, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x80])],
  ['binary/unsupported.bin', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x00, 0x10, 0x80, 0x81, 0x82, 0x83])],
]);

function checksumLines() {
  return [...fixtures.entries()]
    .map(([path, bytes]) => `${createHash('sha256').update(bytes).digest('hex')}  ${path}`)
    .join('\n') + '\n';
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

if (process.argv.includes('--check')) {
  for (const [path, expected] of fixtures) {
    const absolute = join(root, path);
    let actual;
    try {
      actual = readFileSync(absolute);
    } catch {
      fail(`缺少样例：${relative(root, absolute)}`);
      continue;
    }
    if (!actual.equals(expected)) fail(`样例内容漂移：${path}`);
  }
  try {
    const actualChecksums = readFileSync(join(root, 'SHA256SUMS'), 'utf8');
    if (actualChecksums !== checksumLines()) fail('SHA256SUMS 与固定样例不一致');
  } catch {
    fail('缺少 SHA256SUMS');
  }
  if (!process.exitCode) process.stdout.write(`已校验 ${fixtures.size} 个固定样例。\n`);
} else {
  for (const [path, bytes] of fixtures) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, bytes);
  }
  writeFileSync(join(root, 'SHA256SUMS'), checksumLines());
  process.stdout.write(`已生成 ${fixtures.size} 个固定样例。\n`);
}
