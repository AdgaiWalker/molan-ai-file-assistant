#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const checks = [
  {
    label: '工程身份配置',
    cmd: ['node', 'scripts/engineering_identity_check.mjs', '--check'],
  },
  {
    label: '公开文案与身份常量',
    cmd: ['node', 'scripts/render_public_docs.mjs', '--check'],
  },
  {
    label: '官网发布渠道常量',
    cmd: ['node', 'scripts/render_release_channels.mjs', '--check'],
  },
  {
    label: 'TODO 状态一致性',
    cmd: ['node', 'scripts/todo_consistency_check.mjs'],
  },
];

let failed = false;
for (const check of checks) {
  const [command, ...args] = check.cmd;
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.status === 0) {
    console.log(`通过：${check.label}`);
    if (output) console.log(output);
    continue;
  }
  failed = true;
  console.error(`失败：${check.label}`);
  if (output) console.error(output);
}

process.exit(failed ? 1 : 0);
