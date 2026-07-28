#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourcePath = path.join(repoRoot, 'config/product-identity.json');
const templatesDir = path.join(repoRoot, 'docs/public/templates');
const outputDir = path.join(repoRoot, 'docs/public');
const siteOutputPath = path.join(repoRoot, 'site/src/lib/publicIdentity.generated.ts');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

const fileMap = [
  ['privacy-policy.template.md', 'privacy-policy.md'],
  ['terms-of-service.template.md', 'terms-of-service.md'],
  ['account-and-data-deletion.template.md', 'account-and-data-deletion.md'],
  ['support.template.md', 'support.md'],
];

const identityRoot = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
const identity = {
  brandName: identityRoot.brand.name,
  brandSlug: identityRoot.brand.slug,
  ...identityRoot.public,
};
const replacements = {
  UPDATED_DATE: identity.updatedDate,
  STATUS_LABEL: identity.statusLabel,
  LEGAL_ENTITY_NAME: identity.legalEntityName,
  SUPPORT_EMAIL: identity.supportEmail,
  OFFICIAL_DOMAIN: identity.officialDomain,
  ACCOUNT_DELETION_URL: identity.accountDeletionUrl,
};

function renderTemplate(templateText) {
  const rendered = templateText.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in replacements)) {
      throw new Error(`未知模板变量：${key}`);
    }
    return String(replacements[key]);
  });

  const unresolved = rendered.match(/\{\{[A-Z_]+\}\}/g);
  if (unresolved) {
    throw new Error(`模板变量未完全替换：${unresolved.join(', ')}`);
  }

  return rendered.trimEnd() + '\n';
}

function ensureSynced(targetPath, expectedContent) {
  const relativePath = path.relative(repoRoot, targetPath);
  const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : null;
  if (current === expectedContent) return true;
  if (!checkOnly) {
    fs.writeFileSync(targetPath, expectedContent, 'utf-8');
    return true;
  }
  console.error(`未同步：${relativePath}`);
  return false;
}

let ok = true;
for (const [templateName, outputName] of fileMap) {
  const templatePath = path.join(templatesDir, templateName);
  const outputPath = path.join(outputDir, outputName);
  const templateText = fs.readFileSync(templatePath, 'utf-8');
  ok = ensureSynced(outputPath, renderTemplate(templateText)) && ok;
}

const siteModule = `/**
 * 由 scripts/render_public_docs.mjs 生成。
 * 修改 config/product-identity.json 后重新运行脚本，不要直接手改本文件。
 */
export const PUBLIC_IDENTITY = ${JSON.stringify(identity, null, 2)} as const;
`;

ok = ensureSynced(siteOutputPath, siteModule) && ok;

if (checkOnly) {
  if (ok) {
    console.log('公开文案与站点身份常量已同步。');
    process.exit(0);
  }
  process.exit(1);
}

console.log('已同步公开文案与站点身份常量：');
for (const [, outputName] of fileMap) console.log(`- docs/public/${outputName}`);
console.log('- site/src/lib/publicIdentity.generated.ts');
