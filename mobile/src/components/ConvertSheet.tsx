import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {
  convertMdToDocxFile,
  convertDocxFileToMd,
  writeMdFile,
  exportPdfFile,
} from '../converter/fileConvert';
import { themes } from '../theme';

interface ConvertSheetProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  title: string;
  onLoadMd: (md: string, name: string) => void;
  themeMode?: 'day' | 'night';
}

export function ConvertSheet({
  visible,
  onClose,
  content,
  title,
  onLoadMd,
  themeMode = 'day',
}: ConvertSheetProps) {
  const theme = themes[themeMode];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const baseName = (title || '文档').replace(/[\\/:*?"<>|]/g, '_');

  // 当前 md -> docx，分享
  const toWord = async () => {
    setBusy(true);
    setMsg(null);
    const r = await convertMdToDocxFile(content, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 Word 文件');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: `${baseName}.docx`,
        });
      }
    } else {
      setMsg('转换失败：' + r.error);
    }
    setBusy(false);
  };

  // 选择 docx -> md，载入阅读器
  const pickWordToMd = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream',
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setBusy(false);
        return;
      }
      const file = result.assets[0];
      const r = await convertDocxFileToMd(file.uri);
      if (r.ok && r.md) {
        const name = file.name.replace(/\.docx$/i, '');
        onLoadMd(r.md, name);
        setMsg('转换成功，已载入');
        onClose();
      } else {
        setMsg('转换失败：' + r.error);
      }
    } catch (e) {
      setMsg('出错：' + (e as Error).message);
    }
    setBusy(false);
  };

  // 导出当前内容为 .md 文件并分享
  const exportMd = async () => {
    setBusy(true);
    setMsg(null);
    const r = await writeMdFile(content, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 .md 文件');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'text/markdown',
          dialogTitle: `${baseName}.md`,
        });
      }
    } else {
      setMsg('导出失败：' + r.error);
    }
    setBusy(false);
  };

  // 导出当前内容为 PDF（按当前主题渲染）并分享
  const exportPdf = async () => {
    setBusy(true);
    setMsg(null);
    const r = await exportPdfFile(content, baseName, themeMode);
    if (r.ok && r.outputPath) {
      setMsg('已生成 PDF');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'application/pdf',
          dialogTitle: `${baseName}.pdf`,
        });
      }
    } else {
      setMsg('导出失败：' + r.error);
    }
    setBusy(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[styles.header, { color: theme.heading }]}>转换</Text>

          <TouchableOpacity
            style={[styles.action, { borderColor: theme.border }]}
            onPress={toWord}
            disabled={busy}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>当前文档 → Word</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, { borderColor: theme.border }]}
            onPress={pickWordToMd}
            disabled={busy}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>选择 Word → Markdown</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, { borderColor: theme.border }]}
            onPress={exportMd}
            disabled={busy}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>导出为 .md 文件</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, { borderColor: theme.border }]}
            onPress={exportPdf}
            disabled={busy}
          >
            <Text style={[styles.actionText, { color: theme.text }]}>导出为 PDF</Text>
          </TouchableOpacity>

          {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
          {msg ? (
            <Text style={[styles.msg, { color: theme.textSecondary }]}>{msg}</Text>
          ) : null}
        </View>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  action: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 6,
  },
  actionText: {
    fontSize: 16,
  },
  msg: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});
