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
const syncAiDir = validationAbsolutePath('sync_ai_return');
const defaultMarkdownPath = path.join(syncAiDir, 'sync-ai-prep-summary.md');
const defaultJsonPath = path.join(syncAiDir, 'sync-ai-prep-summary.json');
const syncAiEvidenceDir = path.join(syncAiDir, 'evidence');
const syncAiTasks = ['D-010', 'E-007', 'F-005'];
const gateDBatch = batches.find((item) => item.id === 'gate_d_sync');
const gateEBatch = batches.find((item) => item.id === 'gate_e_ai_read');
const gateFBatch = batches.find((item) => item.id === 'gate_f_result_return');

if (!gateDBatch || !gateEBatch || !gateFBatch) {
  throw new Error('缺少 D/E/F 外部批次定义');
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
  return path.join(syncAiEvidenceDir, name);
}

function relativeSeedPath(name) {
  return validationRelativePath('sync_ai_return', 'evidence', name);
}

function combinedSampleRows() {
  const byPath = checksumMap();
  const sampleSet = new Set([
    ...gateDBatch.samples,
    ...gateEBatch.samples,
    ...gateFBatch.samples,
  ]);
  return Array.from(sampleSet).map((relativePath) => {
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

function batchEvidenceSeedText(batch, label) {
  const defaultEvidenceRelativeDir = path.relative(repoRoot, defaultEvidenceDir(batch));
  return [
    `生成时间：${validationDate}`,
    `用途：${label} 的建议证据文件名、目录与必留字段。`,
    '',
    `默认批次证据目录：${defaultEvidenceRelativeDir}`,
    '现有证据目录：',
    ...batch.evidenceDirs.map((item) => `- ${item}`),
    '',
    '建议证据文件名：',
    ...(batch.suggestedEvidenceNames ?? []).map((item) => `- ${path.posix.join(validationRelativePath(batch.id, 'evidence'), item)}`),
    '',
    '必留证据：',
    ...(batch.evidenceChecklist ?? []).map((item) => `- ${item}`),
  ].join('\n');
}

function writeSyncAiEvidenceSeeds() {
  fs.mkdirSync(syncAiEvidenceDir, { recursive: true });
  const generatedAt = `生成时间：${validationDate}`;

  const environmentText = [
    generatedAt,
    '用途：D-010 / E-007 / F-005 共用环境清单；真正开跑前可直接按此确认。',
    '',
    '必备环境：',
    '- server/: Docker Compose 运行时（真实 PostgreSQL 18.4 数据库主链已单独通过）',
    '- desktop/: 已完成 pull / inbox / MCP / write-result 本地主链验证的桌面端',
    '- Android 真机 / iPhone / iPad',
    '- 真实 Codex 读取/写回与电脑确认已完成；无需再次准备 AI 客户端',
    '',
    '建议顺序：',
    '1. D-010 先跑同步与冲突矩阵',
    '2. E-007 已关闭，无需重复执行',
    '3. F-005 只跑 Android / iOS 真机结果回流与阅读操作',
  ].join('\n');

  const sampleText = [
    generatedAt,
    '用途：同步 / AI / 结果回流共用样例与哈希。',
    '',
    combinedSampleRows(),
  ].join('\n');

  const runOrderText = [
    generatedAt,
    '用途：D-010 → E-007 → F-005 的固定执行顺序与停止条件。',
    '',
    '固定顺序：',
    ...gateDBatch.steps.map((step, index) => `${index + 1}. D-010：${step}`),
    ...gateEBatch.steps.map((step, index) => `${index + 1}. E-007：${step}`),
    ...gateFBatch.steps.map((step, index) => `${index + 1}. F-005：${step}`),
    '',
    '结束条件：',
    '- gate-d-sync-report.md 已补 file id / version / hash / 故障恢复证据',
    '- gate-e-ai-read-report.md 已补授权前拒绝 / 授权后可读 / 撤回后拒绝证据',
    '- gate-f-result-return-report.md 已补写回确认、Android / iOS 回流录屏',
  ].join('\n');

  fs.writeFileSync(seedPath('sync-ai-environment-checklist.txt'), `${environmentText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('sync-ai-sample-checksums.txt'), `${sampleText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('sync-ai-run-order.txt'), `${runOrderText}\n`, 'utf-8');
  fs.writeFileSync(seedPath('gate-d-evidence-paths.txt'), `${batchEvidenceSeedText(gateDBatch, 'Gate D 外部批次')}\n`, 'utf-8');
  fs.writeFileSync(seedPath('gate-e-evidence-paths.txt'), `${batchEvidenceSeedText(gateEBatch, 'Gate E 外部批次')}\n`, 'utf-8');
  fs.writeFileSync(seedPath('gate-f-evidence-paths.txt'), `${batchEvidenceSeedText(gateFBatch, 'Gate F 外部批次')}\n`, 'utf-8');

  return [
    relativeSeedPath('sync-ai-environment-checklist.txt'),
    relativeSeedPath('sync-ai-sample-checksums.txt'),
    relativeSeedPath('sync-ai-run-order.txt'),
    relativeSeedPath('gate-d-evidence-paths.txt'),
    relativeSeedPath('gate-e-evidence-paths.txt'),
    relativeSeedPath('gate-f-evidence-paths.txt'),
  ];
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const activeTasks = syncAiTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');

const steps = [
  {
    id: 'v2_preflight',
    title: '外部批次预检',
    command: 'node scripts/v2_validation_preflight.mjs',
    run: () => runNodeScript('scripts/v2_validation_preflight.mjs'),
  },
  {
    id: 'gate_d_sync_template',
    taskId: 'D-010',
    title: 'Gate D 外部批次模板',
    command: 'node scripts/v2_validation_report.mjs --batch gate_d_sync --out default',
    run: () => runNodeScript('scripts/v2_validation_report.mjs', ['--batch', 'gate_d_sync', '--out', 'default']),
    outputs: [
      validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
    ],
  },
  {
    id: 'gate_e_ai_read_template',
    taskId: 'E-007',
    title: 'Gate E 外部批次模板',
    command: 'node scripts/v2_validation_report.mjs --batch gate_e_ai_read --out default',
    run: () => runNodeScript('scripts/v2_validation_report.mjs', ['--batch', 'gate_e_ai_read', '--out', 'default']),
    outputs: [
      validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
    ],
  },
  {
    id: 'gate_f_result_return_template',
    taskId: 'F-005',
    title: 'Gate F 外部批次模板',
    command: 'node scripts/v2_validation_report.mjs --batch gate_f_result_return --out default',
    run: () => runNodeScript('scripts/v2_validation_report.mjs', ['--batch', 'gate_f_result_return', '--out', 'default']),
    outputs: [
      validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
    ],
  },
  {
    id: 'sync_ai_run_sheet',
    title: '同步 / AI / 回流逐项执行清单',
    command: 'node scripts/sync_ai_run_sheet.mjs --out default',
    run: () => runNodeScript('scripts/sync_ai_run_sheet.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
      validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.json'),
    ],
  },
];

const executed = steps
  .filter((step) => !step.taskId || activeTasks.includes(step.taskId))
  .map((step) => ({
    id: step.id,
    title: step.title,
    command: step.command,
    output: step.run(),
    outputs: step.outputs ?? [],
  }));

const seededEvidenceOutputs = writeSyncAiEvidenceSeeds();

const payload = {
  validationDate,
  tasks: activeTasks.length === 0 ? syncAiTasks : activeTasks,
  generatedFrom: 'scripts/prepare_sync_ai_wave.mjs',
  summary: {
    executedStepCount: executed.length,
    activeTaskCount: activeTasks.length,
  },
  outputs: [
    validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
    validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
    validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
    validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
    validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
    ...seededEvidenceOutputs,
    'docs/design/v2-validation-batches.md',
  ],
  seededEvidenceOutputs,
  executed,
  nextStep: activeTasks.length === 0
    ? '当前 D-010 / E-007 / F-005 已不是未完成任务；如果只是想刷新这组外部批次产物，仍可继续使用这条统一入口。'
    : 'E-007 已关闭，真实 Codex 写回与电脑确认也已通过；按 docs/design/v2-validation-batches.md 用同一套 Docker Compose、桌面和真机环境完成 D-010 与 F-005 的剩余矩阵。',
};

const markdown = `# 同步 / AI 读取 / 结果回流统一准备结果

日期：${validationDate}

对应任务：

${(activeTasks.length === 0 ? syncAiTasks : activeTasks).map((task) => `- ${task}`).join('\n')}

用途：把 D-010 / E-007 / F-005 进入真实外部执行前需要的预检与三份批次模板收敛成一个统一入口，减少手工步骤，并固定执行顺序。

## 本次已执行

${executed.map((step) => `### ${step.title}

- 命令：\`${step.command}\`
${step.outputs.length === 0 ? '' : `${step.outputs.map((item) => `- 输出：\`${item}\``).join('\n')}\n`}
\`\`\`text
${step.output || '（无输出）'}
\`\`\``).join('\n\n')}

## 默认证据入口

- \`${validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md')}\`
- \`${validationRelativePath('gate_d_sync', 'gate-d-sync-report.md')}\`
- \`${validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md')}\`
- \`${validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md')}\`
- \`${validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md')}\`
- \`${relativeSeedPath('sync-ai-environment-checklist.txt')}\`
- \`${relativeSeedPath('sync-ai-sample-checksums.txt')}\`
- \`${relativeSeedPath('sync-ai-run-order.txt')}\`
- \`${relativeSeedPath('gate-d-evidence-paths.txt')}\`
- \`${relativeSeedPath('gate-e-evidence-paths.txt')}\`
- \`${relativeSeedPath('gate-f-evidence-paths.txt')}\`
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
