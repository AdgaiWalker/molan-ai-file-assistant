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

// md 文本 -> docx 文件，写入缓存目录
export async function convertMdToDocxFile(mdContent: string, baseName: string): Promise<ConvertResult> {
  try {
    const bytes = await mdToDocxBytes(mdContent);
    const file = new File(Paths.cache, `${baseName}.docx`);
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
    const file = new File(Paths.cache, `${baseName}.md`);
    file.write(mdContent);
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
