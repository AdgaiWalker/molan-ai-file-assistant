#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const identityRoot = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/product-identity.json'), 'utf-8'));
const identity = identityRoot.engineering;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

function writeIfChanged(relativePath, nextText) {
  const absolutePath = path.join(repoRoot, relativePath);
  const prevText = fs.readFileSync(absolutePath, 'utf-8');
  if (prevText === nextText) return false;
  fs.writeFileSync(absolutePath, nextText, 'utf-8');
  return true;
}

function replaceOne(text, regex, replacement, label) {
  regex.lastIndex = 0;
  if (!regex.test(text)) throw new Error(`未命中替换规则：${label}`);
  regex.lastIndex = 0;
  const next = text.replace(regex, replacement);
  return next;
}

function replaceSequential(text, regex, replacements, label) {
  let index = 0;
  const next = text.replace(regex, (...args) => {
    const match = args[0];
    const groups = args.slice(1, -2);
    const replacement = replacements[index];
    if (replacement === undefined) {
      throw new Error(`替换次数超出预期：${label}`);
    }
    index += 1;
    if (typeof replacement === 'function') {
      return replacement(match, ...groups);
    }
    return replacement;
  });
  if (index !== replacements.length) {
    throw new Error(`替换次数不足：${label}，期望 ${replacements.length}，实际 ${index}`);
  }
  return next;
}

const changed = [];

{
  let text = read('native/androidApp/build.gradle.kts');
  text = replaceOne(text, /applicationId = "[^"]+"/, `applicationId = "${identity.android.applicationId}"`, 'android applicationId');
  if (writeIfChanged('native/androidApp/build.gradle.kts', text)) changed.push('native/androidApp/build.gradle.kts');
}

{
  let text = read('native/androidApp/src/main/res/values/strings.xml');
  text = replaceOne(text, /<string name="app_name">[^<]+<\/string>/, `<string name="app_name">${identity.android.displayName}</string>`, 'android displayName');
  if (writeIfChanged('native/androidApp/src/main/res/values/strings.xml', text)) changed.push('native/androidApp/src/main/res/values/strings.xml');
}

{
  let text = read('native/iosApp/project.yml');
  text = replaceOne(text, /CFBundleDisplayName:\s*[^\n]+/, `CFBundleDisplayName: ${identity.ios.displayName}`, 'ios displayName project');
  text = replaceOne(text, /CFBundleURLName:\s*[^\n]+/, `CFBundleURLName: ${identity.ios.urlName}`, 'ios urlName project');
  text = replaceOne(text, /(CFBundleURLSchemes:\s*\n\s*-\s*)[^\n]+/, `$1${identity.ios.urlScheme}`, 'ios urlScheme project');
  text = replaceSequential(
    text,
    /(PRODUCT_BUNDLE_IDENTIFIER:\s*)([^\n]+)/g,
    [
      (_match, prefix) => `${prefix}${identity.ios.bundleId}`,
      (_match, prefix) => `${prefix}${identity.ios.testBundleId}`,
      (_match, prefix) => `${prefix}${identity.ios.shareBundleId}`,
    ],
    'ios bundle identifiers',
  );
  if (writeIfChanged('native/iosApp/project.yml', text)) changed.push('native/iosApp/project.yml');
}

{
  let text = read('native/iosApp/Molan/Resources/Info.plist');
  text = replaceOne(text, /<key>CFBundleDisplayName<\/key>\s*<string>[^<]+<\/string>/, `<key>CFBundleDisplayName</key>\n\t<string>${identity.ios.displayName}</string>`, 'ios displayName plist');
  text = replaceOne(text, /<key>CFBundleURLName<\/key>\s*<string>[^<]+<\/string>/, `<key>CFBundleURLName</key>\n\t\t\t<string>${identity.ios.urlName}</string>`, 'ios urlName plist');
  text = replaceOne(text, /(<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>)[^<]+(<\/string>)/, `$1${identity.ios.urlScheme}$2`, 'ios urlScheme plist');
  if (writeIfChanged('native/iosApp/Molan/Resources/Info.plist', text)) changed.push('native/iosApp/Molan/Resources/Info.plist');
}

{
  let text = read('native/iosApp/Molan/Molan.entitlements');
  text = replaceOne(text, /<string>group\.[^<]+<\/string>/, `<string>${identity.ios.appGroupId}</string>`, 'ios appGroup entitlements');
  if (writeIfChanged('native/iosApp/Molan/Molan.entitlements', text)) changed.push('native/iosApp/Molan/Molan.entitlements');
}

{
  let text = read('native/iosApp/ShareExtension/ShareExtension.entitlements');
  text = replaceOne(text, /<string>group\.[^<]+<\/string>/, `<string>${identity.ios.appGroupId}</string>`, 'ios share extension appGroup entitlements');
  if (writeIfChanged('native/iosApp/ShareExtension/ShareExtension.entitlements', text)) changed.push('native/iosApp/ShareExtension/ShareExtension.entitlements');
}

{
  let text = read('native/iosApp/SharedAppGroup/AppGroupInbox.swift');
  text = replaceOne(text, /groupIdentifier = "[^"]+"/, `groupIdentifier = "${identity.ios.appGroupId}"`, 'ios appGroup inbox group');
  text = replaceOne(text, /openURL = URL\(string: "[^"]+"\)!/, `openURL = URL(string: "${identity.ios.appGroupOpenUrl}")!`, 'ios appGroup inbox url');
  if (writeIfChanged('native/iosApp/SharedAppGroup/AppGroupInbox.swift', text)) changed.push('native/iosApp/SharedAppGroup/AppGroupInbox.swift');
}

{
  let text = read('native/iosApp/Molan/Data/SyncCoordinator.swift');
  text = replaceOne(text, /kSecAttrService as String: "[^"]+"/, `kSecAttrService as String: "${identity.ios.keychainService}"`, 'ios keychain service');
  text = replaceOne(text, /background\(withIdentifier: "[^"]+"\)/, `background(withIdentifier: "${identity.ios.backgroundSessionIdentifier}")`, 'ios background session identifier');
  if (writeIfChanged('native/iosApp/Molan/Data/SyncCoordinator.swift', text)) changed.push('native/iosApp/Molan/Data/SyncCoordinator.swift');
}

{
  let text = read('native/iosApp/Molan.xcodeproj/project.pbxproj');
  text = replaceSequential(
    text,
    /(PRODUCT_BUNDLE_IDENTIFIER = )([^;]+)(;)/g,
    [
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.testBundleId}${suffix}`,
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.shareBundleId}${suffix}`,
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.bundleId}${suffix}`,
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.shareBundleId}${suffix}`,
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.bundleId}${suffix}`,
      (_match, prefix, _value, suffix) => `${prefix}${identity.ios.testBundleId}${suffix}`,
    ],
    'ios xcodeproj bundle identifiers',
  );
  if (writeIfChanged('native/iosApp/Molan.xcodeproj/project.pbxproj', text)) changed.push('native/iosApp/Molan.xcodeproj/project.pbxproj');
}

{
  let text = read('desktop/electron-builder.yml');
  text = replaceOne(text, /appId:\s*[^\n]+/, `appId: ${identity.desktop.appId}`, 'desktop appId');
  text = replaceOne(text, /productName:\s*[^\n]+/, `productName: ${identity.desktop.productName}`, 'desktop productName');
  if (writeIfChanged('desktop/electron-builder.yml', text)) changed.push('desktop/electron-builder.yml');
}

{
  let text = read('desktop/package.json');
  text = replaceOne(text, /"name":\s*"[^"]+"/, `"name": "${identity.desktop.packageName}"`, 'desktop package name');
  if (writeIfChanged('desktop/package.json', text)) changed.push('desktop/package.json');
}

{
  let text = read('desktop/package-lock.json');
  text = replaceSequential(
    text,
    /"name":\s*"[^"]+"/g,
    [
      `"name": "${identity.desktop.packageName}"`,
      `"name": "${identity.desktop.packageName}"`,
    ],
    'desktop package-lock names',
  );
  if (writeIfChanged('desktop/package-lock.json', text)) changed.push('desktop/package-lock.json');
}

{
  let text = read('native/androidApp/README.md');
  text = replaceOne(text, /- (?:开发|当前) Application ID：`[^`]+`(?:，正式 ID 等 A-007 确认；|；后续若再调整，以 `config\/product-identity\.json` 为唯一来源；)/, `- 当前 Application ID：\`${identity.android.applicationId}\`；后续若再调整，以 \`config/product-identity.json\` 为唯一来源；`, 'android readme applicationId');
  if (writeIfChanged('native/androidApp/README.md', text)) changed.push('native/androidApp/README.md');
}

{
  let text = read('native/iosApp/README.md');
  text = replaceOne(text, /- (?:开发|当前) Bundle ID：`[^`]+`(?:，正式 ID 等 A-007 确认；|；后续若再调整，以 `config\/product-identity\.json` 为唯一来源；)/, `- 当前 Bundle ID：\`${identity.ios.bundleId}\`；后续若再调整，以 \`config/product-identity.json\` 为唯一来源；`, 'ios readme bundleId');
  if (writeIfChanged('native/iosApp/README.md', text)) changed.push('native/iosApp/README.md');
}

{
  let text = read('AGENTS.md');
  text = replaceOne(text, /- Android applicationId: `[^`]+`/, `- Android applicationId: \`${identity.android.applicationId}\``, 'agents android identity');
  text = replaceOne(text, /- iOS bundle id: `[^`]+`/, `- iOS bundle id: \`${identity.ios.bundleId}\``, 'agents ios identity');
  text = replaceOne(text, /- iOS App Group: `[^`]+`/, `- iOS App Group: \`${identity.ios.appGroupId}\``, 'agents ios app group');
  text = replaceOne(text, /- desktop app id: `[^`]+`/, `- desktop app id: \`${identity.desktop.appId}\``, 'agents desktop identity');
  if (writeIfChanged('AGENTS.md', text)) changed.push('AGENTS.md');
}

const check = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/engineering_identity_check.mjs'), '--check'], {
  cwd: repoRoot,
  encoding: 'utf-8',
});

if (check.status !== 0) {
  throw new Error((check.stderr || check.stdout || 'engineering_identity_check failed').trim());
}

if (changed.length === 0) {
  console.log('工程身份已与配置一致，无需改动。');
} else {
  console.log('已应用工程身份配置：');
  for (const item of changed) console.log(`- ${item}`);
}
