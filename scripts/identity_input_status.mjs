#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate } from './v2_validation_data.mjs';
import {
  getIdentityInputState,
  getIdentityWaveAction,
  identityLocalInputPath,
} from './identity_wave_status_lib.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'identity_and_accounts');
const defaultMarkdownPath = path.join(defaultDir, 'identity-input-status.md');
const defaultJsonPath = path.join(defaultDir, 'identity-input-status.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function renderValue(value) {
  const text = String(value ?? '').trim();
  return text || '未填写';
}

const inputState = getIdentityInputState(repoRoot);
const nextAction = getIdentityWaveAction(repoRoot);
const rows = inputState.fields.map((field) => ({
  ...field,
  status: inputState.unresolvedFields.some((item) => item.key === field.key) ? '待补' : '已填',
  renderedValue: renderValue(field.current),
}));

const payload = {
  validationDate,
  generatedFrom: 'scripts/identity_input_status.mjs',
  source: identityLocalInputPath,
  summary: {
    total: rows.length,
    resolved: rows.filter((item) => item.status === '已填').length,
    unresolved: rows.filter((item) => item.status === '待补').length,
    nextCommand: nextAction.command,
  },
  rows,
  nextAction: {
    action: nextAction.action,
    command: nextAction.command,
    followup: nextAction.followup,
  },
};

const markdown = `# 身份输入当前状态

日期：${validationDate}

来源：\`${identityLocalInputPath}\`

用途：把 A-007 / G-001 这 8 个真实输入压成一张可直接填写的总表，避免在多个总览之间来回切换。

## 汇总

- 总字段数：${payload.summary.total}
- 已填：${payload.summary.resolved}
- 待补：${payload.summary.unresolved}
- 当前默认下一条命令：\`${payload.summary.nextCommand}\`

## 字段总表

| 字段 | 当前值 | 状态 | 直接影响 |
| --- | --- | --- | --- |
${rows.map((row) => `| ${row.label} | ${row.renderedValue.replace(/\|/g, '\\|')} | ${row.status} | ${row.requiredFor.join('、')} |`).join('\n')}

## 下一步

- 当前动作：${nextAction.action}
- 默认命令：\`${nextAction.command}\`
- 后续动作：${nextAction.followup}
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
