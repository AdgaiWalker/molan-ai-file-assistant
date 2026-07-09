// 共享转换引擎 —— CLI 和 Electron 共用
// Office/PDF/PPT/Excel → Markdown / docx，基于 pandoc

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { cleanupMarkdown } from './mdCleanup';

// ── 类型 ──

export type ConvertFormat = 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'csv' | 'md' | 'json';

export interface ConvertInput {
  inputPath: string;
  fileName: string;
}

export interface ConvertResult {
  inputPath: string;
  fileName: string;
  ok: boolean;
  outputPath?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];
}

export interface ConvertOptions {
  outputDir?: string;
  preserveImages?: boolean;
}

// ── 错误码 ──

export const ERROR_CODES = {
  PANDOC_MISSING: 'E_PANDOC_MISSING',
  UNSUPPORTED_FORMAT: 'E_UNSUPPORTED_FORMAT',
  INPUT_NOT_FOUND: 'E_INPUT_NOT_FOUND',
  CONVERT_FAILED: 'E_CONVERT_FAILED',
  OUTPUT_FAILED: 'E_OUTPUT_FAILED',
} as const;

// ── pandoc 路径解析 ──

export function pandocPath(): string {
  // CLI 优先级：环境变量 > resources/ > 系统 PATH
  if (process.env['PANDOC_PATH'] && fs.existsSync(process.env['PANDOC_PATH'])) {
    return process.env['PANDOC_PATH'];
  }
  // 从本文件位置推断 resources/
  const devPath = path.join(__dirname, '../../resources/pandoc.exe');
  if (fs.existsSync(devPath)) return devPath;
  const cliAdjacent = path.join(__dirname, '../../resources/pandoc.exe');
  if (fs.existsSync(cliAdjacent)) return cliAdjacent;
  return 'pandoc';
}

// ── 格式→文件扩展名 ──

export function outputExtension(format: ConvertFormat): string {
  switch (format) {
    case 'docx': return '.docx';
    case 'pdf': return '.pdf';
    case 'pptx': return '.pptx';
    case 'xlsx': return '.xlsx';
    case 'csv': return '.csv';
    case 'md': return '.md';
    case 'json': return '.json';
    default: return '.md';
  }
}

// ── 格式→pandoc from/to ──

function pandocFormat(ext: string): { from: string; to: string } {
  const lower = ext.toLowerCase();
  switch (lower) {
    case '.docx': return { from: 'docx', to: 'gfm' };
    case '.pptx': return { from: 'pptx', to: 'gfm' };
    case '.pdf': return { from: 'pdf', to: 'gfm' };
    case '.xlsx':
    case '.csv': return { from: lower.slice(1), to: 'gfm' };
    default: return { from: 'markdown', to: 'docx' };
  }
}

// ── 输入格式检测 ──

export function detectFormat(filePath: string): ConvertFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  const valid: ConvertFormat[] = ['docx', 'pdf', 'pptx', 'xlsx', 'csv', 'md', 'json'];
  const stripped = ext.replace('.', '') as ConvertFormat;
  return valid.includes(stripped) ? stripped : null;
}

// 是否 office→md 方向
export function isOfficeToMarkdown(format: ConvertFormat): boolean {
  return ['docx', 'pdf', 'pptx', 'xlsx', 'csv'].includes(format);
}

// ── 单文件转换 ──

function makeOutputPath(inputPath: string, outputFormat: ConvertFormat, outputDir: string): string {
  const base = path.basename(inputPath).replace(/\.[^.]+$/, '');
  const ext = outputExtension(outputFormat);
  let out = path.join(outputDir, base + ext);
  if (!fs.existsSync(out)) return out;
  let i = 1;
  while (fs.existsSync(path.join(outputDir, `${base}_${i}${ext}`))) i++;
  return path.join(outputDir, `${base}_${i}${ext}`);
}

export function convertFile(
  inputPath: string,
  outputFormat: ConvertFormat,
  outputDir: string,
  options?: ConvertOptions,
): Promise<ConvertResult> {
  // 图片资源：preserveImages 时，pandoc 把图片抽到 <outDir>/media 并在 MD 里用相对路径引用
  const mediaDir = options?.preserveImages ? path.join(outputDir, 'media') : undefined;
  const fileName = path.basename(inputPath);
  const inputFormat = detectFormat(inputPath);

  return new Promise((resolve) => {
    if (!inputFormat) {
      resolve({ inputPath, fileName, ok: false, errorCode: ERROR_CODES.UNSUPPORTED_FORMAT, error: '不支持的文件格式', warnings: [] });
      return;
    }
    if (!fs.existsSync(inputPath)) {
      resolve({ inputPath, fileName, ok: false, errorCode: ERROR_CODES.INPUT_NOT_FOUND, error: '文件不存在', warnings: [] });
      return;
    }

    const p = pandocPath();
    const outPath = makeOutputPath(inputPath, outputFormat, outputDir);

    if (outputFormat === 'md' && isOfficeToMarkdown(inputFormat)) {
      // Office → Markdown（转换后清理：去噪声/重复标题/多余空行）
      const { from } = pandocFormat(path.extname(inputPath));
      const args = [inputPath, '-o', outPath, '-f', from, '-t', 'gfm'];
      if (mediaDir) args.push('--extract-media', mediaDir);
      runPandoc(p, args, inputPath, fileName, outPath, resolve, true);
    } else if (inputFormat === 'md' && outputFormat === 'docx') {
      // Markdown → Word
      const args = [inputPath, '-o', outPath, '-f', 'markdown', '-t', 'docx'];
      runPandoc(p, args, inputPath, fileName, outPath, resolve);
    } else if (outputFormat === 'json') {
      // 任意 → JSON（读取 MD 内容，序列化为 JSON 行格式）
      jsonConvert(inputPath, fileName, outPath, outputDir, resolve);
    } else {
      // 其他组合：交给 pandoc 自动推断
      const args = [inputPath, '-o', outPath];
      runPandoc(p, args, inputPath, fileName, outPath, resolve);
    }
  });
}

function runPandoc(
  pandoc: string,
  args: string[],
  inputPath: string,
  fileName: string,
  outPath: string,
  resolve: (v: ConvertResult) => void,
  postCleanup = false,
) {
  const proc = spawn(pandoc, args, { windowsHide: true, timeout: 120_000 });

  let stderr = '';
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  proc.on('error', (err) => {
    resolve({
      inputPath, fileName, ok: false,
      errorCode: ERROR_CODES.PANDOC_MISSING,
      error: `无法启动 pandoc：${err.message}`,
      warnings: [],
    });
  });

  proc.on('close', (code) => {
    if (code === 0 && fs.existsSync(outPath)) {
      // Office→MD 后清理噪声（多余空行/重复标题/YAML 块）
      if (postCleanup) {
        try {
          const raw = fs.readFileSync(outPath, 'utf-8');
          fs.writeFileSync(outPath, cleanupMarkdown(raw), 'utf-8');
        } catch {
          /* 清理失败不影响转换成功结果 */
        }
      }
      resolve({ inputPath, fileName, ok: true, outputPath: outPath, warnings: [] });
    } else {
      resolve({
        inputPath, fileName, ok: false, outputPath: outPath,
        errorCode: ERROR_CODES.CONVERT_FAILED,
        error: stderr || `pandoc 退出码 ${code}`,
        warnings: [],
      });
    }
  });
}

function jsonConvert(
  inputPath: string,
  fileName: string,
  outPath: string,
  outputDir: string,
  resolve: (v: ConvertResult) => void,
) {
  try {
    const content = fs.readFileSync(inputPath, 'utf-8');
    const json = { file: fileName, path: inputPath, content, convertedAt: new Date().toISOString() };
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf-8');
    resolve({ inputPath, fileName, ok: true, outputPath: outPath, warnings: [] });
  } catch (err: any) {
    resolve({
      inputPath, fileName, ok: false, outputPath: outPath,
      errorCode: ERROR_CODES.OUTPUT_FAILED,
      error: err.message,
      warnings: [],
    });
  }
}

// ── 批量转换 ──

// 失败隔离：单文件 reject/抛错不扩散到整批，转成 ok:false 结果
async function safeConvert(
  input: ConvertInput,
  outputFormat: ConvertFormat,
  outputDir: string,
  options?: ConvertOptions,
): Promise<ConvertResult> {
  try {
    return await convertFile(input.inputPath, outputFormat, outputDir, options);
  } catch (err: any) {
    return {
      inputPath: input.inputPath,
      fileName: input.fileName,
      ok: false,
      errorCode: ERROR_CODES.CONVERT_FAILED,
      error: `批量转换内部异常：${err?.message ?? String(err)}`,
      warnings: [],
    };
  }
}

export async function convertBatch(
  inputs: ConvertInput[],
  outputFormat: ConvertFormat,
  outputDir: string,
  concurrency = 4,
  options?: ConvertOptions,
): Promise<ConvertResult[]> {
  const results: ConvertResult[] = new Array(inputs.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= inputs.length) return;
      // allSettled 兜底：即使 safeConvert 内部再抛错也不污染整批
      const settled = await Promise.allSettled([
        safeConvert(inputs[index], outputFormat, outputDir, options),
      ]);
      const r = settled[0];
      results[index] = r.status === 'fulfilled'
        ? r.value
        : {
            inputPath: inputs[index].inputPath,
            fileName: inputs[index].fileName,
            ok: false,
            errorCode: ERROR_CODES.CONVERT_FAILED,
            error: `未捕获异常：${(r as PromiseRejectedResult).reason?.message ?? String((r as PromiseRejectedResult).reason)}`,
            warnings: [],
          };
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, inputs.length || 1));
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return results;
}
