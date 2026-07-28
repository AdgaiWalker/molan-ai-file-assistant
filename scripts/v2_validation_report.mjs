#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  batches,
  checksumMap,
  defaultEvidenceDir,
  defaultReportPath,
  evidenceDirStatus,
  validationDate,
  validationAbsolutePath,
  validationRunsRoot,
} from './v2_validation_data.mjs';
import { reportStatus, templateBlock } from './v2_validation_report_schema.mjs';

const args = process.argv.slice(2);
const batchIndex = args.indexOf('--batch');
const outIndex = args.indexOf('--out');
const listOnly = args.includes('--list');

if (listOnly) {
  for (const batch of batches) {
    console.log(`${batch.id}\t${batch.title}\t${batch.tasks.join(', ')}`);
  }
  process.exit(0);
}

if (batchIndex === -1 || !args[batchIndex + 1]) {
  console.error('用法：node scripts/v2_validation_report.mjs --batch <id> [--out <path>]');
  process.exit(1);
}

const batchId = args[batchIndex + 1];
const batch = batches.find((item) => item.id === batchId);
if (!batch) {
  console.error(`未知批次：${batchId}`);
  process.exit(1);
}

const checksumByPath = checksumMap();

function sampleRows() {
  return batch.samples.map((relativePath) => {
    const file = checksumByPath.get(relativePath);
    if (file) {
      return `| \`${relativePath}\` | ${file.sizeBytes} B | \`${file.expectedSha256}\` |`;
    }
    const absolutePath = path.resolve(relativePath);
    if (fs.existsSync(absolutePath)) {
      return `| \`${relativePath}\` | ${fs.statSync(absolutePath).size} B | \`待补 SHA256\` |`;
    }
    return `| \`${relativePath}\` | missing | missing |`;
  }).join('\n');
}

function evidenceRows() {
  return batch.evidenceDirs.map((relativePath) => {
    const state = evidenceDirStatus(relativePath);
    return `- \`${relativePath}\`（${state.exists ? `${state.fileCount} entries` : 'missing'}）`;
  }).join('\n');
}

function checklistRows() {
  return batch.evidenceChecklist.map((item) => `- ${item}`).join('\n');
}

function stepRows() {
  return batch.steps.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function suggestedEvidenceRows() {
  if (!batch.suggestedEvidenceNames?.length) return '- 无';
  const baseDir = path.relative(process.cwd(), defaultEvidenceDir(batch));
  return batch.suggestedEvidenceNames
    .map((name) => `- \`${path.join(baseDir, name)}\``)
    .join('\n');
}

function releaseCandidateSection() {
  if (batch.id !== 'release_dry_run') return '';
  const snapshotPath = validationAbsolutePath('release_dry_run', 'release-readiness-snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    return '## 当前可直接引用的候选产物\n\n- 尚未发现发布快照 JSON；请先执行 `node scripts/release_readiness_report.mjs --out default`。\n';
  }
  const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const manifest = Array.isArray(payload.deliveryManifest) ? payload.deliveryManifest : [];
  if (manifest.length === 0) {
    return '## 当前可直接引用的候选产物\n\n- 当前发布快照中没有 `deliveryManifest` 数据。\n';
  }
  const rows = manifest.map((item) => {
    const artifact = item.preferredArtifact;
    const artifactText = artifact ? `\`${artifact.relativePath}\`` : '当前无本地候选包';
    const shaText = artifact ? `\`${artifact.sha256}\`` : '—';
    const publicEntry = item.publicHref ? `[${item.publicCta || '查看入口'}](${item.publicHref})` : '未配置';
    const note = artifact ? item.publicDetail : item.missingNote;
    return `| ${item.name} | ${artifactText} | ${shaText} | ${item.publicStatus === 'available' ? '可用' : '准备中'} | ${publicEntry} | ${note} |`;
  }).join('\n');
  return `## 当前可直接引用的候选产物

> 来源：\`docs/validation-runs/${validationDate}/release_dry_run/release-readiness-snapshot.json\` 中的 \`deliveryManifest\`。

| 平台 | 本地首选产物 | SHA256 | 官网状态 | 当前公开入口 | 备注 |
|---|---|---|---|---|---|
${rows}
`;
}

const markdown = `# ${batch.title} 验收记录模板

> 批次ID：${batch.id}
> 状态：${reportStatus.pending}。完成实际执行后，请手动改成“${reportStatus.completed}”。

日期：${validationDate}

任务：

- ${batch.tasks.join('\n- ')}

## 固定样例

| 文件 | 大小 | SHA256 |
|---|---:|---|
${sampleRows() || '| 无 | - | - |'}

## 本地证据目录

${evidenceRows() || '- 无'}

## 默认落盘位置

- 报告：\`${path.relative(process.cwd(), defaultReportPath(batch))}\`
- 证据目录：\`${path.relative(process.cwd(), defaultEvidenceDir(batch))}\`

## 建议证据文件名

${suggestedEvidenceRows()}

## 建议执行步骤

${stepRows()}

## 必留证据

${checklistRows()}

${releaseCandidateSection()}

## 填写模板

${templateBlock(batch.reportKind, batch)}
`;

if (outIndex !== -1 && args[outIndex + 1]) {
  const rawTarget = args[outIndex + 1];
  const target = rawTarget === 'default'
    ? defaultReportPath(batch)
    : path.resolve(rawTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.mkdirSync(defaultEvidenceDir(batch), { recursive: true });
  if (fs.existsSync(target)) {
    const existing = fs.readFileSync(target, 'utf-8');
    if (existing.match(/^> 状态：已执行(?:。|$)/m)) {
      console.log(`已保留 ${target}（报告状态为“已执行”）`);
      process.exit(0);
    }
  }
  fs.writeFileSync(target, markdown, 'utf-8');
  console.log(`已写入 ${target}`);
  process.exit(0);
}

process.stdout.write(markdown);
