export interface SearchableMarkdownBlock {
  raw?: string;
  text?: string;
}

export interface MarkdownSearchMatch {
  index: number;
  snippet: string;
}

export function blockSearchText(block: SearchableMarkdownBlock): string {
  return (block.text || block.raw || '').replace(/\s+/g, ' ').trim();
}

export function findMarkdownMatches(blocks: SearchableMarkdownBlock[], query: string): MarkdownSearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  return blocks
    .map((block, index) => ({ index, text: blockSearchText(block) }))
    .filter((item) => item.text.toLowerCase().includes(normalizedQuery))
    .map((item) => ({
      index: item.index,
      snippet: item.text.length > 96 ? `${item.text.slice(0, 96)}...` : item.text,
    }));
}
