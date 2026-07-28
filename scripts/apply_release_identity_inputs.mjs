#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { validationDate } from './v2_validation_data.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const jsonOnly = args.includes('--json');
const dryRun = args.includes('--dry-run');
const checkOnly = args.includes('--check');
const initOnly = args.includes('--init');
const defaultInputPath = path.join(repoRoot, 'config/release-identity-inputs.json');
const templatePath = path.join(repoRoot, 'config/release-identity-inputs.template.json');
const productIdentityPath = path.join(repoRoot, 'config/product-identity.json');
const inputPath = inputIndex !== -1 && args[inputIndex + 1]
  ? path.resolve(args[inputIndex + 1])
  : defaultInputPath;
const previewOnly = dryRun || checkOnly;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function filled(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('[待补');
}

function normalizeUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  if (/^[a-z]+:\/\//i.test(raw)) return raw.replace(/\/+$/, '');
  return `https://${raw}`.replace(/\/+$/, '');
}

function normalizeEmail(value) {
  return String(value ?? '').trim();
}

function isPlaceholder(value) {
  return typeof value === 'string' && value.includes('[待补');
}

function validateEmail(value, label) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${label} 格式不合法：${value}`);
  }
}

function validateAbsoluteUrl(value, label) {
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error(`${label} 不是合法的 http/https URL：${value}`);
  }
}

function derivePublicUrls(officialDomain, inputUrls, accountDeletionUrl) {
  const domainRoot = normalizeUrl(officialDomain);
  const input = inputUrls ?? {};
  const defaults = {
    privacyPolicyUrl: `${domainRoot}/#/privacy`,
    termsOfServiceUrl: `${domainRoot}/#/terms`,
    accountClosureUrl: accountDeletionUrl,
    dataExportUrl: `${domainRoot}/#/support`,
    dataDeletionUrl: accountDeletionUrl,
  };

  const normalized = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const raw = input[key];
    normalized[key] = raw && !isPlaceholder(raw) ? normalizeUrl(raw) : fallback;
  }
  return normalized;
}

function validateRequired(inputs) {
  const required = [
    ['publicIdentity.legalEntityName', inputs.publicIdentity?.legalEntityName],
    ['publicIdentity.supportEmail', inputs.publicIdentity?.supportEmail],
    ['publicIdentity.officialDomain', inputs.publicIdentity?.officialDomain],
    ['publicIdentity.accountDeletionUrl', inputs.publicIdentity?.accountDeletionUrl],
    ['releaseOwners.appleDeveloperOwner', inputs.releaseOwners?.appleDeveloperOwner],
    ['releaseOwners.googlePlayOwner', inputs.releaseOwners?.googlePlayOwner],
    ['releaseOwners.windowsPublisherOwner', inputs.releaseOwners?.windowsPublisherOwner],
    ['releaseOwners.domainOwner', inputs.releaseOwners?.domainOwner],
  ];

  const missing = required.filter(([, value]) => !filled(value)).map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`缺少必填字段：${missing.join('、')}`);
  }

  validateEmail(normalizeEmail(inputs.publicIdentity.supportEmail), 'publicIdentity.supportEmail');
}

function runPrepareIdentity() {
  const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/prepare_identity_and_accounts.mjs'), '--out', 'default'], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error([
      '执行失败：node scripts/prepare_identity_and_accounts.mjs --out default',
      result.stdout?.trim(),
      result.stderr?.trim(),
    ].filter(Boolean).join('\n'));
  }

  return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

if (initOnly) {
  if (fs.existsSync(inputPath)) {
    const payload = {
      initialized: false,
      inputPath: path.relative(repoRoot, inputPath),
      message: '本地身份输入文件已存在，可直接编辑后再运行 --check / --dry-run / 默认 apply。',
    };
    if (jsonOnly) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      console.log(`已存在：${payload.inputPath}`);
      console.log(payload.message);
    }
    process.exit(0);
  }

  fs.copyFileSync(templatePath, inputPath);
  const payload = {
    initialized: true,
    inputPath: path.relative(repoRoot, inputPath),
    templatePath: path.relative(repoRoot, templatePath),
    nextStep: `编辑 ${path.relative(repoRoot, inputPath)}，填完真实主体后先运行 node scripts/apply_release_identity_inputs.mjs --check，再执行正式回写。`,
  };
  if (jsonOnly) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    console.log(`已初始化：${payload.inputPath}`);
    console.log(`来源模板：${payload.templatePath}`);
    console.log(payload.nextStep);
  }
  process.exit(0);
}

if (!fs.existsSync(inputPath)) {
  throw new Error(`缺少输入文件：${path.relative(repoRoot, inputPath)}。先运行 node scripts/apply_release_identity_inputs.mjs --init 生成本地模板，填写后再执行 --check / --dry-run / 默认 apply。`);
}

const template = readJson(templatePath);
const input = readJson(inputPath);
const merged = {
  publicIdentity: { ...template.publicIdentity, ...(input.publicIdentity ?? {}) },
  releaseOwners: { ...template.releaseOwners, ...(input.releaseOwners ?? {}) },
  publicUrls: { ...template.publicUrls, ...(input.publicUrls ?? {}) },
};

validateRequired(merged);

const productIdentity = readJson(productIdentityPath);
const officialDomain = normalizeUrl(merged.publicIdentity.officialDomain);
validateAbsoluteUrl(officialDomain, 'publicIdentity.officialDomain');
const accountDeletionUrl = merged.publicIdentity.accountDeletionUrl.includes('[待补')
  ? `${officialDomain}/account/delete`
  : normalizeUrl(merged.publicIdentity.accountDeletionUrl);
validateAbsoluteUrl(accountDeletionUrl, 'publicIdentity.accountDeletionUrl');
const derivedPublicUrls = derivePublicUrls(officialDomain, merged.publicUrls, accountDeletionUrl);
for (const [key, value] of Object.entries(derivedPublicUrls)) {
  validateAbsoluteUrl(value, `publicUrls.${key}`);
}

const nextProductIdentity = {
  ...productIdentity,
  public: {
    ...productIdentity.public,
    updatedDate: validationDate,
    legalEntityName: merged.publicIdentity.legalEntityName.trim(),
    supportEmail: normalizeEmail(merged.publicIdentity.supportEmail),
    officialDomain,
    accountDeletionUrl,
  },
};

let prepareOutput = 'dry-run：未写入 config/product-identity.json，也未刷新身份准备产物。';

if (!previewOnly) {
  writeJson(productIdentityPath, nextProductIdentity);
  prepareOutput = runPrepareIdentity();
}

const payload = {
  mode: initOnly ? 'init' : (previewOnly ? (checkOnly ? 'check' : 'dry-run') : 'apply'),
  dryRun: previewOnly,
  inputPath: path.relative(repoRoot, inputPath),
  updatedProductIdentityPath: path.relative(repoRoot, productIdentityPath),
  applied: {
    legalEntityName: nextProductIdentity.public.legalEntityName,
    supportEmail: nextProductIdentity.public.supportEmail,
    officialDomain: nextProductIdentity.public.officialDomain,
    accountDeletionUrl: nextProductIdentity.public.accountDeletionUrl,
    releaseOwners: merged.releaseOwners,
    publicUrls: derivedPublicUrls,
  },
  prepareIdentityOutput: prepareOutput,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(0);
}

console.log(`已从 ${payload.inputPath} 回写公开身份配置：`);
console.log(`- 主体：${payload.applied.legalEntityName}`);
console.log(`- 支持邮箱：${payload.applied.supportEmail}`);
console.log(`- 正式域名：${payload.applied.officialDomain}`);
console.log(`- 删除入口：${payload.applied.accountDeletionUrl}`);
console.log(`- 模式：${previewOnly ? `${payload.mode}（不写文件）` : 'apply（已写入并刷新产物）'}`);
console.log('');
console.log(prepareOutput || '已刷新身份准备产物。');
