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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes } from '../theme';
import { X, ChevronRight, Sparkles, FileText, FileEdit } from 'lucide-react-native';
import { pickBinaryFile } from '../platform/filePicker';
import { shareFile, shareText } from '../platform/share';
import { getShareUsage, setShareUsage, type ShareUsage } from '../storage/shareHistory';

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
  const [lastUsage, setLastUsage] = useState<ShareUsage | null>(null);

  const baseName = (title || '文档').replace(/[\\/:*?"<>|]/g, '_');
  const loadConverter = () => import('../converter/fileConvert');

  // 打开时读最近分享方式；分享成功后记录并刷新
  React.useEffect(() => {
    if (visible) getShareUsage().then(setLastUsage);
  }, [visible]);
  const rememberShare = (format: ShareUsage['format'], label: string) => {
    const usage: ShareUsage = { format, label, at: Date.now() };
    setShareUsage(usage);
    setLastUsage(usage);
  };

  // 当前文档 -> docx，分享；JSON 会先规则化为 Markdown。
  const toWord = async () => {
    setBusy(true);
    setMsg(null);
    const { convertMdToDocxFile, jsonToMarkdown } = await loadConverter();
    const contentAsMarkdown = kind === 'json' ? jsonToMarkdown(content, title || 'JSON 文档') : content;
    const r = await convertMdToDocxFile(contentAsMarkdown, baseName);
    if (r.ok && r.outputPath) {
      setMsg('已生成 Word 文件');
      const { shared } = await shareFile(r.outputPath, {
        filename: `${baseName}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: `${baseName}.docx`,
      });
      await onConverted?.(shared);
      if (shared) rememberShare('docx', '当前文档 → Word');
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
      const picked = await pickBinaryFile([
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
      ]);
      if (!picked) {
        setBusy(false);
        return;
      }
      const { convertDocxBytesToMd } = await loadConverter();
      const bytes = await picked.arrayBuffer();
      const r = await convertDocxBytesToMd(bytes);
      if (r.ok && r.md) {
        const name = picked.name.replace(/\.docx$/i, '');
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
      const { shared } = await shareFile(r.outputPath, {
        filename: `${baseName}.md`,
        mimeType: 'text/markdown',
        dialogTitle: `${baseName}.md`,
      });
      await onConverted?.(shared);
      if (shared) rememberShare('md', kind === 'json' ? 'JSON → Markdown' : '导出为 .md 文件');
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
      const { shared } = await shareFile(r.outputPath, {
        filename: `${baseName}.json`,
        mimeType: 'application/json',
        dialogTitle: `${baseName}.json`,
      });
      await onConverted?.(shared);
      if (shared) rememberShare('original', '导出原 .json 文件');
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
      // web：复制到剪贴板；原生：platform/share 不处理纯文本，回落到 RN Share
      const { shared } = await shareText(content, baseName);
      if (!shared) {
        await Share.share({ title: baseName, message: content });
      }
      await onShared?.();
      rememberShare('text', '分享纯文本');
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
      const { shared } = await shareFile(r.outputPath, {
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        dialogTitle: `${baseName}.pdf`,
      });
      await onConverted?.(shared);
      if (shared) rememberShare('pdf', kind === 'json' ? 'JSON → PDF' : '导出为 PDF');
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
    recent,
  }: {
    title: string;
    desc: string;
    onPress: () => void;
    disabled?: boolean;
    recent?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.action, { borderColor: recent ? theme.link : theme.border, backgroundColor: theme.background }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.actionText, { color: theme.text }]}>{actionTitle}</Text>
          {recent ? (
            <View style={[styles.recentBadge, { backgroundColor: `${theme.link}1A` }]}>
              <Text style={[styles.recentBadgeText, { color: theme.link }]}>上次</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.actionDesc, { color: theme.textSecondary }]}>{desc}</Text>
      </View>
      <ChevronRight size={22} color={theme.textSecondary} />
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
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.purposeRow}>
            <View style={[styles.purposeChip, { backgroundColor: theme.link }]}>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.purposeChipText}>给 AI 读</Text>
              <Text style={styles.purposeChipMeta}>Markdown</Text>
            </View>
            <View style={[styles.purposeChip, { backgroundColor: theme.link + '22', borderColor: theme.link }]}>
              <FileText size={18} color={theme.link} />
              <Text style={[styles.purposeChipText, { color: theme.link }]}>给别人看</Text>
              <Text style={[styles.purposeChipMeta, { color: theme.link }]}>PDF</Text>
            </View>
            <View style={[styles.purposeChip, { backgroundColor: theme.link + '22', borderColor: theme.link }]}>
              <FileEdit size={18} color={theme.link} />
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
              recent={lastUsage?.format === 'md'}
            />
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>给别人看</Text>
            <ActionRow
              title={kind === 'json' ? 'JSON → PDF' : '导出为 PDF'}
              desc="适合办公查看和微信/QQ 转发"
              onPress={exportPdf}
              disabled={busy}
              recent={lastUsage?.format === 'pdf'}
            />
            <ActionRow
              title="分享纯文本"
              desc="直接把当前内容交给系统分享面板，不生成文件"
              onPress={sharePlainText}
              disabled={busy}
              recent={lastUsage?.format === 'text'}
            />
            <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>给别人改</Text>
            <ActionRow
              title={kind === 'json' ? 'JSON → Word' : '当前文档 → Word'}
              desc="适合发给别人继续编辑"
              onPress={toWord}
              disabled={busy}
              recent={lastUsage?.format === 'docx'}
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
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  purposeChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  purposeChipMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
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
  recentBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  recentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
