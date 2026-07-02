import { Token, Tokens } from 'marked';

export interface TocItem {
  level: number;
  text: string;
  id: string;
  index: number;
}

// 从已 lex 的 tokens 提取标题作为目录；index 为块在 tokens 中的下标，供 FlatList scrollToIndex 跳转
export function parseToc(tokens: Token[]): TocItem[] {
  const items: TocItem[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      const text = extractText(heading.tokens);
      items.push({
        level: heading.depth,
        text,
        id: makeId(text),
        index: i,
      });
    }
  }
  return items;
}

function extractText(tokens: any[] | undefined): string {
  if (!tokens) return '';
  return tokens.map((t) => (t.type === 'text' ? t.text : extractText(t.tokens))).join('');
}

function makeId(text: string): string {
  return text.trim().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');
}
