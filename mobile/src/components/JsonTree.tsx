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
import {
  buildJsonRows,
  filterJsonRows,
  jsonValueToClipboardText,
  looksLikeMarkdown,
  type JsonNodeType,
  type JsonRow,
} from '../json/tree';

function valueColor(type: JsonNodeType, theme: Theme): string {
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
      return filterJsonRows(data, q);
    }
    return buildJsonRows(data, expanded);
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

  const copyValue = (row: JsonRow) => {
    Clipboard.setStringAsync(jsonValueToClipboardText(row.value));
  };

  const renderItem = ({ item }: { item: JsonRow }) => {
    const isContainer = item.hasChildren;
    const q = query.trim().toLowerCase();
    const match = q !== '' && (item.key.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q));
    const mdable = item.type === 'string' && item.raw !== undefined && looksLikeMarkdown(item.raw);
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
      contentContainerStyle={{ paddingVertical: 8, paddingBottom: 190 }}
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
