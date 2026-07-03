import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import {
  add as addPrompt,
  list as listPrompts,
  PromptItem,
  recentCopies,
  recordCopy,
  search as searchPrompts,
} from '../storage/prompts';

interface PromptSheetProps {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  currentContent?: string;
  currentTitle?: string;
  onCopied?: () => void;
}

export function PromptSheet({ visible, theme, onClose, currentContent, currentTitle, onCopied }: PromptSheetProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const compact = width < 380;
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [results, setResults] = useState<PromptItem[]>([]);
  const [recent, setRecent] = useState<PromptItem[]>([]);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');

  const reload = async () => {
    const all = await listPrompts();
    setPrompts(all);
    setRecent(await recentCopies(5));
  };

  useEffect(() => {
    if (!visible) return;
    reload();
  }, [visible]);

  useEffect(() => {
    let active = true;
    (async () => {
      const q = query.trim();
      if (!q) {
        setResults(prompts);
        return;
      }
      const r = await searchPrompts(q);
      if (active) setResults(r);
    })();
    return () => {
      active = false;
    };
  }, [query, prompts]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 1500);
  };

  const copy = async (item: PromptItem) => {
    await Clipboard.setStringAsync(item.content);
    onCopied?.();
    await recordCopy(item.id);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1200);
    await reload();
  };

  const startImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text || !text.trim()) {
      showToast('剪贴板为空');
      return;
    }
    setImportContent(text);
    setImportTitle(text.slice(0, 20));
    setImporting(true);
  };

  const confirmImport = async () => {
    const content = importContent;
    if (!content.trim()) {
      setImporting(false);
      return;
    }
    const title = importTitle.trim() || content.slice(0, 20);
    await addPrompt({ title, content, format: 'text' });
    setImporting(false);
    setImportTitle('');
    setImportContent('');
    setQuery('');
    await reload();
    showToast('已导入');
  };

  const cancelImport = () => {
    setImporting(false);
    setImportTitle('');
    setImportContent('');
  };

  const importCurrent = async () => {
    if (!currentContent || !currentContent.trim()) {
      showToast('当前无可导入内容');
      return;
    }
    const content = currentContent;
    const title2 = currentTitle?.slice(0, 20) || content.slice(0, 20);
    await addPrompt({ title: title2, content, format: isJsonLike(content) ? 'json' : 'md' });
    await reload();
    showToast('已导入当前文档');
  };

  const copyAllResults = async () => {
    const items = results.length > 0 ? results : prompts;
    if (items.length === 0) {
      showToast('暂无可复制内容');
      return;
    }
    await Clipboard.setStringAsync(items.map((item) => item.content.trim()).filter(Boolean).join('\n\n---\n\n'));
    onCopied?.();
    showToast(`已复制 ${items.length} 条`);
  };

  const isJsonLike = (text: string): boolean => {
    try { JSON.parse(text); return true; } catch { return false; }
  };

  const renderRow = (item: PromptItem) => (
    <View style={[styles.item, { borderColor: theme.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.content}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.copyBtn, { backgroundColor: theme.link }]}
        onPress={() => copy(item)}
      >
        <Text style={styles.copyText}>{copiedId === item.id ? '已复制' : '复制'}</Text>
      </TouchableOpacity>
    </View>
  );

  const showRecent = !query.trim() && recent.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: Math.min(height * 0.84, 640),
              paddingBottom: Math.max(24, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>提示词快贴</Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                搜索后点按复制，或组合多条后一起复制。
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>⌕</Text>
            <TextInput
              style={[styles.search, { color: theme.text }]}
              placeholder="搜索提示词"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={[styles.clearQuery, { color: theme.textSecondary }]}>清空</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={[styles.importActions, compact && styles.importActionsCompact]}>
            <TouchableOpacity
              style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
              onPress={copyAllResults}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>组合复制</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
              onPress={startImport}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>从剪贴板导入</Text>
            </TouchableOpacity>
            {currentContent ? (
              <TouchableOpacity
                style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
                onPress={importCurrent}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>从当前文件导入</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            style={styles.list}
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderRow(item)}
            ListHeaderComponent={
              showRecent ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>最近复制</Text>
                  {recent.map((item) => (
                    <View key={item.id}>{renderRow(item)}</View>
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                {query.trim() ? '没有匹配的提示词' : '暂无提示词'}
              </Text>
            }
          />

          {toast ? <Text style={[styles.toast, { color: theme.textSecondary }]}>{toast}</Text> : null}
        </Pressable>
      </Pressable>

      <Modal visible={importing} animationType="fade" transparent onRequestClose={cancelImport}>
        <Pressable style={styles.overlay} onPress={cancelImport}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.heading }]}>导入提示词</Text>
            <Text style={[styles.dialogHint, { color: theme.textSecondary }]}>
              可编辑标题，留空则使用内容前 20 字。
            </Text>
            <TextInput
              style={[
                styles.dialogInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
              placeholder="标题（可省略）"
              placeholderTextColor={theme.textSecondary}
              value={importTitle}
              onChangeText={setImportTitle}
              autoFocus
            />
            <Text style={[styles.dialogPreview, { color: theme.textSecondary }]} numberOfLines={3}>
              {importContent}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { borderColor: theme.border }]}
                onPress={cancelImport}
              >
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: theme.link }]}
                onPress={confirmImport}
              >
                <Text style={styles.copyText}>导入</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  searchRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  search: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  clearQuery: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  importBtn: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  importActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  importActionsCompact: {
    flexDirection: 'column',
  },
  list: {
    flex: 1,
  },
  section: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  preview: {
    fontSize: 12,
    marginTop: 3,
  },
  copyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
  },
  toast: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  dialog: {
    marginHorizontal: 32,
    padding: 16,
    borderRadius: 12,
    alignSelf: 'center',
    width: '80%',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dialogHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  dialogInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  dialogPreview: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
