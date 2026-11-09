import { describe, expect, it } from 'vitest';
import {
  filterPrompts,
  groupPrompts,
  resolveSelectedPrompt,
  type PromptItem,
} from './presentation';

const prompts: readonly PromptItem[] = [
  {
    id: 'prd',
    title: 'PRD 需求拆解',
    content: '整理核心流程与边界条件',
    group: '最近复制',
    tags: ['需求分析'],
  },
  {
    id: 'review',
    title: '代码 Review',
    content: '检查可读性和异常处理',
    group: '收藏',
    tags: ['CODE', 'quality'],
  },
  {
    id: 'test',
    title: '生成单元测试',
    content: '覆盖正常路径和异常路径',
    group: '收藏',
    tags: ['test'],
  },
];

describe('filterPrompts', () => {
  it('可以跨标题、正文、分组和标签搜索，且忽略大小写', () => {
    expect(filterPrompts(prompts, 'prd').map((item) => item.id)).toEqual(['prd']);
    expect(filterPrompts(prompts, '异常').map((item) => item.id)).toEqual(['review', 'test']);
    expect(filterPrompts(prompts, '收藏').map((item) => item.id)).toEqual(['review', 'test']);
    expect(filterPrompts(prompts, 'code').map((item) => item.id)).toEqual(['review']);
  });

  it('空白查询返回原始列表', () => {
    expect(filterPrompts(prompts, '   ')).toBe(prompts);
  });
});

describe('groupPrompts', () => {
  it('保留分组首次出现顺序和组内顺序', () => {
    expect(groupPrompts(prompts)).toEqual([
      ['最近复制', [prompts[0]]],
      ['收藏', [prompts[1], prompts[2]]],
    ]);
  });
});

describe('resolveSelectedPrompt', () => {
  it('保留可见选中项；隐藏时选择第一项；空列表返回 null', () => {
    expect(resolveSelectedPrompt(prompts, 'review')?.id).toBe('review');
    expect(resolveSelectedPrompt(prompts.slice(0, 1), 'review')?.id).toBe('prd');
    expect(resolveSelectedPrompt([], 'review')).toBeNull();
  });
});
