export type JsonNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonRow {
  path: string;
  key: string;
  depth: number;
  type: JsonNodeType;
  preview: string;
  childCount: number;
  expanded: boolean;
  hasChildren: boolean;
  raw?: string;
  value?: unknown;
}

export function typeOfJsonValue(value: unknown): JsonNodeType {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  const valueType = typeof value;
  if (valueType === 'string') return 'string';
  if (valueType === 'number') return 'number';
  if (valueType === 'boolean') return 'boolean';
  return 'object';
}

export function summarizeJsonValue(value: unknown, type: JsonNodeType): { preview: string; childCount: number } {
  if (type === 'object') {
    const childCount = Object.keys(value as Record<string, unknown>).length;
    return { preview: `{${childCount}}`, childCount };
  }
  if (type === 'array') {
    const childCount = (value as unknown[]).length;
    return { preview: `[${childCount}]`, childCount };
  }
  if (type === 'string') return { preview: JSON.stringify(value), childCount: 0 };
  if (type === 'null') return { preview: 'null', childCount: 0 };
  return { preview: String(value), childCount: 0 };
}

export function escapeJsonPathKey(key: string): string {
  return /^[A-Za-z_][\w]*$/.test(key) ? `.${key}` : `["${key.replace(/"/g, '\\"')}"]`;
}

export function looksLikeMarkdown(value: string): boolean {
  return /(^|\n)\s{0,3}#{1,6}\s/.test(value)
    || /(^|\n)\s{0,3}[-*+]\s/.test(value)
    || /\*\*[^*]+\*\*/.test(value)
    || /(^|\n)\s{0,3}>/.test(value);
}

/** 默认最大渲染行数：超过则截断，避免大 JSON 全展开卡顿。 */
export const JSON_MAX_ROWS = 2000;

export function buildJsonRows(data: unknown, expanded: Set<string>, maxRows = JSON_MAX_ROWS): JsonRow[] {
  const rows: JsonRow[] = [];
  let truncated = false;
  const walk = (value: unknown, path: string, key: string, depth: number) => {
    if (rows.length >= maxRows) { truncated = true; return; }
    const type = typeOfJsonValue(value);
    const { preview, childCount } = summarizeJsonValue(value, type);
    const hasChildren = (type === 'object' || type === 'array') && childCount > 0;
    const isExpanded = expanded.has(path);
    rows.push({
      path,
      key,
      depth,
      type,
      preview,
      childCount,
      expanded: isExpanded,
      hasChildren,
      raw: type === 'string' ? (value as string) : undefined,
      value,
    });
    if (hasChildren && isExpanded) {
      if (type === 'array') {
        for (let index = 0; index < (value as unknown[]).length; index++) {
          if (rows.length >= maxRows) { truncated = true; break; }
          walk((value as unknown[])[index], `${path}[${index}]`, String(index), depth + 1);
        }
      } else {
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
          if (rows.length >= maxRows) { truncated = true; break; }
          walk(childValue, `${path}${escapeJsonPathKey(childKey)}`, childKey, depth + 1);
        }
      }
    }
  };
  walk(data, '$', '$', 0);
  if (truncated && rows.length > 0) {
    // 末尾插一条提示行（用 object 占位，path 固定）
    rows.push({
      path: '$__truncated__',
      key: '…',
      depth: 0,
      type: 'null',
      preview: `（节点超过 ${maxRows}，已截断。请折叠部分分支或用搜索）`,
      childCount: 0,
      expanded: false,
      hasChildren: false,
      raw: undefined,
      value: null,
    });
  }
  return rows;
}

export function flattenJsonRows(data: unknown): JsonRow[] {
  const rows: JsonRow[] = [];
  const walk = (value: unknown, path: string, key: string, depth: number) => {
    const type = typeOfJsonValue(value);
    const { preview, childCount } = summarizeJsonValue(value, type);
    const hasChildren = (type === 'object' || type === 'array') && childCount > 0;
    rows.push({
      path,
      key,
      depth,
      type,
      preview,
      childCount,
      expanded: true,
      hasChildren,
      raw: type === 'string' ? (value as string) : undefined,
      value,
    });
    if (hasChildren) {
      if (type === 'array') {
        (value as unknown[]).forEach((item, index) => walk(item, `${path}[${index}]`, String(index), depth + 1));
      } else {
        for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
          walk(childValue, `${path}${escapeJsonPathKey(childKey)}`, childKey, depth + 1);
        }
      }
    }
  };
  walk(data, '$', '$', 0);
  return rows;
}

export function filterJsonRows(data: unknown, query: string): JsonRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return flattenJsonRows(data);
  return flattenJsonRows(data).filter(
    (row) => row.key.toLowerCase().includes(normalizedQuery)
      || row.preview.toLowerCase().includes(normalizedQuery),
  );
}

export function jsonValueToClipboardText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}
