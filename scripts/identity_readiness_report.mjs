#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate } from './v2_validation_data.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const defaultDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'identity_and_accounts');
const defaultMarkdownPath = path.join(defaultDir, 'identity-readiness-snapshot.md');
const defaultJsonPath = path.join(defaultDir, 'identity-readiness-snapshot.json');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

function readText(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '';
}

function readJson(relativePath) {
  const text = readText(relativePath);
  return text ? JSON.parse(text) : {};
}

function regexValue(text, regex, fallback = 'missing') {
  return text.match(regex)?.[1]?.trim() ?? fallback;
}

function plistValue(text, key, fallback = 'missing') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return regexValue(text, new RegExp(`<key>${escaped}</key>\\s*<string>([^<]+)</string>`), fallback);
}

function countOccurrences(text, regex) {
  return [...text.matchAll(regex)].length;
}

function containsDevMarker(value) {
  return /(?:^|[.\s-])dev(?:$|[.\s-])/i.test(value) || / Dev$/i.test(value);
}

function linkValue(constantsText, key, fallback = 'missing') {
  return regexValue(constantsText, new RegExp(`${key}:\\s*'([^']+)'`), fallback).trim();
}

function resolveTemplateLiteral(value, constantsText) {
  if (!value.includes('${BRAND.github}')) return value;
  const github = regexValue(constantsText, /github:\s*'([^']+)'/, 'missing');
  return value.replace('${BRAND.github}', github);
}

const siteConstants = readText('site/src/lib/constants.ts');
const androidGradle = readText('native/androidApp/build.gradle.kts');
const androidStrings = readText('native/androidApp/src/main/res/values/strings.xml');
const iosProject = readText('native/iosApp/project.yml');
const iosInfo = readText('native/iosApp/Molan/Resources/Info.plist');
const iosEntitlements = readText('native/iosApp/Molan/Molan.entitlements');
const electronBuilder = readText('desktop/electron-builder.yml');
const desktopPackage = readJson('desktop/package.json');
const cliPackage = readJson('desktop/cli/package.json');
const publicDocs = [
  {
    id: 'privacy_policy',
    title: '隐私说明',
    relativePath: 'docs/public/privacy-policy.md',
    siteUrl: resolveTemplateLiteral(linkValue(siteConstants, 'privacy'), siteConstants),
  },
  {
    id: 'terms_of_service',
    title: '服务条款',
    relativePath: 'docs/public/terms-of-service.md',
    siteUrl: resolveTemplateLiteral(linkValue(siteConstants, 'terms'), siteConstants),
  },
  {
    id: 'account_and_data_deletion',
    title: '账号与数据删除说明',
    relativePath: 'docs/public/account-and-data-deletion.md',
    siteUrl: resolveTemplateLiteral(linkValue(siteConstants, 'deletion'), siteConstants),
  },
  {
    id: 'support',
    title: '支持与反馈',
    relativePath: 'docs/public/support.md',
    siteUrl: resolveTemplateLiteral(linkValue(siteConstants, 'support'), siteConstants),
  },
].map((item) => {
  const text = readText(item.relativePath);
  const placeholders = [...text.matchAll(/\[待补[^\]]+\]/g)].map((match) => match[0]);
  return {
    ...item,
    placeholderCount: placeholders.length,
    placeholders,
  };
});

const currentIdentity = {
  brandName: regexValue(siteConstants, /name:\s*'([^']+)'/, 'missing'),
  brandSlug: regexValue(siteConstants, /slug:\s*'([^']+)'/, 'missing'),
  android: {
    applicationId: regexValue(androidGradle, /applicationId\s*=\s*"([^"]+)"/),
    versionName: regexValue(androidGradle, /versionName\s*=\s*"([^"]+)"/),
    displayName: regexValue(androidStrings, /<string name="app_name">([^<]+)<\/string>/),
  },
  ios: {
    bundleId: regexValue(iosProject, /PRODUCT_BUNDLE_IDENTIFIER:\s*([^\n]+)/),
    displayName: plistValue(iosInfo, 'CFBundleDisplayName'),
    urlScheme: plistValue(iosInfo, 'CFBundleURLName') === 'missing'
      ? regexValue(iosProject, /CFBundleURLSchemes:\s*\n\s*-\s*([^\n]+)/)
      : regexValue(iosInfo, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>([^<]+)<\/string>/),
    urlName: plistValue(iosInfo, 'CFBundleURLName'),
    appGroupId: regexValue(iosEntitlements, /<string>(group\.[^<]+)<\/string>/),
    versionName: plistValue(iosInfo, 'CFBundleShortVersionString'),
    buildNumber: plistValue(iosInfo, 'CFBundleVersion'),
  },
  desktop: {
    appId: regexValue(electronBuilder, /appId:\s*([^\n]+)/),
    productName: regexValue(electronBuilder, /productName:\s*([^\n]+)/),
    version: String(desktopPackage.version ?? 'missing'),
    packageName: String(desktopPackage.name ?? 'missing'),
  },
  cli: {
    packageName: String(cliPackage.name ?? 'missing'),
    version: String(cliPackage.version ?? 'missing'),
  },
};

const findings = [];

function pushFinding(scope, severity, title, detail) {
  findings.push({ scope, severity, title, detail });
}

if (containsDevMarker(currentIdentity.android.applicationId)) {
  pushFinding('android', 'high', 'Android applicationId 仍是开发标识', `当前为 \`${currentIdentity.android.applicationId}\`，正式发布前需要去掉 dev 后缀，并确认不会覆盖生产包。`);
}
if (containsDevMarker(currentIdentity.android.displayName)) {
  pushFinding('android', 'medium', 'Android 对外显示名仍带 Dev', `当前为 \`${currentIdentity.android.displayName}\`，A-007 完成前不应把它当正式商店名。`);
}
if (containsDevMarker(currentIdentity.ios.bundleId) || containsDevMarker(currentIdentity.ios.urlScheme) || containsDevMarker(currentIdentity.ios.appGroupId) || containsDevMarker(currentIdentity.ios.displayName)) {
  pushFinding('ios', 'high', 'iOS 主标识仍是开发态', `Bundle ID / URL Scheme / App Group / 显示名中仍存在 dev 标记（当前 \`${currentIdentity.ios.bundleId}\` / \`${currentIdentity.ios.urlScheme}\` / \`${currentIdentity.ios.appGroupId}\` / \`${currentIdentity.ios.displayName}\`）。`);
}
if (currentIdentity.desktop.appId.includes('mdreader')) {
  pushFinding('desktop', 'high', '桌面 App ID 仍沿用旧命名', `当前为 \`${currentIdentity.desktop.appId}\`，与品牌 \`${currentIdentity.brandSlug}\` / \`${currentIdentity.brandName}\` 不一致，G-001 前需要统一。`);
}
if (currentIdentity.desktop.packageName.includes('md-reader')) {
  pushFinding('desktop', 'medium', '桌面 package 名仍沿用旧命名', `当前为 \`${currentIdentity.desktop.packageName}\`，虽然不一定直接暴露给用户，但后续发布脚本和产物命名最好统一到 molan。`);
}
for (const doc of publicDocs) {
  if (doc.placeholderCount > 0) {
    pushFinding('public_docs', doc.title === '支持与反馈' ? 'high' : 'medium', `${doc.title} 仍有待补占位`, `文件 \`${doc.relativePath}\` 当前还有 ${doc.placeholderCount} 个占位：${doc.placeholders.join('、')}。`);
  }
}
if (publicDocs.some((doc) => doc.siteUrl.includes('/blob/main/docs/public/'))) {
  pushFinding('site', 'medium', '官网法律/支持入口当前仍指向 GitHub 文档', '当前站点已经从内部设计稿切到公开草案，但链接仍是 GitHub Blob，不是最终官网域名下的正式页面。');
}

const payload = {
  validationDate,
  tasks: ['A-007', 'G-001'],
  generatedFrom: 'scripts/identity_readiness_report.mjs',
  currentIdentity,
  publicDocs,
  findings,
  summary: {
    findingCount: findings.length,
    highCount: findings.filter((item) => item.severity === 'high').length,
    mediumCount: findings.filter((item) => item.severity === 'medium').length,
    publicPlaceholderCount: publicDocs.reduce((sum, item) => sum + item.placeholderCount, 0),
  },
  stopWhen: [
    '正式产品名、Android applicationId、iOS Bundle ID、URL Scheme、App Group ID、桌面 App ID 都已切到可发布值',
    '公开隐私、条款、删除和支持页不再包含待补占位',
    '官网、应用内和商店后台展示同一套主体、域名、支持邮箱和发布入口',
  ],
};

function formatFindings(items) {
  if (items.length === 0) return '当前未发现身份与公开入口层面的已知阻塞。';
  return items.map((item, index) => `${index + 1}. [${item.severity}] ${item.title}：${item.detail}`).join('\n');
}

const markdown = `# 身份与公开入口当前状态快照

日期：${validationDate}

对应任务：

- A-007
- G-001

用途：把当前仓库里已经确定的产品身份、包名、公开文案入口和仍待补的占位集中拉平，避免后续签名、商店、官网和应用内各填各的。

## 1. 当前已识别的产品身份

### 品牌

- 正式产品名候选：\`${currentIdentity.brandName}\`
- 品牌 slug：\`${currentIdentity.brandSlug}\`

### Android

- applicationId：\`${currentIdentity.android.applicationId}\`
- 对外显示名：\`${currentIdentity.android.displayName}\`
- versionName：\`${currentIdentity.android.versionName}\`

### iOS / iPadOS

- Bundle ID：\`${currentIdentity.ios.bundleId}\`
- 对外显示名：\`${currentIdentity.ios.displayName}\`
- URL Scheme：\`${currentIdentity.ios.urlScheme}\`
- App Group ID：\`${currentIdentity.ios.appGroupId}\`
- versionName：\`${currentIdentity.ios.versionName}\`
- buildNumber：\`${currentIdentity.ios.buildNumber}\`

### 桌面 / CLI

- 桌面 App ID：\`${currentIdentity.desktop.appId}\`
- 桌面对外名称：\`${currentIdentity.desktop.productName}\`
- 桌面 package：\`${currentIdentity.desktop.packageName}\`
- CLI package：\`${currentIdentity.cli.packageName}\`

## 2. 当前公开入口

${publicDocs.map((doc) => `### ${doc.title}

- 源文件：\`${doc.relativePath}\`
- 当前站点链接：${doc.siteUrl}
- 待补占位数：${doc.placeholderCount}
${doc.placeholders.length === 0 ? '- 当前未发现待补占位。' : `- 待补项：${doc.placeholders.join('、')}`}`).join('\n\n')}

## 3. 当前缺口

- 高优先级缺口：${payload.summary.highCount}
- 中优先级缺口：${payload.summary.mediumCount}
- 公开文案待补占位总数：${payload.summary.publicPlaceholderCount}

${formatFindings(findings)}

## 4. 建议回填顺序

1. 先确定正式主体、域名、支持邮箱；
2. 再统一 Android applicationId、iOS Bundle ID / URL Scheme / App Group、桌面 App ID；
3. 用真实值替换 \`docs/public/\` 下的占位文案；
4. 最后同步回官网、应用内入口、商店后台和 \`TODO.md\` 当前记录。

## 5. 停止条件

- 正式产品名、Android applicationId、iOS Bundle ID、URL Scheme、App Group ID、桌面 App ID 都已切到可发布值；
- 公开隐私、条款、删除和支持页不再包含待补占位；
- 官网、应用内和商店后台展示同一套主体、域名、支持邮箱和发布入口。
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
