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
const defaultMarkdownPath = validationAbsolutePath('remaining-completion-audit.md');
const defaultJsonPath = validationAbsolutePath('remaining-completion-audit.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
}

const snapshot = readTodoSnapshot(repoRoot);
const identityAction = getIdentityWaveAction(repoRoot);
const dashboard = readJson(validationRelativePath('remaining-execution-dashboard.json'));
const reportCheck = readJson(validationRelativePath('validation-report-check.json'));

const waveMap = new Map();
for (const wave of dashboard?.waves ?? []) {
  for (const task of wave.tasks ?? []) {
    waveMap.set(task.id ?? task, wave);
  }
}

const reportMap = new Map();
for (const report of reportCheck?.reports ?? []) {
  reportMap.set(report.batchId, report);
}

const taskDefinitions = {
  'A-007': {
    category: 'identity',
    command: identityAction.command,
    evidence: [
      identityLocalInputPath,
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      ...identityEvidenceSeeds,
    ],
    blocker: identityAction.blockerSummary,
  },
  'G-001': {
    category: 'identity',
    command: identityAction.command,
    evidence: [
      identityLocalInputPath,
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      ...identityEvidenceSeeds,
    ],
    blocker: identityAction.blockerSummary,
  },
  'B-002': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 Android 真机真实来源入口录屏与耗时证据。' },
  'B-004': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 Android 真机滚动、耗时与内存证据。' },
  'B-008': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有中低端 Android 真机性能与恢复矩阵。' },
  'B-009': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有两种国产 Android 品牌的真实入口验收矩阵。' },
  'C-002': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 iPhone 真机真实来源入口录屏与耗时证据。' },
  'C-004': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 iPhone 真机滚动、耗时与内存证据。' },
  'C-008': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 iPhone / iPad 真机性能与恢复矩阵。' },
  'C-009': { category: 'mobile_true_device', command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default', evidence: [validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'), ...mobileEvidenceSeeds], blocker: '还没有 iPhone / iPad 真实入口验收矩阵。' },
  'D-010': { category: 'sync_ai_return', command: 'node scripts/prepare_sync_ai_wave.mjs --out default', evidence: [validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'), ...syncAiEvidenceSeeds], blocker: '真实 PostgreSQL 18.4 数据库主链已通过；仍缺 Docker Compose 编排/卷隔离、真机、Office/PDF、弱网/长离线/冲突的真实联调证据。' },
  'E-007': { category: 'sync_ai_return', command: 'node scripts/prepare_sync_ai_wave.mjs --out default', evidence: [validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'), ...syncAiEvidenceSeeds], blocker: '缺真实 AI 客户端对授权/撤回链路的录屏或日志证据。' },
  'F-005': { category: 'sync_ai_return', command: 'node scripts/prepare_sync_ai_wave.mjs --out default', evidence: [validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'), ...syncAiEvidenceSeeds], blocker: '真实 Codex 客户端生成 Markdown/JSON 并由电脑确认已通过；仍缺 Android/iOS 真机结果回流、打开、复制、分享、保存副本、本机删除和回到来源录屏。' },
  'G-002': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'), ...releaseEvidenceSeeds], blocker: '缺正式签名、AAB/Release APK、渠道上传与真机安装升级证据。' },
  'G-003': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'), ...releaseEvidenceSeeds], blocker: '缺 Apple Team/Profile、Archive、TestFlight 上传与真机入口验收。' },
  'G-004': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'), ...releaseEvidenceSeeds], blocker: '缺正式 Windows 安装包、全新环境手测与发布渠道证据。' },
  'G-005': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'), ...releaseEvidenceSeeds], blocker: '缺正式 Apple 账号、签名、公证与 Gatekeeper 全新机验证。' },
  'G-006': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'), ...releaseEvidenceSeeds], blocker: '缺真实下载渠道、真实客服邮箱、真机教程截图与 SHA256 公布。' },
  'G-007': { category: 'release_and_site', command: 'node scripts/prepare_release_wave.mjs --out default', evidence: [validationRelativePath('release_dry_run', 'release-dry-run-report.md'), ...releaseEvidenceSeeds], blocker: '缺一次真实测试版本发布/回滚演练的完整证据。' },
  'G-008': { category: 'legacy_mobile', command: 'node scripts/prepare_legacy_mobile_wave.mjs --out default', evidence: [validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'), validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'), ...legacyEvidenceSeeds], blocker: '前置发布任务 G-002～G-007 尚未全部关闭，不能执行真实删除动作。' },
};

function statusLabel(status) {
  if (status === '!') return '阻塞';
  if (status === 'v') return '待实机/商店验收';
  if (status === '~') return '有基础但未完成';
  return status;
}

function reportForTask(taskId) {
  if (taskDefinitions[taskId]?.category === 'mobile_true_device') return reportMap.get('mobile_true_device') ?? null;
  if (taskDefinitions[taskId]?.category === 'sync_ai_return') {
    if (taskId === 'D-010') return reportMap.get('gate_d_sync') ?? null;
    if (taskId === 'E-007') return reportMap.get('gate_e_ai_read') ?? null;
    if (taskId === 'F-005') return reportMap.get('gate_f_result_return') ?? null;
  }
  if (taskDefinitions[taskId]?.category === 'release_and_site') return reportMap.get('release_dry_run') ?? null;
  return null;
}

const remainingTasks = snapshot.sections.filter((item) => item.status !== 'x');
const audits = remainingTasks.map((task) => {
  const definition = taskDefinitions[task.id];
  const wave = waveMap.get(task.id);
  const report = reportForTask(task.id);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    statusLabel: statusLabel(task.status),
    wave: wave?.title ?? '未归类',
    command: definition?.command ?? '无',
    blocker: definition?.blocker ?? '未定义',
    evidence: definition?.evidence ?? [],
    reportStatus: report?.reportStatus ?? null,
    reportCheckStatus: report?.status ?? null,
    reportIssues: report?.issues ?? [],
    readyToClose: task.status === 'x',
  };
});

const payload = {
  validationDate,
  generatedFrom: 'scripts/remaining_completion_audit.mjs',
  summary: {
    totalRemaining: remainingTasks.length,
    blocked: remainingTasks.filter((item) => item.status === '!').length,
    verify: remainingTasks.filter((item) => item.status === 'v').length,
    inProgress: remainingTasks.filter((item) => item.status === '~').length,
  },
  audits,
};

const markdown = `# 剩余任务完成审计

日期：${validationDate}

用途：逐项说明当前每个未完成任务为什么还不能改成 \`[x]\`，以及现成证据、默认命令和直接阻塞原因是什么。

## 汇总

- 未完成任务数：${payload.summary.totalRemaining}
- [!]：${payload.summary.blocked}
- [v]：${payload.summary.verify}
- [~]：${payload.summary.inProgress}

${audits.map((item) => `## ${item.id} ${item.title}

- 当前状态：\`${item.status}\`（${item.statusLabel}）
- 所属波次：${item.wave}
- 默认命令：\`${item.command}\`
- 不能关闭的直接原因：${item.blocker}
- 关联报告状态：${item.reportStatus ? `\`${item.reportStatus}\`` : '无'}
- 报告检查状态：${item.reportCheckStatus ? `\`${item.reportCheckStatus}\`` : '无'}
${item.reportIssues.length === 0 ? '- 报告检查未发现额外问题。' : item.reportIssues.map((issue) => `- 报告问题：${issue}`).join('\n')}

### 现成证据入口

${(item.evidence.length === 0 ? ['无'] : item.evidence).map((evidence) => `- \`${evidence}\``).join('\n')}
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
