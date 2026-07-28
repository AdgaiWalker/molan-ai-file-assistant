#!/usr/bin/env node

import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');

const snapshot = readTodoSnapshot(repoRoot);
const payload = {
  file: 'TODO.md',
  total: snapshot.sections.length,
  remaining: snapshot.remaining,
  counts: snapshot.counts,
  remainingByStatus: {
    blocked: snapshot.byStatus['!'].map((item) => item.id),
    verify: snapshot.byStatus.v.map((item) => item.id),
    in_progress: snapshot.byStatus['~'].map((item) => item.id),
    todo: snapshot.byStatus[' '].map((item) => item.id),
  },
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

console.log(`# TODO 当前快照

- 文件：${payload.file}
- 总任务数：${payload.total}
- 未完成任务数：${payload.remaining}

## 状态统计

- [x]：${payload.counts.x}
- [!]：${payload.counts['!']}
- [v]：${payload.counts.v}
- [~]：${payload.counts['~']}
- [ ]：${payload.counts[' ']}
`);

function printGroup(title, items) {
  if (items.length === 0) return;
  console.log(`## ${title}`);
  for (const id of items) console.log(`- ${id}`);
  console.log('');
}

printGroup('阻塞项 [!]', payload.remainingByStatus.blocked);
printGroup('待实机/商店验收 [v]', payload.remainingByStatus.verify);
printGroup('有基础但未完成 [~]', payload.remainingByStatus.in_progress);
printGroup('待做 [ ]', payload.remainingByStatus.todo);
