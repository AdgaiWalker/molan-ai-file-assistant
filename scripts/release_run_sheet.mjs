#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = validationAbsolutePath('release_dry_run');
const defaultMarkdownPath = path.join(defaultDir, 'release-run-sheet.md');
const defaultJsonPath = path.join(defaultDir, 'release-run-sheet.json');
const releaseSnapshotJsonPath = path.join(defaultDir, 'release-readiness-snapshot.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readReleaseSnapshot() {
  if (!fs.existsSync(releaseSnapshotJsonPath)) {
    throw new Error(`缺少发布快照：${releaseSnapshotJsonPath}。请先运行 node scripts/release_readiness_report.mjs --out default`);
  }
  return JSON.parse(fs.readFileSync(releaseSnapshotJsonPath, 'utf-8'));
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function evidencePath(fileName) {
  return validationRelativePath('release_dry_run', 'evidence', fileName);
}

function artifactLabel(artifact) {
  if (!artifact) return '当前无候选产物';
  return `${artifact.relativePath}\n${artifact.sizeBytes} B\n${artifact.sha256}`;
}

function addRow(rows, definition) {
  rows.push({
    ...definition,
    resultFields: [
      '负责人',
      '执行日期',
      '版本号 / 构建号',
      '候选产物 / SHA256',
      '后台或发布入口',
      '截图 / 录屏 / 日志路径',
      '是否通过',
      '问题与下一步',
    ],
  });
}

const snapshot = readReleaseSnapshot();
const manifestById = new Map((snapshot.deliveryManifest ?? []).map((item) => [item.id, item]));
const channelsById = new Map((snapshot.publicReleaseChannels ?? []).map((item) => [item.id, item]));
const rows = [];

addRow(rows, {
  id: 'g002-android-signed-build',
  task: 'G-002',
  group: 'Android 正式渠道',
  target: 'Android signed AAB / APK',
  artifact: artifactLabel(manifestById.get('android')?.preferredArtifact),
  action: '准备正式 release 签名，构建 signed AAB、arm64 APK、universal APK、mapping / 符号文件并记录 SHA256。',
  passRule: '包名、版本号、签名、目标 API、权限声明和 SHA256 均可被截图或命令输出证明。',
  evidence: evidencePath('android-release-sha256.txt'),
});

addRow(rows, {
  id: 'g002-android-device-channel',
  task: 'G-002',
  group: 'Android 正式渠道',
  target: 'Google Play / 国内首发渠道',
  artifact: artifactLabel(manifestById.get('android')?.preferredArtifact),
  action: '在至少两种国产 Android 品牌真机上执行安装、升级、降级拒绝、文件入口、后台同步和渠道上传材料核对。',
  passRule: '内部测试轨道或首发渠道可安装；崩溃 / ANR 基线可观察；商店素材与真实界面一致。',
  evidence: evidencePath('android-channel-device-check.txt'),
});

addRow(rows, {
  id: 'g003-ios-archive-testflight',
  task: 'G-003',
  group: 'iOS / TestFlight',
  target: 'Archive / TestFlight',
  artifact: artifactLabel(manifestById.get('ios')?.preferredArtifact),
  action: '配置 Apple Team、Profile、App Groups 和 Share Extension 签名，执行 Archive 并上传 TestFlight。',
  passRule: 'TestFlight 构建号、Bundle ID、扩展签名、隐私清单和审核备注均可截图证明。',
  evidence: evidencePath('ios-testflight-build.txt'),
});

addRow(rows, {
  id: 'g003-ios-true-device-review',
  task: 'G-003',
  group: 'iOS / TestFlight',
  target: 'iPhone / iPad TestFlight 真机',
  artifact: artifactLabel(manifestById.get('ios')?.preferredArtifact),
  action: '通过 TestFlight 在 iPhone / iPad 验证 Share Extension、App Groups、后台同步、账号删除和文件入口。',
  passRule: '无阻断反馈；审核网络、演示账号、隐私和删除入口材料齐全。',
  evidence: evidencePath('ios-testflight-device-check.txt'),
});

addRow(rows, {
  id: 'g004-windows-package-sign',
  task: 'G-004',
  group: 'Windows 发布',
  target: 'NSIS / MSIX / CLI / Pandoc',
  artifact: artifactLabel(manifestById.get('windows')?.preferredArtifact),
  action: '生成正式 Windows 安装包，完成签名、随包 Pandoc 来源核对、CLI 打包、SHA256 和更新元数据。',
  passRule: '全新 Windows 环境可安装；签名有效；随包可执行文件来源明确；SHA256 可公开核对。',
  evidence: evidencePath('desktop-package-sha256.txt'),
});

addRow(rows, {
  id: 'g004-windows-install-upgrade-rollback',
  task: 'G-004',
  group: 'Windows 发布',
  target: 'Windows 全新环境',
  artifact: artifactLabel(manifestById.get('windows')?.preferredArtifact),
  action: '验证文件关联、转换、同步、升级、回滚和卸载，并记录 Microsoft Store 或正式下载渠道状态。',
  passRule: '安装/升级/回滚/卸载可重复；文件关联与转换可用；正式下载渠道可获取。',
  evidence: evidencePath('windows-install-upgrade-rollback.txt'),
});

addRow(rows, {
  id: 'g005-macos-sign-notarize',
  task: 'G-005',
  group: 'macOS 发布',
  target: 'DMG / ZIP 签名与公证',
  artifact: artifactLabel(manifestById.get('macos')?.preferredArtifact),
  action: '生成 macOS arm64/x64 或 universal 构建，完成签名、公证、DMG/ZIP、SHA256 和更新元数据。',
  passRule: 'Electron、CLI、Pandoc 等可执行文件签名正确；notary 结果可追溯。',
  evidence: evidencePath('macos-sign-notarize.txt'),
});

addRow(rows, {
  id: 'g005-macos-gatekeeper-install',
  task: 'G-005',
  group: 'macOS 发布',
  target: 'Gatekeeper 全新机',
  artifact: artifactLabel(manifestById.get('macos')?.preferredArtifact),
  action: '在全新 macOS 机器验证 Gatekeeper、文件关联、同步、转换、升级和卸载。',
  passRule: '首次打开、权限提示、文件关联、转换和卸载均通过；若进 Mac App Store，沙盒能力单独验证。',
  evidence: evidencePath('macos-gatekeeper-install.txt'),
});

addRow(rows, {
  id: 'g006-site-download-links',
  task: 'G-006',
  group: '官网真实发布内容',
  target: '官网下载入口',
  artifact: (snapshot.deliveryManifest ?? []).map((item) => `${item.name}: ${artifactLabel(item.preferredArtifact)}`).join('\n\n'),
  action: '把真实 Android / TestFlight / Windows / macOS / CLI 入口和 SHA256 回填到公开发布渠道源。',
  passRule: '所有按钮指向真实目标；链接、SHA256、版本号和发布说明与实际产物一致。',
  evidence: evidencePath('site-links-check.txt'),
});

addRow(rows, {
  id: 'g006-site-network-tutorials',
  task: 'G-006',
  group: '官网真实发布内容',
  target: '国内网络 / 教程 / 公开说明',
  artifact: (snapshot.publicReleaseChannels ?? []).map((item) => `${item.name}: ${item.status} / ${item.href}`).join('\n'),
  action: '用国内网络验证官网入口，补微信/QQ教程真机截图、真实客服邮箱、隐私/删除/FAQ/更新日志。',
  passRule: '无空链接；旧版本不被缓存；教程使用真机截图；公开身份与 G-001 证据一致。',
  evidence: evidencePath('site-network-tutorials.txt'),
});

addRow(rows, {
  id: 'g007-release-dry-run',
  task: 'G-007',
  group: '发布演练',
  target: '测试版本完整演练',
  artifact: (snapshot.deliveryManifest ?? []).map((item) => `${item.name}: ${artifactLabel(item.preferredArtifact)}`).join('\n\n'),
  action: '按 Android / iOS / Windows / macOS / CLI / 官网 / 同步后端执行一次测试版本发布演练。',
  passRule: '每步有负责人、命令或后台入口、产物、SHA256、截图和结论。',
  evidence: validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
});

addRow(rows, {
  id: 'g007-monitoring-rollback',
  task: 'G-007',
  group: '发布演练',
  target: '监控与回滚',
  artifact: '发布演练版本',
  action: '记录崩溃/ANR、同步成功率、下载状态和回滚动作，执行一次回滚或等价演练。',
  passRule: '监控不上传正文、提示词或敏感字段；回滚后入口、版本和公告状态可证明。',
  evidence: evidencePath('rollback-record.txt'),
});

const groupSummary = [...new Set(rows.map((row) => row.group))].map((group) => {
  const groupRows = rows.filter((row) => row.group === group);
  return {
    group,
    rowCount: groupRows.length,
    tasks: [...new Set(groupRows.map((row) => row.task))],
  };
});

const payload = {
  validationDate,
  generatedFrom: 'scripts/release_run_sheet.mjs',
  summary: {
    rowCount: rows.length,
    groupCount: groupSummary.length,
    tasks: [...new Set(rows.map((row) => row.task))],
  },
  groupSummary,
  rows,
};

function renderFillBlock(row) {
  return [
    `行项：${row.id}`,
    `任务：${row.task}`,
    `分组：${row.group}`,
    `对象：${row.target}`,
    '',
    '候选产物 / 当前公开状态：',
    row.artifact,
    '',
    `动作：${row.action}`,
    `验收点：${row.passRule}`,
    `建议证据：${row.evidence}`,
    '',
    '负责人：',
    '执行日期：',
    '版本号 / 构建号：',
    '候选产物 / SHA256：',
    '后台或发布入口：',
    '截图 / 录屏 / 日志路径：',
    '是否通过：',
    '问题与下一步：',
  ].join('\n');
}

const markdown = `# 发布 / 上架 / 官网 / 回滚逐项执行清单

日期：${validationDate}

用途：把 G-002～G-007 的正式发布与演练拆成逐行执行项。真实账号、签名、渠道和下载入口到位后，按本表逐行补负责人、后台入口、SHA256、截图和结论；本表为空模板时不算完成证据。

## 汇总

- 执行行数：${payload.summary.rowCount}
- 分组数：${payload.summary.groupCount}
- 覆盖任务：${payload.summary.tasks.join('、')}

## 分组

| 分组 | 行数 | 覆盖任务 |
| --- | ---: | --- |
${groupSummary.map((item) => `| ${escapeTableCell(item.group)} | ${item.rowCount} | ${item.tasks.join('、')} |`).join('\n')}

## 执行表

| ID | 任务 | 分组 | 对象 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${escapeTableCell(row.id)} | ${row.task} | ${escapeTableCell(row.group)} | ${escapeTableCell(row.target)} | ${escapeTableCell(row.passRule)} | \`${row.evidence}\` |`).join('\n')}

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
