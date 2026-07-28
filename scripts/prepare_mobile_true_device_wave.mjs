#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  batches,
  checksumMap,
  defaultEvidenceDir,
  validationAbsolutePath,
  validationDate,
  validationRelativePath,
} from './v2_validation_data.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const mobileDir = validationAbsolutePath('mobile_true_device');
const defaultMarkdownPath = path.join(mobileDir, 'mobile-true-device-prep-summary.md');
const defaultJsonPath = path.join(mobileDir, 'mobile-true-device-prep-summary.json');
const mobileEvidenceDir = path.join(mobileDir, 'evidence');
const mobileTasks = ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'];
const mobileBatch = batches.find((item) => item.id === 'mobile_true_device');

if (!mobileBatch) {
  throw new Error('缺少 mobile_true_device 批次定义');
}

function runNodeScript(relativeScript, scriptArgs = []) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, relativeScript), ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error([
      `执行失败：node ${relativeScript} ${scriptArgs.join(' ')}`.trim(),
      result.stdout?.trim(),
      result.stderr?.trim(),
    ].filter(Boolean).join('\n'));
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function seedPath(name) {
  return path.join(mobileEvidenceDir, name);
}

function relativeSeedPath(name) {
  return validationRelativePath('mobile_true_device', 'evidence', name);
}

function sampleEvidenceRows() {
  const byPath = checksumMap();
  return mobileBatch.samples.map((relativePath) => {
    const matched = byPath.get(relativePath);
    if (matched) {
      return `- ${relativePath}\n  - 大小：${matched.sizeBytes} B\n  - SHA256：${matched.expectedSha256}`;
    }
    const absolutePath = path.join(repoRoot, relativePath);
    if (fs.existsSync(absolutePath)) {
      return `- ${relativePath}\n  - 大小：${fs.statSync(absolutePath).size} B\n  - SHA256：待补`;
    }
    return `- ${relativePath}\n  - 状态：missing`;
  }).join('\n');
}

function writeMobileEvidenceSeeds() {
  fs.mkdirSync(mobileEvidenceDir, { recursive: true });
  const generatedAt = `生成时间：${validationDate}`;
  const defaultEvidenceRelativeDir = path.relative(repoRoot, defaultEvidenceDir(mobileBatch));

  const matrixText = [
    generatedAt,
    '用途：移动真机批次覆盖矩阵；真正开跑时可直接按这里逐项打勾。',
    '',
    '覆盖任务：',
    ...mobileTasks.map((task) => `- ${task}`),
    '',
    '需要的真实来源：',
    '- Android：微信、QQ、浏览器、文件管理器',
    '- iPhone：微信、QQ、Safari、“文件”App、系统分享面板',
    '- iPad：微信、QQ、Safari、“文件”App、系统分享面板',
    '',
    '建议执行步骤：',
    ...mobileBatch.steps.map((step, index) => `${index + 1}. ${step}`),
  ].join('\n');

  const sampleText = [
    generatedAt,
    '用途：移动真机批次固定样例与哈希；真正录屏时直接引用这里的大小与 SHA256。',
    '',
    sampleEvidenceRows(),
  ].join('\n');

  const evidencePathsText = [
    generatedAt,
    '用途：移动真机批次证据落盘位置与建议文件名。',
    '',
    `默认批次证据目录：${defaultEvidenceRelativeDir}`,
    '现有端内证据目录：',
    ...mobileBatch.evidenceDirs.map((item) => `- ${item}`),
    '',
    '建议证据文件名：',
    ...(mobileBatch.suggestedEvidenceNames ?? []).map((item) => `- ${path.posix.join(validationRelativePath('mobile_true_device', 'evidence'), item)}`),
  ].join('\n');

  const reportFieldsText = [
    generatedAt,
    '用途：移动真机报告必填字段速查；执行时避免漏掉报告模板中的关键栏位。',
    '',
    '报告必填：',
    '- 设备 / 系统',
    '- 墨览版本',
    '- 来源 App / 版本',
    '- 样例文件 / 大小 / hash',
    '- 操作步骤',
    '- 目标指标',
    '- 实测结果',
    '- 截图或录屏路径',
    '- 是否通过',
    '',
    '必留证据：',
    ...(mobileBatch.evidenceChecklist ?? []).map((item) => `- ${item}`),
  ].join('\n');

  const runChecklistText = [
    generatedAt,
    '用途：移动真机批次开跑前/结束后的收口清单。',
    '',
    '开跑前：',
    '- 先执行 node scripts/prepare_mobile_true_device_wave.mjs --out default',
    '- 确认固定样例 hash 与设备矩阵无缺项',
    '- 确认 Android / iPhone / iPad 都有可用录屏路径',
    '',
    '结束条件：',
    '- mobile-true-device-report.md 已填完设备、来源 App、样例 hash、性能数据与证据路径',
    '- B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009 均有真实证据',
  ].join('\n');

  fs.writeFileSync(seedPath('mobile-device-matrix.txt'), `${matrixText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('mobile-sample-checksums.txt'), `${sampleText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('mobile-evidence-paths.txt'), `${evidencePathsText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('mobile-report-fields.txt'), `${reportFieldsText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('mobile-run-checklist.txt'), `${runChecklistText}\n`, 'utf-8');

  return [
    relativeSeedPath('mobile-device-matrix.txt'),
    relativeSeedPath('mobile-sample-checksums.txt'),
    relativeSeedPath('mobile-evidence-paths.txt'),
    relativeSeedPath('mobile-report-fields.txt'),
    relativeSeedPath('mobile-run-checklist.txt'),
  ];
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const activeTasks = mobileTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');

const steps = [
  {
    id: 'v2_preflight',
    title: '外部批次预检',
    command: 'node scripts/v2_validation_preflight.mjs',
    run: () => runNodeScript('scripts/v2_validation_preflight.mjs'),
  },
  {
    id: 'mobile_true_device_template',
    title: '移动真机批次模板',
    command: 'node scripts/v2_validation_report.mjs --batch mobile_true_device --out default',
    run: () => runNodeScript('scripts/v2_validation_report.mjs', ['--batch', 'mobile_true_device', '--out', 'default']),
    outputs: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
    ],
  },
  {
    id: 'mobile_true_device_run_sheet',
    title: '移动真机逐项执行清单',
    command: 'node scripts/mobile_true_device_run_sheet.mjs --out default',
    run: () => runNodeScript('scripts/mobile_true_device_run_sheet.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
      validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.json'),
    ],
  },
];

const executed = steps.map((step) => ({
  id: step.id,
  title: step.title,
  command: step.command,
  output: step.run(),
  outputs: step.outputs ?? [],
}));

const seededEvidenceOutputs = writeMobileEvidenceSeeds();

const payload = {
  validationDate,
  tasks: activeTasks.length === 0 ? mobileTasks : activeTasks,
  generatedFrom: 'scripts/prepare_mobile_true_device_wave.mjs',
  summary: {
    executedStepCount: executed.length,
    activeTaskCount: activeTasks.length,
  },
  outputs: [
    validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
    validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
    validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
    ...seededEvidenceOutputs,
    'docs/design/v2-validation-batches.md',
  ],
  seededEvidenceOutputs,
  executed,
  nextStep: activeTasks.length === 0
    ? '当前 B/C 真机批次任务已不是未完成项；如果只是想刷新真机批次产物，仍可继续使用这条统一入口。'
    : '按 docs/design/v2-validation-batches.md 的来源矩阵，用同一批固定样例完成 Android 与 iPhone / iPad 真机采集，并把真实录屏、机型、系统版本、耗时和内存结果直接补进报告。',
};

const markdown = `# 移动真机批次统一准备结果

日期：${validationDate}

对应任务：

${(activeTasks.length === 0 ? mobileTasks : activeTasks).map((task) => `- ${task}`).join('\n')}

用途：把 B/C 真机批次进入真实执行前需要的预检与模板收敛成一个统一入口，减少手工步骤，并固定样例与来源矩阵。

## 本次已执行

${executed.map((step) => `### ${step.title}

- 命令：\`${step.command}\`
${step.outputs.length === 0 ? '' : `${step.outputs.map((item) => `- 输出：\`${item}\``).join('\n')}\n`}
\`\`\`text
${step.output || '（无输出）'}
\`\`\``).join('\n\n')}

## 默认证据入口

- \`${validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md')}\`
- \`${validationRelativePath('mobile_true_device', 'mobile-true-device-report.md')}\`
- \`${validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md')}\`
- \`${relativeSeedPath('mobile-device-matrix.txt')}\`
- \`${relativeSeedPath('mobile-sample-checksums.txt')}\`
- \`${relativeSeedPath('mobile-evidence-paths.txt')}\`
- \`${relativeSeedPath('mobile-report-fields.txt')}\`
- \`${relativeSeedPath('mobile-run-checklist.txt')}\`
- \`docs/design/v2-validation-batches.md\`

## 下一步

${payload.nextStep}
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
