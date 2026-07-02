import { describe, it, expect } from 'vitest';

function getByPath(obj: unknown, path: string): unknown {
  if (path === '$') return obj;
  const tokens = path.slice(1).match(/\[\d+\]|\.\w+|\["[^"]*"\]/g) ?? [];
  let cur: unknown = obj;
  for (const token of tokens) {
    if (cur === null || cur === undefined) return undefined;
    if (token[0] === '[') {
      const inner = token.slice(1, -1);
      if (/^\d+$/.test(inner)) {
        cur = (cur as unknown[])[Number(inner)];
      } else {
        const key = inner.slice(1, -1).replace(/\\"/g, '"');
        cur = (cur as Record<string, unknown>)[key];
      }
    } else {
      cur = (cur as Record<string, unknown>)[token.slice(1)];
    }
  }
  return cur;
}

describe('getByPath', () => {
  it('根路径返回原对象', () => {
    const obj = { a: 1 };
    expect(getByPath(obj, '$')).toBe(obj);
  });

  it('按点号路径取嵌套值', () => {
    expect(getByPath({ a: { b: { c: 2 } } }, '$.a.b.c')).toBe(2);
  });

  it('取数组元素', () => {
    const obj = { list: [10, 20, 30] };
    expect(getByPath(obj, '$.list[0]')).toBe(10);
    expect(getByPath(obj, '$.list[2]')).toBe(30);
  });

  it('混合对象与数组路径', () => {
    const obj = { list: [{ name: 'x' }, { name: 'y' }] };
    expect(getByPath(obj, '$.list[1].name')).toBe('y');
  });

  it('缺失键返回 undefined', () => {
    expect(getByPath({ a: 1 }, '$.b')).toBeUndefined();
  });

  it('中间值为 null 不抛错并返回 undefined', () => {
    expect(getByPath({ a: null }, '$.a.b')).toBeUndefined();
  });

  it('数组越界返回 undefined', () => {
    expect(getByPath({ list: [1] }, '$.list[9]')).toBeUndefined();
  });

  it('方括号引用含特殊字符的键', () => {
    expect(getByPath({ 'a-b': 5 }, '$["a-b"]')).toBe(5);
  });
});
