#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  batches,
  checksumMap,
  validationAbsolutePath,
  validationDate,
  validationRelativePath,
} from './v2_validation_data.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = validationAbsolutePath('mobile_true_device');
const defaultMarkdownPath = path.join(defaultDir, 'mobile-device-run-sheet.md');
const defaultJsonPath = path.join(defaultDir, 'mobile-device-run-sheet.json');
const batch = batches.find((item) => item.id === 'mobile_true_device');

if (!batch) {
  throw new Error('缺少 mobile_true_device 批次定义');
}

const checksumByPath = checksumMap();

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function sampleMeta(relativePath) {
  const checksum = checksumByPath.get(relativePath);
  return {
    path: relativePath,
    sizeBytes: checksum?.sizeBytes ?? (fs.existsSync(path.join(repoRoot, relativePath)) ? fs.statSync(path.join(repoRoot, relativePath)).size : null),
    sha256: checksum?.expectedSha256 ?? '待补',
  };
}

function evidencePath(fileName) {
  return validationRelativePath('mobile_true_device', 'evidence', fileName);
}

function sampleSlug(sample) {
  return path.basename(sample.path).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

const normalSamples = [
  sampleMeta('fixtures/mobile-reading/markdown/normal.md'),
  sampleMeta('fixtures/mobile-reading/json/normal.json'),
  sampleMeta('fixtures/mobile-reading/text/utf8.txt'),
];
const largeSamples = [
  sampleMeta('fixtures/mobile-reading/markdown/large-1mb.md'),
  sampleMeta('fixtures/mobile-reading/json/large-5mb.json'),
];

const rows = [];

function addRow({
  id,
  group,
  tasks,
  deviceSlot,
  platform,
  source,
  sample,
  action,
  passRule,
  evidenceFile,
}) {
  rows.push({
    id,
    group,
    tasks,
    deviceSlot,
    platform,
    source,
    sample,
    action,
    passRule,
    evidence: evidencePath(evidenceFile),
    resultFields: [
      '设备型号 / 系统版本',
      '来源 App / 版本',
      '墨览版本 / 构建号',
      '首屏耗时',
      '滚动表现',
      '峰值内存或系统内存记录',
      '截图 / 录屏路径',
      '是否通过',
    ],
  });
}

const androidSources = [
  ['wechat', '微信'],
  ['qq', 'QQ'],
  ['browser', '浏览器'],
  ['file-manager', '文件管理器'],
];

for (const [sourceId, sourceName] of androidSources) {
  for (const sample of normalSamples) {
    const slug = sampleSlug(sample);
    addRow({
      id: `android-open-${sourceId}-${slug}`,
      group: 'Android 外部来源打开',
      tasks: ['B-002', 'B-009'],
      deviceSlot: 'Android 真机 A；另用真机 B 抽查微信 / 文件管理器',
      platform: 'Android',
      source: sourceName,
      sample,
      action: '从真实来源打开样例，进入阅读页后返回，再次打开同一文件。',
      passRule: '5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。',
      evidenceFile: `android-${sourceId}-${slug}.mp4`,
    });
  }
}

for (const sample of largeSamples) {
  const slug = sampleSlug(sample);
  addRow({
    id: `android-performance-${slug}`,
    group: 'Android 性能与恢复',
    tasks: ['B-004', 'B-008', 'B-009'],
    deviceSlot: '中低端 Android 真机；至少覆盖两个国产品牌中的一台',
    platform: 'Android',
    source: '文件管理器或浏览器下载目录',
    sample,
    action: '打开大样例，记录首屏、滚动、横竖屏、退后台、杀进程恢复和内存。',
    passRule: '外部打开到正文 5 秒内；1 MB Markdown / 5 MB JSON 不 ANR；恢复后不串文件。',
    evidenceFile: `android-performance-${slug}.txt`,
  });
}

const iosSources = [
  ['wechat', '微信'],
  ['qq', 'QQ'],
  ['safari', 'Safari'],
  ['files', '“文件”App'],
  ['share-sheet', '系统分享面板'],
];
const iosDeviceSlots = [
  ['iphone', 'iPhone 真机'],
  ['ipad', 'iPad 真机'],
];

for (const [deviceId, deviceName] of iosDeviceSlots) {
  for (const [sourceId, sourceName] of iosSources) {
    for (const sample of normalSamples) {
      const slug = sampleSlug(sample);
      addRow({
        id: `${deviceId}-open-${sourceId}-${slug}`,
        group: 'iOS / iPadOS 外部来源打开',
        tasks: ['C-002', 'C-009'],
        deviceSlot: deviceName,
        platform: deviceId === 'ipad' ? 'iPadOS' : 'iOS',
        source: sourceName,
        sample,
        action: '从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。',
        passRule: '5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。',
        evidenceFile: `${deviceId}-${sourceId}-${slug}.mp4`,
      });
    }
  }
}

for (const [deviceId, deviceName] of iosDeviceSlots) {
  for (const sample of largeSamples) {
    const slug = sampleSlug(sample);
    addRow({
      id: `${deviceId}-performance-${slug}`,
      group: 'iOS / iPadOS 性能与恢复',
      tasks: ['C-004', 'C-008', 'C-009'],
      deviceSlot: deviceName,
      platform: deviceId === 'ipad' ? 'iPadOS' : 'iOS',
      source: '“文件”App 或系统分享面板',
      sample,
      action: '打开大样例，记录首屏、滚动、后台返回、系统终止后恢复和内存。',
      passRule: '可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。',
      evidenceFile: `${deviceId}-performance-${slug}.txt`,
    });
  }
}

const groupSummary = [...new Set(rows.map((row) => row.group))].map((group) => ({
  group,
  rowCount: rows.filter((row) => row.group === group).length,
  tasks: [...new Set(rows.filter((row) => row.group === group).flatMap((row) => row.tasks))],
}));

const payload = {
  validationDate,
  generatedFrom: 'scripts/mobile_true_device_run_sheet.mjs',
  batch: {
    id: batch.id,
    title: batch.title,
    tasks: batch.tasks,
  },
  summary: {
    rowCount: rows.length,
    groupCount: groupSummary.length,
    evidenceDir: validationRelativePath('mobile_true_device', 'evidence'),
  },
  groupSummary,
  rows,
};

const markdown = `# 移动真机逐项执行清单

日期：${validationDate}

对应批次：${batch.title}

用途：把 B/C 真机验收拆成逐行执行项。真实设备到位后，按本表逐行补设备、来源 App、耗时、内存和证据路径；本表为空模板时不算完成证据。

## 汇总

- 执行行数：${payload.summary.rowCount}
- 分组数：${payload.summary.groupCount}
- 证据目录：\`${payload.summary.evidenceDir}\`

## 分组

| 分组 | 行数 | 覆盖任务 |
| --- | ---: | --- |
${groupSummary.map((item) => `| ${escapeTableCell(item.group)} | ${item.rowCount} | ${item.tasks.join('、')} |`).join('\n')}

## 执行表

| ID | 分组 | 任务 | 设备槽位 | 来源 | 样例 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${escapeTableCell(row.id)} | ${escapeTableCell(row.group)} | ${row.tasks.join('、')} | ${escapeTableCell(row.deviceSlot)} | ${escapeTableCell(row.source)} | ${escapeTableCell(`${row.sample.path}<br>${row.sample.sizeBytes ?? 'missing'} B<br>${row.sample.sha256}`)} | ${escapeTableCell(row.passRule)} | \`${row.evidence}\` |`).join('\n')}

## 每行填写字段

${rows.map((row) => `### ${row.id}

\`\`\`text
任务：${row.tasks.join('、')}
设备槽位：${row.deviceSlot}
平台：${row.platform}
来源：${row.source}
样例：${row.sample.path}
大小：${row.sample.sizeBytes ?? 'missing'} B
SHA256：${row.sample.sha256}
动作：${row.action}
验收点：${row.passRule}
建议证据：${row.evidence}

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
\`\`\`
`).join('\n')}
`;

if (jsonOnly) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (outIndex !== -1 && args[outIndex + 1]) {
    const rawTarget = args[outIndex + 1];
    const target = rawTarget === 'default' ? defaultJsonPath : path.resolve(rawTarget);
    writeOutput(target, text);
  } else {
    process.stdout.write(text);
  }
  process.exit(0);
}

if (outIndex !== -1 && args[outIndex + 1]) {
  const rawTarget = args[outIndex + 1];
  const target = rawTarget === 'default' ? defaultMarkdownPath : path.resolve(rawTarget);
  writeOutput(target, `${markdown}\n`);
  if (rawTarget === 'default') {
    writeOutput(defaultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }
  console.log(`已写入 ${target}`);
  process.exit(0);
}

process.stdout.write(`${markdown}\n`);
