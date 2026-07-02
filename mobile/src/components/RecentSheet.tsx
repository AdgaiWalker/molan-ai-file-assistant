import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { RecentDoc, DocSource } from '../storage/recentDocs';
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

interface RecentSheetProps {
  visible: boolean;
  docs: RecentDoc[];
  theme: Theme;
  onClose: () => void;
  onOpen: (doc: RecentDoc) => void;
  onRemove: (id: string) => void;
}

export function RecentSheet({ visible, docs, theme, onClose, onOpen, onRemove }: RecentSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: theme.heading }]}>最近文档</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>
          {docs.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textSecondary }]}>打开过的文档会出现在这里。</Text>
          ) : (
            <FlatList
              data={docs}
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
                      {sourceLabel(item.source ?? 'other')} · {item.kind === 'json' ? 'JSON' : 'Markdown'} · {new Date(item.updatedAt).toLocaleString()}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  empty: {
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 16,
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
});
