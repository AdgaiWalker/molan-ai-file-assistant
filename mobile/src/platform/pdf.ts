// 平台抽象：Markdown -> PDF 文件。
// 原生：expo-print 输出到缓存；web：生成 HTML blob（调用方下载，浏览器可打印为 PDF）。
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import { marked } from 'marked';

export interface PdfResult {
  ok: boolean;
  outputPath?: string;
  error?: string;
}

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

/** Markdown 渲染为 PDF（原生）/ HTML blob（web）。 */
export async function mdToPdfFile(
  mdContent: string,
  _baseName: string,
  themeMode: 'day' | 'night' = 'day',
): Promise<PdfResult> {
  try {
    const html = mdToHtml(mdContent, themeMode);
    if (Platform.OS === 'web') {
      const blob = new Blob([html], { type: 'text/html' });
      return { ok: true, outputPath: URL.createObjectURL(blob) };
    }
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, outputPath: uri };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
