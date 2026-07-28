#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { batches, defaultEvidenceDir, defaultReportPath, validationAbsolutePath, validationDate } from './v2_validation_data.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';
import { placeholderValue, positiveVerdict, reportFieldDefinitions, reportFields, reportStatus } from './v2_validation_report_schema.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const strict = args.includes('--strict');
const remainingOnly = args.includes('--remaining');
const batchIndex = args.indexOf('--batch');
const outIndex = args.indexOf('--out');
const defaultMarkdownPath = validationAbsolutePath('validation-report-check.md');
const defaultJsonPath = validationAbsolutePath('validation-report-check.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function parseTemplateBlock(text) {
  const match = text.match(/## 填写模板\s+```text\n([\s\S]*?)\n```/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const values = new Map();
  for (const line of lines) {
    const fieldMatch = line.match(/^([^：]+)：(.*)$/);
    if (!fieldMatch) continue;
    values.set(fieldMatch[1].trim(), fieldMatch[2].trim());
  }
  return values;
}

function splitReferences(value) {
  return (value ?? '')
    .split(/\n|[;,；、]/)
    .map((item) => item.trim().replace(/^[-*]\s*/, '').replace(/^`|`$/g, ''))
    .filter(Boolean);
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function looksLikePath(value) {
  return value.includes('/') || value.startsWith('.') || /\.[a-z0-9]{2,5}$/i.test(value);
}

function pathExists(value) {
  const candidate = path.isAbsolute(value) ? value : path.join(repoRoot, value);
  return fs.existsSync(candidate);
}

function validateCompletedField(definition, value) {
  const issues = [];
  if (definition.kind === 'verdict' && !positiveVerdict(value)) {
    issues.push(`字段“${definition.label}”未填写为明确通过结果`);
  }

  if (!['path_list', 'path_or_url_list', 'path_or_text'].includes(definition.kind)) {
    return issues;
  }

  if (definition.kind === 'path_or_text' && !looksLikePath(value)) {
    return issues;
  }

  const references = splitReferences(value);
  if (references.length === 0) {
    issues.push(`字段“${definition.label}”没有可解析的证据路径或链接`);
    return issues;
  }

  for (const ref of references) {
    if (isUrl(ref)) continue;
    if (!looksLikePath(ref) && definition.kind !== 'path_list') continue;
    if (!pathExists(ref)) {
      issues.push(`字段“${definition.label}”引用不存在：${ref}`);
    }
  }

  return issues;
}

function batchSelection() {
  if (batchIndex !== -1 && args[batchIndex + 1]) {
    const batchId = args[batchIndex + 1];
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) {
      throw new Error(`未知批次：${batchId}`);
    }
    return [batch];
  }

  if (!remainingOnly) return batches;

  const statusMap = readTodoSnapshot(repoRoot).sectionStatusMap;
  return batches.filter((batch) => batch.tasks.some((task) => statusMap.get(task) !== 'x'));
}

function inspectBatch(batch) {
  const reportPath = defaultReportPath(batch);
  const evidenceDir = defaultEvidenceDir(batch);
  const relativeReportPath = path.relative(repoRoot, reportPath);
  const relativeEvidenceDir = path.relative(repoRoot, evidenceDir);
  const fields = reportFields(batch.reportKind);
  const fieldDefinitions = reportFieldDefinitions(batch.reportKind);

  if (!fs.existsSync(reportPath)) {
    return {
      batchId: batch.id,
      title: batch.title,
      reportPath: relativeReportPath,
      evidenceDir: relativeEvidenceDir,
      status: 'missing_report',
      issues: ['报告文件不存在'],
      missingFields: fields,
      evidenceFileCount: fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir).length : 0,
    };
  }

  const text = fs.readFileSync(reportPath, 'utf-8');
  const statusLine = text.match(/^> 状态：(.+)$/m)?.[1]?.trim() ?? 'missing';
  const statusValue = statusLine.replace(/。.*$/, '').trim();
  const values = parseTemplateBlock(text);
  const missingFields = [];
  if (!values) {
    missingFields.push(...fields);
  } else {
    for (const field of fields) {
      const value = values.get(field);
      if (placeholderValue(value)) {
        missingFields.push(field);
      }
    }
  }

  const evidenceFileCount = fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir).length : 0;
  const issues = [];

  if (statusValue === reportStatus.pending) {
    issues.push('报告状态仍是“待执行模板”');
  }
  if (statusValue !== reportStatus.pending && statusValue !== reportStatus.completed) {
    issues.push(`报告状态未知：${statusValue}`);
  }
  if (missingFields.length > 0) {
    issues.push(`仍有未填写字段：${missingFields.join('、')}`);
  }
  if (statusValue === reportStatus.completed && evidenceFileCount === 0) {
    issues.push('已标记“已执行”，但默认 evidence 目录为空');
  }
  if (statusValue === reportStatus.completed && values) {
    for (const definition of fieldDefinitions) {
      const value = values.get(definition.label);
      if (placeholderValue(value)) continue;
      issues.push(...validateCompletedField(definition, value));
    }
  }

  const status = issues.length === 0 ? 'ready' : statusValue === reportStatus.pending ? 'template' : 'incomplete';
  return {
    batchId: batch.id,
    title: batch.title,
    reportPath: relativeReportPath,
    evidenceDir: relativeEvidenceDir,
    status,
    reportStatus: statusValue,
    issues,
    missingFields,
    evidenceFileCount,
  };
}

const selectedBatches = batchSelection();
const reports = selectedBatches.map(inspectBatch);

const payload = {
  validationDate,
  generatedFrom: 'scripts/check_validation_reports.mjs',
  scope: remainingOnly ? 'remaining' : batchIndex !== -1 ? 'single' : 'all',
  summary: {
    total: reports.length,
    ready: reports.filter((item) => item.status === 'ready').length,
    template: reports.filter((item) => item.status === 'template').length,
    incomplete: reports.filter((item) => item.status === 'incomplete').length,
    missingReport: reports.filter((item) => item.status === 'missing_report').length,
  },
  reports,
};

const markdown = `# 外部批次报告检查

日期：${validationDate}

用途：检查外部批次报告是否还停留在模板状态，或是否已经填完到可以作为完成证据的程度。

## 汇总

- 检查范围：${payload.scope}
- 报告数：${payload.summary.total}
- ready：${payload.summary.ready}
- template：${payload.summary.template}
- incomplete：${payload.summary.incomplete}
- missing_report：${payload.summary.missingReport}

${reports.map((item) => `## ${item.title}

- 批次ID：\`${item.batchId}\`
- 报告：\`${item.reportPath}\`
- evidence 目录：\`${item.evidenceDir}\`
- 检查状态：\`${item.status}\`
- 报告状态：\`${item.reportStatus ?? 'missing'}\`
- evidence 文件数：${item.evidenceFileCount}
${item.issues.length === 0 ? '- 当前未发现阻塞，可作为候选完成证据。' : item.issues.map((issue) => `- 问题：${issue}`).join('\n')}
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
  process.exit(strict && reports.some((item) => item.status !== 'ready') ? 1 : 0);
}

if (outIndex !== -1 && args[outIndex + 1]) {
  const rawTarget = args[outIndex + 1];
  const target = rawTarget === 'default' ? defaultMarkdownPath : path.resolve(rawTarget);
  writeOutput(target, `${markdown}\n`);
  if (rawTarget === 'default') {
    writeOutput(defaultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }
  console.log(`已写入 ${target}`);
  process.exit(strict && reports.some((item) => item.status !== 'ready') ? 1 : 0);
}

process.stdout.write(`${markdown}\n`);
process.exit(strict && reports.some((item) => item.status !== 'ready') ? 1 : 0);
