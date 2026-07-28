#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getIdentityWaveAction, identityLocalInputPath } from './identity_wave_status_lib.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const defaultOutputPath = path.join(
  repoRoot,
  'docs/validation-runs',
  validationDate,
  'fastest-remaining-path.md',
);
const defaultJsonPath = path.join(
  repoRoot,
  'docs/validation-runs',
  validationDate,
  'fastest-remaining-path.json',
);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');

const identityEvidenceSeeds = [
  validationRelativePath('identity_and_accounts', 'evidence', 'current-product-identity.json'),
  validationRelativePath('identity_and_accounts', 'evidence', 'current-identity-values.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'public-doc-placeholders.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-readiness-findings.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'engineering-identity-values.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-checklist-seed.txt'),
  validationRelativePath('identity_and_accounts', 'evidence', 'identity-evidence-templates.txt'),
];

const releaseEvidenceSeeds = [
  validationRelativePath('release_dry_run', 'release-run-sheet.md'),
  validationRelativePath('release_dry_run', 'evidence', 'release-candidate-manifest.json'),
  validationRelativePath('release_dry_run', 'evidence', 'android-release-sha256.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'ios-testflight-build.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'desktop-package-sha256.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'site-links-check.txt'),
  validationRelativePath('release_dry_run', 'evidence', 'rollback-record.txt'),
];

const legacyEvidenceSeeds = [
  validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-ready-state.json'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-blockers.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-audit-buckets.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-checklist.txt'),
  validationRelativePath('legacy_mobile', 'evidence', 'legacy-post-delete-verification.txt'),
];

const mobileEvidenceSeeds = [
  validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-device-matrix.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-sample-checksums.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-evidence-paths.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-report-fields.txt'),
  validationRelativePath('mobile_true_device', 'evidence', 'mobile-run-checklist.txt'),
];

const syncAiEvidenceSeeds = [
  validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
  validationRelativePath('gate_d_sync', 'evidence', 'postgres18-native-integration.txt'),
  validationRelativePath('gate_f_result_return', 'evidence', 'codex-mcp-result-write-confirm.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-environment-checklist.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-sample-checksums.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'sync-ai-run-order.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-d-evidence-paths.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-e-evidence-paths.txt'),
  validationRelativePath('sync_ai_return', 'evidence', 'gate-f-evidence-paths.txt'),
];

const statusMap = readTodoSnapshot(repoRoot).sectionStatusMap;
const identityAction = getIdentityWaveAction(repoRoot);

const waves = [
  {
    id: 'identity_and_accounts',
    title: '第 1 波：身份、账号与责任主体',
    why: '这是所有正式发布动作的最小外部前置；不先拿到正式身份，后面的签名、商店和域名动作都会反复返工。',
    tasks: ['A-007', 'G-001'],
    deliverables: [
      '正式产品名、Android applicationId、iOS Bundle ID、URL Scheme、App Group ID、桌面 App ID',
      'Apple / Google / Windows 发布账号与域名',
      '隐私政策、服务条款、支持联系方式、账号删除与数据删除责任主体',
    ],
    evidence: [
      'node scripts/public_surface_sync_check.mjs',
      identityLocalInputPath,
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      ...identityEvidenceSeeds,
      '商店后台或开发者后台截图',
      '最终 ID / 域名 / 联系方式清单',
      '应用内和官网可访问的隐私与支持入口',
    ],
    startCommands: [
      ...identityAction.startCommands,
      '人工确认正式产品名、Bundle ID、applicationId、URL Scheme、App Group ID、桌面 App ID',
      '把最终 ID、域名、支持联系方式、隐私责任主体回填到 TODO / 官网 / 应用内入口',
    ],
    stopWhen: [
      'A-007 与 G-001 的账号、标识、隐私主体都已可被截图或链接证明',
      '正式 ID 不再是 .dev / 占位状态',
    ],
    outputs: [
      validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
      validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
      validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
      ...identityEvidenceSeeds,
    ],
    parallelizable: '不可并行跳过；这是后续正式发布的硬前置。',
  },
  {
    id: 'mobile_true_device',
    title: '第 2 波：移动真机矩阵一次跑完',
    why: 'B/C 剩余项本质上都是同一批真机来源、性能与恢复证据；分开跑最浪费时间。',
    tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    deliverables: [
      'Android：微信、QQ、浏览器、文件管理器的真实打开与恢复证据',
      'iPhone / iPad：微信、QQ、Safari、“文件”App、系统分享面板证据',
      '大 Markdown / 大 JSON 的首屏、滚动、恢复与性能记录',
    ],
    evidence: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
      ...mobileEvidenceSeeds,
      '对应 evidence/ 内的录屏、截图、性能文本',
    ],
    startCommands: [
      'node scripts/prepare_mobile_true_device_wave.mjs --out default',
      '按 docs/design/v2-validation-batches.md 的真机来源矩阵执行 Android + iPhone/iPad 采集',
    ],
    stopWhen: [
      'mobile-true-device-report.md 已填完设备、来源 App、样例 hash、性能数据与证据路径',
      'B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009 都有真实录屏或截图',
    ],
    outputs: [
      validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
      ...mobileEvidenceSeeds,
    ],
    parallelizable: 'Android 与 iOS 可以同一天并行采集，但必须使用同一批固定样例。',
  },
  {
    id: 'sync_ai_return',
    title: '第 3 波：同步 / AI / 结果回流外部批次共用一次环境',
    why: 'E-007 已关闭，真实 Codex 写回与电脑确认也已通过；D-010 与 F-005 现在只需复用同一套 Docker Compose、桌面和真机环境收尾。',
    tasks: ['D-010', 'E-007', 'F-005'],
    deliverables: [
      'Docker Compose 编排/卷隔离 + 三端真机 + 桌面联调证据（真实 PostgreSQL 18.4 数据库主链已通过）',
      'Android / iOS 真机收到已确认 AI 结果并完成全部阅读操作的证据',
    ],
    evidence: [
      validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
      validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
      validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
      ...syncAiEvidenceSeeds,
    ],
    startCommands: [
      'node scripts/prepare_sync_ai_wave.mjs --out default',
      'cd server && docker compose up --build --wait',
      '按固定顺序执行 D-010 → F-005',
    ],
    stopWhen: [
      'D-010 与 F-005 报告都已填完真实 file id/version/hash、日志/录屏路径与结论',
      'D-010 / F-005 的唯一外部缺口全部被真实证据覆盖',
    ],
    outputs: [
      validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
      validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
      validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
      ...syncAiEvidenceSeeds,
    ],
    parallelizable: '环境准备一次，执行顺序建议固定为 D-010 → F-005；E-007 不重复执行。',
  },
  {
    id: 'release_and_site',
    title: '第 4 波：平台发布、官网与演练',
    why: '当 Gate B/C/D/E/F 都拿到外部证据后，再集中做 G-002～G-007，能避免因为前置门没关而重复打包。',
    tasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    deliverables: [
      'Android AAB / APK / SHA256 / 渠道后台记录',
      'iOS Archive / TestFlight / 审核资料',
      'Windows / macOS 安装包、签名、公证或发布记录',
      '官网真实下载链接、SHA256、教程截图、更新日志',
      '完整发布演练与回滚演练记录',
    ],
    evidence: [
      'node scripts/public_surface_sync_check.mjs',
      validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
      ...releaseEvidenceSeeds,
      'docs/design/release-operations-checklist.md',
    ],
    startCommands: [
      'node scripts/prepare_release_wave.mjs --out default',
      'cd desktop && npm run build:dist',
      "xcodebuild -project native/iosApp/Molan.xcodeproj -scheme Molan -destination 'generic/platform=iOS Simulator' build",
      '按 docs/design/release-operations-checklist.md 逐平台补签名、上传、SHA256、官网链接与回滚记录',
    ],
    stopWhen: [
      'G-002 ～ G-007 的真实渠道、SHA256、官网链接、演练记录与回滚证据都已填入报告',
      'release-dry-run-report.md 与 release-readiness-snapshot.md 不再是草稿状态',
    ],
    outputs: [
      validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
      validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
      ...releaseEvidenceSeeds,
    ],
    parallelizable: 'Windows 与 macOS 可并行；Android 与 iOS 共享品牌/隐私资料；官网最好最后一次统一替换真实链接。',
  },
  {
    id: 'remove_legacy_mobile',
    title: '第 5 波：删除旧 React Native 端',
    why: 'G-008 是清理动作，不应抢在任何发布验收前执行。',
    tasks: ['G-008'],
    deliverables: [
      '删除 mobile/ 及其专属依赖、文档、CI 引用',
      '确认原生 Android / iOS 与桌面 / CLI 构建都仍然通过',
    ],
    evidence: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      ...legacyEvidenceSeeds,
      '仓库全文搜索无对 mobile/ 的残留主流程引用',
      '原生、桌面、CLI 构建验证输出',
    ],
    startCommands: [
      'node scripts/prepare_legacy_mobile_wave.mjs --out default',
      '确认 G-002 ～ G-007 已全部改成 [x]',
      '删除 mobile/ 及只为其存在的依赖、脚本、CI 和文档引用',
      '重新执行原生、桌面、CLI 构建验证',
    ],
    stopWhen: [
      '全文搜索不再有旧 React Native 主流程残留引用',
      'G-008 所需构建与引用检查全部通过',
    ],
    outputs: [
      validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
      ...legacyEvidenceSeeds,
    ],
    parallelizable: '不可提前；只能在所有发布门关闭后执行。',
  },
];

const activeWaves = waves
  .map((wave) => ({
    ...wave,
    tasks: wave.tasks.filter((task) => statusMap.get(task) && statusMap.get(task) !== 'x'),
  }))
  .filter((wave) => wave.tasks.length > 0);

const payload = {
  validationDate,
  remainingTaskCount: activeWaves.reduce((sum, wave) => sum + wave.tasks.length, 0),
  waves: activeWaves,
};

const markdown = `# 剩余任务最短收口路径

日期：${validationDate}

用途：把当前未完成的任务按“最少重复环境启动、最少返工”的顺序压成执行波次。

## 核心原则

1. 先拿正式身份与账号，再做任何正式发布动作。
2. 真机矩阵一次做完，不把 Android / iOS 拆成多轮。
3. D / F 共用一次 Docker Compose、桌面和真机环境；E 已关闭。
4. G-002～G-007 最后集中打包、发布、替换官网和做演练。
5. G-008 永远最后删除。

## 当前最短顺序

${activeWaves.map((wave) => `## ${wave.title}

### 为什么现在做

${wave.why}

### 覆盖任务

${wave.tasks.map((task) => `- ${task}`).join('\n')}

### 本波必须拿到的产物

${wave.deliverables.map((item) => `- ${item}`).join('\n')}

### 证据入口

${wave.evidence.map((item) => `- \`${item}\``).join('\n')}

### 起手命令

${wave.startCommands.map((item) => `- ${item}`).join('\n')}

### 什么时候可以停

${wave.stopWhen.map((item) => `- ${item}`).join('\n')}

${wave.outputs.length === 0 ? '' : `### 当前已准备输出

${wave.outputs.map((item) => `- \`${item}\``).join('\n')}

`}
### 并行建议

${wave.parallelizable}
`).join('\n')}
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
  const target = rawTarget === 'default' ? defaultOutputPath : path.resolve(rawTarget);
  writeOutput(target, `${markdown}\n`);
  if (rawTarget === 'default') {
    writeOutput(defaultJsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }
  console.log(`已写入 ${target}`);
  process.exit(0);
}

process.stdout.write(`${markdown}\n`);
