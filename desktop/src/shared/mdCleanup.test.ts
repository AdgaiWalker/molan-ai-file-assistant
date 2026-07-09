import { describe, it, expect } from 'vitest';
import { cleanupMarkdown } from './mdCleanup';

describe('cleanupMarkdown', () => {
  it('压缩 3+ 空行为 2 空行', () => {
    expect(cleanupMarkdown('A\n\n\n\nB')).toBe('A\n\nB');
  });
  it('2 空行保留', () => {
    expect(cleanupMarkdown('A\n\nB')).toBe('A\n\nB');
  });
  it('去掉行尾空白', () => {
    expect(cleanupMarkdown('A   \nB\t\n')).toBe('A\nB\n');
  });
  it('去掉 YAML 元数据块', () => {
    const md = '---\ntitle: 测试\nauthor: 张三\n---\n\n# 正文\n';
    expect(cleanupMarkdown(md)).toBe('# 正文\n');
  });
  it('无 YAML 块不动', () => {
    expect(cleanupMarkdown('# 标题\n正文')).toBe('# 标题\n正文');
  });
  it('连续重复标题去重', () => {
    expect(cleanupMarkdown('# 标题\n# 标题\n# 标题\n正文')).toBe('# 标题\n正文');
  });
  it('不连续重复标题保留', () => {
    expect(cleanupMarkdown('# A\n正文\n# A\n更多')).toBe('# A\n正文\n# A\n更多');
  });
  it('去掉分页符', () => {
    expect(cleanupMarkdown('A\x0cB')).toBe('AB');
  });
  it('首尾空行 trim', () => {
    expect(cleanupMarkdown('\n\n\n# 标题\n\n\n')).toBe('# 标题\n');
  });
  it('空字符串', () => {
    expect(cleanupMarkdown('')).toBe('');
  });
});
