import fs from 'node:fs';
import path from 'node:path';

export const identityLocalInputPath = 'config/release-identity-inputs.json';
export const identityTemplatePath = 'config/release-identity-inputs.template.json';
export const productIdentityConfigPath = 'config/product-identity.json';
export const identityPrepareCommand = 'node scripts/prepare_identity_and_accounts.mjs --out default';
export const identityInitCommand = 'node scripts/apply_release_identity_inputs.mjs --init';
export const identityCheckCommand = 'node scripts/apply_release_identity_inputs.mjs --check';
export const identityDryRunCommand = 'node scripts/apply_release_identity_inputs.mjs --dry-run';
export const identityApplyCommand = 'node scripts/apply_release_identity_inputs.mjs';

function readJson(repoRoot, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

function exists(repoRoot, relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

export function placeholder(value) {
  return typeof value === 'string' && value.includes('[待补');
}

export function filled(value) {
  return typeof value === 'string' && value.trim() !== '' && !placeholder(value);
}

export function getMergedReleaseIdentityInputs(repoRoot) {
  const template = readJson(repoRoot, identityTemplatePath);
  const input = exists(repoRoot, identityLocalInputPath) ? readJson(repoRoot, identityLocalInputPath) : {};
  return {
    publicIdentity: { ...template.publicIdentity, ...(input.publicIdentity ?? {}) },
    releaseOwners: { ...template.releaseOwners, ...(input.releaseOwners ?? {}) },
    publicUrls: { ...template.publicUrls, ...(input.publicUrls ?? {}) },
  };
}

export function getProductIdentity(repoRoot) {
  return readJson(repoRoot, productIdentityConfigPath);
}

export function getIdentityInputState(repoRoot) {
  const merged = getMergedReleaseIdentityInputs(repoRoot);
  const fields = [
    {
      key: 'publicIdentity.legalEntityName',
      label: '正式主体名称',
      current: merged.publicIdentity?.legalEntityName ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    },
    {
      key: 'publicIdentity.supportEmail',
      label: '支持邮箱',
      current: merged.publicIdentity?.supportEmail ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-006'],
    },
    {
      key: 'publicIdentity.officialDomain',
      label: '正式域名',
      current: merged.publicIdentity?.officialDomain ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-006'],
    },
    {
      key: 'publicIdentity.accountDeletionUrl',
      label: '账号 / 数据删除入口 URL',
      current: merged.publicIdentity?.accountDeletionUrl ?? '',
      source: identityLocalInputPath,
      requiredFor: ['G-001', 'G-006'],
    },
    {
      key: 'releaseOwners.appleDeveloperOwner',
      label: 'Apple 开发者账号主体',
      current: merged.releaseOwners?.appleDeveloperOwner ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-003', 'G-005'],
    },
    {
      key: 'releaseOwners.googlePlayOwner',
      label: 'Google Play 开发者账号主体',
      current: merged.releaseOwners?.googlePlayOwner ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-002'],
    },
    {
      key: 'releaseOwners.windowsPublisherOwner',
      label: 'Windows / Microsoft 发布主体',
      current: merged.releaseOwners?.windowsPublisherOwner ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-004'],
    },
    {
      key: 'releaseOwners.domainOwner',
      label: '域名持有人',
      current: merged.releaseOwners?.domainOwner ?? '',
      source: identityLocalInputPath,
      requiredFor: ['A-007', 'G-001', 'G-006'],
    },
  ];

  return {
    inputExists: exists(repoRoot, identityLocalInputPath),
    fields,
    unresolvedFields: fields.filter((field) => !filled(field.current)),
  };
}

export function getIdentityWaveAction(repoRoot) {
  const inputState = getIdentityInputState(repoRoot);
  const productIdentity = getProductIdentity(repoRoot);
  const publicStillPlaceholder = [
    productIdentity.public.legalEntityName,
    productIdentity.public.supportEmail,
    productIdentity.public.officialDomain,
    productIdentity.public.accountDeletionUrl,
  ].some((value) => !filled(value));

  if (!inputState.inputExists) {
    return {
      action: '初始化本地身份输入文件',
      command: identityInitCommand,
      canDoNow: true,
      needsExternal: false,
      blockerSummary: '当前还没生成本地身份输入文件。',
      blockers: [],
      followup: `编辑生成的 ${identityLocalInputPath}，再运行 ${identityCheckCommand}。`,
      startCommands: [
        identityInitCommand,
        `编辑 ${identityLocalInputPath}`,
        identityCheckCommand,
      ],
    };
  }

  if (inputState.unresolvedFields.length > 0) {
    return {
      action: '补齐真实身份字段并预检',
      command: identityCheckCommand,
      canDoNow: false,
      needsExternal: true,
      blockerSummary: '需要真实主体、域名、支持邮箱、删除入口与各平台账号主体。',
      blockers: inputState.unresolvedFields.map((field) => `${field.label}${field.current ? `（当前：${field.current}）` : ''}`),
      followup: `字段补齐后先运行 ${identityCheckCommand} / ${identityDryRunCommand}，确认无误后再执行 ${identityApplyCommand}。`,
      startCommands: [
        `编辑 ${identityLocalInputPath}`,
        identityCheckCommand,
        identityDryRunCommand,
        identityApplyCommand,
      ],
    };
  }

  if (publicStillPlaceholder) {
    return {
      action: '把真实身份输入正式回写到公开配置',
      command: identityApplyCommand,
      canDoNow: true,
      needsExternal: false,
      blockerSummary: '本地输入已经补齐，但公开配置与生成产物还没吃到真实值。',
      blockers: [],
      followup: `执行 ${identityApplyCommand} 后，再检查身份快照与公开文案产物。`,
      startCommands: [
        identityApplyCommand,
        identityPrepareCommand,
      ],
    };
  }

  return {
    action: '补商店后台 / 官网 / 应用内的最终身份证据',
    command: identityPrepareCommand,
    canDoNow: false,
    needsExternal: true,
    blockerSummary: '配置层已经收口，剩下的是商店后台、官网与应用内入口的真实证据。',
    blockers: [
      'Apple / Google / Microsoft / 域名后台截图',
      '官网可访问的隐私、支持、删除入口',
      '应用内对应入口截图',
    ],
    followup: '围绕 identity-prep-summary 和 evidence 种子，把截图、后台链接和公开入口证据补齐。',
    startCommands: [
      identityPrepareCommand,
      '补商店后台、官网与应用内入口截图/链接',
    ],
  };
}
