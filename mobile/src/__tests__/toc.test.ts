import { describe, it, expect } from 'vitest';
import type { Token, Tokens } from 'marked';
import { parseToc } from '../markdown/toc';

function textToken(text: string): Token {
  return { type: 'text', text, raw: text } as unknown as Token;
}

function heading(depth: number, text: string, inline: Token[] = [textToken(text)]): Tokens.Heading {
  return { type: 'heading', depth, text, raw: text, tokens: inline } as unknown as Tokens.Heading;
}

function paragraph(text: string): Token {
  return { type: 'paragraph', text, raw: text, tokens: [textToken(text)] } as unknown as Token;
}

describe('parseToc', () => {
  it('空 tokens 返回空数组', () => {
    expect(parseToc([])).toEqual([]);
  });

  it('提取单个标题并保留层级、文本、索引', () => {
    const toc = parseToc([heading(1, 'Hello')]);
    expect(toc).toEqual([{ level: 1, text: 'Hello', id: 'Hello', index: 0 }]);
  });

  it('按出现顺序提取多级标题', () => {
    const toc = parseToc([heading(1, 'A'), heading(2, 'B'), heading(3, 'C')]);
    expect(toc.map((t) => t.level)).toEqual([1, 2, 3]);
    expect(toc.map((t) => t.index)).toEqual([0, 1, 2]);
  });

  it('跳过非标题 token，index 指向 tokens 中的真实位置', () => {
    const tokens = [paragraph('intro'), heading(2, 'Section'), paragraph('body'), heading(2, 'End')];
    const toc = parseToc(tokens);
    expect(toc.map((t) => t.text)).toEqual(['Section', 'End']);
    expect(toc.map((t) => t.index)).toEqual([1, 3]);
  });

  it('递归提取嵌套行内 token 的文本', () => {
    const inline: Token[] = [
      textToken('a '),
      { type: 'strong', tokens: [textToken('bold')] } as unknown as Token,
      textToken(' b'),
    ];
    expect(parseToc([heading(2, 'a bold b', inline)])[0].text).toBe('a bold b');
  });

  it('链接 token 的文本被提取', () => {
    const inline: Token[] = [
      { type: 'link', text: 'click', tokens: [textToken('click')] } as unknown as Token,
    ];
    expect(parseToc([heading(1, 'click', inline)])[0].text).toBe('click');
  });

  it('tokens 为 undefined 的标题文本为空', () => {
    const token = { type: 'heading', depth: 2, text: '', raw: '', tokens: undefined } as unknown as Tokens.Heading;
    expect(parseToc([token])[0].text).toBe('');
  });

  describe('id 生成', () => {
    it('空格转连字符', () => {
      expect(parseToc([heading(2, 'Hello World')])[0].id).toBe('Hello-World');
    });

    it('保留中文并去除标点', () => {
      expect(parseToc([heading(2, '你好，世界！')])[0].id).toBe('你好世界');
    });

    it('去除英文标点', () => {
      expect(parseToc([heading(2, 'Hello, World!')])[0].id).toBe('Hello-World');
    });

    it('相同文本生成相同 id，与层级无关', () => {
      const a = parseToc([heading(2, 'Same')])[0].id;
      const b = parseToc([heading(3, 'Same')])[0].id;
      expect(a).toBe(b);
    });
  });
});
