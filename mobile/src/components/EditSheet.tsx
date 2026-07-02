import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { writeMdFile } from '../converter/fileConvert';
import { Theme } from '../theme';
import { Reader } from './Reader';

interface EditSheetProps {
  visible: boolean;
  title: string;
  content: string;
  theme: Theme;
  onClose: () => void;
  onSave: (content: string) => void;
}

export function EditSheet({ visible, title, content, theme, onClose, onSave }: EditSheetProps) {
  const [draft, setDraft] = useState(content);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(content);
      setPreview(false);
      setMessage(null);
    }
  }, [content, visible]);

  const save = () => {
    onSave(draft);
    setMessage('已保存到当前文档');
  };

  const saveAndShare = async () => {
    setBusy(true);
    setMessage(null);
    try {
      onSave(draft);
      const result = await writeMdFile(draft, title || '文档');
      if (!result.ok || !result.outputPath) {
        setMessage('导出失败：' + result.error);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.outputPath, {
          mimeType: 'text/markdown',
          dialogTitle: `${title || '文档'}.md`,
        });
        setMessage('已生成临时文件并打开分享面板');
      } else {
        setMessage('当前环境不支持系统分享');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.toolbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.toolBtn}>
            <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.heading }]} numberOfLines={1}>
            编辑：{title}
          </Text>
          <TouchableOpacity onPress={() => setPreview((v) => !v)} style={styles.toolBtn}>
            <Text style={{ color: theme.link, fontSize: 14 }}>{preview ? '源码' : '预览'}</Text>
          </TouchableOpacity>
        </View>

        {preview ? (
          <Reader content={draft} title="预览" immersive={false} onToggleChrome={() => {}} />
        ) : (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.editor,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          />
        )}

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.link }]} onPress={save} disabled={busy}>
            <Text style={styles.primaryText}>保存</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={saveAndShare} disabled={busy}>
            {busy ? <ActivityIndicator /> : <Text style={{ color: theme.text }}>保存并分享</Text>}
          </TouchableOpacity>
          {message ? <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 10,
  },
  toolBtn: {
    minWidth: 54,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  editor: {
    flex: 1,
    margin: 14,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    lineHeight: 25,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 12,
    textAlign: 'center',
  },
});
