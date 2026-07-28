#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getIdentityWaveAction, identityLocalInputPath } from './identity_wave_status_lib.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

const identityEvidenceSeeds = [
  validationRelativePath('identity_and_accounts', 'evidence', 'current-product-identity.json'),
  validationRelativePath('identity_and_accounts', 'evidence', 'current-identity-values.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'public-doc-placeholders.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-readiness-findings.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'engineering-identity-values.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-checklist-seed.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-evidence-templates.txt'),
];

const releaseEvidenceSeeds = [
  validationRelativePath('release_dry_run', 'release-run-sheet.md'),
  validationRelativePath('release_dry_run', 'evidence', 'release-candidate-manifest.json'),
  validationRelativePath('release_dry_run', 'evidence', 'android-release-sha256.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'ios-testflight-build.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'desktop-package-sha256.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'site-links-check.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'rollback-record.txt'),
];

const legacyEvidenceSeeds = [
  validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-ready-state.json'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-blockers.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-audit-buckets.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-checklist.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-post-delete-verification.txt'),
];

const mobileEvidenceSeeds = [
  validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-device-matrix.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-sample-checksums.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-evidence-paths.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-report-fields.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-run-checklist.txt'),
];

const syncAiEvidenceSeeds = [
  validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
  validationRelativePath('gate_d_sync', 'evidence', 'postgres18-native-integration.txt'),
  validationRelativePath('gate_f_result_return', 'evidence', 'codex-mcp-result-write-confirm.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-environment-checklist.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-sample-checksums.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-run-order.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-d-evidence-paths.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-e-evidence-paths.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-f-evidence-paths.txt'),
];
const defaultMarkdownPath = validationAbsolutePath('remaining-execution-dashboard.md');
const defaultJsonPath = validationAbsolutePath('remaining-execution-dashboard.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readJsonIfExists(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
}

const snapshot = readTodoSnapshot(repoRoot);
const identityAction = getIdentityWaveAction(repoRoot);
const waveDefinitions = [
  {
    id: 'identity_and_accounts',
    title: '第 1 波：身份、账号与责任主体',
    tasks: ['A-007', 'G-001'],
    command: identityAction.command,
    summaryJson: validationRelativePath('identity_and_accounts', 'identity-prep-summary.json'),
    evidence: [
      identityLocalInputPath,
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      ...identityEvidenceSeeds,
    ],
    blockerRule: () => identityAction.blockerSummary,
  },
  {
    id: 'mobile_true_device',
    title: '第 2 波：移动真机矩阵一次跑完',
    tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default',
    summaryJson: validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.json'),
    evidence: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
      ...mobileEvidenceSeeds,
    ],
    blockerRule: () => '需要 Android / iPhone / iPad 真机、微信/QQ/浏览器/文件 App 等真实来源矩阵取证。',
  },
  {
    id: 'sync_ai_return',
    title: '第 3 波：同步 / AI / 结果回流共用环境',
    tasks: ['D-010', 'E-007', 'F-005'],
    command: 'node scripts/prepare_sync_ai_wave.mjs --out default',
    summaryJson: validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.json'),
    evidence: [
      validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
      validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
      validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
      ...syncAiEvidenceSeeds,
    ],
    blockerRule: () => '真实 PostgreSQL 18.4 数据库主链、真实 Codex 读取/写回和电脑确认已通过；还需要 Docker Compose 编排/卷隔离与 Android/iOS 真机完成剩余矩阵。',
  },
  {
    id: 'release_and_site',
    title: '第 4 波：平台发布、官网与演练',
    tasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    command: 'node scripts/prepare_release_wave.mjs --out default',
    summaryJson: validationRelativePath('release_dry_run', 'release-prep-summary.json'),
    evidence: [
      validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
      validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
      ...releaseEvidenceSeeds,
    ],
    blockerRule: () => {
      const identityPending = ['A-007', 'G-001'].some((task) => snapshot.sectionStatusMap.get(task) !== 'x');
      const gatePending = ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009', 'D-010', 'E-007', 'F-005']
        .some((task) => snapshot.sectionStatusMap.get(task) !== 'x');
      const reasons = [];
      if (identityPending) reasons.push('正式身份与账号前置未关闭');
      if (gatePending) reasons.push('B/C/D/E/F 外部证据仍未补齐');
      return reasons.length === 0
        ? '仍需真实商店/下载渠道、签名、公证、TestFlight 与回滚演练证据。'
        : reasons.join('；');
    },
  },
  {
    id: 'legacy_mobile',
    title: '第 5 波：删除旧 React Native 端',
    tasks: ['G-008'],
    command: 'node scripts/prepare_legacy_mobile_wave.mjs --out default',
    summaryJson: validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.json'),
    evidence: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      ...legacyEvidenceSeeds,
    ],
    blockerRule: () => {
      const pending = ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007']
        .filter((task) => snapshot.sectionStatusMap.get(task) !== 'x');
      return pending.length === 0
        ? '仍需执行真实删除动作并完成删除后的全量构建验证。'
        : `仍需先关闭这些发布任务：${pending.join('、')}`;
    },
  },
];

function summarizeWave(wave) {
  const taskStatuses = wave.tasks.map((task) => ({
    id: task,
    status: snapshot.sectionStatusMap.get(task) ?? 'missing',
  }));
  const remainingTasks = taskStatuses.filter((item) => item.status !== 'x').map((item) => item.id);
  const allDone = remainingTasks.length === 0;
  const summaryJson = readJsonIfExists(wave.summaryJson);
  const prepReady = summaryJson !== null;
  return {
    id: wave.id,
    title: wave.title,
    tasks: taskStatuses,
    remainingTasks,
    allDone,
    prepReady,
    command: wave.command,
    summaryJson: wave.summaryJson,
    evidence: wave.evidence,
    blocker: allDone ? '当前波次任务都已完成。' : wave.blockerRule(),
  };
}

const waves = waveDefinitions.map(summarizeWave);
const nextWave = waves.find((wave) => !wave.allDone);

const payload = {
  validationDate,
  generatedFrom: 'scripts/remaining_execution_dashboard.mjs',
  summary: {
    totalTasks: snapshot.sections.length,
    remainingTasks: snapshot.remaining,
    blockedCount: snapshot.counts['!'],
    verifyCount: snapshot.counts.v,
    inProgressCount: snapshot.counts['~'],
  },
  nextWave: nextWave ? {
    id: nextWave.id,
    title: nextWave.title,
    command: nextWave.command,
  } : null,
  waves,
};

function statusLabel(status) {
  if (status === 'x') return '[x] 已完成';
  if (status === '!') return '[!] 阻塞';
  if (status === 'v') return '[v] 待实机/商店验收';
  if (status === '~') return '[~] 有基础但未完成';
  if (status === ' ') return '[ ] 待做';
  return `[${status}] 未知`;
}

const markdown = `# 剩余任务执行看板

日期：${validationDate}

用途：把当前剩余任务按执行波次集中成一个总览，看清楚“下一波是什么、被什么卡住、默认命令是什么、证据入口在哪”。

## 当前总览

- 总任务数：${payload.summary.totalTasks}
- 未完成任务数：${payload.summary.remainingTasks}
- [!]：${payload.summary.blockedCount}
- [v]：${payload.summary.verifyCount}
- [~]：${payload.summary.inProgressCount}

${payload.nextWave
  ? `## 当前默认下一波

- 波次：${payload.nextWave.title}
- 起手命令：\`${payload.nextWave.command}\``
  : '## 当前默认下一波\n\n- 当前所有波次都已完成。'}

## 波次状态

${waves.map((wave) => `### ${wave.title}

- 默认命令：\`${wave.command}\`
- 波次状态：${wave.allDone ? '已完成' : (wave.prepReady ? '已准备，可执行' : '未准备')}
- 未完成任务：${wave.remainingTasks.length === 0 ? '无' : wave.remainingTasks.join('、')}
- 当前阻塞：${wave.blocker}
- 任务状态：${wave.tasks.map((item) => `${item.id} ${statusLabel(item.status)}`).join('；')}

#### 证据入口

${wave.evidence.map((item) => `- \`${item}\``).join('\n')}
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
