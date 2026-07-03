import React from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecentDoc, DocSource, documentStatusText } from '../storage/recentDocs';
import { Theme } from '../theme';

function sourceLabel(s: DocSource | string): string {
  switch (s) {
    case 'wechat': return '微信';
    case 'qq': return 'QQ';
    case 'fileManager': return '文件管理';
    case 'documentPicker': return '本地选择';
    case 'recent': return '最近文档';
    default: return '其他';
  }
}

function actionLabel(doc: RecentDoc): string {
  if (doc.lastCopiedAt) return `最近复制 ${new Date(doc.lastCopiedAt).toLocaleString()}`;
  if (doc.lastEditedAt) return `最近编辑 ${new Date(doc.lastEditedAt).toLocaleString()}`;
  return `最近打开 ${new Date(doc.updatedAt).toLocaleString()}`;
}

interface RecentSheetProps {
  visible: boolean;
  docs: RecentDoc[];
  theme: Theme;
  onClose: () => void;
  onOpen: (doc: RecentDoc) => void;
  onRemove: (id: string) => void;
}

export function RecentSheet({ visible, docs, theme, onClose, onOpen, onRemove }: RecentSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [query, setQuery] = React.useState('');
  const filteredDocs = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => {
      const haystack = [
        doc.title,
        doc.kind === 'json' ? 'JSON' : 'Markdown',
        sourceLabel(doc.source ?? 'other'),
        documentStatusText(doc),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [docs, query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: Math.min(height * 0.78, 560),
              paddingBottom: Math.max(24, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>最近文档</Text>
              <Text style={[styles.subhead, { color: theme.textSecondary }]}>继续阅读、查找最近复制或编辑过的文件。</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索标题 / 来源 / 类型 / 状态"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            style={[styles.searchInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          />
          {docs.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>打开过的文档会出现在这里。</Text>
          ) : filteredDocs.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>没有找到匹配文档。</Text>
          ) : (
            <FlatList
              data={filteredDocs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, { borderColor: theme.border }]}
                  onPress={() => onOpen(item)}
                  onLongPress={() => onRemove(item.id)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                      {sourceLabel(item.source ?? 'other')} · {item.kind === 'json' ? 'JSON' : 'Markdown'} · {actionLabel(item)}
                    </Text>
                    <Text style={[styles.status, { color: theme.link }]} numberOfLines={1}>
                      {documentStatusText(item)}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>长按移除</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </Pressable>
      </Pressable>
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
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  subhead: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  closeBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 16,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 14,
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
  meta: {
    fontSize: 12,
    marginTop: 3,
  },
  status: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '700',
  },
});
