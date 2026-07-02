#!/usr/bin/env node
// 墨览 CLI — molan convert
// 把 Office/PDF/PPT/Excel 转成 Markdown，输出结构化 JSON 给 AI/agent 解析

import { program } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
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
  .action(async (inputs: string[], opts) => {
    const outputFormat = opts.to as ConvertFormat;
    const outputDir = path.resolve(opts.out);
    const asJson = opts.json;
    const isBatch = opts.batch || inputs.length > 1;

    // 确保输出目录存在
    fs.mkdirSync(outputDir, { recursive: true });

    // 展开 glob
    let files: string[] = inputs;
    if (isBatch && inputs.length === 1 && (inputs[0].includes('*') || fs.statSync(inputs[0]).isDirectory())) {
      const pattern = fs.statSync(inputs[0]).isDirectory()
        ? path.join(inputs[0], '**/*')
        : inputs[0];
      files = await fg([pattern], { onlyFiles: true, caseSensitiveMatch: false });
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

    const rawResults = isBatch
      ? await convertBatch(inputs_, outputFormat, outputDir, Number(opts.concurrency))
      : [await convertFile(inputs_[0].inputPath, outputFormat, outputDir)];

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

program.parse();
