import { describe, it, expect } from 'vitest';
import { findMarkdownMatches, blockSearchText } from '../markdown/search';

// 纯逻辑：Markdown 搜索匹配。覆盖空查询、大小写、空白合并、片段截断边界。
// 判据：这些规则断了不会立刻崩，但搜索结果会错乱（空查询不该匹配、长文本该截断）。
describe('blockSearchText', () => {
  it('优先用 text，回退 raw', () => {
    expect(blockSearchText({ text: 'A', raw: 'B' })).toBe('A');
    expect(blockSearchText({ raw: 'B' })).toBe('B');
    expect(blockSearchText({})).toBe('');
  });

  it('合并多余空白并去首尾', () => {
    expect(blockSearchText({ text: '  多   个   空白\t\n  ' })).toBe('多 个 空白');
  });
});

describe('findMarkdownMatches', () => {
  const blocks = [
    { text: '第一节：介绍 Markdown' },
    { text: 'BOLD 与 italic 混合' },
    { raw: '代码块内容 console.log("hi")' },
    { text: '一段非常长的文本'.repeat(15) }, // > 96 字符
  ];

  it('空查询返回空数组', () => {
    expect(findMarkdownMatches(blocks, '')).toEqual([]);
    expect(findMarkdownMatches(blocks, '   ')).toEqual([]);
  });

  it('大小写不敏感匹配', () => {
    const r = findMarkdownMatches(blocks, 'BOLD');
    expect(r).toHaveLength(1);
    expect(r[0].index).toBe(1);
  });

  it('命中 raw 字段（代码块）', () => {
    const r = findMarkdownMatches(blocks, 'console');
    expect(r).toHaveLength(1);
    expect(r[0].index).toBe(2);
  });

  it('长文本截断到 96 字符并加省略号', () => {
    const r = findMarkdownMatches(blocks, '一段非常长');
    expect(r).toHaveLength(1);
    expect(r[0].snippet.length).toBe(96 + 3); // 96 + '...'
    expect(r[0].snippet.endsWith('...')).toBe(true);
  });

  it('短文本不截断', () => {
    const r = findMarkdownMatches(blocks, '介绍');
    expect(r[0].snippet).toBe('第一节：介绍 Markdown');
  });

  it('无命中返回空数组', () => {
    expect(findMarkdownMatches(blocks, '不存在的词')).toEqual([]);
  });

  it('多块命中保留各自原始 index', () => {
    const r = findMarkdownMatches(
      [{ text: 'markdown 甲' }, { text: '其他' }, { text: 'markdown 乙' }],
      'markdown',
    );
    expect(r.map((m) => m.index)).toEqual([0, 2]);
  });
});
