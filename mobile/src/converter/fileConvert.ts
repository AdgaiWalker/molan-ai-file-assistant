import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { marked } from 'marked';
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

// md 文本 -> docx 文件，写入缓存目录
export async function convertMdToDocxFile(mdContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const bytes = await mdToDocxBytes(mdContent);
    const file = new File(Paths.cache, `${safeFileName(baseName)}.docx`);
    file.write(bytes);
    return { ok: true, outputPath: file.uri };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// docx 文件 -> md 文本
export async function convertDocxFileToMd(docxUri: string): Promise<ConvertResult & { md?: string }> {
  try {
    const ab = await new File(docxUri).arrayBuffer();
    const md = await docxToMd(ab);
    return { ok: true, md };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// 把 md 文本写入 .md 文件
export async function writeMdFile(mdContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const file = new File(Paths.cache, `${safeFileName(baseName)}.md`);
    file.write(mdContent);
    return { ok: true, outputPath: file.uri };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function writeJsonFile(jsonContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const file = new File(Paths.cache, `${safeFileName(baseName)}.json`);
    file.write(jsonContent);
    return { ok: true, outputPath: file.uri };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// md 渲染为带主题样式的 HTML（供 print-to-pdf）
function mdToHtml(md: string, mode: 'day' | 'night'): string {
  const body = marked.parse(md) as string;
  const dark = mode === 'night';
  const bg = dark ? '#1C1C1E' : '#FAFAFA';
  const fg = dark ? '#E5E5E5' : '#1A1A1A';
  const heading = dark ? '#FFFFFF' : '#111111';
  const codeBg = dark ? '#2C2C2E' : '#F0F0F0';
  const codeText = dark ? '#FF8AB4' : '#C7254E';
  const border = dark ? '#38383A' : '#E0E0E0';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    body { font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif; background:${bg}; color:${fg}; line-height:1.7; padding:24px; }
    h1,h2,h3,h4,h5,h6 { color:${heading}; line-height:1.3; }
    code { background:${codeBg}; color:${codeText}; padding:2px 4px; border-radius:3px; font-family:"SF Mono",Menlo,monospace; }
    pre { background:${codeBg}; padding:12px; border-radius:6px; overflow-x:auto; }
    pre code { background:transparent; }
    blockquote { border-left:4px solid ${border}; margin:0; padding:4px 12px; }
    table { border-collapse:collapse; }
    th,td { border:1px solid ${border}; padding:8px; }
    img { max-width:100%; }
  </style></head><body>${body}</body></html>`;
}

// md -> PDF 文件（expo-print 输出到缓存，再由调用方分享）
export async function exportPdfFile(
  mdContent: string,
  baseName: string,
  themeMode: 'day' | 'night' = 'day',
): Promise<ConvertResult> {
  try {
    const html = mdToHtml(mdContent, themeMode);
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, outputPath: uri };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
