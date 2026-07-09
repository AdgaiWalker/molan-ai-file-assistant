import { describe, it, expect } from 'vitest';
import { extractVars, fillVars, hasVars } from '../storage/promptVars';

describe('extractVars', () => {
  it('提取单个变量', () => {
    expect(extractVars('请总结 {{文件内容}}')).toEqual(['文件内容']);
  });
  it('提取多个变量，去重，保持顺序', () => {
    expect(extractVars('{{A}} 和 {{B}} 再 {{A}}')).toEqual(['A', 'B']);
  });
  it('允许变量名两侧空白', () => {
    expect(extractVars('{{  代码片段  }}')).toEqual(['代码片段']);
  });
  it('无变量返回空数组', () => {
    expect(extractVars('普通文本无变量')).toEqual([]);
  });
  it('空花括号不算变量', () => {
    expect(extractVars('{{}} 和 {{ }}')).toEqual([]);
  });
  it('变量名不含花括号/空白', () => {
    expect(extractVars('{{a{b}}')).toEqual([]);
  });
});

describe('fillVars', () => {
  it('替换已提供的变量', () => {
    expect(fillVars('{{文件内容}} 生成', { 文件内容: '正文' })).toBe('正文 生成');
  });
  it('未提供的变量保留原样', () => {
    expect(fillVars('{{A}}{{B}}', { A: '甲' })).toBe('甲{{B}}');
  });
  it('变量两侧空白匹配', () => {
    expect(fillVars('{{ A }}', { A: '甲' })).toBe('甲');
  });
  it('值里含花括号不触发递归', () => {
    expect(fillVars('{{A}}', { A: '{{B}}' })).toBe('{{B}}');
  });
  it('空映射不改文本', () => {
    expect(fillVars('{{A}} 普通', {})).toBe('{{A}} 普通');
  });
});

describe('hasVars', () => {
  it('有变量', () => {
    expect(hasVars('请 {{x}}')).toBe(true);
  });
  it('无变量', () => {
    expect(hasVars('普通')).toBe(false);
  });
});
