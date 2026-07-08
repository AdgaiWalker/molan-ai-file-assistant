import { describe, it, expect } from 'vitest';
import { collectTags, groupByFolder, filterPrompts } from '../storage/folders';
import type { PromptItem } from '../storage/prompts';

const mk = (id: string, folderId: string | undefined, tags: string[] | undefined, title = id): PromptItem => ({
  id, title, content: 'c', format: 'text', copyCount: 0, createdAt: 0, folderId, tags,
});

describe('collectTags', () => {
  it('收集去重 + 排序 + 去空白', () => {
    const items = [
      mk('1', undefined, ['翻译', ' 中文 ', '']),
      mk('2', undefined, ['翻译', '总结']),
    ];
    // 去重去空白后：翻译/中文/总结；默认按 localeCompare（中文 Unicode 序）
    const tags = collectTags(items);
    expect(tags).toHaveLength(3);
    expect(tags).toContain('翻译');
    expect(tags).toContain('中文');
    expect(tags).toContain('总结');
    expect(tags).toEqual(Array.from(new Set(['翻译', '中文', '总结'])).sort((a, b) => a.localeCompare(b)));
  });
  it('无标签返回空数组', () => {
    expect(collectTags([mk('1', undefined, undefined), mk('2', undefined, [])])).toEqual([]);
  });
  it('空数组', () => {
    expect(collectTags([])).toEqual([]);
  });
});

describe('groupByFolder', () => {
  it('按 folderId 聚合，undefined 归未分组(null)', () => {
    const items = [
      mk('1', 'fa', undefined),
      mk('2', undefined, undefined),
      mk('3', 'fa', undefined),
      mk('4', 'fb', undefined),
    ];
    const groups = groupByFolder(items);
    expect(groups.map((g) => g.folderId)).toEqual(['fa', null, 'fb']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['1', '3']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['2']);
    expect(groups[2].items.map((i) => i.id)).toEqual(['4']);
  });
  it('保持首次出现顺序', () => {
    const items = [mk('1', 'fb', undefined), mk('2', 'fa', undefined)];
    expect(groupByFolder(items).map((g) => g.folderId)).toEqual(['fb', 'fa']);
  });
  it('空数组', () => {
    expect(groupByFolder([])).toEqual([]);
  });
});

describe('filterPrompts', () => {
  const items = [
    mk('1', 'fa', ['翻译']),
    mk('2', 'fa', ['总结']),
    mk('3', undefined, ['翻译']),
    mk('4', 'fb', ['翻译', '总结']),
  ];

  it('只按分组筛：folderId=undefined 不筛分组', () => {
    expect(filterPrompts(items, undefined, undefined).length).toBe(4);
  });
  it('folderId=null 表示未分组', () => {
    expect(filterPrompts(items, null, undefined).map((i) => i.id)).toEqual(['3']);
  });
  it('folderId=具体值', () => {
    expect(filterPrompts(items, 'fa', undefined).map((i) => i.id)).toEqual(['1', '2']);
  });
  it('只按标签筛', () => {
    expect(filterPrompts(items, undefined, '翻译').map((i) => i.id)).toEqual(['1', '3', '4']);
  });
  it('分组 + 标签叠加', () => {
    expect(filterPrompts(items, 'fa', '翻译').map((i) => i.id)).toEqual(['1']);
    expect(filterPrompts(items, 'fa', '总结').map((i) => i.id)).toEqual(['2']);
  });
  it('标签不存在返回空', () => {
    expect(filterPrompts(items, undefined, '不存在')).toEqual([]);
  });
});
