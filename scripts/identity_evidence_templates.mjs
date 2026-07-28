#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate, validationRelativePath } from './v2_validation_data.mjs';
import {
  getIdentityInputState,
  getIdentityWaveAction,
  identityCheckCommand,
  identityLocalInputPath,
} from './identity_wave_status_lib.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = path.join(repoRoot, 'docs/validation-runs', validationDate, 'identity_and_accounts');
const defaultMarkdownPath = path.join(defaultDir, 'identity-evidence-templates.md');
const defaultJsonPath = path.join(defaultDir, 'identity-evidence-templates.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function renderValue(value) {
  const text = String(value ?? '').trim();
  return text || '未填写';
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function renderFillBlock(template) {
  return [
    `证据项：${template.title}`,
    `关联任务：${template.tasks.join('、')}`,
    `执行人：`,
    `执行日期：`,
    `环境 / 后台：${template.environment}`,
    '',
    ...template.fields.map((field) => `${field.label}：${renderValue(field.current)}`),
    '',
    '证据材料：',
    ...template.evidenceSlots.map((slot) => `- ${slot}：`),
    '',
    '验收结论：',
    '- 结果：未执行 / 通过 / 不通过',
    '- 如不通过，阻塞原因：',
    '- 下一步：',
  ].join('\n');
}

const inputState = getIdentityInputState(repoRoot);
const nextAction = getIdentityWaveAction(repoRoot);
const fieldsByKey = new Map(inputState.fields.map((field) => [field.key, field]));

function pickFields(keys) {
  return keys.map((key) => fieldsByKey.get(key)).filter(Boolean);
}

const templates = [
  {
    id: 'public_pages',
    title: '官网公开页证据',
    tasks: ['G-001', 'G-006'],
    environment: '官网本地预览或线上站点',
    fields: pickFields([
      'publicIdentity.legalEntityName',
      'publicIdentity.supportEmail',
      'publicIdentity.officialDomain',
      'publicIdentity.accountDeletionUrl',
    ]),
    command: 'node scripts/public_surface_sync_check.mjs',
    evidenceSlots: [
      '隐私政策页面 URL / 截图路径',
      '服务条款页面 URL / 截图路径',
      '账号与数据删除页面 URL / 截图路径',
      '支持页面 URL / 截图路径',
      '公开面自检命令输出',
    ],
  },
  {
    id: 'app_internal_entrypoints',
    title: '应用内隐私 / 支持 / 删除入口证据',
    tasks: ['G-001', 'G-002', 'G-003', 'G-006', 'G-007'],
    environment: 'Android 真机、iOS 真机、桌面发布候选版本',
    fields: pickFields([
      'publicIdentity.supportEmail',
      'publicIdentity.accountDeletionUrl',
    ]),
    command: '人工打开应用入口并截图',
    evidenceSlots: [
      'Android 隐私入口截图路径',
      'Android 支持入口截图路径',
      'Android 删除账号入口截图路径',
      'iOS 隐私入口截图路径',
      'iOS 支持入口截图路径',
      'iOS 删除账号入口截图路径',
      '桌面端相关入口截图路径',
    ],
  },
  {
    id: 'store_backends',
    title: '商店后台与开发者资料证据',
    tasks: ['A-007', 'G-001', 'G-002', 'G-003', 'G-004', 'G-005'],
    environment: 'Apple Developer / App Store Connect / Google Play Console / Microsoft 发布后台 / 域名后台',
    fields: pickFields([
      'publicIdentity.legalEntityName',
      'releaseOwners.appleDeveloperOwner',
      'releaseOwners.googlePlayOwner',
      'releaseOwners.windowsPublisherOwner',
      'releaseOwners.domainOwner',
      'publicIdentity.supportEmail',
    ]),
    command: '人工后台回填并截图',
    evidenceSlots: [
      'Apple 开发者主体截图路径',
      'App Store Connect 隐私 / 支持 / 删除入口配置截图路径',
      'Google Play 开发者主体截图路径',
      'Google Play 数据安全 / 联系方式配置截图路径',
      'Microsoft 发布主体截图路径',
      '域名持有人或 DNS 后台截图路径',
    ],
  },
  {
    id: 'deletion_execution',
    title: '账号 / 数据删除执行证据',
    tasks: ['G-001', 'G-006', 'G-007'],
    environment: '测试账号 + 官网删除入口 + 应用内删除入口',
    fields: pickFields([
      'publicIdentity.supportEmail',
      'publicIdentity.accountDeletionUrl',
    ]),
    command: '人工提交删除请求并记录结果',
    evidenceSlots: [
      '测试账号标识',
      '删除请求提交前截图路径',
      '删除请求提交后确认截图路径',
      '支持邮箱自动回复或人工确认截图路径',
      '删除完成后的登录 / 数据不可见验证截图路径',
    ],
  },
  {
    id: 'final_record_sync',
    title: '最终记录同步证据',
    tasks: ['A-007', 'G-001'],
    environment: '仓库记录与验证产物',
    fields: inputState.fields,
    command: 'node scripts/prepare_identity_and_accounts.mjs --out default',
    evidenceSlots: [
      `${validationRelativePath('identity_and_accounts', 'identity-input-status.md')} 最终状态`,
      `${validationRelativePath('identity_and_accounts', 'identity-sync-targets.md')} 最终状态`,
      `${validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md')} 最终状态`,
      'TODO.md 对应任务状态',
      '最终截图 / 后台链接索引',
    ],
  },
].map((template) => ({
  ...template,
  fillBlock: renderFillBlock(template),
}));

const payload = {
  validationDate,
  generatedFrom: 'scripts/identity_evidence_templates.mjs',
  source: identityLocalInputPath,
  summary: {
    templateCount: templates.length,
    unresolvedInputCount: inputState.unresolvedFields.length,
    nextCommand: nextAction.command,
    checkCommand: identityCheckCommand,
  },
  templates,
  nextAction: {
    action: nextAction.action,
    command: nextAction.command,
    followup: nextAction.followup,
  },
};

const markdown = `# 身份与公开入口人工证据模板

日期：${validationDate}

来源：\`${identityLocalInputPath}\`

用途：把 A-007 / G-001 需要人工截图、后台链接、执行结论的部分压成可直接填写的模板。模板本身不是完成证据；只有填入真实主体、真实后台 / 真机截图和结论后，才可作为收口材料。

## 汇总

- 模板数：${payload.summary.templateCount}
- 身份输入待补字段数：${payload.summary.unresolvedInputCount}
- 身份字段预检命令：\`${identityCheckCommand}\`
- 当前默认下一条命令：\`${payload.summary.nextCommand}\`

## 模板索引

| 模板 | 关联任务 | 环境 / 后台 | 默认命令 / 动作 |
| --- | --- | --- | --- |
${templates.map((template) => `| ${escapeTableCell(template.title)} | ${template.tasks.join('、')} | ${escapeTableCell(template.environment)} | ${escapeTableCell(template.command)} |`).join('\n')}

## 可填写模板

${templates.map((template) => `### ${template.title}

\`\`\`text
${template.fillBlock}
\`\`\`
`).join('\n')}

## 下一步

- 当前动作：${nextAction.action}
- 默认命令：\`${nextAction.command}\`
- 后续动作：${nextAction.followup}
`;

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
