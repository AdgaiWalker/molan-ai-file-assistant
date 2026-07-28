#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { batches, validationDate } from './v2_validation_data.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const releaseRunDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'release_dry_run');
const identityDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'identity_and_accounts');
const legacyMobileDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'legacy_mobile');
const mobileTrueDeviceDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'mobile_true_device');
const syncAiDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'sync_ai_return');
const summaryPath = path.join(repoRoot, 'docs/validation-runs', validationDate, 'prepare-summary.md');
const summaryJsonPath = path.join(repoRoot, 'docs/validation-runs', validationDate, 'prepare-summary.json');
const fastPathMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'fastest-remaining-path.md');
const fastPathJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'fastest-remaining-path.json');
const nextActionMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'next-remaining-action.md');
const nextActionJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'next-remaining-action.json');
const dashboardMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-execution-dashboard.md');
const dashboardJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-execution-dashboard.json');
const dependencyMatrixMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-dependency-matrix.md');
const dependencyMatrixJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-dependency-matrix.json');
const reportCheckMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'validation-report-check.md');
const reportCheckJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'validation-report-check.json');
const completionAuditMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-completion-audit.md');
const completionAuditJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'remaining-completion-audit.json');
const minimalExternalInputsMarkdown = path.join(repoRoot, 'docs/validation-runs', validationDate, 'minimal-external-inputs.md');
const minimalExternalInputsJson = path.join(repoRoot, 'docs/validation-runs', validationDate, 'minimal-external-inputs.json');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const writeSummary = args.includes('--write-summary');

const identityEvidenceSeeds = [
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'current-product-identity.json')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'current-identity-values.txt')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'public-doc-placeholders.txt')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'identity-readiness-findings.txt')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'engineering-identity-values.txt')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'identity-checklist-seed.txt')),
  path.relative(repoRoot, path.join(identityDir, 'evidence', 'identity-evidence-templates.txt')),
];

const releaseEvidenceSeeds = [
  path.relative(repoRoot, path.join(releaseRunDir, 'release-run-sheet.md')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'release-candidate-manifest.json')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'android-release-sha256.txt')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'ios-testflight-build.txt')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'desktop-package-sha256.txt')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'site-links-check.txt')),
  path.relative(repoRoot, path.join(releaseRunDir, 'evidence', 'rollback-record.txt')),
];

const legacyEvidenceSeeds = [
  path.relative(repoRoot, path.join(legacyMobileDir, 'legacy-mobile-run-sheet.md')),
  path.relative(repoRoot, path.join(legacyMobileDir, 'evidence', 'legacy-delete-ready-state.json')),
  path.relative(repoRoot, path.join(legacyMobileDir, 'evidence', 'legacy-delete-blockers.txt')),
  path.relative(repoRoot, path.join(legacyMobileDir, 'evidence', 'legacy-delete-audit-buckets.txt')),
  path.relative(repoRoot, path.join(legacyMobileDir, 'evidence', 'legacy-delete-checklist.txt')),
  path.relative(repoRoot, path.join(legacyMobileDir, 'evidence', 'legacy-post-delete-verification.txt')),
];

const mobileEvidenceSeeds = [
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'mobile-device-run-sheet.md')),
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'evidence', 'mobile-device-matrix.txt')),
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'evidence', 'mobile-sample-checksums.txt')),
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'evidence', 'mobile-evidence-paths.txt')),
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'evidence', 'mobile-report-fields.txt')),
  path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'evidence', 'mobile-run-checklist.txt')),
];

const syncAiEvidenceSeeds = [
  path.relative(repoRoot, path.join(syncAiDir, 'sync-ai-run-sheet.md')),
  path.relative(repoRoot, path.join(repoRoot, 'docs/validation-runs', validationDate, 'gate_d_sync', 'evidence', 'postgres18-native-integration.txt')),
  path.relative(repoRoot, path.join(repoRoot, 'docs/validation-runs', validationDate, 'gate_f_result_return', 'evidence', 'codex-mcp-result-write-confirm.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'sync-ai-environment-checklist.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'sync-ai-sample-checksums.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'sync-ai-run-order.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'gate-d-evidence-paths.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'gate-e-evidence-paths.txt')),
  path.relative(repoRoot, path.join(syncAiDir, 'evidence', 'gate-f-evidence-paths.txt')),
];

function runNodeScript(relativeScript, scriptArgs) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, relativeScript), ...scriptArgs], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error([
      `执行失败：node ${relativeScript} ${scriptArgs.join(' ')}`,
      result.stdout?.trim(),
      result.stderr?.trim(),
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

function reportPathFor(batch) {
  return path.join(
    repoRoot,
    'docs/validation-runs',
    validationDate,
    batch.id,
    `${batch.defaultSlug ?? batch.id}-report.md`,
  );
}

const todoStatuses = readTodoSnapshot(repoRoot).sectionStatusMap;
const pendingBatches = batches.filter((batch) => batch.tasks.some((task) => todoStatuses.get(task) !== 'x'));
const releaseTasks = ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'];
const identityTasks = ['A-007', 'G-001'];
const mobileTrueDeviceTasks = ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'];
const syncAiTasks = ['D-010', 'E-007', 'F-005'];
const legacyMobileTasks = ['G-008'];
const shouldPrepareReleaseSnapshot = releaseTasks.some((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x');
const shouldPrepareIdentityTemplate = identityTasks.some((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x');
const shouldPrepareMobileTrueDeviceWave = mobileTrueDeviceTasks.some((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x');
const shouldPrepareSyncAiWave = syncAiTasks.some((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x');
const shouldPrepareLegacyMobileAudit = legacyMobileTasks.some((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x');

const prepared = [];

runNodeScript('scripts/public_surface_sync_check.mjs', []);
prepared.push({
  kind: 'public_surface_check',
  id: 'public_surface_sync',
  title: '公开面与 TODO 总自检',
  tasks: ['A-007', 'G-001', 'G-006', 'G-007', 'G-008'],
  output: 'node scripts/public_surface_sync_check.mjs',
});

if (shouldPrepareIdentityTemplate) {
  runNodeScript('scripts/prepare_identity_and_accounts.mjs', ['--out', 'default']);
  prepared.push({
    kind: 'identity_prepare_summary',
    id: 'identity_prepare_summary',
    title: '身份与账号统一准备摘要',
    tasks: identityTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(identityDir, 'identity-prep-summary.md')),
    jsonOutput: path.relative(repoRoot, path.join(identityDir, 'identity-prep-summary.json')),
    extraOutputs: identityEvidenceSeeds,
  });
  prepared.push({
    kind: 'identity_template',
    id: 'identity_and_accounts',
    title: '身份、账号与责任主体清单',
    tasks: identityTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(identityDir, 'identity-and-accounts-checklist.md')),
    jsonOutput: path.relative(repoRoot, path.join(identityDir, 'identity-and-accounts-checklist.json')),
  });
  prepared.push({
    kind: 'identity_snapshot',
    id: 'identity_readiness',
    title: '身份与公开入口当前状态快照',
    tasks: identityTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(identityDir, 'identity-readiness-snapshot.md')),
    jsonOutput: path.relative(repoRoot, path.join(identityDir, 'identity-readiness-snapshot.json')),
  });
  prepared.push({
    kind: 'engineering_identity',
    id: 'engineering_identity',
    title: '工程身份一致性快照',
    tasks: identityTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(identityDir, 'engineering-identity-snapshot.md')),
    jsonOutput: path.relative(repoRoot, path.join(identityDir, 'engineering-identity-snapshot.json')),
  });
}

for (const batch of pendingBatches) {
  if (batch.id === 'mobile_true_device' && shouldPrepareMobileTrueDeviceWave) {
    continue;
  }
  if (['gate_d_sync', 'gate_e_ai_read', 'gate_f_result_return'].includes(batch.id) && shouldPrepareSyncAiWave) {
    continue;
  }
  if (batch.id === 'release_dry_run' && shouldPrepareReleaseSnapshot) {
    continue;
  }
  runNodeScript('scripts/v2_validation_report.mjs', ['--batch', batch.id, '--out', 'default']);
  prepared.push({
    kind: 'validation_batch',
    id: batch.id,
    title: batch.title,
    tasks: batch.tasks,
    output: path.relative(repoRoot, reportPathFor(batch)),
  });
}

if (shouldPrepareMobileTrueDeviceWave) {
  runNodeScript('scripts/prepare_mobile_true_device_wave.mjs', ['--out', 'default']);
  prepared.push({
    kind: 'mobile_true_device_prepare_summary',
    id: 'mobile_true_device_prepare_summary',
    title: '移动真机批次统一准备摘要',
    tasks: mobileTrueDeviceTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'mobile-true-device-prep-summary.md')),
    jsonOutput: path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'mobile-true-device-prep-summary.json')),
    extraOutputs: mobileEvidenceSeeds,
  });
  prepared.push({
    kind: 'mobile_true_device',
    id: 'mobile_true_device',
    title: '移动真机批次（B/C）',
    tasks: mobileTrueDeviceTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(mobileTrueDeviceDir, 'mobile-true-device-report.md')),
  });
}

if (shouldPrepareSyncAiWave) {
  runNodeScript('scripts/prepare_sync_ai_wave.mjs', ['--out', 'default']);
  prepared.push({
    kind: 'sync_ai_prepare_summary',
    id: 'sync_ai_prepare_summary',
    title: '同步 / AI 读取 / 结果回流统一准备摘要',
    tasks: syncAiTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(syncAiDir, 'sync-ai-prep-summary.md')),
    jsonOutput: path.relative(repoRoot, path.join(syncAiDir, 'sync-ai-prep-summary.json')),
    extraOutputs: syncAiEvidenceSeeds,
  });
  prepared.push({
    kind: 'gate_d_sync',
    id: 'gate_d_sync',
    title: 'Gate D 外部批次（D-010）',
    tasks: ['D-010'].filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(repoRoot, 'docs/validation-runs', validationDate, 'gate_d_sync', 'gate-d-sync-report.md')),
  });
  if (todoStatuses.get('E-007') !== 'x') {
    prepared.push({
      kind: 'gate_e_ai_read',
      id: 'gate_e_ai_read',
      title: 'Gate E 外部批次（E-007）',
      tasks: ['E-007'],
      output: path.relative(repoRoot, path.join(repoRoot, 'docs/validation-runs', validationDate, 'gate_e_ai_read', 'gate-e-ai-read-report.md')),
    });
  }
  prepared.push({
    kind: 'gate_f_result_return',
    id: 'gate_f_result_return',
    title: 'Gate F 外部批次（F-005）',
    tasks: ['F-005'].filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(repoRoot, 'docs/validation-runs', validationDate, 'gate_f_result_return', 'gate-f-result-return-report.md')),
  });
}

if (shouldPrepareReleaseSnapshot) {
  runNodeScript('scripts/prepare_release_wave.mjs', ['--out', 'default']);
  prepared.push({
    kind: 'release_prepare_summary',
    id: 'release_prepare_summary',
    title: '发布波次统一准备摘要',
    tasks: releaseTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(releaseRunDir, 'release-prep-summary.md')),
    jsonOutput: path.relative(repoRoot, path.join(releaseRunDir, 'release-prep-summary.json')),
    extraOutputs: releaseEvidenceSeeds,
  });
  prepared.push({
    kind: 'release_snapshot',
    id: 'release_readiness',
    title: '发布就绪快照',
    tasks: releaseTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(releaseRunDir, 'release-readiness-snapshot.md')),
    jsonOutput: path.relative(repoRoot, path.join(releaseRunDir, 'release-readiness-snapshot.json')),
  });
  prepared.push({
    kind: 'release_dry_run',
    id: 'release_dry_run',
    title: '发布前演练批次（G-007）',
    tasks: ['G-007'].filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(releaseRunDir, 'release-dry-run-report.md')),
  });
}

if (shouldPrepareLegacyMobileAudit) {
  runNodeScript('scripts/prepare_legacy_mobile_wave.mjs', ['--out', 'default']);
  prepared.push({
    kind: 'legacy_mobile_prepare_summary',
    id: 'legacy_mobile_prepare_summary',
    title: '旧 mobile 删除波次统一准备摘要',
    tasks: legacyMobileTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(legacyMobileDir, 'legacy-mobile-prep-summary.md')),
    jsonOutput: path.relative(repoRoot, path.join(legacyMobileDir, 'legacy-mobile-prep-summary.json')),
    extraOutputs: legacyEvidenceSeeds,
  });
  prepared.push({
    kind: 'legacy_mobile_audit',
    id: 'legacy_mobile',
    title: '旧 mobile 基线删除前审计',
    tasks: legacyMobileTasks.filter((task) => todoStatuses.get(task) && todoStatuses.get(task) !== 'x'),
    output: path.relative(repoRoot, path.join(legacyMobileDir, 'legacy-mobile-retirement-audit.md')),
    jsonOutput: path.relative(repoRoot, path.join(legacyMobileDir, 'legacy-mobile-retirement-audit.json')),
  });
}

runNodeScript('scripts/remaining_todo_fast_path.mjs', ['--out', 'default']);
runNodeScript('scripts/next_remaining_action.mjs', ['--out', 'default']);
runNodeScript('scripts/remaining_execution_dashboard.mjs', ['--out', 'default']);
runNodeScript('scripts/remaining_dependency_matrix.mjs', ['--out', 'default']);
runNodeScript('scripts/check_validation_reports.mjs', ['--remaining', '--out', 'default']);
runNodeScript('scripts/remaining_completion_audit.mjs', ['--out', 'default']);
runNodeScript('scripts/minimal_external_inputs.mjs', ['--out', 'default']);

const payload = {
  validationDate,
  pendingBatchCount: pendingBatches.length,
  prepared,
  fastPath: {
    markdown: path.relative(repoRoot, fastPathMarkdown),
    json: path.relative(repoRoot, fastPathJson),
  },
  nextAction: {
    markdown: path.relative(repoRoot, nextActionMarkdown),
    json: path.relative(repoRoot, nextActionJson),
  },
  dashboard: {
    markdown: path.relative(repoRoot, dashboardMarkdown),
    json: path.relative(repoRoot, dashboardJson),
  },
  dependencyMatrix: {
    markdown: path.relative(repoRoot, dependencyMatrixMarkdown),
    json: path.relative(repoRoot, dependencyMatrixJson),
  },
  reportCheck: {
    markdown: path.relative(repoRoot, reportCheckMarkdown),
    json: path.relative(repoRoot, reportCheckJson),
  },
  completionAudit: {
    markdown: path.relative(repoRoot, completionAuditMarkdown),
    json: path.relative(repoRoot, completionAuditJson),
  },
  minimalExternalInputs: {
    markdown: path.relative(repoRoot, minimalExternalInputsMarkdown),
    json: path.relative(repoRoot, minimalExternalInputsJson),
  },
};

const markdown = `# 剩余外部批次准备结果

日期：${validationDate}

用途：根据当前 \`TODO.md\` 的未完成状态，一次性准备仍需执行的外部批次模板与发布快照。

## 本次已准备

${prepared.length === 0 ? '- 当前没有需要准备的外部批次。' : prepared.map((item) => {
  const taskLine = item.tasks.join(' / ');
  const outputs = item.kind === 'validation_batch'
    ? `- 输出：\`${item.output}\``
    : item.jsonOutput
    ? `- 输出：\`${item.output}\`\n- JSON：\`${item.jsonOutput}\`${item.extraOutputs?.length ? `\n- 证据种子：\n${item.extraOutputs.map((output) => `  - \`${output}\``).join('\n')}` : ''}`
    : `- 输出：\`${item.output}\``;
  return `### ${item.title}

- 关联任务：${taskLine}
${outputs}`;
}).join('\n\n')}

### 最短收口路径

- 输出：\`${path.relative(repoRoot, fastPathMarkdown)}\`
- JSON：\`${path.relative(repoRoot, fastPathJson)}\`

### 当前下一步动作

- 输出：\`${path.relative(repoRoot, nextActionMarkdown)}\`
- JSON：\`${path.relative(repoRoot, nextActionJson)}\`

### 剩余任务执行看板

- 输出：\`${path.relative(repoRoot, dashboardMarkdown)}\`
- JSON：\`${path.relative(repoRoot, dashboardJson)}\`

### 剩余任务外部依赖矩阵

- 输出：\`${path.relative(repoRoot, dependencyMatrixMarkdown)}\`
- JSON：\`${path.relative(repoRoot, dependencyMatrixJson)}\`

### 外部批次报告检查

- 输出：\`${path.relative(repoRoot, reportCheckMarkdown)}\`
- JSON：\`${path.relative(repoRoot, reportCheckJson)}\`

### 剩余任务完成审计

- 输出：\`${path.relative(repoRoot, completionAuditMarkdown)}\`
- JSON：\`${path.relative(repoRoot, completionAuditJson)}\`

### 最小外部输入清单

- 输出：\`${path.relative(repoRoot, minimalExternalInputsMarkdown)}\`
- JSON：\`${path.relative(repoRoot, minimalExternalInputsJson)}\`
`;

if (writeSummary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${markdown}\n`, 'utf-8');
  fs.writeFileSync(summaryJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} else {
  process.stdout.write(`${markdown}\n`);
}
