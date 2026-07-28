#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const legacyDir = validationAbsolutePath('legacy_mobile');
const defaultMarkdownPath = path.join(legacyDir, 'legacy-mobile-prep-summary.md');
const defaultJsonPath = path.join(legacyDir, 'legacy-mobile-prep-summary.json');
const legacyEvidenceDir = path.join(legacyDir, 'evidence');
const legacyAuditJsonPath = path.join(legacyDir, 'legacy-mobile-retirement-audit.json');
const releaseTasks = ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'];
const legacyTask = 'G-008';

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

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`缺少 JSON 产物：${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function legacySeedPath(name) {
  return path.join(legacyEvidenceDir, name);
}

function relativeLegacySeedPath(name) {
  return validationRelativePath('legacy_mobile', 'evidence', name);
}

function writeLegacyEvidenceSeeds({ pendingReleaseTasks, readyToDelete }) {
  fs.mkdirSync(legacyEvidenceDir, { recursive: true });
  const audit = readJson(legacyAuditJsonPath);
  const generatedAt = `生成时间：${validationDate}`;

  const blockingSummaryText = [
    generatedAt,
    '用途：旧 mobile 删除前阻塞面摘要，可直接作为 G-008 当前状态说明。',
    '',
    `必须移除命中文件数：${audit.blockingFilesWithHits}`,
    `必须移除命中行数：${audit.blockingHits}`,
    `可保留历史证据文件数：${audit.historicalFilesWithHits}`,
    `可保留历史证据命中行数：${audit.historicalHits}`,
    '',
    readyToDelete
      ? '当前发布前置与审计阻塞均已满足，可进入真实删除动作。'
      : `当前仍不能进入真实删除：发布前置未关闭 ${pendingReleaseTasks.length} 项。`,
    '',
    '当前发布前置任务：',
    ...(pendingReleaseTasks.length === 0
      ? ['- 无']
      : pendingReleaseTasks.map((task) => `- ${task}`)),
  ].join('\n');

  const mustRemove = Array.isArray(audit.report)
    ? audit.report.filter((item) => item.classification?.id === 'must_remove')
    : [];
  const historical = Array.isArray(audit.report)
    ? audit.report.filter((item) => item.classification?.id === 'historical_evidence')
    : [];

  const auditBucketsText = [
    generatedAt,
    '用途：旧 mobile 引用分桶结果；真正删除前后可直接对照这些文件是否已清零或仍可保留。',
    '',
    '必须移除：',
    ...(mustRemove.length === 0
      ? ['- 当前无命中。']
      : mustRemove.flatMap((item) => [
          `- 文件：${item.relativePath}`,
          ...item.hits.map((hit) => `  - 第 ${hit.line} 行：${hit.content}`),
        ])),
    '',
    '可保留历史证据：',
    ...(historical.length === 0
      ? ['- 当前无命中。']
      : historical.flatMap((item) => [
          `- 文件：${item.relativePath}`,
          ...item.hits.slice(0, 5).map((hit) => `  - 第 ${hit.line} 行：${hit.content}`),
          ...(item.hits.length > 5 ? [`  - 其余 ${item.hits.length - 5} 行命中见 legacy-mobile-retirement-audit.md/json`] : []),
        ])),
  ].join('\n');

  const deleteChecklistText = [
    generatedAt,
    '用途：G-008 真正执行删除动作时的逐项清单，可直接在本文件补勾选结果与命令输出。',
    '',
    '删除前：',
    '- 确认 G-002 ～ G-007 全部已关闭',
    '- 重新运行 node scripts/prepare_legacy_mobile_wave.mjs --out default',
    '- 复核 legacy-mobile-retirement-audit.md/json 的“必须移除”分组为 0',
    '',
    '删除动作：',
    '- 删除 mobile/ 目录',
    '- 删除只为旧 mobile 存在的依赖、脚本、CI 与文档引用',
    '',
    '删除后验证：',
    '- 运行全文搜索，确认主流程不再引用 mobile/ / Expo / React Native',
    '- 重新执行原生 Android / iOS、桌面和 CLI 构建命令',
    '- 重新运行 legacy_mobile_retirement_audit.mjs，确认“必须移除”仍为 0',
    '',
    '建议补充字段：',
    '删除执行时间：',
    '执行人：',
    '删除命令：',
    '删除后构建结果：',
    '删除后全文搜索结果：',
  ].join('\n');

  const postDeleteText = [
    generatedAt,
    '用途：G-008 删除后验证占位；真正删除后可直接在本文件上填构建与搜索结果。',
    '',
    '待补命令输出：',
    '- rg -n "mobile/|React Native|\\bExpo\\b|expo start" README.md AGENTS.md .github docs/CLAUDE.md docs/validation-runs/README.md site scripts',
    '- cd native && ./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest',
    '- xcodebuild -project native/iosApp/Molan.xcodeproj -scheme Molan -destination \'generic/platform=iOS Simulator\' build',
    '- cd desktop && npm run typecheck && npm run build',
    '- cd desktop/cli && npm run typecheck && npm run build && npm run test',
  ].join('\n');

  const readyState = {
    generatedAt: validationDate,
    task: legacyTask,
    readyToDelete,
    pendingReleaseTasks,
    blockingFilesWithHits: audit.blockingFilesWithHits,
    blockingHits: audit.blockingHits,
    historicalFilesWithHits: audit.historicalFilesWithHits,
    historicalHits: audit.historicalHits,
    stopWhen: audit.stopWhen ?? [],
  };

  fs.writeFileSync(legacySeedPath('legacy-delete-ready-state.json'), `${JSON.stringify(readyState, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(legacySeedPath('legacy-delete-blockers.txt'), `${blockingSummaryText}\n`, 'utf-8');
  fs.writeFileSync(legacySeedPath('legacy-delete-audit-buckets.txt'), `${auditBucketsText}\n`, 'utf-8');
  fs.writeFileSync(legacySeedPath('legacy-delete-checklist.txt'), `${deleteChecklistText}\n`, 'utf-8');
  fs.writeFileSync(legacySeedPath('legacy-post-delete-verification.txt'), `${postDeleteText}\n`, 'utf-8');

  return [
    relativeLegacySeedPath('legacy-delete-ready-state.json'),
    relativeLegacySeedPath('legacy-delete-blockers.txt'),
    relativeLegacySeedPath('legacy-delete-audit-buckets.txt'),
    relativeLegacySeedPath('legacy-delete-checklist.txt'),
    relativeLegacySeedPath('legacy-post-delete-verification.txt'),
  ];
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const activeTasks = todoSnapshot.sectionStatusMap.get(legacyTask) === 'x' ? [] : [legacyTask];
const pendingReleaseTasks = releaseTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');

const steps = [
  {
    id: 'legacy_mobile_audit',
    title: '旧 mobile 基线删除前审计',
    command: 'node scripts/legacy_mobile_retirement_audit.mjs --out default',
    run: () => runNodeScript('scripts/legacy_mobile_retirement_audit.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.json'),
    ],
  },
  {
    id: 'legacy_mobile_run_sheet',
    title: '旧 React Native mobile 删除逐项执行清单',
    command: 'node scripts/legacy_mobile_run_sheet.mjs --out default',
    run: () => runNodeScript('scripts/legacy_mobile_run_sheet.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.json'),
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

const readyToDelete = pendingReleaseTasks.length === 0 && activeTasks.length > 0;
const seededEvidenceOutputs = writeLegacyEvidenceSeeds({ pendingReleaseTasks, readyToDelete });

const payload = {
  validationDate,
  tasks: activeTasks.length === 0 ? [legacyTask] : activeTasks,
  generatedFrom: 'scripts/prepare_legacy_mobile_wave.mjs',
  readyToDelete,
  pendingReleaseTasks,
  outputs: [
    validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
    validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
    validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
    ...seededEvidenceOutputs,
  ],
  seededEvidenceOutputs,
  executed,
  nextSteps: readyToDelete
    ? [
        '删除 mobile/ 及只为其存在的依赖、脚本、CI 和文档引用',
        '重新执行原生 Android / iOS、桌面和 CLI 的构建与验证命令',
        '确认全文搜索不再有旧 mobile 主流程残留引用，再关闭 G-008',
      ]
    : [
        `当前仍需先关闭这些前置发布任务：${pendingReleaseTasks.join('、') || '无'}`,
        '在这些任务全部改成 [x] 之前，不执行真实删除动作',
        '可继续把 legacy-mobile-retirement-audit 作为删除前阻塞面板使用',
      ],
};

const markdown = `# 旧 mobile 删除波次统一准备结果

日期：${validationDate}

对应任务：

- ${legacyTask}

用途：把 G-008 在真实删除前需要的审计结果、前置状态和删除后验证动作收敛成一个统一入口，避免到最后一步还要手工拼检查项。

## 本次已执行

${executed.map((step) => `### ${step.title}

- 命令：\`${step.command}\`
${step.outputs.length === 0 ? '' : `${step.outputs.map((item) => `- 输出：\`${item}\``).join('\n')}\n`}
\`\`\`text
${step.output || '（无输出）'}
\`\`\``).join('\n\n')}

## 当前删除前置状态

- G-002 ～ G-007 未完成数：${pendingReleaseTasks.length}
${pendingReleaseTasks.length === 0 ? '- 当前发布前置已全部关闭，可以进入真实删除动作。' : `- 尚未关闭：${pendingReleaseTasks.map((task) => `\`${task}\``).join('、')}`}

## 默认证据入口

- \`${validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md')}\`
- \`${validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md')}\`
- \`${validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md')}\`
- \`${relativeLegacySeedPath('legacy-delete-ready-state.json')}\`
- \`${relativeLegacySeedPath('legacy-delete-blockers.txt')}\`
- \`${relativeLegacySeedPath('legacy-delete-audit-buckets.txt')}\`
- \`${relativeLegacySeedPath('legacy-delete-checklist.txt')}\`
- \`${relativeLegacySeedPath('legacy-post-delete-verification.txt')}\`

## 下一步

${payload.nextSteps.map((step) => `- ${step}`).join('\n')}
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
