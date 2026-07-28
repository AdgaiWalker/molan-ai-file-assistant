#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  batches,
  checksumMap,
  validationAbsolutePath,
  validationDate,
  validationRelativePath,
} from './v2_validation_data.mjs';
import { getRepoRoot } from './todo_status_lib.mjs';

const repoRoot = getRepoRoot(import.meta.url);
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const outIndex = args.indexOf('--out');
const defaultDir = validationAbsolutePath('sync_ai_return');
const defaultMarkdownPath = path.join(defaultDir, 'sync-ai-run-sheet.md');
const defaultJsonPath = path.join(defaultDir, 'sync-ai-run-sheet.json');
const batchIds = ['gate_d_sync', 'gate_e_ai_read', 'gate_f_result_return'];
const batchesById = new Map(batches.filter((batch) => batchIds.includes(batch.id)).map((batch) => [batch.id, batch]));
const checksumByPath = checksumMap();

for (const batchId of batchIds) {
  if (!batchesById.has(batchId)) {
    throw new Error(`缺少外部批次定义：${batchId}`);
  }
}

function writeOutput(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function escapeTableCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function sampleMeta(relativePath) {
  const checksum = checksumByPath.get(relativePath);
  const absolutePath = path.join(repoRoot, relativePath);
  return {
    path: relativePath,
    sizeBytes: checksum?.sizeBytes ?? (fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : null),
    sha256: checksum?.expectedSha256 ?? '待补',
  };
}

function evidencePath(batchId, fileName) {
  return validationRelativePath(batchId, 'evidence', fileName);
}

function addRows(rows, batchId, definitions) {
  const batch = batchesById.get(batchId);
  for (const definition of definitions) {
    rows.push({
      batchId,
      batchTitle: batch.title,
      task: batch.tasks[0],
      ...definition,
      resultFields: [
        '执行环境 / 版本',
        '输入文档 ID / 版本 / hash',
        '输出对象 / 事件 ID',
        '命令或入口',
        '截图 / 录屏 / 日志路径',
        '是否通过',
        '问题与下一步',
      ],
    });
  }
}

const md = sampleMeta('fixtures/mobile-reading/markdown/normal.md');
const json = sampleMeta('fixtures/mobile-reading/json/normal.json');
const txt = sampleMeta('fixtures/mobile-reading/text/utf8.txt');
const docx = sampleMeta('desktop/cli/test-fixtures/sample.docx');
const pdf = sampleMeta('desktop/cli/test-fixtures/sample.pdf');
const xlsx = sampleMeta('desktop/cli/test-fixtures/sample.xlsx');
const pptx = sampleMeta('desktop/cli/test-fixtures/sample.pptx');

const rows = [];

addRows(rows, 'gate_d_sync', [
  {
    id: 'd01-postgres-compose-health',
    phase: 'D-010 环境启动',
    environment: 'server/ PostgreSQL 18 Compose + desktop/ + Android/iOS 真机',
    samples: [],
    action: '启动 PostgreSQL 18 Compose，同步服务完成迁移和健康检查，再启动桌面端与移动端登录会话。',
    passRule: '健康检查返回数据库和对象存储可用；日志不含正文、token 或私密路径。',
    evidence: evidencePath('gate_d_sync', 'postgres-compose-health.txt'),
  },
  {
    id: 'd02-android-collect-markdown-json',
    phase: 'D-010 Android 收集上传',
    environment: 'Android 真机 + 真实同步服务',
    samples: [md, json],
    action: 'Android 收集 Markdown 与 JSON，显式入库并等待上传完成。',
    passRule: '生成稳定 Document / Version / FileObject；同 hash 不重复上传；失败可重试。',
    evidence: evidencePath('gate_d_sync', 'android-sync-start.mp4'),
  },
  {
    id: 'd03-ios-collect-text',
    phase: 'D-010 iOS 收集上传',
    environment: 'iPhone 真机 + 真实同步服务',
    samples: [txt],
    action: 'iOS 收集 TXT，显式入库并等待上传完成。',
    passRule: 'App Group / 受控目录交接后可离线读；上传后版本关系与 Android 语义一致。',
    evidence: evidencePath('gate_d_sync', 'ios-sync-start.mp4'),
  },
  {
    id: 'd04-desktop-pull-three-device',
    phase: 'D-010 桌面拉取',
    environment: 'desktop/ 真实收件箱',
    samples: [md, json, txt],
    action: '桌面 pull 同步 Android / iOS 上传对象，确认原件、版本、hash 与来源关系。',
    passRule: '三份对象在桌面收件箱可见；重启桌面后索引仍可读；游标不重复消费。',
    evidence: evidencePath('gate_d_sync', 'desktop-three-device-sync.png'),
  },
  {
    id: 'd05-office-pdf-sync',
    phase: 'D-010 Office / PDF 同步',
    environment: 'Android 或 iOS 真机 + desktop/ 转换读取',
    samples: [docx, pdf, xlsx, pptx],
    action: '补 docx / pdf / xlsx / pptx 原件同步，桌面端确认原件对象和可派生关系。',
    passRule: '桌面能看到原件，保留来源关系；Office/PDF hash 与固定样例一致。',
    evidence: evidencePath('gate_d_sync', 'desktop-office-objects.png'),
  },
  {
    id: 'd06-weak-network-long-offline',
    phase: 'D-010 弱网 / 长离线',
    environment: 'Android/iOS 真机 + 可控网络',
    samples: [md, json, txt],
    action: '执行弱网、断网排队、一周长离线等价压测或可解释缩短版，并恢复同步。',
    passRule: '队列不丢、不乱序；恢复后对象、版本、hash 与本地状态一致。',
    evidence: evidencePath('gate_d_sync', 'weak-network-log.txt'),
  },
  {
    id: 'd07-device-revoke-delete-restore',
    phase: 'D-010 设备撤销 / 删除恢复',
    environment: '服务端设备列表 + Android/iOS/desktop',
    samples: [md],
    action: '撤销设备后验证拒绝同步；执行删除、恢复并观察三端最终状态。',
    passRule: '被撤销设备立即拒绝；删除后不可读，恢复后版本关系仍正确。',
    evidence: evidencePath('gate_d_sync', 'device-revoke-delete-restore-log.txt'),
  },
  {
    id: 'd08-conflict-resolution',
    phase: 'D-010 双端冲突',
    environment: 'Android + iOS 或 desktop 双端并发',
    samples: [json],
    action: '制造双端编辑 / 删除冲突，拉取后确认双方版本保留和冲突状态。',
    passRule: '不静默覆盖；冲突双方均可追溯；最终解除冲突后同步收敛。',
    evidence: evidencePath('gate_d_sync', 'conflict-resolution-log.txt'),
  },
]);

addRows(rows, 'gate_e_ai_read', [
  {
    id: 'e01-sync-source-docx-pdf',
    phase: 'E-007 原件同步',
    environment: '手机真机 + desktop/ 真实收件箱',
    samples: [docx, pdf],
    action: '手机收集 docx / pdf 原件并同步到桌面真实收件箱。',
    passRule: '桌面看到原件 ID、版本 ID、hash；原件默认不可被 AI 直接读取。',
    evidence: evidencePath('gate_e_ai_read', 'desktop-source-docs.png'),
  },
  {
    id: 'e02-generate-markdown-derivatives',
    phase: 'E-007 派生副本',
    environment: 'desktop/ converter + inbox',
    samples: [docx, pdf],
    action: '桌面生成 Markdown 派生副本，记录来源版本与派生对象 hash。',
    passRule: '派生对象与来源版本关联稳定；Markdown 内容可供授权读取。',
    evidence: evidencePath('gate_e_ai_read', 'desktop-derivatives.png'),
  },
  {
    id: 'e03-ai-read-before-authorize',
    phase: 'E-007 授权前拒绝',
    environment: '真实 AI 客户端（CLI 或 MCP）',
    samples: [docx, pdf],
    action: '未授权状态下让 AI 客户端读取派生正文。',
    passRule: '读取被拒绝；审计记录不包含正文、token 或私密路径。',
    evidence: evidencePath('gate_e_ai_read', 'desktop-authorize-before.png'),
  },
  {
    id: 'e04-ai-read-after-authorize',
    phase: 'E-007 授权后可读',
    environment: '真实 AI 客户端（CLI 或 MCP）',
    samples: [docx, pdf],
    action: '授权 AI 读取，再通过真实 AI 客户端走 CLI 或 MCP 读取正文。',
    passRule: '授权后可读；返回内容来自派生 Markdown；记录客户端名称、入口和日志。',
    evidence: evidencePath('gate_e_ai_read', 'ai-client-read-success.mp4'),
  },
  {
    id: 'e05-ai-read-after-revoke',
    phase: 'E-007 撤回后拒绝',
    environment: '真实 AI 客户端（CLI 或 MCP）',
    samples: [docx, pdf],
    action: '撤回授权后立即再次读取同一对象。',
    passRule: '撤回立即生效；再次读取被拒绝；审计链路可解释。',
    evidence: evidencePath('gate_e_ai_read', 'ai-client-read-revoked.mp4'),
  },
]);

addRows(rows, 'gate_f_result_return', [
  {
    id: 'f01-ai-generate-result',
    phase: 'F-005 AI 生成结果',
    environment: '真实 AI 客户端 + 已授权来源',
    samples: [docx, pdf, json],
    action: '真实 AI 客户端读取已授权样例，生成 Markdown / JSON 结果。',
    passRule: '结果明确关联来源文档与来源版本；结果内容不覆盖原件。',
    evidence: evidencePath('gate_f_result_return', 'ai-client-generate-result.mp4'),
  },
  {
    id: 'f02-write-result',
    phase: 'F-005 写回桌面',
    environment: 'desktop/ CLI 或 MCP',
    samples: [docx, pdf, json],
    action: '通过 `molan write-result` 或 MCP `write_result` 写回结果。',
    passRule: '写回成功返回结果 ID；保存为新版本或独立文档；失败路径有明确错误。',
    evidence: evidencePath('gate_f_result_return', 'desktop-write-result-log.txt'),
  },
  {
    id: 'f03-air-event-desktop',
    phase: 'F-005 结果事件',
    environment: 'desktop/ + sync server',
    samples: [docx, pdf, json],
    action: '桌面推送 `air_` 事件并确认同步服务可拉取。',
    passRule: '`air_` 事件含结果 ID、来源文档、来源版本；不会泄漏正文到日志。',
    evidence: evidencePath('gate_f_result_return', 'desktop-air-event-log.txt'),
  },
  {
    id: 'f04-android-result-return',
    phase: 'F-005 Android 回流',
    environment: 'Android 真机',
    samples: [docx, pdf, json],
    action: 'Android 拉到结果卡片，打开结果并回到来源。',
    passRule: '结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。',
    evidence: evidencePath('gate_f_result_return', 'android-result-open.mp4'),
  },
  {
    id: 'f05-ios-result-return',
    phase: 'F-005 iOS 回流',
    environment: 'iPhone 真机',
    samples: [docx, pdf, json],
    action: 'iOS 拉到结果卡片，打开结果并回到来源。',
    passRule: '结果卡片可见；阅读页可打开；来源跳转正确；复制 / 分享 / 保存副本可用。',
    evidence: evidencePath('gate_f_result_return', 'ios-result-open.mp4'),
  },
]);

const groupSummary = [...new Set(rows.map((row) => row.batchId))].map((batchId) => {
  const groupRows = rows.filter((row) => row.batchId === batchId);
  const batch = batchesById.get(batchId);
  return {
    batchId,
    title: batch.title,
    task: batch.tasks[0],
    rowCount: groupRows.length,
  };
});

const payload = {
  validationDate,
  generatedFrom: 'scripts/sync_ai_run_sheet.mjs',
  summary: {
    rowCount: rows.length,
    groupCount: groupSummary.length,
    tasks: [...new Set(rows.map((row) => row.task))],
  },
  groupSummary,
  rows,
};

function renderSamples(samples) {
  if (samples.length === 0) return '无';
  return samples.map((sample) => `${sample.path}<br>${sample.sizeBytes ?? 'missing'} B<br>${sample.sha256}`).join('<br><br>');
}

function renderFillBlock(row) {
  return [
    `行项：${row.id}`,
    `任务：${row.task}`,
    `阶段：${row.phase}`,
    `环境：${row.environment}`,
    '',
    '样例：',
    ...(row.samples.length === 0 ? ['- 无'] : row.samples.map((sample) => `- ${sample.path} / ${sample.sizeBytes ?? 'missing'} B / ${sample.sha256}`)),
    '',
    `动作：${row.action}`,
    `验收点：${row.passRule}`,
    `建议证据：${row.evidence}`,
    '',
    '执行环境 / 版本：',
    '输入文档 ID / 版本 / hash：',
    '输出对象 / 事件 ID：',
    '命令或入口：',
    '截图 / 录屏 / 日志路径：',
    '是否通过：',
    '问题与下一步：',
  ].join('\n');
}

const markdown = `# 同步 / AI 读取 / 结果回流逐项执行清单

日期：${validationDate}

用途：把 D-010 / E-007 / F-005 的真实联调拆成逐行执行项。真实 PostgreSQL 18、桌面端、真机和 AI 客户端到位后，按本表逐行补日志、录屏、hash 和结论；本表为空模板时不算完成证据。

## 汇总

- 执行行数：${payload.summary.rowCount}
- 分组数：${payload.summary.groupCount}
- 覆盖任务：${payload.summary.tasks.join('、')}

## 分组

| 批次 | 任务 | 行数 |
| --- | --- | ---: |
${groupSummary.map((item) => `| ${escapeTableCell(item.title)} | ${item.task} | ${item.rowCount} |`).join('\n')}

## 执行表

| ID | 任务 | 阶段 | 环境 | 样例 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- | --- |
${rows.map((row) => `| ${escapeTableCell(row.id)} | ${row.task} | ${escapeTableCell(row.phase)} | ${escapeTableCell(row.environment)} | ${escapeTableCell(renderSamples(row.samples))} | ${escapeTableCell(row.passRule)} | \`${row.evidence}\` |`).join('\n')}

## 每行填写字段

${rows.map((row) => `### ${row.id}

\`\`\`text
${renderFillBlock(row)}
\`\`\`
`).join('\n')}
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
