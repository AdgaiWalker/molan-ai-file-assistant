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
const defaultMarkdownPath = validationAbsolutePath('remaining-dependency-matrix.md');
const defaultJsonPath = validationAbsolutePath('remaining-dependency-matrix.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function countStatuses(taskIds, statusMap) {
  const counts = { x: 0, '!': 0, v: 0, '~': 0, ' ': 0 };
  for (const taskId of taskIds) {
    const status = statusMap.get(taskId);
    if (!status) continue;
    counts[status] += 1;
  }
  return counts;
}

function dominantStateLabel(counts) {
  if (counts['!'] > 0) return `阻塞（${counts['!']}）`;
  if (counts.v > 0) return `待真机 / 渠道验收（${counts.v}）`;
  if (counts['~'] > 0) return `有基础待外部证据（${counts['~']}）`;
  if (counts[' '] > 0) return `待开始（${counts[' ']}）`;
  return '已关闭';
}

const snapshot = readTodoSnapshot(repoRoot);
const identityAction = getIdentityWaveAction(repoRoot);
const groupDefinitions = [
  {
    id: 'identity_and_accounts',
    title: '正式身份、账号与公开主体',
    tasks: ['A-007', 'G-001'],
    downstreamTasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    command: identityAction.command,
    blocker: identityAction.blockerSummary,
    resources: [
      '正式产品名，以及 Android applicationId / iOS Bundle ID / 桌面 App ID 等最终标识',
      'Apple / Google / Windows 正式开发者账号或团队信息',
      '域名、支持邮箱、隐私政策、服务条款、删除/注销说明与商店后台可提交资料',
    ],
    evidence: [
      identityLocalInputPath,
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'identity-evidence-templates.md'),
      validationRelativePath('minimal-external-inputs.md'),
    ],
  },
  {
    id: 'mobile_true_device',
    title: 'Android / iPhone / iPad 真机来源矩阵',
    tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    downstreamTasks: ['D-010', 'F-005', 'G-002', 'G-003', 'G-006', 'G-007'],
    command: 'node scripts/prepare_mobile_true_device_wave.mjs --out default',
    blocker: '缺 Android / iPhone / iPad 真机、真实来源入口、性能数据与恢复录屏。',
    resources: [
      'Android 真机，至少覆盖微信 / QQ / 浏览器 / 文件管理器来源',
      'iPhone 与 iPad 真机，覆盖微信 / QQ / Safari / “文件”App / 系统分享面板',
      '固定样例、首屏耗时、滚动表现、峰值内存、横竖屏/退后台/杀进程恢复证据',
    ],
    evidence: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
      validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
    ],
  },
  {
    id: 'sync_ai_return',
    title: '同步 / AI 读取 / 结果回流共用环境',
    tasks: ['D-010', 'E-007', 'F-005'],
    downstreamTasks: ['G-002', 'G-003', 'G-006', 'G-007', 'G-008'],
    command: 'node scripts/prepare_sync_ai_wave.mjs --out default',
    blocker: '真实 PostgreSQL 18.4 数据库主链、真实 Codex 读取/写回和电脑确认已通过；缺 Docker Compose 编排/卷隔离与 Android/iOS 真机共同联调证据。',
    resources: [
      'Docker Compose 运行时、卷隔离与桌面端真实收件箱环境',
      'Android / iOS 真机与 Office / PDF 固定样例',
      'Android / iOS 结果回流、打开、复制、分享、保存副本、本机删除和回到来源录屏',
    ],
    evidence: [
      validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
      validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
      validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
      validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
    ],
  },
  {
    id: 'release_and_site',
    title: '正式渠道、签名、公证与官网替换',
    tasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    downstreamTasks: ['G-008'],
    command: 'node scripts/prepare_release_wave.mjs --out default',
    blocker: '缺正式签名、商店/TestFlight/下载渠道、官网真实入口、SHA256 与回滚演练证据。',
    resources: [
      'Android 签名、AAB / APK、渠道后台与升级/回滚验证',
      'Apple Team / Profile、Archive、TestFlight / App Store 入口、macOS 签名与公证',
      'Windows 安装包、官网真实下载链接、客服邮箱、教程截图、发布/监控/回滚记录',
    ],
    evidence: [
      validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
      validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
      validationRelativePath('release_dry_run', 'release-run-sheet.md'),
    ],
  },
  {
    id: 'legacy_mobile_cleanup',
    title: '最终清理窗口（非外部资源）',
    tasks: ['G-008'],
    downstreamTasks: [],
    command: 'node scripts/prepare_legacy_mobile_wave.mjs --out default',
    blocker: '这不是新外部资源问题，而是必须等 G-002～G-007 全部关闭后，才能执行真实删除动作。',
    resources: [
      'G-002～G-007 全部改成 [x]',
      '删除后原生 Android / iOS、桌面 GUI、CLI 的全量构建验证',
      '仓库主流程不再依赖旧 React Native 基线',
    ],
    evidence: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
    ],
  },
];

const groups = groupDefinitions.map((definition) => {
  const directRemaining = definition.tasks.filter((taskId) => snapshot.sectionStatusMap.get(taskId) !== 'x');
  const downstreamRemaining = definition.downstreamTasks.filter((taskId) => snapshot.sectionStatusMap.get(taskId) !== 'x');
  const statusCounts = countStatuses(directRemaining, snapshot.sectionStatusMap);
  return {
    ...definition,
    directRemaining,
    downstreamRemaining,
    statusCounts,
    stateLabel: directRemaining.length === 0 ? '已关闭' : dominantStateLabel(statusCounts),
  };
});

const activeGroups = groups.filter((group) => group.directRemaining.length > 0);
const firstGroup = activeGroups[0] ?? null;

const payload = {
  validationDate,
  generatedFrom: 'scripts/remaining_dependency_matrix.mjs',
  summary: {
    totalTasks: snapshot.sections.length,
    remainingTasks: snapshot.remaining,
    activeGroupCount: activeGroups.length,
    firstGroup: firstGroup ? {
      id: firstGroup.id,
      title: firstGroup.title,
      directRemaining: firstGroup.directRemaining,
      downstreamRemaining: firstGroup.downstreamRemaining,
      command: firstGroup.command,
    } : null,
  },
  groups,
};

const markdown = `# 剩余任务外部依赖矩阵

日期：${validationDate}

用途：不按任务波次，而按“真正卡住收口的外部条件”来分组，看清楚先拿下哪一组资源最值钱。

## 当前结论

- 总任务数：${payload.summary.totalTasks}
- 未完成任务数：${payload.summary.remainingTasks}
- 仍需关注的依赖组：${payload.summary.activeGroupCount}
${firstGroup
  ? `- 当前最先要拿下的一组：${firstGroup.title}
- 起手命令：\`${firstGroup.command}\`
- 直接覆盖任务：${firstGroup.directRemaining.join('、') || '无'}
- 会继续推进的后续任务：${firstGroup.downstreamRemaining.join('、') || '无'}`
  : '- 当前所有依赖组都已关闭。'}

## 依赖矩阵

| 依赖组 | 当前状态 | 直接覆盖任务 | 继续推进 | 起手命令 |
| --- | --- | --- | --- | --- |
${groups.map((group) => `| ${group.title} | ${group.stateLabel} | ${group.directRemaining.length === 0 ? '无' : group.directRemaining.join('、')} | ${group.downstreamRemaining.length === 0 ? '无' : group.downstreamRemaining.join('、')} | \`${group.command}\` |`).join('\n')}

## 分组说明

${groups.map((group) => `### ${group.title}

- 当前状态：${group.stateLabel}
- 直接覆盖任务：${group.directRemaining.length === 0 ? '无' : group.directRemaining.join('、')}
- 继续推进：${group.downstreamRemaining.length === 0 ? '无' : group.downstreamRemaining.join('、')}
- 当前卡点：${group.directRemaining.length === 0 ? '本组直接任务已关闭。' : group.blocker}

#### 本组必须到位的资源

${group.resources.map((item) => `- ${item}`).join('\n')}

#### 现成证据入口

${group.evidence.map((item) => `- \`${item}\``).join('\n')}

#### 默认起手命令

- \`${group.command}\`
`).join('\n')}

## 极简外部输入清单

- \`${validationRelativePath('minimal-external-inputs.md')}\`
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
