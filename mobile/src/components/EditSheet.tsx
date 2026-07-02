import React, { useEffect, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { writeMdFile } from '../converter/fileConvert';
import { Theme } from '../theme';
import { Reader } from './Reader';

interface EditSheetProps {
  visible: boolean;
  title: string;
  content: string;
  isJson?: boolean;
  theme: Theme;
  onClose: () => void;
  onSave: (content: string) => void;
}

const DRAFT_KEY = 'molan.edit.draft';

export function EditSheet({ visible, title, content, isJson, theme, onClose, onSave }: EditSheetProps) {
  const [draft, setDraft] = useState(content);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setDraft(content);
      setPreview(false);
      setMessage(null);
      setJsonError(null);
      savedRef.current = false;
    }
  }, [content, visible]);

  // 自动保存草稿
  useEffect(() => {
    if (!visible || draft === content || savedRef.current) return;
    const timer = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content: draft, isJson })).catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft, content, title, isJson, visible]);

  // 关闭时恢复草稿
  useEffect(() => {
    if (!visible) return;
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.title === title && saved.content !== content) {
          setDraft(saved.content);
          setMessage('已恢复未保存的编辑');
        }
      } catch {
        /* 忽略 */
      }
    };
    restore();
  }, [visible, title, content]);

  // JSON 实时校验
  useEffect(() => {
    if (!isJson) { setJsonError(null); return; }
    try {
      JSON.parse(draft);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }, [draft, isJson]);

  const hasChanges = draft !== content;

  const save = () => {
    if (isJson && jsonError) {
      setMessage('JSON 格式有误，请先修复');
      return;
    }
    savedRef.current = true;
    onSave(draft);
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    setMessage('已保存到当前文档');
  };

  const saveAndShare = async () => {
    if (isJson && jsonError) {
      setMessage('JSON 格式有误，请先修复');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      savedRef.current = true;
      onSave(draft);
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      const result = await writeMdFile(draft, title || '文档');
      if (!result.ok || !result.outputPath) {
        setMessage('导出失败：' + result.error);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.outputPath, {
          mimeType: isJson ? 'application/json' : 'text/markdown',
          dialogTitle: `${title || '文档'}.${isJson ? 'json' : 'md'}`,
        });
        setMessage('已生成临时文件并打开分享面板');
      } else {
        setMessage('当前环境不支持系统分享');
      }
    } finally {
      setBusy(false);
    }
  };

  const saveAsCopy = () => {
    if (isJson && jsonError) {
      setMessage('JSON 格式有误，请先修复');
      return;
    }
    savedRef.current = true;
    // 不调用 onSave (不覆盖原文件)，但保留草稿
    const copyName = title ? `${title}（副本）` : '文档副本';
    onSave(draft);
    setMessage('已保存为副本');
    AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(draft);
      setDraft(JSON.stringify(parsed, null, 2));
      setJsonError(null);
      setMessage('已格式化');
    } catch (e) {
      setMessage('格式化失败：' + (e as Error).message);
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
          <View style={{ flexDirection: 'row' }}>
            {isJson ? (
              <TouchableOpacity onPress={formatJson} style={styles.toolBtn}>
                <Text style={{ color: theme.link, fontSize: 14 }}>格式化</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setPreview((v) => !v)} style={styles.toolBtn}>
              <Text style={{ color: theme.link, fontSize: 14 }}>{preview ? '源码' : '预览'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* JSON 错误提示 */}
        {isJson && jsonError ? (
          <View style={[styles.errorBar, { backgroundColor: '#fce8e6' }]}>
            <Text style={{ color: '#d93025', fontSize: 12 }}>JSON 错误：{jsonError}</Text>
          </View>
        ) : null}

        {preview && !isJson ? (
          <Reader content={draft} title="预览" immersive={false} onToggleChrome={() => {}} />
        ) : preview && isJson ? (
          <View style={{ flex: 1, padding: 14 }}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>JSON 预览（只读，返回源码编辑）</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'monospace', lineHeight: 22 }}>
              {draft}
            </Text>
          </View>
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
                borderColor: jsonError ? '#d93025' : theme.border,
              },
            ]}
          />
        )}

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.link }]}
            onPress={save}
            disabled={busy || (isJson && !!jsonError)}
          >
            <Text style={styles.primaryText}>{hasChanges ? '保存更改' : '保存'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={saveAsCopy}
            disabled={busy || (isJson && !!jsonError)}
          >
            <Text style={{ color: theme.text }}>保存为副本</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={saveAndShare}
            disabled={busy || (isJson && !!jsonError)}
          >
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
  errorBar: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
});
