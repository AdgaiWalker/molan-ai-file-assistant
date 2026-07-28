import fs from 'node:fs';
import path from 'node:path';

export const TODO_HEADING_REGEX = /^### \[([ x~!v])\] ([A-Z]-\d{3}) `(.*?)` (.+)$/;
export const TODO_QUEUE_ROW_REGEX = /^\|\s*\d+\s*\|\s*([A-Z]-\d{3})\s*\|\s*`(\[[ x~!v]\])`\s*\|/;

export function getRepoRoot(importMetaUrl) {
  return path.resolve(path.dirname(new URL(importMetaUrl).pathname), '..');
}

export function readTodoSnapshot(repoRoot) {
  const todoPath = path.join(repoRoot, 'TODO.md');
  const text = fs.readFileSync(todoPath, 'utf-8');
  const lines = text.split('\n');

  const sections = [];
  const sectionStatusMap = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(TODO_HEADING_REGEX);
    if (!match) continue;
    const [, status, id, priority, title] = match;
    const item = {
      id,
      status,
      priority,
      title,
      line: index + 1,
    };
    sections.push(item);
    sectionStatusMap.set(id, status);
  }

  const queueRows = [];
  let inQueueTable = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('## 3. 当前执行队列')) {
      inQueueTable = true;
      continue;
    }
    if (inQueueTable && line.startsWith('## ')) {
      break;
    }
    if (!inQueueTable) continue;
    const match = line.match(TODO_QUEUE_ROW_REGEX);
    if (!match) continue;
    queueRows.push({
      id: match[1],
      status: match[2].slice(1, -1),
      line: index + 1,
      raw: line,
    });
  }

  const counts = { x: 0, '!': 0, v: 0, '~': 0, ' ': 0 };
  for (const section of sections) counts[section.status] += 1;

  const byStatus = {
    x: sections.filter((item) => item.status === 'x'),
    '!': sections.filter((item) => item.status === '!'),
    v: sections.filter((item) => item.status === 'v'),
    '~': sections.filter((item) => item.status === '~'),
    ' ': sections.filter((item) => item.status === ' '),
  };

  return {
    todoPath,
    text,
    lines,
    sections,
    sectionStatusMap,
    queueRows,
    counts,
    byStatus,
    remaining: counts['!'] + counts.v + counts['~'] + counts[' '],
  };
}
