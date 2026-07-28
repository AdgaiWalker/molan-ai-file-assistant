#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourcePath = path.join(repoRoot, 'docs/public/public-release-channels.json');
const siteOutputPath = path.join(repoRoot, 'site/src/lib/releaseChannels.generated.ts');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

const allowedStatuses = new Set(['available', 'coming']);
const channels = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));

if (!Array.isArray(channels) || channels.length === 0) {
  throw new Error('public-release-channels.json 必须是非空数组。');
}

const ids = new Set();
for (const channel of channels) {
  for (const key of ['id', 'name', 'status', 'detail', 'href', 'cta']) {
    if (!channel[key] || typeof channel[key] !== 'string') {
      throw new Error(`渠道缺少字符串字段 ${key}：${JSON.stringify(channel)}`);
    }
  }
  if (ids.has(channel.id)) {
    throw new Error(`渠道 id 重复：${channel.id}`);
  }
  ids.add(channel.id);
  if (!allowedStatuses.has(channel.status)) {
    throw new Error(`渠道 ${channel.id} 的 status 非法：${channel.status}`);
  }
}

const output = `/**
 * 由 scripts/render_release_channels.mjs 生成。
 * 修改 docs/public/public-release-channels.json 后重新运行脚本，不要直接手改本文件。
 */
export const RELEASE_CHANNELS = ${JSON.stringify(channels, null, 2)} as const;
`;

const current = fs.existsSync(siteOutputPath) ? fs.readFileSync(siteOutputPath, 'utf-8') : null;
if (checkOnly) {
  if (current === output) {
    console.log('官网发布渠道配置已同步。');
    process.exit(0);
  }
  console.error(`未同步：${path.relative(repoRoot, siteOutputPath)}`);
  process.exit(1);
}

fs.writeFileSync(siteOutputPath, output, 'utf-8');

console.log('已同步官网发布渠道配置：');
console.log('- site/src/lib/releaseChannels.generated.ts');
