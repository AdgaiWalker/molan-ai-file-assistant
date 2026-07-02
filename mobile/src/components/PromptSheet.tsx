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
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
}

export function PromptSheet({ visible, theme, onClose, currentContent, currentTitle }: PromptSheetProps) {
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

  const importFragment = async () => {
    // 从剪贴板读取以模拟"先复制片段再导入"的流程
    const text = await Clipboard.getStringAsync();
    if (!text || !text.trim()) {
      showToast('请先在正文中复制要导入的片段');
      return;
    }
    setImportContent(text);
    setImportTitle(text.slice(0, 20));
    setImporting(true);
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
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: theme.heading }]}>提示词库</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            点按即可复制提示词，粘贴到任意 AI 助手中使用。
          </Text>

          <View style={styles.searchRow}>
            <TextInput
              style={[
                styles.search,
                { color: theme.text, backgroundColor: theme.codeBackground, borderColor: theme.border },
              ]}
              placeholder="搜索标题 / 内容 / 标签"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
              onPress={startImport}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>从剪贴板导入</Text>
            </TouchableOpacity>
            {currentContent ? (
              <>
                <TouchableOpacity
                  style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
                  onPress={importCurrent}
                >
                  <Text style={{ color: theme.text, fontSize: 13 }}>导入当前文档</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
                  onPress={importFragment}
                >
                  <Text style={{ color: theme.text, fontSize: 13 }}>导入剪贴板片段</Text>
                </TouchableOpacity>
              </>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  search: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  importBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
