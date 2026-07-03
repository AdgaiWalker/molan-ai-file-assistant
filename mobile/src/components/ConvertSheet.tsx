import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Share,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes } from '../theme';

interface ConvertSheetProps {
  visible: boolean;
  onClose: () => void;
  content: string;
  title: string;
  kind?: 'markdown' | 'json';
  onLoadMd: (md: string, name: string) => void;
  onConverted?: (shared?: boolean) => void | Promise<void>;
  onShared?: () => void | Promise<void>;
  themeMode?: 'day' | 'night';
}

export function ConvertSheet({
  visible,
  onClose,
  content,
  title,
  kind = 'markdown',
  onLoadMd,
  onConverted,
  onShared,
  themeMode = 'day',
}: ConvertSheetProps) {
  const theme = themes[themeMode];
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const baseName = (title || '文档').replace(/[\\/:*?"<>|]/g, '_');
  const loadConverter = () => import('../converter/fileConvert');

  // 当前文档 -> docx，分享；JSON 会先规则化为 Markdown。
  const toWord = async () => {
    setBusy(true);
    setMsg(null);
    const { convertMdToDocxFile, jsonToMarkdown } = await loadConverter();
    const contentAsMarkdown = kind === 'json' ? jsonToMarkdown(content, title || 'JSON 文档') : content;
    const r = await convertMdToDocxFile(contentAsMarkdown, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 Word 文件');
      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: `${baseName}.docx`,
        });
        shared = true;
      }
      await onConverted?.(shared);
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
      const { convertDocxFileToMd } = await loadConverter();
      const r = await convertDocxFileToMd(file.uri);
      if (r.ok && r.md) {
        const name = file.name.replace(/\.docx$/i, '');
        onLoadMd(r.md, name);
        await onConverted?.(false);
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

  // 导出当前内容为 .md 文件并分享；JSON 会先规则化为 Markdown。
  const exportMd = async () => {
    setBusy(true);
    setMsg(null);
    const { writeMdFile, jsonToMarkdown } = await loadConverter();
    const contentAsMarkdown = kind === 'json' ? jsonToMarkdown(content, title || 'JSON 文档') : content;
    const r = await writeMdFile(contentAsMarkdown, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 .md 文件');
      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'text/markdown',
          dialogTitle: `${baseName}.md`,
        });
        shared = true;
      }
      await onConverted?.(shared);
    } else {
      setMsg('导出失败：' + r.error);
    }
    setBusy(false);
  };

  const exportOriginalJson = async () => {
    if (kind !== 'json') return;
    setBusy(true);
    setMsg(null);
    const { writeJsonFile } = await loadConverter();
    const r = await writeJsonFile(content, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 .json 文件');
      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'application/json',
          dialogTitle: `${baseName}.json`,
        });
        shared = true;
      }
      await onConverted?.(shared);
    } else {
      setMsg('导出失败：' + r.error);
    }
    setBusy(false);
  };

  const loadJsonAsMd = () => {
    if (kind !== 'json') return;
    setBusy(true);
    setMsg(null);
    loadConverter()
      .then(({ jsonToMarkdown }) => {
        onLoadMd(jsonToMarkdown(content, title || 'JSON 文档'), `${baseName}-json`);
        onConverted?.(false);
        setMsg('已转为 Markdown 并载入');
        onClose();
      })
      .catch((e) => setMsg('转换失败：' + (e as Error).message))
      .finally(() => setBusy(false));
  };

  const sharePlainText = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await Share.share({ title: baseName, message: content });
      await onShared?.();
      setMsg('已调起纯文本分享');
    } catch (e) {
      setMsg('分享失败：' + (e as Error).message);
    }
    setBusy(false);
  };

  // 导出当前内容为 PDF（按当前主题渲染）并分享；JSON 会先规则化为 Markdown。
  const exportPdf = async () => {
    setBusy(true);
    setMsg(null);
    const { exportPdfFile, jsonToMarkdown } = await loadConverter();
    const contentAsMarkdown = kind === 'json' ? jsonToMarkdown(content, title || 'JSON 文档') : content;
    const r = await exportPdfFile(contentAsMarkdown, baseName, themeMode);
    if (r.ok && r.outputPath) {
      setMsg('已生成 PDF');
      let shared = false;
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(r.outputPath, {
          mimeType: 'application/pdf',
          dialogTitle: `${baseName}.pdf`,
        });
        shared = true;
      }
      await onConverted?.(shared);
    } else {
      setMsg('导出失败：' + r.error);
    }
    setBusy(false);
  };

  const ActionRow = ({
    title: actionTitle,
    desc,
    onPress,
    disabled,
  }: {
    title: string;
    desc: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.action, { borderColor: theme.border, backgroundColor: theme.background }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.actionText, { color: theme.text }]}>{actionTitle}</Text>
        <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>{desc}</Text>
      </View>
      <Text style={[styles.actionArrow, { color: theme.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: Math.min(height * 0.84, 620),
              paddingBottom: Math.max(24, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>转换中心</Text>
              <Text style={[styles.subhead, { color: theme.textSecondary }]} numberOfLines={2}>
                按用途选择输出格式，生成后直接分享。
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.text, fontSize: 13 }}>关闭</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.purposeRow}>
            <View style={[styles.purposeChip, { backgroundColor: theme.link }]}>
              <Text style={styles.purposeChipText}>给 AI 读</Text>
              <Text style={styles.purposeChipMeta}>Markdown</Text>
            </View>
            <View style={[styles.purposeChip, { backgroundColor: theme.link + '22', borderColor: theme.link }]}>
              <Text style={[styles.purposeChipText, { color: theme.link }]}>给别人看</Text>
              <Text style={[styles.purposeChipMeta, { color: theme.link }]}>PDF</Text>
            </View>
            <View style={[styles.purposeChip, { backgroundColor: theme.link + '22', borderColor: theme.link }]}>
              <Text style={[styles.purposeChipText, { color: theme.link }]}>给别人改</Text>
              <Text style={[styles.purposeChipMeta, { color: theme.link }]}>Word</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.actionList}>
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>给 AI 读</Text>
            <ActionRow
              title={kind === 'json' ? 'JSON → Markdown 并分享' : '导出为 .md 文件'}
              desc="适合给 AI 或懂 Markdown 的人继续处理"
              onPress={exportMd}
              disabled={busy}
            />
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>给别人看</Text>
            <ActionRow
              title={kind === 'json' ? 'JSON → PDF' : '导出为 PDF'}
              desc="适合办公查看和微信/QQ 转发"
              onPress={exportPdf}
              disabled={busy}
            />
            <ActionRow
              title="分享纯文本"
              desc="直接把当前内容交给系统分享面板，不生成文件"
              onPress={sharePlainText}
              disabled={busy}
            />
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>给别人改</Text>
            <ActionRow
              title={kind === 'json' ? 'JSON → Word' : '当前文档 → Word'}
              desc="适合发给别人继续编辑"
              onPress={toWord}
              disabled={busy}
            />
            {kind === 'json' ? (
              <>
                <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>原文件</Text>
                <ActionRow
                  title="分享原 .json 文件"
                  desc="保留结构化数据，不做格式转换"
                  onPress={exportOriginalJson}
                  disabled={busy}
                />
                <ActionRow
                  title="JSON → Markdown 并阅读"
                  desc="转为文档视图，方便继续阅读和复制"
                  onPress={loadJsonAsMd}
                  disabled={busy}
                />
              </>
            ) : null}
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>导入</Text>
            <ActionRow
              title="选择 Word → Markdown"
              desc="手机端轻转换，适合临时把 Word 放进阅读器"
              onPress={pickWordToMd}
              disabled={busy}
            />
          </ScrollView>

          {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
          {msg ? (
            <Text style={[styles.msg, { color: theme.textSecondary }]}>{msg}</Text>
          ) : null}
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
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  subhead: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  closeBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionList: {
    gap: 6,
  },
  purposeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  purposeChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  purposeChipMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  action: {
    minHeight: 68,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  actionArrow: {
    fontSize: 26,
    lineHeight: 28,
  },
  disabled: {
    opacity: 0.55,
  },
  msg: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});
