import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { themes, ThemeMode } from '../theme';
import { JsonTree } from './JsonTree';
import { Reader } from './Reader';

interface JsonViewProps {
  raw: string;
  title?: string;
}

export function JsonView({ raw, title = 'JSON' }: JsonViewProps) {
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const theme = themes[systemMode];
  const [query, setQuery] = useState('');
  const [mdPreview, setMdPreview] = useState<string | null>(null);

  const parsed = useMemo(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);

  const parseError = useMemo(() => {
    try {
      JSON.parse(raw);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [raw]);

  const copyPretty = async () => {
    if (parsed !== null) await Clipboard.setStringAsync(JSON.stringify(parsed, null, 2));
  };
  const copyMinified = async () => {
    if (parsed !== null) await Clipboard.setStringAsync(JSON.stringify(parsed));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={systemMode === 'day' ? 'dark-content' : 'light-content'} />

      <View style={[styles.toolbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.heading }]} numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={copyPretty} disabled={parsed === null}>
          <Text style={{ color: parsed === null ? theme.textSecondary : theme.link, fontSize: 13 }}>复制美化</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={copyMinified} disabled={parsed === null} style={{ marginLeft: 16 }}>
          <Text style={{ color: parsed === null ? theme.textSecondary : theme.link, fontSize: 13 }}>复制压缩</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.search, { color: theme.text, backgroundColor: theme.codeBackground }]}
          placeholder="搜索 key / 值"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      {parseError ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>JSON 解析失败：{parseError}</Text>
        </View>
      ) : (
        <JsonTree data={parsed} theme={theme} query={query} onRenderMd={(md) => setMdPreview(md)} />
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
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  searchWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  search: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
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
