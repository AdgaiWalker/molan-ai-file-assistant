#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { validationAbsolutePath, validationDate, validationRelativePath } from './v2_validation_data.mjs';
import { getIdentityInputState, getIdentityWaveAction, identityLocalInputPath, productIdentityConfigPath } from './identity_wave_status_lib.mjs';
import { getRepoRoot, readTodoSnapshot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultMarkdownPath = validationAbsolutePath('next-remaining-action.md');
const defaultJsonPath = validationAbsolutePath('next-remaining-action.json');

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function readJson(relativeOrAbsolutePath) {
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function exists(relativeOrAbsolutePath) {
  const filePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
  return fs.existsSync(filePath);
}

function buildIdentityWave(snapshot) {
  const inputState = getIdentityInputState(repoRoot);
  const identityAction = getIdentityWaveAction(repoRoot);
  return {
    id: 'identity_and_accounts',
    title: '第 1 波：身份、账号与责任主体',
    tasks: ['A-007', 'G-001'],
    canDoNow: identityAction.canDoNow,
    needsExternal: identityAction.needsExternal,
    action: identityAction.action,
    command: identityAction.command,
    followup: identityAction.followup,
    why: !inputState.inputExists
      ? '正式身份波次已经缩成一个本地 JSON 输入文件；先把文件起出来，后面就不需要再手工复制模板。'
      : inputState.unresolvedFields.length > 0
        ? '这一波已经不缺工程改造，只缺真实主体、域名、邮箱和各平台账号主体。'
        : identityAction.canDoNow
          ? '本地输入已经补齐，但公开配置与产物还没吃到这些真实值。'
          : '配置层已经准备好了，剩下的是无法靠本地假造的真实后台与公开入口证据。',
    blockers: identityAction.blockers,
    evidence: [
      identityLocalInputPath,
      ...(inputState.unresolvedFields.length > 0
        ? [
            validationRelativePath('identity_and_accounts', 'identity-and-accounts-checklist.md'),
            validationRelativePath('identity_and_accounts', 'identity-readiness-snapshot.md'),
            validationRelativePath('identity_and_accounts', 'evidence', 'identity-checklist-seed.txt'),
            validationRelativePath('identity_and_accounts', 'evidence', 'identity-evidence-templates.txt'),
          ]
        : identityAction.canDoNow
          ? [
              productIdentityConfigPath,
              validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
              validationRelativePath('identity_and_accounts', 'engineering-identity-snapshot.md'),
            ]
          : [
              validationRelativePath('identity_and_accounts', 'identity-prep-summary.md'),
              validationRelativePath('identity_and_accounts', 'evidence', 'public-doc-placeholders.txt'),
              validationRelativePath('identity_and_accounts', 'evidence', 'identity-readiness-findings.txt'),
              validationRelativePath('identity_and_accounts', 'evidence', 'identity-evidence-templates.txt'),
            ]),
    ],
  };
}

function buildPreparedWave({
  id,
  title,
  tasks,
  prepSummary,
  prepCommand,
  executeAction,
  executeCommand,
  blockers,
  evidence,
  why,
}) {
  if (!exists(prepSummary)) {
    return {
      id,
      title,
      tasks,
      canDoNow: true,
      needsExternal: false,
      action: '先刷新这一波的统一准备产物',
      command: prepCommand,
      followup: executeCommand,
      why: '先把模板、证据种子和路径准备好，外部环境到位后就不用再现场拼步骤。',
      blockers: [],
      evidence,
    };
  }

  return {
    id,
    title,
    tasks,
    canDoNow: false,
    needsExternal: true,
    action: executeAction,
    command: executeCommand,
    followup: '执行完成后把真实录屏、截图、日志、SHA256 和结论直接补到对应报告。',
    why,
    blockers,
    evidence,
  };
}

const snapshot = readTodoSnapshot(repoRoot);
const waveOrder = [
  {
    id: 'identity_and_accounts',
    tasks: ['A-007', 'G-001'],
    build: () => buildIdentityWave(snapshot),
  },
  {
    id: 'mobile_true_device',
    tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    build: () => buildPreparedWave({
      id: 'mobile_true_device',
      title: '第 2 波：移动真机矩阵一次跑完',
      tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
      prepSummary: validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
      prepCommand: 'node scripts/prepare_mobile_true_device_wave.mjs --out default',
      executeAction: '按固定样例执行 Android + iPhone / iPad 真机采集',
      executeCommand: `打开 ${validationRelativePath('mobile_true_device', 'mobile-true-device-report.md')}，按来源矩阵逐项取证`,
      blockers: [
        'Android 真机、iPhone、iPad',
        '微信 / QQ / 浏览器 / 文件 App / 系统分享面板真实入口',
        '录屏与性能记录',
      ],
      evidence: [
        validationRelativePath('mobile_true_device', 'mobile-true-device-prep-summary.md'),
        validationRelativePath('mobile_true_device', 'mobile-true-device-report.md'),
        validationRelativePath('mobile_true_device', 'mobile-device-run-sheet.md'),
        validationRelativePath('mobile_true_device', 'evidence', 'mobile-device-matrix.txt'),
      ],
      why: '这一组剩余项本质上是同一批真机来源与性能证据，分开跑只会重复起设备环境。',
    }),
  },
  {
    id: 'sync_ai_return',
    tasks: ['D-010', 'E-007', 'F-005'],
    build: () => buildPreparedWave({
      id: 'sync_ai_return',
      title: '第 3 波：同步 / AI / 结果回流共用环境',
      tasks: ['D-010', 'E-007', 'F-005'],
      prepSummary: validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
      prepCommand: 'node scripts/prepare_sync_ai_wave.mjs --out default',
      executeAction: 'E-007 已关闭；用同一套 Docker Compose、桌面和真机环境执行 D-010 与 F-005 的剩余矩阵',
      executeCommand: 'cd server && docker compose up --build --wait，然后按 sync-ai-run-order.txt 固定顺序执行',
      blockers: [
        'Docker Compose 编排/卷隔离联调环境（真实 PostgreSQL 18.4 数据库主链已通过）',
        '桌面端真实收件箱联调机器',
        'Android / iOS 真机',
      ],
      evidence: [
        validationRelativePath('sync_ai_return', 'sync-ai-prep-summary.md'),
        validationRelativePath('sync_ai_return', 'sync-ai-run-sheet.md'),
        validationRelativePath('gate_d_sync', 'gate-d-sync-report.md'),
        validationRelativePath('gate_e_ai_read', 'gate-e-ai-read-report.md'),
        validationRelativePath('gate_f_result_return', 'gate-f-result-return-report.md'),
      ],
      why: '这三项共享同一套联调环境，分开启动环境最浪费时间。',
    }),
  },
  {
    id: 'release_and_site',
    tasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
    build: () => buildPreparedWave({
      id: 'release_and_site',
      title: '第 4 波：平台发布、官网与演练',
      tasks: ['G-002', 'G-003', 'G-004', 'G-005', 'G-006', 'G-007'],
      prepSummary: validationRelativePath('release_dry_run', 'release-prep-summary.md'),
      prepCommand: 'node scripts/prepare_release_wave.mjs --out default',
      executeAction: '按平台逐个补签名、上传、官网链接替换和回滚演练',
      executeCommand: '打开 docs/design/release-operations-checklist.md，按 release-prep-summary 的产物与 SHA256 执行',
      blockers: [
        'Android 渠道后台与 release 签名',
        'Apple Team / Profile / TestFlight / macOS 公证',
        'Windows / 官网真实下载渠道',
      ],
      evidence: [
        validationRelativePath('release_dry_run', 'release-prep-summary.md'),
        validationRelativePath('release_dry_run', 'release-readiness-snapshot.md'),
        validationRelativePath('release_dry_run', 'release-dry-run-report.md'),
        validationRelativePath('release_dry_run', 'release-run-sheet.md'),
      ],
      why: '这波必须等前面身份、真机、同步 / AI 外部证据到位后再一次性做，不然会重复打包和重复填商店资料。',
    }),
  },
  {
    id: 'legacy_mobile',
    tasks: ['G-008'],
    build: () => buildPreparedWave({
      id: 'legacy_mobile',
      title: '第 5 波：删除旧 React Native 端',
      tasks: ['G-008'],
      prepSummary: validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
      prepCommand: 'node scripts/prepare_legacy_mobile_wave.mjs --out default',
      executeAction: '执行真实删除并补删除后验证',
      executeCommand: '确认 G-002～G-007 全部改成 [x] 后，再按 legacy-delete-checklist.txt 删除 mobile/ 并重跑构建',
      blockers: [
        'G-002～G-007 必须先全部关闭',
        '删除后要重跑原生、桌面、CLI 构建验证',
      ],
      evidence: [
        validationRelativePath('legacy_mobile', 'legacy-mobile-prep-summary.md'),
        validationRelativePath('legacy_mobile', 'legacy-mobile-retirement-audit.md'),
        validationRelativePath('legacy_mobile', 'legacy-mobile-run-sheet.md'),
        validationRelativePath('legacy_mobile', 'evidence', 'legacy-delete-checklist.txt'),
      ],
      why: '这一步是最终清理动作，不能抢跑。',
    }),
  },
];

const nextWaveDefinition = waveOrder.find((wave) => wave.tasks.some((task) => snapshot.sectionStatusMap.get(task) !== 'x'));
const nextWave = nextWaveDefinition ? nextWaveDefinition.build() : null;

const payload = {
  validationDate,
  generatedFrom: 'scripts/next_remaining_action.mjs',
  summary: {
    remainingTasks: snapshot.remaining,
    blockedTasks: snapshot.counts['!'],
    verifyTasks: snapshot.counts.v,
    inProgressTasks: snapshot.counts['~'],
  },
  nextWave,
};

const markdown = `# 当前下一步动作

日期：${validationDate}

用途：只回答“现在下一步最该做什么”，避免在多份总览之间来回切换。

## 当前总览

- 未完成任务数：${payload.summary.remainingTasks}
- [!]：${payload.summary.blockedTasks}
- [v]：${payload.summary.verifyTasks}
- [~]：${payload.summary.inProgressTasks}

${nextWave ? `## 当前第一优先波次

- 波次：${nextWave.title}
- 关联任务：${nextWave.tasks.join('、')}
- 当前动作：${nextWave.action}
- 现在是否能直接做：${nextWave.canDoNow ? '能，纯本地动作' : '不能，还需要外部条件'}
- 是否需要外部条件：${nextWave.needsExternal ? '需要' : '不需要'}
- 默认命令 / 操作：\`${nextWave.command}\`
- 后续紧跟动作：${nextWave.followup}
- 为什么先做它：${nextWave.why}

${nextWave.blockers.length === 0 ? '### 当前无额外阻塞\n\n- 这一步可以现在立刻推进。' : `### 当前卡点

${nextWave.blockers.map((item) => `- ${item}`).join('\n')}`}

### 直接看这些入口

${nextWave.evidence.map((item) => `- \`${item}\``).join('\n')}`
  : '## 当前第一优先波次\n\n- 当前所有任务都已完成。'}
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
