import mammoth from 'mammoth';
import TurndownService from 'turndown';

// docx 二进制 -> markdown 文本
export async function docxToMd(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer: data });
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  // 表格：turndown 默认不支持，加规则转成 markdown 表格
  turndown.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: (content, node) => ` ${content.trim()} |`,
  });
  turndown.addRule('tableRow', {
    filter: 'tr',
    replacement: (content, node) => {
      const cells = (node as HTMLElement).querySelectorAll('th, td');
      const isHeader = Array.from(cells).some((c) => c.tagName.toLowerCase() === 'th');
      if (isHeader) {
        const sep = Array.from(cells).map(() => ' --- |').join('');
        return `|${content}\n|${sep}\n`;
      }
      return `|${content}`;
    },
  });
  turndown.addRule('table', {
    filter: 'table',
    replacement: (content) => `\n\n${content}\n\n`,
  });
  let md = turndown.turndown(result.value);
  return md.trim() + '\n';
}
