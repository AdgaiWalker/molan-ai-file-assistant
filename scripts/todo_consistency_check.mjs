#!/usr/bin/env node

import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const snapshot = readTodoSnapshot(repoRoot);

const mismatches = [];
const missingSections = [];
for (const row of snapshot.queueRows) {
  const sectionStatus = snapshot.sectionStatusMap.get(row.id);
  if (!sectionStatus) {
    missingSections.push(row.id);
    continue;
  }
  if (sectionStatus !== row.status) {
    mismatches.push({
      id: row.id,
      queueStatus: row.status,
      sectionStatus,
    });
  }
}

const payload = {
  file: 'TODO.md',
  sectionTaskCount: snapshot.sections.length,
  queueSingleTaskCount: snapshot.queueRows.length,
  counts: snapshot.counts,
  remaining: snapshot.remaining,
  mismatches,
  missingSections,
  ok: mismatches.length === 0 && missingSections.length === 0,
};

if (jsonOnly) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.ok ? 0 : 1);
}

console.log(`# TODO 一致性检查

- 文件：${payload.file}
- 任务小节数：${payload.sectionTaskCount}
- 当前执行队列中的单任务行数：${payload.queueSingleTaskCount}
- 未完成任务数：${payload.remaining}
- 结果：${payload.ok ? '通过' : '未通过'}
`);

console.log(`## 状态统计

- [x]：${payload.counts.x}
- [!]：${payload.counts['!']}
- [v]：${payload.counts.v}
- [~]：${payload.counts['~']}
- [ ]：${payload.counts[' ']}
`);

if (missingSections.length > 0) {
  console.log('## 队列表中缺少正文小节');
  for (const id of missingSections) console.log(`- ${id}`);
}

if (mismatches.length > 0) {
  console.log('\n## 状态不一致');
  for (const item of mismatches) {
    console.log(`- ${item.id}：队列表是 [${item.queueStatus}]，正文小节是 [${item.sectionStatus}]`);
  }
}

process.exit(payload.ok ? 0 : 1);
