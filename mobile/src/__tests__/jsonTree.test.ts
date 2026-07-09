import { describe, expect, it } from 'vitest';
import {
  buildJsonRows,
  filterJsonRows,
  jsonValueToClipboardText,
} from '../json/tree';

describe('json tree helpers', () => {
  const data = {
    user: {
      name: '张三',
      active: true,
      'role-name': 'admin',
    },
    items: [{ title: 'PRD 文档' }, { title: '接口说明' }],
  };

  it('builds JSONPath for regular, array and quoted keys', () => {
    const rows = buildJsonRows(data, new Set(['$', '$.user', '$.items', '$.items[0]']));
    const paths = rows.map((row) => row.path);

    expect(paths).toContain('$.user.name');
    expect(paths).toContain('$.items[0].title');
    expect(paths).toContain('$.user["role-name"]');
  });

  it('searches by key and value across collapsed structures', () => {
    const keyMatches = filterJsonRows(data, 'role');
    const valueMatches = filterJsonRows(data, '接口');

    expect(keyMatches.map((row) => row.path)).toContain('$.user["role-name"]');
    expect(valueMatches.map((row) => row.path)).toContain('$.items[1].title');
  });

  it('converts JSON values to clipboard text without extra quotes for strings', () => {
    expect(jsonValueToClipboardText('hello')).toBe('hello');
    expect(jsonValueToClipboardText(true)).toBe('true');
    expect(jsonValueToClipboardText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('buildJsonRows 截断（大 JSON 虚拟化）', () => {
  it('超过 maxRows 时截断并加提示行', () => {
    const big = Array.from({ length: 500 }, (_, i) => ({ id: i, name: `项${i}` }));
    const rows = buildJsonRows({ list: big }, new Set(['$', '$.list']), 50);
    expect(rows.length).toBe(51); // 50 + 1 提示行
    expect(rows[rows.length - 1].path).toBe('$__truncated__');
    expect(rows[rows.length - 1].preview).toContain('已截断');
  });
  it('未超 maxRows 不截断', () => {
    const rows = buildJsonRows({ a: 1, b: 2 }, new Set(['$']), 100);
    expect(rows.some((r) => r.path === '$__truncated__')).toBe(false);
  });
});
