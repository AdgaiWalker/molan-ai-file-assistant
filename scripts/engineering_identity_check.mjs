#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { getRepoRoot } from './todo_status_lib.mjs';
import { validationDate, validationAbsolutePath, validationRelativePath } from './v2_validation_data.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const checkOnly = args.includes('--check');
const outIndex = args.indexOf('--out');
const defaultDir = validationAbsolutePath('identity_and_accounts');
const defaultMarkdownPath = path.join(defaultDir, 'engineering-identity-snapshot.md');
const defaultJsonPath = path.join(defaultDir, 'engineering-identity-snapshot.json');

const identityRoot = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/product-identity.json'), 'utf-8'));
const identity = identityRoot.engineering;

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

const androidGradle = readText('native/androidApp/build.gradle.kts');
const androidStrings = readText('native/androidApp/src/main/res/values/strings.xml');
const iosProject = readText('native/iosApp/project.yml');
const iosInfo = readText('native/iosApp/Molan/Resources/Info.plist');
const iosEntitlements = readText('native/iosApp/Molan/Molan.entitlements');
const iosShareEntitlements = readText('native/iosApp/ShareExtension/ShareExtension.entitlements');
const iosAppGroupInbox = readText('native/iosApp/SharedAppGroup/AppGroupInbox.swift');
const iosSyncCoordinator = readText('native/iosApp/Molan/Data/SyncCoordinator.swift');
const iosXcodeproj = readText('native/iosApp/Molan.xcodeproj/project.pbxproj');
const electronBuilder = readText('desktop/electron-builder.yml');
const desktopPackage = JSON.parse(readText('desktop/package.json') || '{}');

const actual = {
  android: {
    applicationId: regexValue(androidGradle, /applicationId\s*=\s*"([^"]+)"/),
    displayName: regexValue(androidStrings, /<string name="app_name">([^<]+)<\/string>/),
  },
  ios: {
    bundleId: regexValue(iosProject, /PRODUCT_BUNDLE_IDENTIFIER:\s*([^\n]+)/),
    testBundleId: regexValue(iosProject, /PRODUCT_BUNDLE_IDENTIFIER:\s*(com\.[^\n]+\.tests)/),
    shareBundleId: regexValue(iosProject, /PRODUCT_BUNDLE_IDENTIFIER:\s*(com\.[^\n]+\.share)/),
    displayName: plistValue(iosInfo, 'CFBundleDisplayName'),
    urlName: regexValue(iosInfo, /<key>CFBundleURLName<\/key>\s*<string>([^<]+)<\/string>/),
    urlScheme: regexValue(iosInfo, /<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>([^<]+)<\/string>/),
    appGroupId: regexValue(iosEntitlements, /<string>(group\.[^<]+)<\/string>/),
    shareEntitlementsAppGroupId: regexValue(iosShareEntitlements, /<string>(group\.[^<]+)<\/string>/),
    keychainService: regexValue(iosSyncCoordinator, /kSecAttrService as String:\s*"([^"]+)"/),
    backgroundSessionIdentifier: regexValue(iosSyncCoordinator, /background\(withIdentifier:\s*"([^"]+)"\)/),
    appGroupOpenUrl: regexValue(iosAppGroupInbox, /openURL = URL\(string:\s*"([^"]+)"\)!/),
    xcodeprojBundleIds: [...iosXcodeproj.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((match) => match[1].trim()),
  },
  desktop: {
    appId: regexValue(electronBuilder, /appId:\s*([^\n]+)/),
    packageName: String(desktopPackage.name ?? 'missing'),
    productName: regexValue(electronBuilder, /productName:\s*([^\n]+)/),
  },
};

const checks = [
  ['android.applicationId', identity.android.applicationId, actual.android.applicationId],
  ['android.displayName', identity.android.displayName, actual.android.displayName],
  ['ios.bundleId', identity.ios.bundleId, actual.ios.bundleId],
  ['ios.testBundleId', identity.ios.testBundleId, actual.ios.testBundleId],
  ['ios.shareBundleId', identity.ios.shareBundleId, actual.ios.shareBundleId],
  ['ios.displayName', identity.ios.displayName, actual.ios.displayName],
  ['ios.urlName', identity.ios.urlName, actual.ios.urlName],
  ['ios.urlScheme', identity.ios.urlScheme, actual.ios.urlScheme],
  ['ios.appGroupId', identity.ios.appGroupId, actual.ios.appGroupId],
  ['ios.shareEntitlementsAppGroupId', identity.ios.appGroupId, actual.ios.shareEntitlementsAppGroupId],
  ['ios.keychainService', identity.ios.keychainService, actual.ios.keychainService],
  ['ios.backgroundSessionIdentifier', identity.ios.backgroundSessionIdentifier, actual.ios.backgroundSessionIdentifier],
  ['ios.appGroupOpenUrl', identity.ios.appGroupOpenUrl, actual.ios.appGroupOpenUrl],
  ['desktop.appId', identity.desktop.appId, actual.desktop.appId],
  ['desktop.packageName', identity.desktop.packageName, actual.desktop.packageName],
  ['desktop.productName', identity.desktop.productName, actual.desktop.productName],
  ['ios.xcodeprojBundleIds[0]', identity.ios.testBundleId, actual.ios.xcodeprojBundleIds[0] ?? 'missing'],
  ['ios.xcodeprojBundleIds[1]', identity.ios.shareBundleId, actual.ios.xcodeprojBundleIds[1] ?? 'missing'],
  ['ios.xcodeprojBundleIds[2]', identity.ios.bundleId, actual.ios.xcodeprojBundleIds[2] ?? 'missing'],
  ['ios.xcodeprojBundleIds[3]', identity.ios.shareBundleId, actual.ios.xcodeprojBundleIds[3] ?? 'missing'],
  ['ios.xcodeprojBundleIds[4]', identity.ios.bundleId, actual.ios.xcodeprojBundleIds[4] ?? 'missing'],
  ['ios.xcodeprojBundleIds[5]', identity.ios.testBundleId, actual.ios.xcodeprojBundleIds[5] ?? 'missing'],
];

const mismatches = checks
  .filter(([, expected, found]) => expected !== found)
  .map(([key, expected, found]) => ({ key, expected, found }));

const payload = {
  validationDate,
  generatedFrom: 'scripts/engineering_identity_check.mjs',
  configSource: 'config/product-identity.json',
  actual,
  mismatches,
  ok: mismatches.length === 0,
};

const markdown = `# 工程身份一致性快照

日期：${validationDate}

对应任务：

- A-007
- G-001

配置源：\`config/product-identity.json\`

## 当前实际值

### Android

- applicationId：\`${actual.android.applicationId}\`
- displayName：\`${actual.android.displayName}\`

### iOS

- bundleId：\`${actual.ios.bundleId}\`
- testBundleId：\`${actual.ios.testBundleId}\`
- shareBundleId：\`${actual.ios.shareBundleId}\`
- displayName：\`${actual.ios.displayName}\`
- urlName：\`${actual.ios.urlName}\`
- urlScheme：\`${actual.ios.urlScheme}\`
- appGroupId：\`${actual.ios.appGroupId}\`
- shareEntitlementsAppGroupId：\`${actual.ios.shareEntitlementsAppGroupId}\`
- keychainService：\`${actual.ios.keychainService}\`
- backgroundSessionIdentifier：\`${actual.ios.backgroundSessionIdentifier}\`
- appGroupOpenUrl：\`${actual.ios.appGroupOpenUrl}\`
- xcodeprojBundleIds：\`${actual.ios.xcodeprojBundleIds.join('`, `')}\`

### 桌面

- appId：\`${actual.desktop.appId}\`
- packageName：\`${actual.desktop.packageName}\`
- productName：\`${actual.desktop.productName}\`

## 检查结果

${payload.ok ? '当前工程内开发身份与 `config/product-identity.json` 一致。' : mismatches.map((item, index) => `${index + 1}. ${item.key}：期望 \`${item.expected}\`，实际 \`${item.found}\``).join('\n')}

## 停止条件

- Android / iOS / 桌面的开发身份统一由 \`config/product-identity.json\` 表达；
- 正式切换身份时，先更新该配置，再同步工程文件与公开文案；
- 本快照与 \`identity-readiness-snapshot\` 同步通过后，才继续商店与签名动作。
`;

function writeOutputs() {
  fs.mkdirSync(defaultDir, { recursive: true });
  fs.writeFileSync(defaultMarkdownPath, `${markdown}\n`, 'utf-8');
  fs.writeFileSync(defaultJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

if (jsonOnly) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (outIndex !== -1 && args[outIndex + 1]) {
    const rawTarget = args[outIndex + 1];
    const target = rawTarget === 'default' ? defaultJsonPath : path.resolve(rawTarget);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, 'utf-8');
  } else {
    process.stdout.write(text);
  }
  process.exit(payload.ok ? 0 : 1);
}

if (checkOnly) {
  if (payload.ok) {
    console.log('工程身份配置已同步。');
    process.exit(0);
  }
  for (const item of mismatches) {
    console.error(`未同步：${item.key}（期望 ${item.expected}，实际 ${item.found}）`);
  }
  process.exit(1);
}

if (outIndex !== -1 && args[outIndex + 1]) {
  const rawTarget = args[outIndex + 1];
  if (rawTarget === 'default') {
    writeOutputs();
    console.log(`已写入 ${validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md')}`);
    process.exit(payload.ok ? 0 : 1);
  }
  const target = path.resolve(rawTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${markdown}\n`, 'utf-8');
  process.exit(payload.ok ? 0 : 1);
}

process.stdout.write(`${markdown}\n`);
process.exit(payload.ok ? 0 : 1);
