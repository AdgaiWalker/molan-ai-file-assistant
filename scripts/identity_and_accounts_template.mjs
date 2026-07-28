#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate } from './v2_validation_data.mjs';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const defaultDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'identity_and_accounts');
const defaultMarkdownPath = path.join(defaultDir, 'identity-and-accounts-checklist.md');
const defaultJsonPath = path.join(defaultDir, 'identity-and-accounts-checklist.json');
const productIdentityPath = path.join(repoRoot, 'config/product-identity.json');
const releaseInputsPath = path.join(repoRoot, 'config/release-identity-inputs.json');
const releaseInputsTemplatePath = path.join(repoRoot, 'config/release-identity-inputs.template.json');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

const productIdentity = JSON.parse(fs.readFileSync(productIdentityPath, 'utf-8'));
const releaseTemplate = JSON.parse(fs.readFileSync(releaseInputsTemplatePath, 'utf-8'));
const releaseInputs = fs.existsSync(releaseInputsPath)
  ? JSON.parse(fs.readFileSync(releaseInputsPath, 'utf-8'))
  : releaseTemplate;

function normalizeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.includes('[待补')) return '';
  if (/^[a-z]+:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw}`.replace(/\/+$/, '');
}

const domainRoot = normalizeUrl(releaseInputs.publicIdentity?.officialDomain ?? productIdentity.public.officialDomain);
const deletionUrl = releaseInputs.publicIdentity?.accountDeletionUrl?.trim()
  || productIdentity.public.accountDeletionUrl
  || '';

const fieldValues = {
  '正式产品名': productIdentity.brand.name,
  'Android applicationId': productIdentity.engineering.android.applicationId,
  'iOS Bundle ID': productIdentity.engineering.ios.bundleId,
  'URL Scheme': productIdentity.engineering.ios.urlScheme,
  'App Group ID': productIdentity.engineering.ios.appGroupId,
  '桌面 App ID': productIdentity.engineering.desktop.appId,
  'Apple 开发者账号主体': releaseInputs.releaseOwners?.appleDeveloperOwner ?? '',
  'Google Play 开发者账号主体': releaseInputs.releaseOwners?.googlePlayOwner ?? '',
  'Microsoft / Windows 发布主体': releaseInputs.releaseOwners?.windowsPublisherOwner ?? '',
  '域名持有人': releaseInputs.releaseOwners?.domainOwner ?? '',
  '客服 / 支持邮箱': releaseInputs.publicIdentity?.supportEmail ?? productIdentity.public.supportEmail,
  '隐私政策 URL': releaseInputs.publicUrls?.privacyPolicyUrl || (domainRoot ? `${domainRoot}/#/privacy` : ''),
  '服务条款 URL': releaseInputs.publicUrls?.termsOfServiceUrl || (domainRoot ? `${domainRoot}/#/terms` : ''),
  '账号注销说明 URL': releaseInputs.publicUrls?.accountClosureUrl || deletionUrl,
  '数据导出说明 URL': releaseInputs.publicUrls?.dataExportUrl ?? '',
  '数据删除说明 URL': releaseInputs.publicUrls?.dataDeletionUrl || deletionUrl,
};

function renderFieldBlock(fields) {
  return fields.map((field) => `${field}：${fieldValues[field] ?? ''}`).join('\n');
}

const payload = {
  validationDate,
  tasks: ['A-007', 'G-001'],
  fieldValues,
  sections: [
    {
      id: 'brand_and_ids',
      title: '品牌与正式 ID',
      fields: [
        '正式产品名',
        'Android applicationId',
        'iOS Bundle ID',
        'URL Scheme',
        'App Group ID',
        '桌面 App ID',
      ],
    },
    {
      id: 'accounts_and_owners',
      title: '账号、主体与持有人',
      fields: [
        'Apple 开发者账号主体',
        'Google Play 开发者账号主体',
        'Microsoft / Windows 发布主体',
        '域名持有人',
        '客服 / 支持邮箱',
      ],
    },
    {
      id: 'policy_and_links',
      title: '隐私、条款与删除入口',
      fields: [
        '隐私政策 URL',
        '服务条款 URL',
        '账号注销说明 URL',
        '数据导出说明 URL',
        '数据删除说明 URL',
      ],
    },
    {
      id: 'sync_targets',
      title: '需要同步回填的位置',
      fields: [
        'TODO.md',
        'README / 官网下载页',
        '应用内“隐私 / 支持 / 删除账号”入口',
        '商店后台资料',
      ],
    },
  ],
  stopWhen: [
    'A-007 与 G-001 需要的正式 ID、域名、主体与入口都已可证明',
    '应用内、官网、商店后台对外展示的信息一致',
    '不再存在 .dev / 占位 ID 被误当正式发布配置的情况',
  ],
};

const markdown = `# 身份、账号与责任主体清单

日期：${validationDate}

对应任务：

- A-007
- G-001

用途：在正式发布前，把品牌、正式 ID、账号主体、域名和隐私/删除入口一次性定下来，避免后续签名、商店和官网反复返工。

## 1. 品牌与正式 ID

\`\`\`text
${renderFieldBlock(payload.sections[0].fields)}
\`\`\`

## 2. 账号、主体与持有人

\`\`\`text
${renderFieldBlock(payload.sections[1].fields)}
\`\`\`

## 3. 隐私、条款与删除入口

\`\`\`text
${renderFieldBlock(payload.sections[2].fields)}
\`\`\`

## 4. 需要同步回填的位置

- TODO.md
- README / 官网下载页
- 应用内“隐私 / 支持 / 删除账号”入口
- 商店后台资料

## 5. 证据

\`\`\`text
Apple 后台截图路径：
Google Play 后台截图路径：
Microsoft / 域名后台截图路径：
官网链接截图路径：
应用内入口截图路径：
\`\`\`

## 6. 停止条件

- A-007 与 G-001 需要的正式 ID、域名、主体与入口都已可证明；
- 应用内、官网、商店后台对外展示的信息一致；
- 不再存在 \`.dev\` / 占位 ID 被误当正式发布配置的情况。
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
