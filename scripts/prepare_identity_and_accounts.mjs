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
const identityDir = validationAbsolutePath('identity_and_accounts');
const defaultMarkdownPath = path.join(identityDir, 'identity-prep-summary.md');
const defaultJsonPath = path.join(identityDir, 'identity-prep-summary.json');
const identityEvidenceDir = path.join(identityDir, 'evidence');
const identityReadinessJsonPath = path.join(identityDir, 'identity-readiness-snapshot.json');
const engineeringIdentityJsonPath = path.join(identityDir, 'engineering-identity-snapshot.json');
const identityChecklistJsonPath = path.join(identityDir, 'identity-and-accounts-checklist.json');
const identityInputStatusJsonPath = path.join(identityDir, 'identity-input-status.json');
const identitySyncTargetsJsonPath = path.join(identityDir, 'identity-sync-targets.json');
const identityEvidenceTemplatesJsonPath = path.join(identityDir, 'identity-evidence-templates.json');
const productIdentityConfigPath = path.join(repoRoot, 'config/product-identity.json');
const identityTasks = ['A-007', 'G-001'];

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

function identitySeedPath(name) {
  return path.join(identityEvidenceDir, name);
}

function relativeIdentitySeedPath(name) {
  return validationRelativePath('identity_and_accounts', 'evidence', name);
}

function writeIdentityEvidenceSeeds() {
  fs.mkdirSync(identityEvidenceDir, { recursive: true });

  const readiness = readJson(identityReadinessJsonPath);
  const engineering = readJson(engineeringIdentityJsonPath);
  const checklist = readJson(identityChecklistJsonPath);
  const inputStatus = readJson(identityInputStatusJsonPath);
  const syncTargets = readJson(identitySyncTargetsJsonPath);
  const evidenceTemplates = readJson(identityEvidenceTemplatesJsonPath);
  const productIdentity = readJson(productIdentityConfigPath);
  const generatedAt = `生成时间：${validationDate}`;

  const currentIdentityText = [
    generatedAt,
    '用途：当前产品身份配置与工程实际值对照，可直接作为 A-007 / G-001 的起始证据。',
    '',
    `品牌名：${readiness.currentIdentity?.brandName ?? 'missing'}`,
    `品牌 slug：${readiness.currentIdentity?.brandSlug ?? 'missing'}`,
    `Android applicationId：${readiness.currentIdentity?.android?.applicationId ?? 'missing'}`,
    `Android 显示名：${readiness.currentIdentity?.android?.displayName ?? 'missing'}`,
    `iOS Bundle ID：${readiness.currentIdentity?.ios?.bundleId ?? 'missing'}`,
    `iOS URL Scheme：${readiness.currentIdentity?.ios?.urlScheme ?? 'missing'}`,
    `iOS App Group ID：${readiness.currentIdentity?.ios?.appGroupId ?? 'missing'}`,
    `桌面 App ID：${readiness.currentIdentity?.desktop?.appId ?? 'missing'}`,
    `桌面 packageName：${readiness.currentIdentity?.desktop?.packageName ?? 'missing'}`,
    '',
    '待补正式信息：',
    '- 正式产品名',
    '- 正式 Android applicationId',
    '- 正式 iOS Bundle ID / URL Scheme / App Group ID',
    '- 正式桌面 App ID',
  ].join('\n');

  const publicDocSeedText = [
    generatedAt,
    '用途：当前公开文案占位清单，可直接作为 G-001 的起始对照。',
    '',
    ...(Array.isArray(readiness.publicDocs) ? readiness.publicDocs : []).flatMap((doc) => ([
      `文档：${doc.title}`,
      `路径：${doc.relativePath}`,
      `占位数：${doc.placeholderCount}`,
      `占位项：${doc.placeholders?.join('、') || '无'}`,
      '',
    ])),
  ].join('\n');

  const readinessFindingsText = [
    generatedAt,
    '用途：当前身份与公开面高/中优先级问题清单；真正回填正式主体时可逐条勾掉。',
    '',
    ...(Array.isArray(readiness.findings) ? readiness.findings : []).map((item, index) => ([
      `${index + 1}. [${item.severity}] ${item.title}`,
      `   范围：${item.scope}`,
      `   说明：${item.detail}`,
    ].join('\n'))),
    '',
    '停止条件：',
    ...((Array.isArray(readiness.stopWhen) ? readiness.stopWhen : []).map((item) => `- ${item}`)),
  ].join('\n');

  const engineeringSnapshotText = [
    generatedAt,
    '用途：当前工程身份快照，可直接作为改正式 ID 前后的对照记录。',
    '',
    `工程配置来源：${engineering.configSource ?? 'missing'}`,
    `当前是否一致：${engineering.ok ? '是' : '否'}`,
    '',
    `Android applicationId：${engineering.actual?.android?.applicationId ?? 'missing'}`,
    `Android 显示名：${engineering.actual?.android?.displayName ?? 'missing'}`,
    `iOS Bundle ID：${engineering.actual?.ios?.bundleId ?? 'missing'}`,
    `iOS Share Bundle ID：${engineering.actual?.ios?.shareBundleId ?? 'missing'}`,
    `iOS URL Scheme：${engineering.actual?.ios?.urlScheme ?? 'missing'}`,
    `iOS App Group ID：${engineering.actual?.ios?.appGroupId ?? 'missing'}`,
    `桌面 App ID：${engineering.actual?.desktop?.appId ?? 'missing'}`,
    `桌面 packageName：${engineering.actual?.desktop?.packageName ?? 'missing'}`,
    '',
    `不一致项数：${Array.isArray(engineering.mismatches) ? engineering.mismatches.length : 0}`,
  ].join('\n');

  const checklistSeedText = [
    generatedAt,
    '用途：身份 / 账号 / 对外入口人工回填清单，可直接在本文件上追加负责人、截图或后台链接。',
    '',
    ...(Array.isArray(checklist.sections) ? checklist.sections : []).flatMap((section) => ([
      `分组：${section.title}`,
      ...((section.fields ?? []).map((field) => `- ${field}`)),
      '',
    ])),
    '停止条件：',
    ...((Array.isArray(checklist.stopWhen) ? checklist.stopWhen : []).map((item) => `- ${item}`)),
  ].join('\n');

  const inputStatusSeedText = [
    generatedAt,
    '用途：身份输入 8 字段当前状态总表；可直接对照 config/release-identity-inputs.json 填写。',
    '',
    ...(Array.isArray(inputStatus.rows) ? inputStatus.rows : []).map((row) => [
      `${row.label}`,
      `- 当前值：${row.renderedValue}`,
      `- 状态：${row.status}`,
      `- 影响任务：${Array.isArray(row.requiredFor) ? row.requiredFor.join('、') : '无'}`,
    ].join('\n')),
    '',
    `当前默认命令：${inputStatus.nextAction?.command ?? '无'}`,
  ].join('\n');

  const syncTargetsSeedText = [
    generatedAt,
    '用途：身份信息逐位置回填清单；对照自动回写目标和人工补证据目标，避免遗漏应用内 / 商店后台。',
    '',
    ...(Array.isArray(syncTargets.targets) ? syncTargets.targets : []).map((target) => [
      `${target.title}`,
      `- 类型：${target.type}`,
      `- 位置：${Array.isArray(target.where) ? target.where.join('；') : '无'}`,
      `- 涉及字段：${Array.isArray(target.fields) ? target.fields.join('、') : '无'}`,
      `- 默认命令 / 动作：${target.command ?? '无'}`,
    ].join('\n')),
    '',
    `当前默认命令：${syncTargets.summary?.nextCommand ?? '无'}`,
  ].join('\n');

  const evidenceTemplatesSeedText = [
    generatedAt,
    '用途：G-001 / A-007 人工证据可填写模板；把截图、后台链接和最终结论追加到对应条目下。',
    '',
    ...(Array.isArray(evidenceTemplates.templates) ? evidenceTemplates.templates : []).map((template) => [
      template.fillBlock ?? template.title,
      '',
    ].join('\n')),
    `当前默认命令：${evidenceTemplates.summary?.nextCommand ?? '无'}`,
  ].join('\n');

  const productIdentitySeed = {
    generatedAt: validationDate,
    source: 'config/product-identity.json',
    productIdentity,
    readinessSummary: readiness.summary ?? null,
    stopWhen: checklist.stopWhen ?? [],
  };

  const configPath = identitySeedPath('current-product-identity.json');
  const currentPath = identitySeedPath('current-identity-values.txt');
  const publicPath = identitySeedPath('public-doc-placeholders.txt');
  const findingsPath = identitySeedPath('identity-readiness-findings.txt');
  const engineeringPath = identitySeedPath('engineering-identity-values.txt');
  const checklistPath = identitySeedPath('identity-checklist-seed.txt');
  const inputStatusPath = identitySeedPath('identity-input-status.txt');
  const syncTargetsPath = identitySeedPath('identity-sync-targets.txt');
  const evidenceTemplatesPath = identitySeedPath('identity-evidence-templates.txt');

  fs.writeFileSync(configPath, `${JSON.stringify(productIdentitySeed, null, 2)}\n`, 'utf-8');
  fs.writeFileSync(currentPath, `${currentIdentityText}\n`, 'utf-8');
  fs.writeFileSync(publicPath, `${publicDocSeedText}\n`, 'utf-8');
  fs.writeFileSync(findingsPath, `${readinessFindingsText}\n`, 'utf-8');
  fs.writeFileSync(engineeringPath, `${engineeringSnapshotText}\n`, 'utf-8');
  fs.writeFileSync(checklistPath, `${checklistSeedText}\n`, 'utf-8');
  fs.writeFileSync(inputStatusPath, `${inputStatusSeedText}\n`, 'utf-8');
  fs.writeFileSync(syncTargetsPath, `${syncTargetsSeedText}\n`, 'utf-8');
  fs.writeFileSync(evidenceTemplatesPath, `${evidenceTemplatesSeedText}\n`, 'utf-8');

  return [
    relativeIdentitySeedPath('current-product-identity.json'),
    relativeIdentitySeedPath('current-identity-values.txt'),
    relativeIdentitySeedPath('public-doc-placeholders.txt'),
    relativeIdentitySeedPath('identity-readiness-findings.txt'),
    relativeIdentitySeedPath('engineering-identity-values.txt'),
    relativeIdentitySeedPath('identity-checklist-seed.txt'),
    relativeIdentitySeedPath('identity-input-status.txt'),
    relativeIdentitySeedPath('identity-sync-targets.txt'),
    relativeIdentitySeedPath('identity-evidence-templates.txt'),
  ];
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const activeTasks = identityTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');

const steps = [
  {
    id: 'render_public_docs',
    title: '公开文案回写',
    command: 'node scripts/render_public_docs.mjs',
    run: () => runNodeScript('scripts/render_public_docs.mjs'),
  },
  {
    id: 'apply_engineering_identity',
    title: '工程身份回写',
    command: 'node scripts/apply_engineering_identity.mjs',
    run: () => runNodeScript('scripts/apply_engineering_identity.mjs'),
  },
  {
    id: 'identity_and_accounts_template',
    title: '身份与账号清单',
    command: 'node scripts/identity_and_accounts_template.mjs --out default',
    run: () => runNodeScript('scripts/identity_and_accounts_template.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.json'),
    ],
  },
  {
    id: 'identity_input_status',
    title: '身份输入当前状态总表',
    command: 'node scripts/identity_input_status.mjs --out default',
    run: () => runNodeScript('scripts/identity_input_status.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-input-status.md'),
      validationRelativePath('identity_and_accounts', 'identity-input-status.json'),
    ],
  },
  {
    id: 'identity_sync_targets',
    title: '身份信息逐位置回填清单',
    command: 'node scripts/identity_sync_targets.mjs --out default',
    run: () => runNodeScript('scripts/identity_sync_targets.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-sync-targets.md'),
      validationRelativePath('identity_and_accounts', 'identity-sync-targets.json'),
    ],
  },
  {
    id: 'identity_evidence_templates',
    title: '身份与公开入口人工证据模板',
    command: 'node scripts/identity_evidence_templates.mjs --out default',
    run: () => runNodeScript('scripts/identity_evidence_templates.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-evidence-templates.md'),
      validationRelativePath('identity_and_accounts', 'identity-evidence-templates.json'),
    ],
  },
  {
    id: 'identity_readiness_snapshot',
    title: '身份与公开入口状态快照',
    command: 'node scripts/identity_readiness_report.mjs --out default',
    run: () => runNodeScript('scripts/identity_readiness_report.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.json'),
    ],
  },
  {
    id: 'engineering_identity_snapshot',
    title: '工程身份一致性快照',
    command: 'node scripts/engineering_identity_check.mjs --out default',
    run: () => runNodeScript('scripts/engineering_identity_check.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.json'),
    ],
  },
  {
    id: 'public_surface_sync_check',
    title: '公开面与 TODO 总自检',
    command: 'node scripts/public_surface_sync_check.mjs',
    run: () => runNodeScript('scripts/public_surface_sync_check.mjs'),
  },
];

const executed = steps.map((step) => ({
  id: step.id,
  title: step.title,
  command: step.command,
  output: step.run(),
  outputs: step.outputs ?? [],
}));

const seededEvidenceOutputs = writeIdentityEvidenceSeeds();

const payload = {
  validationDate,
  tasks: activeTasks.length === 0 ? identityTasks : activeTasks,
  generatedFrom: 'scripts/prepare_identity_and_accounts.mjs',
  summary: {
    executedStepCount: executed.length,
    activeTaskCount: activeTasks.length,
  },
  outputs: [
    validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
    validationRelativePath('identity_and_accounts', 'identity-input-status.md'),
    validationRelativePath('identity_and_accounts', 'identity-sync-targets.md'),
    validationRelativePath('identity_and_accounts', 'identity-evidence-templates.md'),
    validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
    validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
    validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
    ...seededEvidenceOutputs,
  ],
  seededEvidenceOutputs,
  executed,
  nextStep: activeTasks.length === 0
    ? 'A-007 / G-001 当前已不是未完成任务；若只是想刷新产物，可继续保留这条命令作为统一入口。'
    : '先运行 node scripts/apply_release_identity_inputs.mjs --init 生成本地输入模板，填入真实主体、支持邮箱、正式域名和账号主体后，再运行 node scripts/apply_release_identity_inputs.mjs --check；确认无误后执行默认 apply。随后按清单补商店后台与应用内入口证据。',
};

const markdown = `# 身份与账号统一准备结果

日期：${validationDate}

对应任务：

${(activeTasks.length === 0 ? identityTasks : activeTasks).map((task) => `- ${task}`).join('\n')}

用途：把 A-007 / G-001 需要的工程身份回写、公开文案同步、清单生成、状态快照和总自检压成一个统一入口，减少手工步骤。

## 本次已执行

${executed.map((step) => `### ${step.title}

- 命令：\`${step.command}\`
${step.outputs.length === 0 ? '' : `${step.outputs.map((item) => `- 输出：\`${item}\``).join('\n')}\n`}
\`\`\`text
${step.output || '（无输出）'}
\`\`\``).join('\n\n')}

## 默认证据入口

- \`${validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md')}\`
- \`${validationRelativePath('identity_and_accounts', 'identity-input-status.md')}\`
- \`${validationRelativePath('identity_and_accounts', 'identity-sync-targets.md')}\`
- \`${validationRelativePath('identity_and_accounts', 'identity-evidence-templates.md')}\`
- \`${validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md')}\`
- \`${validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md')}\`
- \`${relativeIdentitySeedPath('current-product-identity.json')}\`
- \`${relativeIdentitySeedPath('current-identity-values.txt')}\`
- \`${relativeIdentitySeedPath('public-doc-placeholders.txt')}\`
- \`${relativeIdentitySeedPath('identity-readiness-findings.txt')}\`
- \`${relativeIdentitySeedPath('engineering-identity-values.txt')}\`
- \`${relativeIdentitySeedPath('identity-checklist-seed.txt')}\`
- \`${relativeIdentitySeedPath('identity-input-status.txt')}\`
- \`${relativeIdentitySeedPath('identity-sync-targets.txt')}\`
- \`${relativeIdentitySeedPath('identity-evidence-templates.txt')}\`

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
