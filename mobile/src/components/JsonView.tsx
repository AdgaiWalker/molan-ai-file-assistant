import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Modal,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes, ThemeMode } from '../theme';
import { JsonTree } from './JsonTree';
import { Reader } from './Reader';
import { parseAndFormatJson } from '../json/format';

interface JsonViewProps {
  raw: string;
  title?: string;
}

export function JsonView({ raw, title = 'JSON' }: JsonViewProps) {
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const theme = themes[systemMode];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [query, setQuery] = useState('');
  const [mdPreview, setMdPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'pretty' | 'minified'>('tree');

  const formatted = useMemo(() => parseAndFormatJson(raw), [raw]);
  const parsed = formatted.ok ? formatted.value : null;
  const parseError = formatted.ok ? null : formatted.error;

  const copyPretty = async () => {
    if (formatted.ok) await Clipboard.setStringAsync(formatted.pretty);
  };
  const copyMinified = async () => {
    if (formatted.ok) await Clipboard.setStringAsync(formatted.minified);
  };

  const rawDisplay = formatted.ok
    ? viewMode === 'pretty'
      ? formatted.pretty
      : formatted.minified
    : raw;

  const modeButton = (mode: typeof viewMode, label: string) => (
    <TouchableOpacity
      style={[
        styles.modeButton,
        {
          borderColor: theme.border,
          backgroundColor: viewMode === mode ? theme.link : theme.surface,
        },
      ]}
      onPress={() => setViewMode(mode)}
      disabled={!formatted.ok && mode !== 'pretty'}
    >
      <Text style={{ color: viewMode === mode ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={systemMode === 'day' ? 'dark-content' : 'light-content'} />

      <View
        style={[
          styles.toolbar,
          compact && styles.toolbarCompact,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            minHeight: insets.top + 52,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.heading }]} numberOfLines={1}>{title}</Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity style={[styles.toolPill, { borderColor: theme.border }]} onPress={copyPretty} disabled={parsed === null}>
            <Text style={{ color: parsed === null ? theme.textSecondary : theme.link, fontSize: 12 }}>复制美化</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolPill, { borderColor: theme.border }]} onPress={copyMinified} disabled={parsed === null}>
            <Text style={{ color: parsed === null ? theme.textSecondary : theme.link, fontSize: 12 }}>复制压缩</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.modeRow}>
          {modeButton('tree', '树形')}
          {modeButton('pretty', '美化')}
          {modeButton('minified', '压缩')}
        </View>
        {viewMode === 'tree' ? (
          <TextInput
            style={[styles.search, { color: theme.text, backgroundColor: theme.codeBackground }]}
            placeholder="搜索 key / 值"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        ) : null}
      </View>

      {parseError ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>JSON 解析失败：{parseError}</Text>
          <ScrollView style={[styles.rawBox, { backgroundColor: theme.codeBackground }]}>
            <Text selectable style={[styles.rawText, { color: theme.codeText }]}>{raw}</Text>
          </ScrollView>
        </View>
      ) : viewMode === 'tree' ? (
        <JsonTree data={parsed} theme={theme} query={query} onRenderMd={(md) => setMdPreview(md)} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.rawContent, { backgroundColor: theme.background }]}
        >
          <Text selectable style={[styles.rawText, { color: theme.codeText, backgroundColor: theme.codeBackground }]}>
            {rawDisplay}
          </Text>
        </ScrollView>
      )}

      <Modal visible={mdPreview !== null} animationType="slide" onRequestClose={() => setMdPreview(null)}>
        <View style={{ flex: 1 }}>
          <Reader content={mdPreview ?? ''} title="Markdown 片段" immersive onToggleChrome={() => {}} />
          <TouchableOpacity style={styles.closeFab} onPress={() => setMdPreview(null)}>
            <Text style={styles.closeFabText}>✕ 关闭</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  toolbarCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolPill: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    minHeight: 32,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  search: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rawContent: {
    padding: 12,
    paddingBottom: 190,
  },
  rawBox: {
    marginTop: 12,
    borderRadius: 8,
    maxHeight: 260,
  },
  rawText: {
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Courier New',
    fontSize: 12,
    lineHeight: 18,
  },
  closeFab: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 50,
  },
  closeFabText: {
    color: '#fff',
    fontSize: 13,
  },
});
