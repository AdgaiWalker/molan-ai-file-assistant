#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validationDate, validationAbsolutePath, validationRelativePath } from './v2_validation_data.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const defaultOutputDir = validationAbsolutePath('release_dry_run');
const defaultMarkdownPath = path.join(defaultOutputDir, 'release-readiness-snapshot.md');
const defaultJsonPath = path.join(defaultOutputDir, 'release-readiness-snapshot.json');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '';
}

function regexValue(text, regex, fallback = 'missing') {
  return text.match(regex)?.[1]?.trim() ?? fallback;
}

function plistValue(text, key, fallback = 'missing') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return regexValue(text, new RegExp(`<key>${escaped}</key>\\s*<string>([^<]+)</string>`), fallback);
}

function sha256(absolutePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(absolutePath));
  return hash.digest('hex');
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }
  return files.sort();
}

function normalizeArtifactKey(relativePath) {
  if (relativePath.endsWith('/Molan.app/Info.plist')) return 'ios:Molan.app/Info.plist';
  if (relativePath.endsWith('/Molan.app/PlugIns/MolanShare.appex/Info.plist')) return 'ios:MolanShare.appex@embedded';
  if (relativePath.endsWith('/MolanShare.appex/Info.plist')) return 'ios:MolanShare.appex';
  return relativePath;
}

function collectArtifacts(relativeRoots, includeFile, dedupeBy = null) {
  const seen = new Set();
  const rows = [];
  for (const relativeRoot of relativeRoots) {
    const absoluteRoot = path.join(repoRoot, relativeRoot);
    for (const absolutePath of walkFiles(absoluteRoot)) {
      const relativePath = path.relative(repoRoot, absolutePath);
      const dedupeKey = dedupeBy ? dedupeBy(relativePath) : relativePath;
      if (seen.has(dedupeKey)) continue;
      if (!includeFile(relativePath)) continue;
      seen.add(dedupeKey);
      const stat = fs.statSync(absolutePath);
      rows.push({
        relativePath,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        sha256: sha256(absolutePath),
      });
    }
  }
  return rows;
}

function summarizeArtifacts(relativeRoots, includeFile, limit = 40, dedupeBy = null) {
  const rows = collectArtifacts(relativeRoots, includeFile, dedupeBy);
  return {
    total: rows.length,
    items: rows.slice(0, limit),
    truncated: rows.length > limit,
  };
}

const androidGradle = readText('native/androidApp/build.gradle.kts');
const iosProject = readText('native/iosApp/project.yml');
const iosInfo = readText('native/iosApp/Molan/Resources/Info.plist');
const electronBuilder = readText('desktop/electron-builder.yml');
const desktopPackage = JSON.parse(readText('desktop/package.json') || '{}');
const cliPackage = JSON.parse(readText('desktop/cli/package.json') || '{}');
const serverPackage = JSON.parse(readText('server/package.json') || '{}');
const publicReleaseChannels = JSON.parse(readText('docs/public/public-release-channels.json') || '[]');
const publicReleaseChannelMap = new Map(
  Array.isArray(publicReleaseChannels)
    ? publicReleaseChannels.map((item) => [item.id, item])
    : [],
);
const bundledPandocWindowsPath = fs.existsSync(path.join(repoRoot, 'desktop/resources/pandoc.exe'))
  ? 'desktop/resources/pandoc.exe'
  : null;
const bundledPandocNativePath = fs.existsSync(path.join(repoRoot, 'desktop/resources/pandoc'))
  ? 'desktop/resources/pandoc'
  : null;

const sections = [
  {
    id: 'android',
    title: 'Android',
    config: {
      packageId: regexValue(androidGradle, /applicationId\s*=\s*"([^"]+)"/),
      namespace: regexValue(androidGradle, /namespace\s*=\s*"([^"]+)"/),
      versionName: regexValue(androidGradle, /versionName\s*=\s*"([^"]+)"/),
      versionCode: regexValue(androidGradle, /versionCode\s*=\s*([0-9]+)/),
      artifactRoot: 'native/androidApp/build/outputs',
    },
    nextSteps: [
      'cd native && ./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest',
      '准备 release 签名后再执行 AAB / Release APK 构建',
    ],
    artifacts: summarizeArtifacts(
      ['native/androidApp/build/outputs'],
      (file) => file.endsWith('.apk')
        || file.endsWith('.aab')
        || file.endsWith('/output-metadata.json')
        || file.endsWith('/mapping.txt'),
    ),
  },
  {
    id: 'ios',
    title: 'iOS / iPadOS',
    config: {
      bundleId: regexValue(iosProject, /PRODUCT_BUNDLE_IDENTIFIER:\s*([^\n]+)/),
      displayName: regexValue(iosProject, /CFBundleDisplayName:\s*([^\n]+)/),
      urlScheme: regexValue(iosProject, /CFBundleURLSchemes:\s*\n\s*-\s*([^\n]+)/),
      deploymentTarget: regexValue(iosProject, /iOS:\s*"([^"]+)"/),
      versionName: plistValue(iosInfo, 'CFBundleShortVersionString'),
      buildNumber: plistValue(iosInfo, 'CFBundleVersion'),
      artifactRoot: 'native/iosApp/build',
    },
    nextSteps: [
      "xcodebuild -project native/iosApp/Molan.xcodeproj -scheme Molan -destination 'generic/platform=iOS Simulator' build",
      '准备正式 Team / Profile / App Groups 后再做 Archive 与 TestFlight',
    ],
    artifacts: summarizeArtifacts(
      ['native/iosApp/build'],
      (file) => file.endsWith('.ipa')
        || file.endsWith('.xcarchive')
        || /\/Build\/Products\/[^/]+\/Molan\.app\/Info\.plist$/.test(file)
        || /\/Build\/Products\/[^/]+\/Molan\.app\/PlugIns\/MolanShare\.appex\/Info\.plist$/.test(file)
        || /\/Build\/Products\/[^/]+\/MolanShare\.appex\/Info\.plist$/.test(file),
      12,
      normalizeArtifactKey,
    ),
  },
  {
    id: 'desktop',
    title: '桌面 GUI',
    config: {
      appId: regexValue(electronBuilder, /appId:\s*([^\n]+)/),
      productName: regexValue(electronBuilder, /productName:\s*([^\n]+)/),
      version: String(desktopPackage.version ?? 'missing'),
      artifactRoot: 'desktop/release',
      windowsArtifactPattern: regexValue(electronBuilder, /artifactName:\s*([^\n]+)/),
      bundledPandocWindows: bundledPandocWindowsPath ?? '未准备',
      bundledPandocMacLike: bundledPandocNativePath ?? '未准备；当前依赖系统 PATH 中的 pandoc',
    },
    nextSteps: [
      'cd desktop && npm run typecheck && npm run build',
      '在目标平台执行 cd desktop && npm run build:dist，生成对应平台发布包',
      bundledPandocWindowsPath
        ? 'Windows 随包 pandoc 已准备；正式发布前确认其来源版本、SHA256 与签名策略'
        : 'Windows 若要随包携带转换能力，先执行 python3 scripts/download_pandoc.py 准备 desktop/resources/pandoc.exe',
      bundledPandocNativePath
        ? 'macOS / Linux 原生 pandoc 资源已准备；发布前确认可执行权限与来源版本'
        : 'macOS 当前仍依赖系统 PATH 中的 pandoc；若后续要随包携带，再单独补原生 pandoc 资源',
      'Windows 侧补安装、升级、回滚与下载渠道验收；macOS 侧补签名、公证与 Gatekeeper 验证',
    ],
    artifacts: summarizeArtifacts(
      ['desktop/release', 'desktop/out', 'desktop/resources'],
      (file) => (
        file.startsWith('desktop/release/')
        && (
          file.endsWith('.msix')
          || file.endsWith('.dmg')
          || file.endsWith('.zip')
          || file.endsWith('.blockmap')
          || file.endsWith('/resources/pandoc.exe')
          || file.endsWith('/墨览.exe')
          || file.endsWith('-setup.exe')
        )
      )
        || (
          file.startsWith('desktop/out/')
          && (
            file.endsWith('.js')
            || file.endsWith('.css')
            || file.endsWith('/index.html')
          )
        )
        || file === 'desktop/resources/pandoc.exe',
    ),
  },
  {
    id: 'cli',
    title: 'CLI',
    config: {
      packageName: String(cliPackage.name ?? 'missing'),
      version: String(cliPackage.version ?? 'missing'),
      artifactRoot: 'desktop/cli/dist',
    },
    nextSteps: [
      'cd desktop/cli && npm run typecheck && npm run build && npm run test && npm run pack:dist',
      '如需公开下载，再补发布说明、SHA256 和下载入口',
    ],
    artifacts: summarizeArtifacts(
      ['desktop/cli/dist'],
      (file) => file.endsWith('.js') || file.endsWith('.zip') || file.endsWith('.tgz'),
    ),
  },
  {
    id: 'server',
    title: '同步后端',
    config: {
      packageName: String(serverPackage.name ?? 'missing'),
      version: String(serverPackage.version ?? 'missing'),
      artifactRoot: 'server/dist',
    },
    nextSteps: [
      'cd server && npm run typecheck && npm test',
      '正式部署前补 PostgreSQL 18 Compose / 生产部署 / 回滚演练证据',
    ],
    artifacts: summarizeArtifacts(
      ['server/dist'],
      (file) => file.endsWith('.js'),
    ),
  },
];

function pickFirstArtifact(artifacts, matchers) {
  for (const matcher of matchers) {
    const hit = artifacts.find((item) => matcher(item.relativePath));
    if (hit) return hit;
  }
  return null;
}

function buildDeliveryManifestEntry({ id, name, relativeRoots, includeFile, preferredMatchers, missingNote }) {
  const channel = publicReleaseChannelMap.get(id) ?? null;
  const candidates = collectArtifacts(relativeRoots, includeFile);
  const preferredArtifact = pickFirstArtifact(candidates, preferredMatchers);
  return {
    id,
    name,
    publicStatus: channel?.status ?? 'coming',
    publicHref: channel?.href ?? '',
    publicCta: channel?.cta ?? '',
    publicDetail: channel?.detail ?? '当前未配置公开下载入口。',
    artifactCount: candidates.length,
    preferredArtifact,
    missingNote,
  };
}

const deliveryManifest = [
  buildDeliveryManifestEntry({
    id: 'android',
    name: 'Android',
    relativeRoots: ['native/androidApp/build/outputs'],
    includeFile: (file) => file.endsWith('.aab') || file.endsWith('.apk'),
    preferredMatchers: [
      (file) => file.endsWith('.aab'),
      (file) => file.endsWith('.apk'),
    ],
    missingNote: '当前还没有可公开分发的 Android release 包；正式签名和渠道构建仍未完成。',
  }),
  buildDeliveryManifestEntry({
    id: 'ios',
    name: 'iPhone / iPad',
    relativeRoots: ['native/iosApp/build'],
    includeFile: (file) => file.endsWith('.ipa') || file.endsWith('.xcarchive'),
    preferredMatchers: [
      (file) => file.endsWith('.ipa'),
      (file) => file.endsWith('.xcarchive'),
    ],
    missingNote: '当前还没有可公开分发的 iOS Archive / IPA；正式签名、Archive 和 TestFlight 仍未完成。',
  }),
  buildDeliveryManifestEntry({
    id: 'windows',
    name: 'Windows',
    relativeRoots: ['desktop/release'],
    includeFile: (file) => file.endsWith('-setup.exe') || file.endsWith('.msix') || file.endsWith('/墨览.exe'),
    preferredMatchers: [
      (file) => file.endsWith('.msix'),
      (file) => file.endsWith('-setup.exe'),
      (file) => file.endsWith('/墨览.exe'),
    ],
    missingNote: '当前还没有可对外发布的 Windows 安装包。',
  }),
  buildDeliveryManifestEntry({
    id: 'macos',
    name: 'macOS',
    relativeRoots: ['desktop/release'],
    includeFile: (file) => file.endsWith('.dmg') || (file.endsWith('.zip') && /-mac/.test(file)),
    preferredMatchers: [
      (file) => file.endsWith('.dmg'),
      (file) => file.endsWith('.zip') && /-mac/.test(file),
    ],
    missingNote: '当前还没有可对外发布的 macOS DMG / ZIP。',
  }),
  buildDeliveryManifestEntry({
    id: 'cli',
    name: 'CLI',
    relativeRoots: ['desktop/cli/dist'],
    includeFile: (file) => file.endsWith('.tgz') || file.endsWith('.zip'),
    preferredMatchers: [
      (file) => file.endsWith('.tgz'),
      (file) => file.endsWith('.zip'),
    ],
    missingNote: '当前还没有可对外发布的 CLI 压缩包。',
  }),
];

const payload = {
  reportDate: validationDate,
  generatedFrom: 'scripts/release_readiness_report.mjs',
  publicReleaseChannels,
  deliveryManifest,
  sections,
};

function configRows(config) {
  return Object.entries(config)
    .map(([key, value]) => `- ${key}: \`${value}\``)
    .join('\n');
}

function artifactTable(artifactSummary) {
  if (artifactSummary.items.length === 0) {
    return '当前未发现可直接交付的产物；说明配置已在，但正式构建/签名/打包尚未完成。';
  }
  const table = [
    '| 文件 | 大小 | 修改时间 | SHA256 |',
    '|---|---:|---|---|',
    ...artifactSummary.items.map((item) => `| \`${item.relativePath}\` | ${item.sizeBytes} B | ${item.modifiedAt} | \`${item.sha256}\` |`),
  ].join('\n');
  if (!artifactSummary.truncated) return table;
  return `${table}\n\n> 仅展示前 ${artifactSummary.items.length} 条，完整命中数为 ${artifactSummary.total}。`;
}

function nextStepRows(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function publicChannelTable(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '当前未配置公开发布渠道。';
  }
  return [
    '| 渠道 | 状态 | 说明 | 入口 |',
    '|---|---|---|---|',
    ...items.map((item) => `| ${item.name} | ${item.status === 'available' ? '可用' : '准备中'} | ${item.detail} | ${item.href} |`),
  ].join('\n');
}

function deliveryManifestTable(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '当前未生成对外交付物清单。';
  }
  return [
    '| 平台 | 发布状态 | 当前公开入口 | 本地首选产物 | SHA256 | 备注 |',
    '|---|---|---|---|---|---|',
    ...items.map((item) => {
      const preferredArtifact = item.preferredArtifact;
      const artifactPath = preferredArtifact ? `\`${preferredArtifact.relativePath}\`` : '当前无本地候选包';
      const artifactHash = preferredArtifact ? `\`${preferredArtifact.sha256}\`` : '—';
      const publicEntry = item.publicHref ? `[${item.publicCta || '查看入口'}](${item.publicHref})` : '未配置';
      const note = preferredArtifact
        ? `本地已发现 ${item.artifactCount} 个候选包；${item.publicDetail}`
        : item.missingNote;
      return `| ${item.name} | ${item.publicStatus === 'available' ? '可用' : '准备中'} | ${publicEntry} | ${artifactPath} | ${artifactHash} | ${note} |`;
    }),
  ].join('\n');
}

const markdown = `# 发布就绪清单快照

日期：${validationDate}

> 作用：自动提取当前仓库中的版本号、标识、产物目录、已发现产物与 SHA256，给 G-002～G-007 提供统一入口。它不代表已完成签名、上架、真机或商店验收。

## 使用方式

\`\`\`bash
node scripts/release_readiness_report.mjs
node scripts/release_readiness_report.mjs --json
node scripts/release_readiness_report.mjs --out default
\`\`\`

默认 \`--out default\` 会写入：

- \`${validationRelativePath('release_dry_run', 'release-readiness-snapshot.md')}\`
- \`${validationRelativePath('release_dry_run', 'release-readiness-snapshot.json')}\`

## 当前公开发布状态

${publicChannelTable(publicReleaseChannels)}

## 当前对外交付首选产物

${deliveryManifestTable(deliveryManifest)}

${sections.map((section) => `## ${section.title}

### 当前配置

${configRows(section.config)}

### 已发现产物

${artifactTable(section.artifacts)}

### 下一步

${nextStepRows(section.nextSteps)}
`).join('\n')}
`;

if (jsonOnly) {
  const text = JSON.stringify(payload, null, 2);
  if (outIndex !== -1 && args[outIndex + 1]) {
    const rawTarget = args[outIndex + 1];
    const target = rawTarget === 'default'
      ? defaultJsonPath
      : path.resolve(rawTarget);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${text}\n`, 'utf-8');
  } else {
    process.stdout.write(`${text}\n`);
  }
  process.exit(0);
}

if (outIndex !== -1 && args[outIndex + 1]) {
  const rawTarget = args[outIndex + 1];
  const target = rawTarget === 'default'
    ? defaultMarkdownPath
    : path.resolve(rawTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, markdown, 'utf-8');
  if (rawTarget === 'default') {
    fs.writeFileSync(defaultJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  }
  console.log(`已写入 ${target}`);
  process.exit(0);
}

process.stdout.write(markdown);
