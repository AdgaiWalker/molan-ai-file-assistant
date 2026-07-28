#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate } from './v2_validation_data.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const defaultDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'legacy_mobile');
const defaultMarkdownPath = path.join(defaultDir, 'legacy-mobile-retirement-audit.md');
const defaultJsonPath = path.join(defaultDir, 'legacy-mobile-retirement-audit.json');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

const targetPaths = [
  'README.md',
  'AGENTS.md',
  'TODO.md',
  '.github',
  'docs/design',
  'docs/CLAUDE.md',
  'docs/validation-runs/README.md',
  'scripts',
  'site',
];

const allowedExtensions = new Set([
  '.md', '.txt', '.json', '.yml', '.yaml', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.css', '.html',
]);

const excludeDirs = new Set([
  'node_modules', 'dist', 'build', 'out', 'release', '.git', '.expo', validationDate,
]);

const excludeFiles = new Set([
  'scripts/legacy_mobile_retirement_audit.mjs',
]);

const patterns = [
  { id: 'mobile_path', label: 'mobile/', regex: /mobile\//g },
  { id: 'react_native', label: 'React Native', regex: /React Native/gi },
  { id: 'expo', label: 'Expo', regex: /\bExpo\b/g },
  { id: 'expo_start', label: 'expo start', regex: /expo start/g },
];

const buckets = {
  mustRemove: {
    id: 'must_remove',
    label: '必须移除',
    blocking: true,
    summary: '主流程、活跃文档、CI 和站点中的旧 mobile 基线引用，关闭 G-008 前必须清零。',
  },
  historicalEvidence: {
    id: 'historical_evidence',
    label: '可保留历史证据',
    blocking: false,
    summary: '为了保留迁移轨迹、验收基线或清理计划而保留的历史引用，不计入当前阻塞。',
  },
};

function isTextFile(relativePath) {
  const ext = path.extname(relativePath);
  return allowedExtensions.has(ext);
}

function collectFiles(relativeTarget) {
  const absoluteTarget = path.join(repoRoot, relativeTarget);
  if (!fs.existsSync(absoluteTarget)) return [];
  const stat = fs.statSync(absoluteTarget);
  if (stat.isFile()) return [relativeTarget];

  const results = [];
  const stack = [absoluteTarget];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (excludeDirs.has(entry.name)) continue;
        stack.push(path.join(current, entry.name));
        continue;
      }
      const absolutePath = path.join(current, entry.name);
      const relativePath = path.relative(repoRoot, absolutePath);
      if (excludeFiles.has(relativePath)) continue;
      if (!isTextFile(relativePath)) continue;
      results.push(relativePath);
    }
  }
  return results.sort();
}

function scanFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  const lines = fs.readFileSync(absolutePath, 'utf-8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const matchedPatterns = patterns
      .filter((pattern) => pattern.regex.test(line))
      .map((pattern) => pattern.label);
    for (const pattern of patterns) pattern.regex.lastIndex = 0;
    if (matchedPatterns.length === 0) continue;
    hits.push({
      line: i + 1,
      content: line.trim(),
      patterns: matchedPatterns,
    });
  }
  return hits;
}

function classifyFile(relativePath) {
  if (
    relativePath === 'README.md'
    || relativePath === 'AGENTS.md'
    || relativePath.startsWith('.github/')
    || relativePath === 'docs/CLAUDE.md'
    || relativePath === 'docs/validation-runs/README.md'
    || relativePath.startsWith('site/')
  ) {
    return {
      ...buckets.mustRemove,
      reason: '这是当前仍在使用的主流程文档、CI 或站点说明，旧 mobile 基线引用应在删除前清零。',
    };
  }

  if (
    relativePath === 'TODO.md'
    || relativePath === 'docs/design/conversion-recipes.md'
    || relativePath === 'docs/design/mobile-reading-acceptance-matrix.md'
    || relativePath === 'scripts/remaining_todo_fast_path.mjs'
    || relativePath === 'scripts/prepare_legacy_mobile_wave.mjs'
    || relativePath === 'scripts/remaining_dependency_matrix.mjs'
    || relativePath === 'scripts/remaining_execution_dashboard.mjs'
  ) {
    return {
      ...buckets.historicalEvidence,
      reason: '这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。',
    };
  }

  return {
    ...buckets.mustRemove,
    reason: '未命中白名单的引用默认按阻塞项处理，避免遗漏仍在主流程生效的旧依赖说明。',
  };
}

const files = [...new Set(targetPaths.flatMap(collectFiles))];
const report = files
  .map((relativePath) => ({
    relativePath,
    classification: classifyFile(relativePath),
    hits: scanFile(relativePath),
  }))
  .filter((item) => item.hits.length > 0);

const bucketOrder = [buckets.mustRemove.id, buckets.historicalEvidence.id];
const bucketSections = bucketOrder.map((bucketId) => {
  const items = report.filter((item) => item.classification.id === bucketId);
  const descriptor = Object.values(buckets).find((bucket) => bucket.id === bucketId);
  return {
    ...descriptor,
    totalFiles: items.length,
    totalHits: items.reduce((sum, item) => sum + item.hits.length, 0),
    items,
  };
});
const blockingSection = bucketSections.find((section) => section.blocking);
const historicalSection = bucketSections.find((section) => !section.blocking);

const payload = {
  validationDate,
  task: 'G-008',
  targetPaths,
  totalFilesWithHits: report.length,
  totalHits: report.reduce((sum, item) => sum + item.hits.length, 0),
  blockingFilesWithHits: blockingSection?.totalFiles ?? 0,
  blockingHits: blockingSection?.totalHits ?? 0,
  historicalFilesWithHits: historicalSection?.totalFiles ?? 0,
  historicalHits: historicalSection?.totalHits ?? 0,
  buckets: bucketSections.map((section) => ({
    id: section.id,
    label: section.label,
    blocking: section.blocking,
    summary: section.summary,
    totalFiles: section.totalFiles,
    totalHits: section.totalHits,
  })),
  report,
  stopWhen: [
    '“必须移除”分组中的命中全部清零；“可保留历史证据”分组不阻塞 G-008 关闭',
    '删除 mobile/ 后，原生 Android / iOS、桌面和 CLI 构建命令仍然通过',
    'G-002 ～ G-007 已全部关闭后，再执行真实删除动作',
  ],
};

const markdown = `# 旧 mobile 基线删除前审计

日期：${validationDate}

对应任务：

- G-008

用途：在真正删除 \`mobile/\` 之前，先盘点 README、AGENTS、CI、脚本、官网与发布流程里还残留多少旧 Expo / React Native 基线引用。

## 审计范围

${targetPaths.map((item) => `- \`${item}\``).join('\n')}

## 通过条件

- “必须移除”分组中的命中全部清零；“可保留历史证据”分组不阻塞 G-008；
- 删除 \`mobile/\` 后，原生 Android / iOS、桌面和 CLI 构建命令仍然通过；
- G-002 ～ G-007 已全部关闭后，再执行真实删除动作。

## 判定规则

- **必须移除**：README、AGENTS、CI、站点和活跃操作文档里的旧 \`mobile/\` / Expo / React Native 引用；
- **可保留历史证据**：TODO、迁移验收基线、收口脚本中为了保留迁移轨迹而存在的引用。

## 当前命中统计

- 命中文件数：${payload.totalFilesWithHits}
- 命中总行数：${payload.totalHits}
- 必须移除：${payload.blockingFilesWithHits} 个文件 / ${payload.blockingHits} 行
- 可保留历史证据：${payload.historicalFilesWithHits} 个文件 / ${payload.historicalHits} 行

${payload.blockingHits === 0
    ? '当前阻塞项已归零；只要 G-002 ～ G-007 也全部关闭，并在真实删除后完成全量构建检查，就可以关闭 G-008。'
    : `当前仍不能关闭 G-008，因为“必须移除”分组还有 ${payload.blockingHits} 行命中需要处理。`}

${report.length === 0 ? '当前审计范围内未发现旧 mobile 基线引用。' : bucketSections.map((section) => `## ${section.label}

- 说明：${section.summary}
- 命中文件数：${section.totalFiles}
- 命中总行数：${section.totalHits}

${section.items.length === 0 ? '当前分组无命中。' : section.items.map((item) => `### ${item.relativePath}

- 判定原因：${item.classification.reason}
${item.hits.map((hit) => `- 第 ${hit.line} 行 [${hit.patterns.join(' / ')}]：\`${hit.content || '(空行)'}\``).join('\n')}
`).join('\n')}`).join('\n')}
`;

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

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
