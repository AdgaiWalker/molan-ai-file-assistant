// 转换协调层 —— 纯逻辑 + 委托 platform 层做 I/O。
// 公共 API 保持稳定（convertMdToDocxFile/writeMdFile/writeJsonFile/exportPdfFile/
// convertDocxFileToMd/jsonToMarkdown），调用方只需改分享方式（platform/share）。
import { writeBytes, writeText } from '../platform/fileWriter';
import { mdToPdfFile } from '../platform/pdf';
import { mdToDocxBytes } from './mdToDocx';
import { docxToMd } from './docxToMd';

export interface ConvertResult {
  ok: boolean;
  outputPath?: string;
  error?: string;
}

function safeFileName(name: string): string {
  return (name || '文档').replace(/[\\/:*?"<>|]/g, '_');
}

function fence(text: string, lang = ''): string {
  const ticks = text.includes('```') ? '````' : '```';
  return `${ticks}${lang}\n${text}\n${ticks}`;
}

function jsonValueToMarkdown(value: unknown, depth = 2): string {
  const heading = '#'.repeat(Math.min(depth, 6));
  if (value === null || value === undefined) return '`null`';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '""';
    const looksMarkdown = /(^|\n)\s{0,3}#{1,6}\s/.test(trimmed)
      || /(^|\n)\s{0,3}[-*+]\s/.test(trimmed)
      || /\*\*[^*]+\*\*/.test(trimmed);
    return looksMarkdown ? trimmed : trimmed.replace(/\n{3,}/g, '\n\n');
  }
  if (typeof value === 'number' || typeof value === 'boolean') return `\`${String(value)}\``;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item, index) => {
        const body = jsonValueToMarkdown(item, depth + 1);
        if (typeof item === 'object' && item !== null) {
          return `${heading} 第 ${index + 1} 项\n\n${body}`;
        }
        return `- ${body}`;
      })
      .join('\n\n');
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return entries
    .map(([key, item]) => {
      const body = jsonValueToMarkdown(item, depth + 1);
      if (typeof item === 'object' && item !== null) {
        return `${heading} ${key}\n\n${body}`;
      }
      return `- **${key}**：${body}`;
    })
    .join('\n\n');
}

export function jsonToMarkdown(jsonContent: string, title = 'JSON 文档'): string {
  try {
    const data = JSON.parse(jsonContent);
    return `# ${title}\n\n${jsonValueToMarkdown(data)}\n`;
  } catch {
    return `# ${title}\n\nJSON 解析失败，以下为原始内容：\n\n${fence(jsonContent, 'json')}\n`;
  }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MD_MIME = 'text/markdown';
const JSON_MIME = 'application/json';

// md 文本 -> docx 文件（写入缓存 / blob URL），返回 outputPath。
export async function convertMdToDocxFile(mdContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const bytes = await mdToDocxBytes(mdContent);
    const { outputPath } = writeBytes(`${safeFileName(baseName)}.docx`, bytes, DOCX_MIME);
    return { ok: true, outputPath };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// docx 字节 -> md 文本（纯逻辑，平台无关）。
// 调用方负责从文件读取 arrayBuffer（platform/filePicker.pickBinaryFile）。
export async function convertDocxBytesToMd(bytes: ArrayBuffer): Promise<ConvertResult & { md?: string }> {
  try {
    const md = await docxToMd(bytes);
    return { ok: true, md };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// 把 md 文本写入 .md 文件（缓存 / blob URL）。
export async function writeMdFile(mdContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const { outputPath } = writeText(`${safeFileName(baseName)}.md`, mdContent, MD_MIME);
    return { ok: true, outputPath };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function writeJsonFile(jsonContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const { outputPath } = writeText(`${safeFileName(baseName)}.json`, jsonContent, JSON_MIME);
    return { ok: true, outputPath };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// md 渲染为 PDF（platform/pdf 委托 expo-print / HTML blob）。
export async function exportPdfFile(
  mdContent: string,
  baseName: string,
  themeMode: 'day' | 'night' = 'day',
): Promise<ConvertResult> {
  return mdToPdfFile(mdContent, safeFileName(baseName), themeMode);
}
