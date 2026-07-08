#!/usr/bin/env node
// 墨览 CLI — molan convert
// 把 Office/PDF/PPT/Excel 转成 Markdown，输出结构化 JSON 给 AI/agent 解析

import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import fg from 'fast-glob';
import {
  convertFile,
  convertBatch,
  detectFormat,
  isOfficeToMarkdown,
  outputExtension,
  ERROR_CODES,
  pandocPath,
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

const CLOUD_ERROR_CODES = {
  CLOUD_EMPTY: 'E_CLOUD_EMPTY',
  CLOUD_DOCUMENT_NOT_FOUND: 'E_CLOUD_DOCUMENT_NOT_FOUND',
  CLOUD_WRITE_FAILED: 'E_CLOUD_WRITE_FAILED',
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
      const p = pandocPath();
      const exists = fs.existsSync(p) || p === 'pandoc';
      const result = {
        ok: exists,
        pandocPath: p,
        nodeVersion: process.version,
        platform: process.platform,
        supportedFormats: ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'md', 'json'],
      };
      console.log(JSON.stringify(result, null, 2));
      process.exit(exists ? 0 : 1);
    } catch (err: any) {
      console.log(JSON.stringify({ ok: false, error: err.message }, null, 2));
      process.exit(1);
    }
  });

program
  .command('push <file>')
  .description('把本地 Markdown/JSON/文本文件保存到本地 AI 文件收件箱，后续可被 molan read 读取。')
  .option('--title <title>', '保存标题，默认使用文件名')
  .option('--json', '以 JSON 格式输出结果到 stdout')
  .action((file: string, opts) => {
    const inputPath = path.resolve(file);
    const asJson = opts.json;

    if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
      const result = { ok: false, errorCode: ERROR_CODES.INPUT_NOT_FOUND, error: '文件不存在', results: [] };
      if (asJson) console.log(JSON.stringify(result, null, 2));
      else console.error(`错误：${result.error}`);
      process.exit(1);
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

program
  .command('pull')
  .description('列出本地 AI 文件收件箱，供 AI/agent 选择后读取。')
  .option('--json', '以 JSON 格式输出结果到 stdout')
  .action((opts) => {
    const index = readCloudIndex();
    const result = index.documents.length > 0
      ? cloudSummary(index.documents)
      : { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_EMPTY, error: 'AI 文件收件箱为空', results: [] };

    if (opts.json) {
      console.log(JSON.stringify(result, null, 2));
    } else if (index.documents.length === 0) {
      console.error('AI 文件收件箱为空');
    } else {
      for (const doc of index.documents) {
        console.log(`${doc.id}\t${doc.kind}\t${doc.title}`);
      }
    }
    process.exit(index.documents.length > 0 ? 0 : 1);
  });

program
  .command('read <idOrTitle>')
  .description('读取本地 AI 文件收件箱中的 Markdown/JSON/文本内容。')
  .option('--json', '以 JSON 格式输出结果到 stdout')
  .action((idOrTitle: string, opts) => {
    const index = readCloudIndex();
    const doc = findCloudDocument(index, idOrTitle);

    if (!doc || !fs.existsSync(doc.storedPath)) {
      const result = { ok: false, errorCode: CLOUD_ERROR_CODES.CLOUD_DOCUMENT_NOT_FOUND, error: '未找到文件', results: [] };
      if (opts.json) console.log(JSON.stringify(result, null, 2));
      else console.error(`错误：${result.error}`);
      process.exit(1);
    }

    const content = fs.readFileSync(doc.storedPath, 'utf-8');
    const result = {
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

    if (opts.json) console.log(JSON.stringify(result, null, 2));
    else console.log(content);
    process.exit(0);
  });

program.parse();
