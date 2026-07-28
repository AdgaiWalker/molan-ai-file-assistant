#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getIdentityInputState, identityCheckCommand, identityLocalInputPath } from './identity_wave_status_lib.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultMarkdownPath = validationAbsolutePath('minimal-external-inputs.md');
const defaultJsonPath = validationAbsolutePath('minimal-external-inputs.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

function placeholder(value) {
  return typeof value === 'string' && value.includes('[待补');
}

const snapshot = readTodoSnapshot(repoRoot);
const productIdentity = readJson('config/product-identity.json');
const identityInputState = getIdentityInputState(repoRoot);
const minimalIdentityInputs = identityInputState.fields;

const locallyDecidedIdentity = [
  ['正式产品名', productIdentity.brand.name],
  ['品牌 slug', productIdentity.brand.slug],
  ['Android applicationId', productIdentity.engineering.android.applicationId],
  ['Android 显示名', productIdentity.engineering.android.displayName],
  ['iOS Bundle ID', productIdentity.engineering.ios.bundleId],
  ['iOS URL Scheme', productIdentity.engineering.ios.urlScheme],
  ['iOS App Group ID', productIdentity.engineering.ios.appGroupId],
  ['桌面 App ID', productIdentity.engineering.desktop.appId],
  ['桌面 packageName', productIdentity.engineering.desktop.packageName],
];

const externalGroups = [
  {
    id: 'identity_and_accounts',
    title: '身份 / 账号 / 公开主体',
    directTasks: ['A-007', 'G-001'],
    type: 'value_inputs',
    readyArtifacts: [
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
      validationRelativePath('identity_and_accounts', 'evidence', 'identity-checklist-seed.txt'),
      validationRelativePath('identity_and_accounts', 'evidence', 'identity-evidence-templates.txt'),
      identityLocalInputPath,
    ],
    minimalInputs: minimalIdentityInputs,
    note: `这一组已经不是工程实现问题；现在统一在 ${identityLocalInputPath} 里补值，随后运行 ${identityCheckCommand} 预检。`,
  },
  {
    id: 'mobile_true_device',
    title: '移动真机来源与性能矩阵',
    directTasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    type: 'resource_bundle',
    resources: [
      '至少 2 台 Android 真机（最好覆盖两个国产品牌）',
      '至少 1 台 iPhone 与 1 台 iPad',
      '微信 / QQ / 浏览器 / 文件 App / 系统分享面板的真实入口',
      '录屏与性能记录能力',
    ],
    readyArtifacts: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
      validationRelativePath('mobile_true_device', 'evidence', 'mobile-device-matrix.txt'),
      validationRelativePath('mobile_true_device', 'evidence', 'mobile-run-checklist.txt'),
    ],
    note: '这一组缺的是设备和真实来源，不缺模板、样例或字段定义。',
  },
  {
    id: 'sync_ai_return',
    title: '同步 / AI / 回流联调环境',
    directTasks: ['D-010', 'E-007', 'F-005'],
    type: 'resource_bundle',
    resources: [
      'Docker Compose 可运行环境（真实 PostgreSQL 18.4 数据库主链已通过）',
      '桌面端真实收件箱联调机器',
      'Android / iOS 真机',
    ],
    readyArtifacts: [
      validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
      validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-environment-checklist.txt'),
      validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-run-order.txt'),
    ],
    note: '真实 Codex 读取/写回与电脑确认已完成；这一组现在缺的是 Docker Compose 编排/卷隔离和 Android/iOS 真机矩阵。',
  },
  {
    id: 'release_and_site',
    title: '正式发布渠道 / 签名 / 公证 / 官网替换',
    directTasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    type: 'resource_bundle',
    resources: [
      'Android release 签名与渠道后台',
      'Apple Team / Profile / TestFlight / macOS 公证信息',
      'Windows 安装包发布渠道',
      '官网真实下载链接、真实客服邮箱、回滚演练记录',
    ],
    readyArtifacts: [
      validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      validationRelativePath('release_dry_run', 'release-run-sheet.md'),
      validationRelativePath('release_dry_run', 'evidence', 'release-candidate-manifest.json'),
      validationRelativePath('release_dry_run', 'evidence', 'rollback-record.txt'),
    ],
    note: '这一组缺的是正式渠道和账号能力，不缺候选产物、SHA256 占位和演练模板。',
  },
  {
    id: 'legacy_mobile_cleanup',
    title: '旧 React Native mobile 最终清理窗口',
    directTasks: ['G-008'],
    type: 'release_window',
    resources: [
      'G-002～G-007 全部已关闭',
      '旧 mobile 删除前审计 must_remove 为 0',
      '可执行删除后的 Android / iOS / desktop / CLI 全量验证窗口',
    ],
    readyArtifacts: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
      validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-ready-state.json'),
      validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-checklist.txt'),
    ],
    note: '这一组缺的是发布完成后的安全删除窗口；在 G-002～G-007 关闭前，不执行真实删除。',
  },
];

const unresolvedIdentityInputs = minimalIdentityInputs.filter((item) => !item.current || placeholder(item.current));
const activeGroups = externalGroups
  .map((group) => ({
    ...group,
    directTasks: group.directTasks.filter((taskId) => snapshot.sectionStatusMap.get(taskId) !== 'x'),
  }))
  .filter((group) => group.directTasks.length > 0);

const payload = {
  validationDate,
  generatedFrom: 'scripts/minimal_external_inputs.mjs',
  summary: {
    remainingTasks: snapshot.remaining,
    blockedTasks: snapshot.counts['!'],
    verifyTasks: snapshot.counts.v,
    identityInputCount: minimalIdentityInputs.length,
    unresolvedIdentityInputCount: unresolvedIdentityInputs.length,
    activeExternalGroupCount: activeGroups.length,
  },
  locallyDecidedIdentity,
  unresolvedIdentityInputs,
  externalGroups: activeGroups,
};

const markdown = `# 剩余任务最小外部输入清单

日期：${validationDate}

用途：把当前未完成任务里真正无法靠本地继续推进的部分，压成一份最小外部输入与资源清单。能本地决定的身份值已单独列出，不再重复索要。

## 当前结论

- 未完成任务数：${payload.summary.remainingTasks}
- 阻塞任务数：[!] ${payload.summary.blockedTasks}
- 待外部验收任务数：[v] ${payload.summary.verifyTasks}
- 仍需外部资源的活动组数：${payload.summary.activeExternalGroupCount}
- 真正还缺的身份类输入数：${payload.summary.unresolvedIdentityInputCount} / ${payload.summary.identityInputCount}

## 已在本地定死的身份值

${locallyDecidedIdentity.map(([label, value]) => `- ${label}：\`${value}\``).join('\n')}

## 现在只缺的身份类输入

${unresolvedIdentityInputs.map((item, index) => `${index + 1}. ${item.label}
   - 当前值：${item.current ? `\`${item.current}\`` : '未填写'}
   - 建议回填位置：\`${item.source}\`
   - 直接影响：${item.requiredFor.join('、')}`).join('\n\n')}

## 外部资源组

${activeGroups.map((group) => `### ${group.title}

- 覆盖任务：${group.directTasks.join('、')}
- 类型：${group.type === 'value_inputs' ? '需要填写真实值' : '需要拿到真实设备 / 账号 / 渠道'}
- 说明：${group.note}

${group.type === 'value_inputs'
  ? `#### 最小输入

${group.minimalInputs.map((item) => `- ${item.label}`).join('\n')}`
  : `#### 最少需要到位的资源

${group.resources.map((item) => `- ${item}`).join('\n')}`}

#### 已准备好的入口

${group.readyArtifacts.map((item) => `- \`${item}\``).join('\n')}
`).join('\n')}

## 当前建议顺序

1. 先补完上面的 ${payload.summary.unresolvedIdentityInputCount} 个身份类输入；
2. 再启动移动真机矩阵；
3. 然后共用一次同步 / AI / 回流联调环境；
4. 最后进入正式发布与官网替换；
5. G-008 永远最后做。
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
