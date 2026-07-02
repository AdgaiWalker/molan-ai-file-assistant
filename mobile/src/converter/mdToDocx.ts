import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ExternalHyperlink,
  BorderStyle,
  Packer,
} from 'docx';
import { marked, Token, Tokens } from 'marked';

// md 文本 -> docx 二进制（Uint8Array），可写入文件
export async function mdToDocxBytes(md: string): Promise<Uint8Array> {
  const doc = buildDocument(md);
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

export function buildDocument(md: string): Document {
  const tokens = marked.lexer(md);
  const children = renderBlocks(tokens);
  return new Document({
    sections: [{ children }],
  });
}

function renderBlocks(tokens: Token[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const token of tokens) {
    const el = renderBlock(token);
    if (el) out.push(...(Array.isArray(el) ? el : [el]));
  }
  return out;
}

function renderBlock(token: Token): (Paragraph | Table)[] | Paragraph | Table | null {
  switch (token.type) {
    case 'heading':
      return renderHeading(token as Tokens.Heading);
    case 'paragraph':
      return new Paragraph({ children: renderInline((token as Tokens.Paragraph).tokens) });
    case 'list':
      return renderList(token as Tokens.List);
    case 'code':
      return renderCode(token as Tokens.Code);
    case 'table':
      return renderTable(token as Tokens.Table);
    case 'blockquote':
      return renderBlockquote(token as Tokens.Blockquote);
    case 'hr':
      return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1 } },
      });
    case 'space':
    case 'html':
      return null;
    default:
      return null;
  }
}

function renderHeading(token: Tokens.Heading): Paragraph {
  const levels: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  return new Paragraph({
    heading: levels[token.depth] ?? HeadingLevel.HEADING_6,
    children: renderInline(token.tokens),
  });
}

function renderList(token: Tokens.List, depth = 0): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const indent = 360 + depth * 360;
  token.items.forEach((item, i) => {
    const marker = token.ordered ? `${Number(token.start) + i}. ` : '• ';
    const parts = item.tokens ?? [];
    const head = parts[0];
    const headRuns = head
      ? renderInline(head.type === 'text' ? (head as Tokens.Text).tokens : (head as Tokens.Paragraph).tokens)
      : [];
    out.push(new Paragraph({ children: [new TextRun({ text: marker }), ...headRuns], indent: { left: indent } }));
    for (const bt of parts.slice(1)) {
      if (bt.type === 'list') {
        out.push(...renderList(bt as Tokens.List, depth + 1));
      } else if (bt.type === 'paragraph') {
        out.push(new Paragraph({ children: renderInline((bt as Tokens.Paragraph).tokens), indent: { left: indent } }));
      } else {
        const el = renderBlock(bt);
        if (el) out.push(...(Array.isArray(el) ? el : [el]));
      }
    }
  });
  return out;
}

function renderCode(token: Tokens.Code): Paragraph {
  const lines = token.text.split('\n');
  return new Paragraph({
    children: lines.flatMap((line, i) => {
      const runs = [new TextRun({ text: line, font: 'Consolas', size: 20 })];
      if (i < lines.length - 1) runs.push(new TextRun({ text: '', break: 1 }));
      return runs;
    }),
  });
}

function renderTable(token: Tokens.Table): Table {
  const colCount = token.header.length || 1;
  const cellWidth = Math.floor(100 / colCount);
  const makeCell = (cell: Tokens.TableCell | undefined): TableCell =>
    new TableCell({
      children: [new Paragraph({ children: cell ? renderInline(cell.tokens) : [] })],
      width: { size: cellWidth, type: WidthType.PERCENTAGE },
    });
  const headerRow = new TableRow({ children: token.header.map(makeCell) });
  const bodyRows = token.rows.map(
    (row) => new TableRow({ children: Array.from({ length: colCount }, (_, i) => makeCell(row[i])) }),
  );
  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function renderBlockquote(token: Tokens.Blockquote): (Paragraph | Table)[] {
  return renderBlocks(token.tokens);
}

// 行内 token -> (TextRun | ExternalHyperlink)[]
type InlineRun = TextRun | ExternalHyperlink;
interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
}

function renderInline(tokens: Token[] | undefined, style: RunStyle = {}): InlineRun[] {
  if (!tokens) return [];
  return tokens.flatMap((t) => renderInlineToken(t, style));
}

function renderInlineToken(token: Token, style: RunStyle): InlineRun[] {
  switch (token.type) {
    case 'text': {
      const tt = token as Tokens.Text;
      return tt.tokens ? renderInline(tt.tokens, style) : [new TextRun({ text: tt.text, ...style })];
    }
    case 'strong':
      return renderInline((token as Tokens.Strong).tokens, { ...style, bold: true });
    case 'em':
      return renderInline((token as Tokens.Em).tokens, { ...style, italics: true });
    case 'del':
      return renderInline((token as Tokens.Del).tokens, { ...style, strike: true });
    case 'codespan':
      return [new TextRun({ text: (token as Tokens.Codespan).text, font: 'Consolas', size: 20, ...style })];
    case 'link': {
      const link = token as Tokens.Link;
      const inner = renderInline(link.tokens, style);
      return [
        new ExternalHyperlink({
          link: link.href,
          children: inner.length ? inner : [new TextRun({ text: link.href, ...style })],
        }),
      ];
    }
    case 'image': {
      const img = token as Tokens.Image;
      const label = img.text || '图片';
      if (img.href) {
        return [
          new ExternalHyperlink({
            link: img.href,
            children: [new TextRun({ text: `[图] ${label}`, ...style })],
          }),
        ];
      }
      return [new TextRun({ text: `[图] ${label}`, ...style })];
    }
    case 'br':
      return [new TextRun({ text: '', break: 1, ...style })];
    case 'escape':
      return [new TextRun({ text: (token as Tokens.Escape).text, ...style })];
    default:
      return [];
  }
}
