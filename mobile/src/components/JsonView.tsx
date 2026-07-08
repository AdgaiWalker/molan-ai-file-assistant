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
import { ChevronLeft, Search, MoreHorizontal, X, Copy } from 'lucide-react-native';

interface JsonViewProps {
  raw: string;
  title?: string;
  onCopied?: () => void;
  onClose?: () => void;
}

export function JsonView({ raw, title = 'JSON', onCopied, onClose }: JsonViewProps) {
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const theme = themes[systemMode];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [query, setQuery] = useState('');
  const [mdPreview, setMdPreview] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'pretty' | 'minified'>('tree');
  const [moreVisible, setMoreVisible] = useState(false);

  const formatted = useMemo(() => parseAndFormatJson(raw), [raw]);
  const parsed = formatted.ok ? formatted.value : null;
  const parseError = formatted.ok ? null : formatted.error;

  const copyPretty = async () => {
    if (formatted.ok) {
      await Clipboard.setStringAsync(formatted.pretty);
      onCopied?.();
    }
  };
  const copyMinified = async () => {
    if (formatted.ok) {
      await Clipboard.setStringAsync(formatted.minified);
      onCopied?.();
    }
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
        <View style={styles.toolLeft}>
          {onClose ? (
            <TouchableOpacity style={styles.toolBtn} onPress={onClose}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.title, { color: theme.heading }]} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setMoreVisible(true)}>
            <MoreHorizontal size={22} color={theme.text} />
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
          <View style={[styles.searchBox, { backgroundColor: theme.codeBackground }]}>
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.search, { color: theme.text }]}
              placeholder="搜索 key 或 value"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
          </View>
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
        <JsonTree data={parsed} theme={theme} query={query} onRenderMd={(md) => setMdPreview(md)} onCopied={onCopied} />
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
            <X size={14} color="#fff" />
            <Text style={styles.closeFabText}> 关闭</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 更多菜单：复制美化 / 压缩 */}
      <Modal visible={moreVisible} animationType="fade" transparent={true} onRequestClose={() => setMoreVisible(false)}>
        <TouchableOpacity style={styles.moreOverlay} activeOpacity={1} onPress={() => setMoreVisible(false)}>
          <View style={[styles.morePanel, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: insets.top + 52, marginRight: 12 }]}>
            <TouchableOpacity
              style={[styles.moreItem, { borderBottomColor: theme.border }]}
              onPress={() => { setMoreVisible(false); copyPretty(); }}
              disabled={parsed === null}
            >
              <Copy size={18} color={parsed === null ? theme.textSecondary : theme.text} />
              <Text style={[styles.moreItemText, { color: parsed === null ? theme.textSecondary : theme.text }]}>复制美化 JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreItem}
              onPress={() => { setMoreVisible(false); copyMinified(); }}
              disabled={parsed === null}
            >
              <Copy size={18} color={parsed === null ? theme.textSecondary : theme.text} />
              <Text style={[styles.moreItemText, { color: parsed === null ? theme.textSecondary : theme.text }]}>复制压缩 JSON</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 4,
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  search: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 50,
  },
  closeFabText: {
    color: '#fff',
    fontSize: 13,
  },
  moreOverlay: {
    flex: 1,
    alignItems: 'flex-end',
  },
  morePanel: {
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  moreItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
});
