#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = validationAbsolutePath('legacy_mobile');
const defaultMarkdownPath = path.join(defaultDir, 'legacy-mobile-run-sheet.md');
const defaultJsonPath = path.join(defaultDir, 'legacy-mobile-run-sheet.json');
const auditJsonPath = path.join(defaultDir, 'legacy-mobile-retirement-audit.json');
const releaseTasks = ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'];

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readAudit() {
  if (!fs.existsSync(auditJsonPath)) {
    throw new Error(`缺少旧 mobile 审计：${auditJsonPath}。请先运行 node scripts/legacy_mobile_retirement_audit.mjs --out default`);
  }
  return JSON.parse(fs.readFileSync(auditJsonPath, 'utf-8'));
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function evidencePath(fileName) {
  return validationRelativePath('legacy_mobile', 'evidence', fileName);
}

function addRow(rows, definition) {
  rows.push({
    ...definition,
    resultFields: [
      '执行人',
      '执行日期',
      '命令或动作',
      '输出摘要',
      '证据路径',
      '是否通过',
      '问题与下一步',
    ],
  });
}

const todoSnapshot = readTodoSnapshot(repoRoot);
const pendingReleaseTasks = releaseTasks.filter((task) => todoSnapshot.sectionStatusMap.get(task) && todoSnapshot.sectionStatusMap.get(task) !== 'x');
const audit = readAudit();
const readyByRelease = pendingReleaseTasks.length === 0;
const readyByAudit = (audit.blockingHits ?? 0) === 0;
const readyToDelete = readyByRelease && readyByAudit;
const rows = [];

addRow(rows, {
  id: 'g008-01-release-precondition',
  phase: '删除前置',
  gate: readyByRelease ? '可继续' : '禁止删除',
  action: '确认 G-002～G-007 已全部关闭，发布产物可获取，回滚方案不依赖旧 React Native 应用。',
  passRule: 'G-002～G-007 全部为 [x]；否则不得执行真实删除动作。',
  evidence: evidencePath('legacy-delete-ready-state.json'),
});

addRow(rows, {
  id: 'g008-02-audit-must-remove-zero',
  phase: '删除前审计',
  gate: readyByAudit ? '可继续' : '禁止删除',
  action: '运行 legacy_mobile_retirement_audit，确认“必须移除”分组为 0 个文件 / 0 行。',
  passRule: '主流程、README、AGENTS、CI、站点和活跃文档不再引用 mobile/、Expo 或 React Native。',
  evidence: validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
});

addRow(rows, {
  id: 'g008-03-backup-current-state',
  phase: '删除前记录',
  gate: '可预先执行',
  action: '记录删除前 git status、legacy 审计摘要和当前 TODO 状态，方便回滚和复盘。',
  passRule: '删除前状态可追溯；不需要复制 archive 副本。',
  evidence: evidencePath('legacy-delete-blockers.txt'),
});

addRow(rows, {
  id: 'g008-04-delete-mobile-directory',
  phase: '真实删除',
  gate: readyToDelete ? '可执行' : '禁止删除',
  action: '删除旧 mobile/ 目录。',
  passRule: '只有 readyToDelete=true 时才执行；删除后工作区不再存在旧 React Native 工程。',
  evidence: evidencePath('legacy-delete-checklist.txt'),
});

addRow(rows, {
  id: 'g008-05-remove-legacy-only-deps',
  phase: '真实删除',
  gate: readyToDelete ? '可执行' : '禁止删除',
  action: '删除只为旧 mobile 存在的依赖、脚本、CI、文档和 generated 缓存引用。',
  passRule: '不删除原生 Android/iOS、desktop、CLI、contracts、site 或历史验收记录需要保留的证据。',
  evidence: evidencePath('legacy-delete-checklist.txt'),
});

addRow(rows, {
  id: 'g008-06-post-delete-search',
  phase: '删除后验证',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '全文搜索 mobile/、Expo、React Native、expo start 等旧移动端关键词。',
  passRule: '必须移除范围无命中；TODO、历史证据和本 run sheet 中的保留引用不计阻塞。',
  evidence: evidencePath('legacy-post-delete-verification.txt'),
});

addRow(rows, {
  id: 'g008-07-android-build',
  phase: '删除后验证',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '运行原生 Android 构建与测试。',
  passRule: 'native Android 构建/测试通过，证明删除旧 mobile 未影响当前 Android 主线。',
  evidence: evidencePath('legacy-post-delete-verification.txt'),
});

addRow(rows, {
  id: 'g008-08-ios-build',
  phase: '删除后验证',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '运行原生 iOS 构建。',
  passRule: 'native iOS 构建通过，证明删除旧 mobile 未影响当前 iOS 主线。',
  evidence: evidencePath('legacy-post-delete-verification.txt'),
});

addRow(rows, {
  id: 'g008-09-desktop-site-cli-check',
  phase: '删除后验证',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '运行 desktop、desktop/cli、site 和 contracts 的关键检查。',
  passRule: '桌面、CLI、站点和契约检查通过，证明旧 mobile 删除没有断主闭环。',
  evidence: evidencePath('legacy-post-delete-verification.txt'),
});

addRow(rows, {
  id: 'g008-10-final-audit-refresh',
  phase: '最终回写',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '重新运行 prepare_legacy_mobile_wave 与 prepare_remaining_external_work，刷新审计、总控和 TODO 证据入口。',
  passRule: 'legacy-mobile-retirement-audit 的 must_remove 仍为 0；G-008 有删除后构建与搜索证据。',
  evidence: validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
});

addRow(rows, {
  id: 'g008-11-close-todo',
  phase: '最终回写',
  gate: readyToDelete ? '可执行' : '等待删除后执行',
  action: '在证据齐全后把 TODO.md 中 G-008 从 [~] 改为 [x]，并记录删除结果。',
  passRule: 'G-008 完成定义全部满足；不夹带未验证的发布项。',
  evidence: 'TODO.md',
});

const groupSummary = [...new Set(rows.map((row) => row.phase))].map((phase) => {
  const groupRows = rows.filter((row) => row.phase === phase);
  return {
    phase,
    rowCount: groupRows.length,
    blockedRows: groupRows.filter((row) => row.gate.includes('禁止') || row.gate.includes('等待')).length,
  };
});

const payload = {
  validationDate,
  generatedFrom: 'scripts/legacy_mobile_run_sheet.mjs',
  task: 'G-008',
  readyToDelete,
  pendingReleaseTasks,
  auditSummary: {
    blockingFilesWithHits: audit.blockingFilesWithHits ?? 0,
    blockingHits: audit.blockingHits ?? 0,
    historicalFilesWithHits: audit.historicalFilesWithHits ?? 0,
    historicalHits: audit.historicalHits ?? 0,
  },
  summary: {
    rowCount: rows.length,
    groupCount: groupSummary.length,
    blockedRows: rows.filter((row) => row.gate.includes('禁止') || row.gate.includes('等待')).length,
  },
  groupSummary,
  rows,
};

function renderFillBlock(row) {
  return [
    `行项：${row.id}`,
    `任务：G-008`,
    `阶段：${row.phase}`,
    `当前门禁：${row.gate}`,
    '',
    `动作：${row.action}`,
    `验收点：${row.passRule}`,
    `建议证据：${row.evidence}`,
    '',
    '执行人：',
    '执行日期：',
    '命令或动作：',
    '输出摘要：',
    '证据路径：',
    '是否通过：',
    '问题与下一步：',
  ].join('\n');
}

const markdown = `# 旧 React Native mobile 删除逐项执行清单

日期：${validationDate}

用途：把 G-008 的删除前确认、真实删除和删除后验证拆成逐行执行项。当前表不会执行删除；只有 G-002～G-007 全部关闭且审计阻塞为 0 时，才允许执行真实删除动作。

## 汇总

- readyToDelete：${readyToDelete ? '是' : '否'}
- 发布前置未关闭：${pendingReleaseTasks.length === 0 ? '无' : pendingReleaseTasks.join('、')}
- 必须移除命中：${payload.auditSummary.blockingFilesWithHits} 个文件 / ${payload.auditSummary.blockingHits} 行
- 执行行数：${payload.summary.rowCount}
- 当前被门禁挡住的行数：${payload.summary.blockedRows}

## 分组

| 阶段 | 行数 | 当前被挡住 |
| --- | ---: | ---: |
${groupSummary.map((item) => `| ${escapeTableCell(item.phase)} | ${item.rowCount} | ${item.blockedRows} |`).join('\n')}

## 执行表

| ID | 阶段 | 当前门禁 | 动作 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${escapeTableCell(row.id)} | ${escapeTableCell(row.phase)} | ${escapeTableCell(row.gate)} | ${escapeTableCell(row.action)} | ${escapeTableCell(row.passRule)} | \`${row.evidence}\` |`).join('\n')}

## 每行填写字段

${rows.map((row) => `### ${row.id}

\`\`\`text
${renderFillBlock(row)}
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
