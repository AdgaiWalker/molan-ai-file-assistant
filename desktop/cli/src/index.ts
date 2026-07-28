#!/usr/bin/env node
// 墨览 CLI — molan convert
// 把 Office/PDF/PPT/Excel 转成 Markdown，输出结构化 JSON 给 AI/agent 解析

import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import fg from 'fast-glob';
import { InboxIndex } from '../../electron/main/inboxIndex.js';
import { startMcpStdioServer } from './mcpServer.js';
import {
  confirmExistingDraft,
  discardExistingDraft,
  writeSyncedResultDraft,
} from './syncedInbox.js';
import {
  convertFile,
  convertBatch,
  detectFormat,
  isOfficeToMarkdown,
  outputExtension,
  ERROR_CODES,
  pandocStatus,
  type ConvertFormat,
  type ConvertResult,
} from '../../src/shared/converter.js';

const VERSION = '1.0.0';

interface CloudDocument {
  id: string;
  title: string;
  kind: string;
  sourcePath: string;
  storedPath: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

interface CloudIndex {
  version: 1;
  documents: CloudDocument[];
}

type SourceMode = 'offline' | 'synced';

const CLOUD_ERROR_CODES = {
  CLOUD_EMPTY: 'E_CLOUD_EMPTY',
  CLOUD_DOCUMENT_NOT_FOUND: 'E_CLOUD_DOCUMENT_NOT_FOUND',
  CLOUD_WRITE_FAILED: 'E_CLOUD_WRITE_FAILED',
  SYNC_ROOT_REQUIRED: 'E_SYNC_ROOT_REQUIRED',
  SYNC_EMPTY: 'E_SYNC_EMPTY',
  SYNC_DOCUMENT_NOT_FOUND: 'E_SYNC_DOCUMENT_NOT_FOUND',
  SYNC_READABLE_COPY_MISSING: 'E_SYNC_READABLE_COPY_MISSING',
  AI_READ_NOT_ALLOWED: 'E_AI_READ_NOT_ALLOWED',
  ACCESS_SCOPE_INVALID: 'E_ACCESS_SCOPE_INVALID',
} as const;

function cloudRoot(): string {
  return path.resolve(process.env['MOLAN_CLOUD_DIR'] || path.join(os.homedir(), '.molan', 'cloud'));
}

function cloudDocsDir(): string {
  return path.join(cloudRoot(), 'documents');
}

function cloudIndexPath(): string {
  return path.join(cloudRoot(), 'index.json');
}

function ensureCloud(): void {
  fs.mkdirSync(cloudDocsDir(), { recursive: true });
  if (!fs.existsSync(cloudIndexPath())) {
    writeCloudIndex({ version: 1, documents: [] });
  }
}

function readCloudIndex(): CloudIndex {
  ensureCloud();
  try {
    const parsed = JSON.parse(fs.readFileSync(cloudIndexPath(), 'utf-8')) as CloudIndex;
    return { version: 1, documents: Array.isArray(parsed.documents) ? parsed.documents : [] };
  } catch {
    return { version: 1, documents: [] };
  }
}

function writeCloudIndex(index: CloudIndex): void {
  fs.mkdirSync(cloudRoot(), { recursive: true });
  fs.writeFileSync(cloudIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}

function inferKind(filePath: string): string {
  return path.extname(filePath).replace('.', '').toLowerCase() || 'text';
}

function makeDocumentId(filePath: string): string {
  const base = path.basename(filePath).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/\.[^.]+$/, '');
  return `${Date.now()}-${base}`.slice(0, 120);
}

function findCloudDocument(index: CloudIndex, idOrTitle: string): CloudDocument | undefined {
  const normalized = idOrTitle.trim();
  return index.documents.find((doc) => doc.id === normalized || doc.title === normalized || doc.storedPath === normalized);
}

function cloudSummary(documents: CloudDocument[]) {
  return {
    ok: true,
    total: documents.length,
    success: documents.length,
    failed: 0,
    results: documents.map((doc) => ({
      ok: true,
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      outputPath: doc.storedPath,
      updatedAt: doc.updatedAt,
    })),
  };
}

function resolveSourceMode(value: unknown): SourceMode {
  if (value === 'offline' || value === undefined || value === null) return 'offline';
  if (value === 'synced') return 'synced';
  throw new Error(`不支持的数据来源：${String(value)}`);
}

function resolveSyncRoot(value: unknown): string {
  const explicit = typeof value === 'string' && value.trim() ? value.trim() : process.env['MOLAN_SYNC_ROOT'];
  if (!explicit) throw new Error(CLOUD_ERROR_CODES.SYNC_ROOT_REQUIRED);
  return path.resolve(explicit);
}

async function readCommandInput(file: string | undefined, opts: { stdin?: boolean }) {
  if (opts.stdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const content = Buffer.concat(chunks).toString('utf-8');
    if (!content.trim()) throw new Error('stdin 内容为空');
    return { content, inputPath: null as string | null };
  }
  if (!file) throw new Error('缺少结果文件或 --stdin');
  const inputPath = path.resolve(file);
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) throw new Error('结果文件不存在');
  return { content: fs.readFileSync(inputPath, 'utf-8'), inputPath };
}

async function syncedPullResult(syncRoot: string) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const documents = index.listDocuments();
    if (documents.length === 0) {
      return { ok: false, errorCode: CLOUD_ERROR_CODES.SYNC_EMPTY, error: '真实收件箱为空', results: [] };
    }
    return {
      ok: true,
      total: documents.length,
      success: documents.length,
      failed: 0,
      results: documents.map((doc) => {
        const access = index.aiReadStatus(doc.id);
        const readable = access.allowed ? index.preferredReadableTarget(doc.id) : null;
        return {
          ok: true,
          id: doc.id,
          title: doc.title,
          kind: readable?.kind ?? doc.originalFormat,
          outputPath: readable?.outputPath ?? '',
          updatedAt: doc.updatedAt,
          source: 'synced' as const,
          readableSource: readable?.readableSource ?? null,
          aiReadable: access.allowed,
          aiGrantScope: access.scopeType,
          aiGrantScopeKey: access.scopeKey,
          grantedAt: access.grantedAt,
          lastReadAt: access.lastReadAt,
          lastReadVia: access.lastReadVia,
          lastReadResult: access.lastReadResult,
          lastReadVersionId: access.lastReadVersionId,
          lastReadArtifactId: access.lastReadArtifactId,
          lastReadErrorCode: access.lastErrorCode,
        };
      }),
    };
  } finally {
    index.close();
  }
}

async function syncedReadResult(syncRoot: string, idOrTitle: string) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const document = index.listDocuments().find((item) => item.id === idOrTitle.trim() || item.title === idOrTitle.trim());
    if (!document) {
      return { ok: false, errorCode: CLOUD_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    const access = index.aiReadStatus(document.id);
    const readable = index.preferredReadableTarget(document.id);
    if (!access.allowed) {
      await index.recordAiReadAudit({
        documentId: document.id,
        sourceVersionId: readable?.sourceVersionId ?? null,
        sourceArtifactId: readable?.sourceArtifactId ?? null,
        entrypoint: 'cli',
        result: 'denied',
        errorCode: CLOUD_ERROR_CODES.AI_READ_NOT_ALLOWED,
        readAt: new Date().toISOString(),
      });
      return {
        ok: false,
        errorCode: CLOUD_ERROR_CODES.AI_READ_NOT_ALLOWED,
        error: '该文件尚未授权 AI 读取，请先显式授权。',
        results: [],
      };
    }
    if (!readable || !fs.existsSync(readable.outputPath)) {
      await index.recordAiReadAudit({
        documentId: document.id,
        sourceVersionId: readable?.sourceVersionId ?? document.currentVersionId,
        sourceArtifactId: readable?.sourceArtifactId ?? null,
        entrypoint: 'cli',
        result: 'missing_readable',
        errorCode: CLOUD_ERROR_CODES.SYNC_READABLE_COPY_MISSING,
        readAt: new Date().toISOString(),
      });
      return {
        ok: false,
        errorCode: CLOUD_ERROR_CODES.SYNC_READABLE_COPY_MISSING,
        error: '真实收件箱中没有可供 AI 读取的文本副本，请先完成转换。',
        results: [],
      };
    }
    const content = fs.readFileSync(readable.outputPath, 'utf-8');
    await index.recordAiReadAudit({
      documentId: document.id,
      sourceVersionId: readable.sourceVersionId,
      sourceArtifactId: readable.sourceArtifactId,
      entrypoint: 'cli',
      result: 'success',
      errorCode: null,
      readAt: new Date().toISOString(),
    });
    return {
      ok: true,
      total: 1,
      success: 1,
      failed: 0,
      results: [{
        ok: true,
        id: document.id,
        title: document.title,
        kind: readable.kind,
        outputPath: readable.outputPath,
        content,
        updatedAt: document.updatedAt,
        source: 'synced' as const,
        readableSource: readable.readableSource,
        aiGrantScope: access.scopeType,
        aiGrantScopeKey: access.scopeKey,
        auditResult: 'success',
      }],
    };
  } finally {
    index.close();
  }
}

async function syncedAccessResult(syncRoot: string, target: string, scope: unknown, allowed: boolean) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const now = new Date().toISOString();
    if (scope === 'collection') {
      const scopeKey = target.trim() || 'all';
      if (scopeKey !== 'all') {
        return { ok: false, errorCode: CLOUD_ERROR_CODES.ACCESS_SCOPE_INVALID, error: '当前只支持 all 集合授权', results: [] };
      }
      await index.setAiReadAccess({ scopeType: 'collection', scopeKey, allowed, now });
      return {
        ok: true,
        total: 1,
        success: 1,
        failed: 0,
        results: [{
          ok: true,
          allowed,
          scopeType: 'collection' as const,
          scopeKey,
          updatedAt: now,
        }],
      };
    }
    const document = index.listDocuments().find((item) => item.id === target.trim() || item.title === target.trim());
    if (!document) {
      return { ok: false, errorCode: CLOUD_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    await index.setAiReadAccess({ scopeType: 'document', scopeKey: document.id, allowed, now });
    return {
      ok: true,
      total: 1,
      success: 1,
      failed: 0,
      results: [{
        ok: true,
        id: document.id,
        title: document.title,
        allowed,
        scopeType: 'document' as const,
        scopeKey: document.id,
        updatedAt: now,
      }],
    };
  } finally {
    index.close();
  }
}

function sourceOptions(command: ReturnType<typeof program.command>) {
  return command
    .option('--source <source>', '数据来源：offline 或 synced', 'offline')
    .option('--sync-root <dir>', '真实收件箱根目录；也可通过 MOLAN_SYNC_ROOT 指定');
}

program
  .name('molan')
  .description('墨览 CLI — Office/PDF/PPT/Excel → Markdown，结构化输出供 AI 调用')
  .version(VERSION);

program
  .command('convert [inputs...]')
  .description('将文件转换为指定格式。默认将 Office 文件转为 Markdown。')
  .option('--to <format>', '输出格式：md, json, docx, pdf', 'md')
  .option('--out <dir>', '输出目录', '.')
  .option('--batch', '启用批量模式，输入可以是 glob 或目录')
  .option('--concurrency <n>', '批量并发数', '4')
  .option('--json', '以 JSON 格式输出结果到 stdout')
  .option('--preserve-images', '把 Office 文档里的图片抽到 <输出目录>/media，Markdown 用相对路径引用')
  .action(async (inputs: string[], opts) => {
    const outputFormat = opts.to as ConvertFormat;
    const outputDir = path.resolve(opts.out);
    const asJson = opts.json;
    const isBatch = opts.batch || inputs.length > 1;
    const preserveImages = !!opts.preserveImages;

    // 确保输出目录存在
    fs.mkdirSync(outputDir, { recursive: true });

    // 展开 glob（fast-glob 要求正斜杠分隔符，path.join 在 Windows 会产出反斜杠导致匹配为空）
    let files: string[] = inputs;
    if (isBatch && inputs.length === 1) {
      const input = inputs[0];
      let isDir = false;
      try { isDir = fs.statSync(input).isDirectory(); } catch { /* glob 或不存在 */ }
      if (input.includes('*') || isDir) {
        const pattern = isDir ? `${input.replace(/\\/g, '/')}/**/*` : input;
        files = await fg([pattern], { onlyFiles: true, caseSensitiveMatch: false });
      }
    }

    if (files.length === 0) {
      const result = { ok: false, errorCode: ERROR_CODES.INPUT_NOT_FOUND, error: '未找到输入文件', results: [] };
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.error('错误：未找到输入文件');
      process.exit(1);
    }

    // 过滤支持的文件
    const valid = files.filter((f) => detectFormat(f));

    if (valid.length === 0) {
      const result = { ok: false, errorCode: ERROR_CODES.UNSUPPORTED_FORMAT, error: '没有支持的文件格式（支持 docx/pdf/pptx/xlsx/csv/md/json）', results: [] };
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.error('错误：没有支持的文件格式');
      process.exit(1);
    }

    const inputs_ = valid.map((p) => ({ inputPath: p, fileName: path.basename(p) }));

    const convertOptions = preserveImages ? { preserveImages: true } : undefined;
    const rawResults = isBatch
      ? await convertBatch(inputs_, outputFormat, outputDir, Number(opts.concurrency), convertOptions)
      : [await convertFile(inputs_[0].inputPath, outputFormat, outputDir, convertOptions)];

    const flatResults: ConvertResult[] = rawResults;

    const summary = {
      ok: flatResults.every((r) => r.ok),
      total: flatResults.length,
      success: flatResults.filter((r) => r.ok).length,
      failed: flatResults.filter((r) => !r.ok).length,
      results: flatResults,
    };

    if (asJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      for (const r of flatResults) {
        if (r.ok) {
          console.log(`✓ ${r.fileName} → ${path.relative(process.cwd(), r.outputPath!)}`);
        } else {
          console.error(`✗ ${r.fileName}：${r.error || r.errorCode}`);
        }
      }
      console.log(`\n成功 ${summary.success} / 失败 ${summary.failed} / 共 ${summary.total}`);
    }

    process.exit(summary.ok ? 0 : 1);
  });

program
  .command('check')
  .description('检查 pandoc 是否可用')
  .action(() => {
    try {
      const status = pandocStatus();
      const result = {
        ok: status.ok,
        pandocPath: status.pandocPath,
        nodeVersion: process.version,
        platform: process.platform,
        supportedFormats: ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'md', 'json'],
        ...(status.reason ? { reason: status.reason } : {}),
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(status.ok ? 0 : 1);
    } catch (err: any) {
      console.log(JSON.stringify({ ok: false, error: err.message }, null, 2));
      process.exit(1);
    }
  });

sourceOptions(
program
  .command('push <file>')
  .description('把本地 Markdown/JSON/文本文件保存到本地 AI 文件收件箱，后续可被 molan read 读取。')
  .option('--title <title>', '保存标题，默认使用文件名')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (file: string, opts) => {
    const inputPath = path.resolve(file);
    const asJson = opts.json;
    const source = resolveSourceMode(opts.source);

    if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
      const result = { ok: false, errorCode: ERROR_CODES.INPUT_NOT_FOUND, error: '文件不存在', results: [] };
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.error(`错误：${result.error}`);
      process.exit(1);
    }

    if (source === 'synced') {
      try {
        const index = await InboxIndex.open(resolveSyncRoot(opts.syncRoot));
        const imported = await index.importLocalDocument({
          inputPath,
          title: opts.title || path.basename(inputPath),
          importedAt: new Date().toISOString(),
        });
        index.close();
        const result = {
          ok: true,
          total: 1,
          success: 1,
          failed: 0,
          results: [{
            ok: true,
            id: imported.id,
            title: imported.title,
            kind: imported.originalFormat,
            outputPath: imported.outputPath,
            updatedAt: imported.updatedAt,
            source: 'synced' as const,
          }],
        };
        if (asJson) console.log(JSON.stringify(result, null, 2));
        else console.log(`✓ 已导入真实收件箱：${imported.title} (${imported.id})`);
        process.exit(0);
      } catch (err: any) {
        const result = { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_WRITE_FAILED, error: err.message, results: [] };
        if (asJson) console.log(JSON.stringify(result, null, 2));
        else console.error(`错误：${result.error}`);
        process.exit(1);
      }
    }

    try {
      const index = readCloudIndex();
      const now = new Date().toISOString();
      const id = makeDocumentId(inputPath);
      const title = opts.title || path.basename(inputPath);
      const ext = path.extname(inputPath) || '.txt';
      const storedPath = path.join(cloudDocsDir(), `${id}${ext}`);
      fs.copyFileSync(inputPath, storedPath);

      const doc: CloudDocument = {
        id,
        title,
        kind: inferKind(inputPath),
        sourcePath: inputPath,
        storedPath,
        size: fs.statSync(storedPath).size,
        createdAt: now,
        updatedAt: now,
      };
      index.documents.unshift(doc);
      writeCloudIndex(index);

      const result = cloudSummary([doc]);
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.log(`✓ 已保存到 AI 文件收件箱：${doc.title} (${doc.id})`);
      process.exit(0);
    } catch (err: any) {
      const result = { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_WRITE_FAILED, error: err.message, results: [] };
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.error(`错误：${result.error}`);
      process.exit(1);
    }
  });

sourceOptions(
program
  .command('pull')
  .description('列出本地 AI 文件收件箱，供 AI/agent 选择后读取。')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (opts) => {
    const source = resolveSourceMode(opts.source);
    const result = source === 'synced'
      ? await syncedPullResult(resolveSyncRoot(opts.syncRoot))
      : (() => {
          const index = readCloudIndex();
          return index.documents.length > 0
            ? cloudSummary(index.documents)
            : { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_EMPTY, error: 'AI 文件收件箱为空', results: [] };
        })();

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!result.ok || result.results.length === 0) {
        console.error(source === 'synced' ? '真实收件箱为空' : 'AI 文件收件箱为空');
      } else {
        for (const doc of result.results) {
          console.log(`${doc.id}\t${doc.kind}\t${doc.title}`);
        }
      }
    }
    process.exit(result.ok ? 0 : 1);
  });

sourceOptions(
program
  .command('read <idOrTitle>')
  .description('读取本地 AI 文件收件箱中的 Markdown/JSON/文本内容。')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (idOrTitle: string, opts) => {
    const source = resolveSourceMode(opts.source);
    const result = source === 'synced'
      ? await syncedReadResult(resolveSyncRoot(opts.syncRoot), idOrTitle)
      : (() => {
          const index = readCloudIndex();
          const doc = findCloudDocument(index, idOrTitle);

          if (!doc || !fs.existsSync(doc.storedPath)) {
            return { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_DOCUMENT_NOT_FOUND, error: '未找到文件', results: [] };
          }

          const content = fs.readFileSync(doc.storedPath, 'utf-8');
          return {
            ok: true,
            total: 1,
            success: 1,
            failed: 0,
            results: [{
              ok: true,
              id: doc.id,
              title: doc.title,
              kind: doc.kind,
              outputPath: doc.storedPath,
              content,
              updatedAt: doc.updatedAt,
            }],
          };
        })();

    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(result.results[0].content);
    else console.error(`错误：${result.error}`);
    process.exit(result.ok ? 0 : 1);
  });

sourceOptions(
program
  .command('authorize <target>')
  .description('授权 AI 读取真实收件箱中的文件或集合。')
  .option('--scope <scope>', '授权范围：document 或 collection', 'document')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (target: string, opts) => {
    const result = await syncedAccessResult(resolveSyncRoot(opts.syncRoot), target, opts.scope, true);
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`✓ 已授权：${target}`);
    else console.error(`错误：${result.error}`);
    process.exit(result.ok ? 0 : 1);
  });

sourceOptions(
program
  .command('revoke <target>')
  .description('撤回 AI 读取真实收件箱中的文件或集合权限。')
  .option('--scope <scope>', '撤回范围：document 或 collection', 'document')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (target: string, opts) => {
    const result = await syncedAccessResult(resolveSyncRoot(opts.syncRoot), target, opts.scope, false);
    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) console.log(`✓ 已撤回：${target}`);
    else console.error(`错误：${result.error}`);
    process.exit(result.ok ? 0 : 1);
  });

sourceOptions(
program
  .command('write-result [file]')
  .description('把 AI 生成的结果先写成草稿，或在显式确认后写入真实收件箱。')
  .option('--stdin', '从 stdin 读取正文')
  .option('--title <title>', '结果标题；未指定时使用文件名')
  .option('--format <format>', '结果格式：markdown 或 json', 'markdown')
  .option('--result-type <type>', '结果类型：summary/report/structured_json/new_document/revision', 'summary')
  .option('--save-mode <mode>', '保存方式：draft/new_document/new_version', 'draft')
  .option('--document <idOrTitle>', '来源文档 ID 或标题；save-mode=new_version 时必填')
  .option('--version <id>', '来源版本 ID；默认使用当前版本')
  .option('--artifact <id>', '来源派生副本 ID')
  .option('--model <name>', '模型名，可选')
  .option('--prompt-hash <hash>', '提示词哈希，可选')
  .option('--request-id <id>', '幂等请求 ID，可选')
  .option('--confirm', '显式确认，直接落成正式版本或新文档')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (file: string | undefined, opts) => {
    try {
      const source = resolveSourceMode(opts.source);
      if (source !== 'synced') {
        const result = { ok: false, errorCode: CLOUD_ERROR_CODES.SYNC_ROOT_REQUIRED, error: 'write-result 当前只支持 synced 模式', results: [] };
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      const { content, inputPath } = await readCommandInput(file, opts);
      const format = opts.format === 'json' ? 'json' : 'markdown';
      const title = opts.title || (inputPath ? path.basename(inputPath, path.extname(inputPath)) : 'AI 结果');
      const result = await writeSyncedResultDraft(resolveSyncRoot(opts.syncRoot), {
        title,
        format,
        resultType: String(opts.resultType),
        saveMode: opts.saveMode,
        content,
        createdBy: 'cli',
        modelName: typeof opts.model === 'string' ? opts.model : undefined,
        promptTextHash: typeof opts.promptHash === 'string' ? opts.promptHash : undefined,
        documentIdOrTitle: typeof opts.document === 'string' ? opts.document : undefined,
        sourceVersionId: typeof opts.version === 'string' ? opts.version : undefined,
        sourceArtifactId: typeof opts.artifact === 'string' ? opts.artifact : undefined,
        requestId: typeof opts.requestId === 'string' ? opts.requestId : undefined,
        confirmed: !!opts.confirm,
      });
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    } catch (error: any) {
      const result = { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_WRITE_FAILED, error: error.message, results: [] };
      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });

sourceOptions(
program
  .command('confirm-result <draftId>')
  .description('确认一份待处理的 AI 结果草稿，并写成新版本或新文档。')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (draftId: string, opts) => {
    const result = await confirmExistingDraft(resolveSyncRoot(opts.syncRoot), draftId);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  });

sourceOptions(
program
  .command('discard-result <draftId>')
  .description('取消一份待确认的 AI 结果草稿。')
  .option('--json', '以 JSON 格式输出结果到 stdout'))
  .action(async (draftId: string, opts) => {
    const result = await discardExistingDraft(resolveSyncRoot(opts.syncRoot), draftId);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  });

program
  .command('mcp')
  .description('以 stdio 方式启动最小 MCP 只读服务器。')
  .option('--sync-root <dir>', '真实收件箱根目录；也可通过 MOLAN_SYNC_ROOT 指定')
  .action(async (opts) => {
    await startMcpStdioServer(opts.syncRoot, process.stdin, process.stdout);
    await new Promise<void>((resolve) => {
      process.stdin.on('end', () => resolve());
      process.stdin.on('close', () => resolve());
    });
  });

void program.parseAsync();
