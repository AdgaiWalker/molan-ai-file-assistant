import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';

type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

interface Row {
  path: string;
  key: string;
  depth: number;
  type: NodeType;
  preview: string;
  childCount: number;
  expanded: boolean;
  hasChildren: boolean;
  raw?: string;
}

function typeOf(v: unknown): NodeType {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'string') return 'string';
  if (t === 'number') return 'number';
  if (t === 'boolean') return 'boolean';
  return 'object';
}

function summarize(v: unknown, type: NodeType): { preview: string; childCount: number } {
  if (type === 'object') {
    const n = Object.keys(v as Record<string, unknown>).length;
    return { preview: `{${n}}`, childCount: n };
  }
  if (type === 'array') {
    const n = (v as unknown[]).length;
    return { preview: `[${n}]`, childCount: n };
  }
  if (type === 'string') return { preview: JSON.stringify(v), childCount: 0 };
  if (type === 'null') return { preview: 'null', childCount: 0 };
  return { preview: String(v), childCount: 0 };
}

function escapeKey(k: string): string {
  return /^[A-Za-z_][\w]*$/.test(k) ? `.${k}` : `["${k.replace(/"/g, '\\"')}"]`;
}

function looksLikeMd(s: string): boolean {
  return /(^|\n)\s{0,3}#{1,6}\s/.test(s) || /(^|\n)\s{0,3}[-*+]\s/.test(s) || /\*\*[^*]+\*\*/.test(s) || /(^|\n)\s{0,3}>/.test(s);
}

function buildRows(data: unknown, expanded: Set<string>): Row[] {
  const rows: Row[] = [];
  const walk = (v: unknown, path: string, key: string, depth: number) => {
    const type = typeOf(v);
    const { preview, childCount } = summarize(v, type);
    const hasChildren = (type === 'object' || type === 'array') && childCount > 0;
    const isExpanded = expanded.has(path);
    rows.push({ path, key, depth, type, preview, childCount, expanded: isExpanded, hasChildren, raw: type === 'string' ? (v as string) : undefined });
    if (hasChildren && isExpanded) {
      if (type === 'array') {
        (v as unknown[]).forEach((item, i) => walk(item, `${path}[${i}]`, String(i), depth + 1));
      } else {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          walk(val, `${path}${escapeKey(k)}`, k, depth + 1);
        }
      }
    }
  };
  walk(data, '$', '$', 0);
  return rows;
}

function flattenAll(data: unknown): Row[] {
  const rows: Row[] = [];
  const walk = (v: unknown, path: string, key: string, depth: number) => {
    const type = typeOf(v);
    const { preview, childCount } = summarize(v, type);
    const hasChildren = (type === 'object' || type === 'array') && childCount > 0;
    rows.push({ path, key, depth, type, preview, childCount, expanded: true, hasChildren, raw: type === 'string' ? (v as string) : undefined });
    if (hasChildren) {
      if (type === 'array') {
        (v as unknown[]).forEach((item, i) => walk(item, `${path}[${i}]`, String(i), depth + 1));
      } else {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          walk(val, `${path}${escapeKey(k)}`, k, depth + 1);
        }
      }
    }
  };
  walk(data, '$', '$', 0);
  return rows;
}

function valueColor(type: NodeType, theme: Theme): string {
  switch (type) {
    case 'string': return theme.codeText;
    case 'number': return theme.link;
    case 'boolean': return theme.heading;
    case 'null': return theme.textSecondary;
    default: return theme.textSecondary;
  }
}

interface JsonTreeProps {
  data: unknown;
  theme: Theme;
  query: string;
  onRenderMd?: (md: string) => void;
}

export function JsonTree({ data, theme, query, onRenderMd }: JsonTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return flattenAll(data).filter(
        (r) => r.key.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q),
      );
    }
    return buildRows(data, expanded);
  }, [data, expanded, query]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const copyPath = (path: string) => {
    Clipboard.setStringAsync(path);
    Alert.alert('已复制 JSONPath', path);
  };

  const copyValue = (row: Row) => {
    Clipboard.setStringAsync(row.preview);
  };

  const renderItem = ({ item }: { item: Row }) => {
    const isContainer = item.hasChildren;
    const q = query.trim().toLowerCase();
    const match = q !== '' && (item.key.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q));
    const mdable = item.type === 'string' && item.raw !== undefined && looksLikeMd(item.raw);
    return (
      <View style={[styles.row, { paddingLeft: item.depth * 16 + 12 }]}>
        <Text style={{ width: 16, color: theme.textSecondary, fontSize: 11 }}>
          {isContainer ? (item.expanded ? '▼' : '▶') : ''}
        </Text>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => (isContainer ? toggle(item.path) : copyValue(item))}
          onLongPress={() => copyPath(item.path)}
        >
          <Text
            style={{ color: theme.link, fontSize: 13, fontWeight: match ? '700' : '400' }}
            numberOfLines={1}
          >
            {item.key}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>: </Text>
          <Text
            style={{ flexShrink: 1, color: valueColor(item.type, theme), fontSize: 13 }}
            numberOfLines={1}
          >
            {item.preview}
          </Text>
        </TouchableOpacity>
        {mdable && onRenderMd ? (
          <TouchableOpacity
            style={[styles.mdBtn, { borderColor: theme.border }]}
            onPress={() => onRenderMd(item.raw!)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: theme.link, fontSize: 11 }}>查看MD</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.path}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 96 }}
      initialNumToRender={40}
      windowSize={11}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
  },
  mdBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 6,
  },
});
