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
const releaseDir = validationAbsolutePath('release_dry_run');
const defaultMarkdownPath = path.join(releaseDir, 'release-prep-summary.md');
const defaultJsonPath = path.join(releaseDir, 'release-prep-summary.json');
const releaseEvidenceDir = path.join(releaseDir, 'evidence');
const releaseSnapshotJsonPath = path.join(releaseDir, 'release-readiness-snapshot.json');
const releaseTasks = ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'];

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

function readReleaseSnapshot() {
  if (!fs.existsSync(releaseSnapshotJsonPath)) {
    throw new Error(`缺少发布快照 JSON：${releaseSnapshotJsonPath}`);
  }
  return JSON.parse(fs.readFileSync(releaseSnapshotJsonPath, 'utf-8'));
}

function seedTextPath(name) {
  return path.join(releaseEvidenceDir, name);
}

function relativeSeedPath(name) {
  return validationRelativePath('release_dry_run', 'evidence', name);
}

function formatArtifactBlock(item, fallbackLabel) {
  if (!item?.preferredArtifact) {
    return [
      `平台：${item?.name ?? fallbackLabel}`,
      '本地候选产物：当前无本地候选包',
      `官网状态：${item?.publicStatus === 'available' ? '可用' : '准备中'}`,
      `官网入口：${item?.publicHref ?? '未配置'}`,
      `备注：${item?.missingNote ?? '待补'}`,
    ].join('\n');
  }

  return [
    `平台：${item.name}`,
    `本地候选产物：${item.preferredArtifact.relativePath}`,
    `SHA256：${item.preferredArtifact.sha256}`,
    `文件大小：${item.preferredArtifact.sizeBytes} B`,
    `修改时间：${item.preferredArtifact.modifiedAt}`,
    `官网状态：${item.publicStatus === 'available' ? '可用' : '准备中'}`,
    `官网入口：${item.publicHref}`,
    `备注：${item.publicDetail}`,
  ].join('\n');
}

function writeReleaseEvidenceSeeds() {
  fs.mkdirSync(releaseEvidenceDir, { recursive: true });
  const snapshot = readReleaseSnapshot();
  const manifest = Array.isArray(snapshot.deliveryManifest) ? snapshot.deliveryManifest : [];
  const byId = new Map(manifest.map((item) => [item.id, item]));
  const generatedAt = `生成时间：${validationDate}`;

  const androidText = [
    generatedAt,
    '用途：当前 Android 候选包与 SHA256 记录，可直接作为 G-002 / G-007 演练前的初始证据。',
    '',
    formatArtifactBlock(byId.get('android'), 'Android'),
    '',
    '待补真实演练：',
    '- release 签名 AAB / APK',
    '- 真机安装 / 升级 / 降级拒绝矩阵',
    '- 渠道上传与发布说明截图',
  ].join('\n');

  const iosSection = snapshot.sections?.find((item) => item.id === 'ios');
  const iosText = [
    generatedAt,
    '用途：当前 iOS / TestFlight 发布前置状态记录，可直接作为 G-003 / G-007 演练前的初始证据。',
    '',
    formatArtifactBlock(byId.get('ios'), 'iPhone / iPad'),
    '',
    `当前 Bundle ID：${iosSection?.config?.bundleId ?? 'missing'}`,
    `当前 URL Scheme：${iosSection?.config?.urlScheme ?? 'missing'}`,
    `当前版本号：${iosSection?.config?.versionName ?? 'missing'}`,
    `当前构建号：${iosSection?.config?.buildNumber ?? 'missing'}`,
    '',
    '待补真实演练：',
    '- Apple Team / Profile / App Groups',
    '- Archive / TestFlight 构建号',
    '- 真机入口、账号删除与审核材料截图',
  ].join('\n');

  const desktopBlocks = ['windows', 'macos', 'cli']
    .map((id) => formatArtifactBlock(byId.get(id), id))
    .join('\n\n');
  const desktopText = [
    generatedAt,
    '用途：当前桌面 / CLI 候选包与 SHA256 记录，可直接作为 G-004 / G-005 / G-007 演练前的初始证据。',
    '',
    desktopBlocks,
    '',
    '待补真实演练：',
    '- Windows 全新环境安装 / 升级 / 回滚 / 卸载',
    '- macOS 签名 / 公证 / Gatekeeper',
    '- CLI 对外下载说明与官网入口替换',
  ].join('\n');

  const publicChannels = Array.isArray(snapshot.publicReleaseChannels) ? snapshot.publicReleaseChannels : [];
  const channelText = [
    generatedAt,
    '用途：当前官网公开入口清单，可直接作为 G-006 / G-007 演练前的初始对照。',
    '',
    ...publicChannels.map((item) => [
      `渠道：${item.name}`,
      `状态：${item.status === 'available' ? '可用' : '准备中'}`,
      `入口：${item.href}`,
      `CTA：${item.cta}`,
      `说明：${item.detail}`,
    ].join('\n')),
  ].join('\n\n');

  const rollbackText = [
    generatedAt,
    '用途：发布演练回滚记录占位；真正执行时直接在本文件补时间线、触发原因与结果。',
    '',
    '当前本地候选包：',
    ...manifest.map((item) => `- ${item.name}：${item.preferredArtifact?.relativePath ?? '当前无本地候选包'}`),
    '',
    '待补字段：',
    '触发时间：',
    '触发原因：',
    '问题版本 / 构建号：',
    '回滚入口：',
    '回滚动作：',
    '回滚后验证结果：',
    '对外说明：',
  ].join('\n');

  const manifestJsonPath = seedTextPath('release-candidate-manifest.json');
  const androidPath = seedTextPath('android-release-sha256.txt');
  const iosPath = seedTextPath('ios-testflight-build.txt');
  const desktopPath = seedTextPath('desktop-package-sha256.txt');
  const channelsPath = seedTextPath('site-links-check.txt');
  const rollbackPath = seedTextPath('rollback-record.txt');

  fs.writeFileSync(manifestJsonPath, `${JSON.stringify(snapshot.deliveryManifest ?? [], null, 2)}\n`, 'utf-8');
  fs.writeFileSync(androidPath, `${androidText}\n`, 'utf-8');
  fs.writeFileSync(iosPath, `${iosText}\n`, 'utf-8');
  fs.writeFileSync(desktopPath, `${desktopText}\n`, 'utf-8');
  fs.writeFileSync(channelsPath, `${channelText}\n`, 'utf-8');
  fs.writeFileSync(rollbackPath, `${rollbackText}\n`, 'utf-8');

  return [
    relativeSeedPath('release-candidate-manifest.json'),
    relativeSeedPath('android-release-sha256.txt'),
    relativeSeedPath('ios-testflight-build.txt'),
    relativeSeedPath('desktop-package-sha256.txt'),
    relativeSeedPath('site-links-check.txt'),
    relativeSeedPath('rollback-record.txt'),
  ];
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const activeTasks = releaseTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');

const steps = [
  {
    id: 'public_surface_sync_check',
    title: '官网公开面与 TODO 总自检',
    command: 'node scripts/public_surface_sync_check.mjs',
    run: () => runNodeScript('scripts/public_surface_sync_check.mjs'),
  },
  {
    id: 'release_readiness_snapshot',
    title: '发布就绪快照',
    command: 'node scripts/release_readiness_report.mjs --out default',
    run: () => runNodeScript('scripts/release_readiness_report.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.json'),
    ],
  },
  {
    id: 'release_dry_run_template',
    title: '发布演练模板',
    command: 'node scripts/v2_validation_report.mjs --batch release_dry_run --out default',
    run: () => runNodeScript('scripts/v2_validation_report.mjs', ['--batch', 'release_dry_run', '--out', 'default']),
    outputs: [
      validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
    ],
  },
  {
    id: 'release_run_sheet',
    title: '发布 / 上架 / 官网 / 回滚逐项执行清单',
    command: 'node scripts/release_run_sheet.mjs --out default',
    run: () => runNodeScript('scripts/release_run_sheet.mjs', ['--out', 'default']),
    outputs: [
      validationRelativePath('release_dry_run', 'release-run-sheet.md'),
      validationRelativePath('release_dry_run', 'release-run-sheet.json'),
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

const seededEvidenceOutputs = writeReleaseEvidenceSeeds();

const payload = {
  validationDate,
  tasks: activeTasks.length === 0 ? releaseTasks : activeTasks,
  generatedFrom: 'scripts/prepare_release_wave.mjs',
  summary: {
    executedStepCount: executed.length,
    activeTaskCount: activeTasks.length,
  },
  outputs: [
    validationRelativePath('release_dry_run', 'release-prep-summary.md'),
    validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
    validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
    validationRelativePath('release_dry_run', 'release-run-sheet.md'),
    ...seededEvidenceOutputs,
    'docs/design/release-operations-checklist.md',
  ],
  seededEvidenceOutputs,
  executed,
  nextStep: activeTasks.length === 0
    ? '当前 G-002～G-007 已不是未完成任务；如果只是想刷新发布波次产物，仍可继续使用这条统一入口。'
    : '在此基础上按 docs/design/release-operations-checklist.md 逐平台补签名、上传、真实下载入口、SHA256、监控截图与回滚记录。',
};

const markdown = `# 发布波次统一准备结果

日期：${validationDate}

对应任务：

${(activeTasks.length === 0 ? releaseTasks : activeTasks).map((task) => `- ${task}`).join('\n')}

用途：把 G-002～G-007 进入真实发布 / 演练前需要的公开面自检、发布快照（含对外交付首选产物与 SHA256）和演练模板收敛成一个统一入口，减少手工步骤。

## 本次已执行

${executed.map((step) => `### ${step.title}

- 命令：\`${step.command}\`
${step.outputs.length === 0 ? '' : `${step.outputs.map((item) => `- 输出：\`${item}\``).join('\n')}\n`}
\`\`\`text
${step.output || '（无输出）'}
\`\`\``).join('\n\n')}

## 默认证据入口

- \`${validationRelativePath('release_dry_run', 'release-prep-summary.md')}\`
- \`${validationRelativePath('release_dry_run', 'release-readiness-snapshot.md')}\`
- \`${validationRelativePath('release_dry_run', 'release-dry-run-report.md')}\`
- \`${validationRelativePath('release_dry_run', 'release-run-sheet.md')}\`
- \`${relativeSeedPath('release-candidate-manifest.json')}\`
- \`${relativeSeedPath('android-release-sha256.txt')}\`
- \`${relativeSeedPath('ios-testflight-build.txt')}\`
- \`${relativeSeedPath('desktop-package-sha256.txt')}\`
- \`${relativeSeedPath('site-links-check.txt')}\`
- \`${relativeSeedPath('rollback-record.txt')}\`
- \`docs/design/release-operations-checklist.md\`

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
