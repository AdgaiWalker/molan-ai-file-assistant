import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const validationDate = '2026-07-21';
export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const validationRunsRoot = path.join(repoRoot, 'docs/validation-runs');

export function validationRelativePath(...segments) {
  return path.posix.join('docs', 'validation-runs', validationDate, ...segments);
}

export function validationAbsolutePath(...segments) {
  return path.join(validationRunsRoot, validationDate, ...segments);
}

export const checksumGroups = [
  {
    id: 'mobile_reading',
    title: '移动阅读固定样例',
    checksumFile: path.join(repoRoot, 'fixtures/mobile-reading/SHA256SUMS'),
  },
  {
    id: 'office_pdf',
    title: 'Office / PDF 固定样例',
    checksumFile: path.join(repoRoot, 'desktop/cli/test-fixtures/SHA256SUMS'),
  },
];

export const batches = [
  {
    id: 'mobile_true_device',
    title: '移动真机批次（B/C）',
    tasks: ['B-002', 'B-004', 'B-008', 'B-009', 'C-002', 'C-004', 'C-008', 'C-009'],
    reportKind: 'device',
    defaultSlug: 'mobile-true-device',
    samples: [
      'fixtures/mobile-reading/markdown/normal.md',
      'fixtures/mobile-reading/json/normal.json',
      'fixtures/mobile-reading/text/utf8.txt',
      'fixtures/mobile-reading/markdown/large-1mb.md',
      'fixtures/mobile-reading/json/large-5mb.json',
    ],
    evidenceDirs: [
      'native/androidApp/verify-evidence',
      'native/iosApp/verify-evidence',
    ],
    steps: [
      'Android 分别从微信、QQ、浏览器、文件管理器打开 Markdown / JSON / TXT，并记录首屏耗时。',
      'iPhone 与 iPad 分别从微信、QQ、Safari、“文件”App、系统分享面板打开同一批样例。',
      '在中低端 Android 与 iPhone 上重复跑 1 MB Markdown 与 5 MB JSON，记录滚动与峰值内存。',
      '完成横竖屏、退后台、杀进程后的恢复验证，并保存录屏或截图路径。',
    ],
    evidenceChecklist: [
      '来源 App / 系统版本 / 设备型号',
      '样例文件大小与 SHA256',
      '首屏耗时 / 滚动表现 / 峰值内存',
      '录屏或截图路径',
    ],
    suggestedEvidenceNames: [
      'android-wechat-open.mp4',
      'android-qq-open.mp4',
      'ios-files-open.mp4',
      'ipad-share-extension.mp4',
      'android-large-json-memory.txt',
      'ios-large-markdown-memory.txt',
    ],
  },
  {
    id: 'gate_d_sync',
    title: 'Gate D 外部批次（D-010）',
    tasks: ['D-010'],
    reportKind: 'cross',
    defaultSlug: 'gate-d-sync',
    samples: [
      'fixtures/mobile-reading/markdown/normal.md',
      'fixtures/mobile-reading/json/normal.json',
      'fixtures/mobile-reading/text/utf8.txt',
      'desktop/cli/test-fixtures/sample.docx',
      'desktop/cli/test-fixtures/sample.pdf',
      'desktop/cli/test-fixtures/sample.xlsx',
      'desktop/cli/test-fixtures/sample.pptx',
    ],
    evidenceDirs: [
      'native/androidApp/verify-evidence',
      'native/iosApp/verify-evidence',
      'desktop/verify-evidence',
    ],
    steps: [
      '启动 PostgreSQL 18 Compose，同步服务健康检查通过后再开始三端联调。',
      'Android 收集 Markdown / JSON，iOS 收集 TXT，桌面 pull 确认三端对象、版本与哈希一致。',
      '继续补 docx / pdf / xlsx / pptx 同步，确认桌面端能看到原件并保留来源关系。',
      '执行弱网、长离线、设备撤销、双端冲突、删除恢复，并记录恢复路径与最终状态。',
    ],
    evidenceChecklist: [
      '来源文件 ID / 版本 / hash',
      '同步事件 ID / 桌面落盘路径 / 派生对象信息',
      '故障注入方式与恢复结果',
      '跨端录屏 / 日志路径',
    ],
    suggestedEvidenceNames: [
      'android-sync-start.mp4',
      'ios-sync-start.mp4',
      'desktop-three-device-sync.png',
      'desktop-office-objects.png',
      'weak-network-log.txt',
      'conflict-resolution-log.txt',
    ],
  },
  {
    id: 'gate_e_ai_read',
    title: 'Gate E 外部批次（E-007）',
    tasks: ['E-007'],
    reportKind: 'ai_read',
    defaultSlug: 'gate-e-ai-read',
    samples: [
      'desktop/cli/test-fixtures/sample.docx',
      'desktop/cli/test-fixtures/sample.pdf',
    ],
    evidenceDirs: [
      'desktop/verify-evidence',
    ],
    steps: [
      '手机收集 docx / pdf 原件并同步到桌面真实收件箱。',
      '桌面生成 Markdown 派生副本，记录来源版本与派生对象 hash。',
      '先验证未授权读取失败，再授权 AI 读取，通过真实 AI 客户端走 CLI 或 MCP 读取正文。',
      '撤回授权后立即再次读取，确认被拒绝并保留日志或录屏。',
    ],
    evidenceChecklist: [
      '原件 hash 与派生 Markdown hash',
      '授权前拒绝 / 授权后可读 / 撤回后拒绝',
      '真实 AI 客户端名称与入口（CLI 或 MCP）',
      '日志或完整录屏路径',
    ],
    suggestedEvidenceNames: [
      'desktop-authorize-before.png',
      'desktop-authorize-after.png',
      'ai-client-read-success.mp4',
      'ai-client-read-revoked.mp4',
      'cli-or-mcp-log.txt',
    ],
  },
  {
    id: 'gate_f_result_return',
    title: 'Gate F 外部批次（F-005）',
    tasks: ['F-005'],
    reportKind: 'result_return',
    defaultSlug: 'gate-f-result-return',
    samples: [
      'desktop/cli/test-fixtures/sample.docx',
      'desktop/cli/test-fixtures/sample.pdf',
      'fixtures/mobile-reading/json/normal.json',
    ],
    evidenceDirs: [
      'native/androidApp/verify-evidence',
      'native/iosApp/verify-evidence',
      'desktop/verify-evidence',
    ],
    steps: [
      '用真实 AI 客户端读取已授权样例，生成 Markdown / JSON 结果。',
      '通过 `molan write-result` 或 MCP `write_result` 写回，并确认保存为新版本或独立文档。',
      '桌面推送 `air_` 事件，Android / iOS 拉到结果卡片并进入阅读页。',
      '从结果回到来源，再执行复制 / 分享 / 保存副本，保留双端录屏。',
    ],
    evidenceChecklist: [
      '结果 ID / 来源文档 / 来源版本',
      '桌面写回确认结果与 `air_` 事件痕迹',
      'Android 结果卡片与来源跳转录屏',
      'iOS 结果卡片与来源跳转录屏',
    ],
    suggestedEvidenceNames: [
      'desktop-write-result-log.txt',
      'desktop-air-event-log.txt',
      'android-result-open.mp4',
      'android-result-back-to-source.mp4',
      'ios-result-open.mp4',
      'ios-result-back-to-source.mp4',
    ],
  },
  {
    id: 'release_dry_run',
    title: '发布前演练批次（G-007）',
    tasks: ['G-007'],
    reportKind: 'release',
    defaultSlug: 'release-dry-run',
    samples: [],
    evidenceDirs: [
      'site',
      'desktop',
      'server',
    ],
    steps: [
      '按发布、监控与回滚清单执行一次测试版本演练。',
      '对 Android / iOS / Windows / macOS / CLI / 官网 / 同步后端分别记录产物、SHA256、入口和回滚动作。',
      '验证官网链接、隐私说明、样例链接和发布说明与实际产物一致。',
      '保留监控截图与回滚后状态，补齐负责人占位。',
    ],
    evidenceChecklist: [
      '版本号 / 构建号 / SHA256',
      '发布入口与回滚入口',
      '官网链接与下载产物对照',
      '监控截图与回滚结果',
    ],
    suggestedEvidenceNames: [
      'android-release-sha256.txt',
      'ios-testflight-build.txt',
      'desktop-package-sha256.txt',
      'site-links-check.png',
      'monitoring-dashboard.png',
      'rollback-record.txt',
    ],
  },
];

export function sha256(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

export function readChecksumFile(checksumFile) {
  const baseDir = path.dirname(checksumFile);
  return fs.readFileSync(checksumFile, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [digest, relativePath] = line.trim().split(/\s{2,}/);
      const absolutePath = path.join(baseDir, relativePath);
      const exists = fs.existsSync(absolutePath);
      const actual = exists ? sha256(absolutePath) : null;
      return {
        relativePath: path.relative(repoRoot, absolutePath),
        expectedSha256: digest,
        actualSha256: actual,
        exists,
        ok: exists && actual === digest,
        sizeBytes: exists ? fs.statSync(absolutePath).size : null,
      };
    });
}

export function evidenceDirStatus(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { path: relativePath, exists: false, fileCount: 0 };
  }
  const fileCount = fs.readdirSync(absolutePath).length;
  return { path: relativePath, exists: true, fileCount };
}

export function checksumMap() {
  const map = new Map();
  for (const group of checksumGroups) {
    for (const item of readChecksumFile(group.checksumFile)) {
      map.set(item.relativePath, item);
    }
  }
  return map;
}

export function defaultReportPath(batch) {
  return path.join(
    validationRunsRoot,
    validationDate,
    batch.id,
    `${batch.defaultSlug ?? batch.id}-report.md`,
  );
}

export function defaultEvidenceDir(batch) {
  return path.join(
    validationRunsRoot,
    validationDate,
    batch.id,
    'evidence',
  );
}
