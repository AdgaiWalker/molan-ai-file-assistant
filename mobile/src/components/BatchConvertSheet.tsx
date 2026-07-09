// 批量转换中心 —— 多文件 → 选格式 → 逐项转换 → 成功/失败列表 → 重试 / 批量分享。
// 复用 platform/filePicker（多选）、converter/fileConvert（单项转换）、platform/share（下载）。
// 状态机见 storage/batchJobs.ts。
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import { X, Plus, RefreshCw, Share2, CheckCircle2, XCircle, Clock, FileText, FileEdit, Sparkles } from 'lucide-react-native';
import { pickFile } from '../platform/filePicker';
import { shareFile } from '../platform/share';
import {
  buildJobs,
  mergeJobs,
  setJobStatus,
  resetFailed,
  summarize,
  isBatchDone,
  inferKind,
  type BatchJob,
  type BatchOutputFormat,
} from '../storage/batchJobs';

interface BatchConvertSheetProps {
  visible: boolean;
  onClose: () => void;
  theme: Theme;
}

const FORMAT_OPTIONS: { value: BatchOutputFormat; label: string; icon: 'sparkles' | 'text' | 'edit' }[] = [
  { value: 'md', label: 'Markdown', icon: 'sparkles' },
  { value: 'pdf', label: 'PDF', icon: 'text' },
  { value: 'docx', label: 'Word', icon: 'edit' },
];

export function BatchConvertSheet({ visible, onClose, theme }: BatchConvertSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [format, setFormat] = useState<BatchOutputFormat>('md');
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const stats = summarize(jobs);

  const addFiles = useCallback(async () => {
    setMsg(null);
    // web 与原生 pickFile 都是单选；循环让用户连续加。这里一次调用加一个，
    // 多次点"添加文件"累积。去重由 mergeJobs 保证。
    try {
      const picked = await pickFile(['text/markdown', 'text/plain', 'application/json', 'application/octet-stream']);
      if (!picked) return;
      const kind = inferKind(picked.name);
      setJobs((prev) => mergeJobs(prev, [{ name: picked.name, content: picked.text, kind }]));
    } catch (e) {
      setMsg('添加失败：' + (e as Error).message);
    }
  }, []);

  const removeJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const convertOne = useCallback(async (job: BatchJob): Promise<BatchJob> => {
    const { writeMdFile, writeJsonFile, convertMdToDocxFile, exportPdfFile, jsonToMarkdown } =
      await import('../converter/fileConvert');
    const baseName = job.name.replace(/\.[^.]+$/, '') || '文档';
    const contentAsMd = job.kind === 'json' ? jsonToMarkdown(job.content, baseName) : job.content;
    try {
      let r;
      if (format === 'md') r = await writeMdFile(contentAsMd, baseName);
      else if (format === 'docx') r = await convertMdToDocxFile(contentAsMd, baseName);
      else r = await exportPdfFile(contentAsMd, baseName, 'day');
      if (r.ok && r.outputPath) {
        return { ...job, status: 'success', outputPath: r.outputPath, error: undefined };
      }
      return { ...job, status: 'failed', error: r.error || '未知错误' };
    } catch (e) {
      return { ...job, status: 'failed', error: (e as Error).message };
    }
  }, [format]);

  const runBatch = useCallback(async () => {
    const pending = jobs.filter((j) => j.status === 'pending');
    if (pending.length === 0) return;
    setRunning(true);
    setMsg(null);
    // 标记 pending → running，逐项跑
    let cursor = jobs;
    setJobs(cursor.map((j) => (j.status === 'pending' ? { ...j, status: 'running' } : j)));
    for (const job of pending) {
      const done = await convertOne({ ...job, status: 'running' });
      cursor = setJobStatus(
        cursor.map((j) => (j.id === job.id ? { ...j, status: 'running' } : j)),
        job.id,
        done.status,
        done.status === 'success' ? { outputPath: done.outputPath } : { error: done.error },
      );
      setJobs(cursor);
    }
    setRunning(false);
    const s = summarize(cursor);
    setMsg(`完成：成功 ${s.success} / 失败 ${s.failed} / 共 ${s.total}`);
  }, [jobs, convertOne]);

  const retryFailed = useCallback(() => {
    setJobs((prev) => resetFailed(prev));
    setMsg(null);
  }, []);

  const shareAll = useCallback(async () => {
    const ok = jobs.filter((j) => j.status === 'success' && j.outputPath);
    if (ok.length === 0) return;
    setMsg(`正在依次分享 ${ok.length} 个文件…`);
    // 系统分享一次只能发一个文件；逐个触发下载/分享。
    const ext = format === 'md' ? 'md' : format === 'docx' ? 'docx' : 'pdf';
    const mime = format === 'md' ? 'text/markdown' : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
    for (const job of ok) {
      const baseName = job.name.replace(/\.[^.]+$/, '') || '文档';
      await shareFile(job.outputPath!, { filename: `${baseName}.${ext}`, mimeType: mime, dialogTitle: `${baseName}.${ext}` });
    }
    setMsg('已依次触发分享');
  }, [jobs, format]);

  const FormatIcon = ({ which, size, color }: { which: string; size: number; color: string }) => {
    if (which === 'sparkles') return <Sparkles size={size} color={color} />;
    if (which === 'edit') return <FileEdit size={size} color={color} />;
    return <FileText size={size} color={color} />;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              maxHeight: Math.min(height * 0.88, 680),
              paddingBottom: Math.max(24, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>批量转换</Text>
              <Text style={[styles.subhead, { color: theme.textSecondary }]} numberOfLines={2}>
                添加多个 Markdown / JSON，统一转一种格式后分享。
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 格式选择 */}
          <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>输出格式</Text>
          <View style={styles.formatRow}>
            {FORMAT_OPTIONS.map((opt) => {
              const active = format === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.formatChip,
                    {
                      backgroundColor: active ? theme.link : theme.surface,
                      borderColor: active ? theme.link : theme.border,
                    },
                  ]}
                  onPress={() => setFormat(opt.value)}
                >
                  <FormatIcon which={opt.icon} size={16} color={active ? '#FFFFFF' : theme.textSecondary} />
                  <Text style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 13, fontWeight: '700' }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 操作栏 */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={addFiles}
              disabled={running}
            >
              <Plus size={16} color={theme.link} />
              <Text style={[styles.btnText, { color: theme.link }]}>添加文件</Text>
            </TouchableOpacity>
            {stats.failed > 0 && !running ? (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={retryFailed}
              >
                <RefreshCw size={16} color={theme.link} />
                <Text style={[styles.btnText, { color: theme.link }]}>重试失败</Text>
              </TouchableOpacity>
            ) : null}
            {isBatchDone(jobs) && stats.success > 0 ? (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.link, borderColor: theme.link }]}
                onPress={shareAll}
              >
                <Share2 size={16} color="#FFFFFF" />
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>分享全部</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 任务列表 */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {jobs.length === 0 ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                还没有文件。点"添加文件"把多个 .md / .json 加入队列。
              </Text>
            ) : (
              jobs.map((job) => (
                <View key={job.id} style={[styles.jobRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.jobName, { color: theme.text }]} numberOfLines={1}>{job.name}</Text>
                    {job.status === 'failed' && job.error ? (
                      <Text style={[styles.jobMeta, { color: theme.error }]} numberOfLines={2}>失败：{job.error}</Text>
                    ) : (
                      <Text style={[styles.jobMeta, { color: theme.textSecondary }]}>
                        {job.kind} · {job.content.length} 字
                      </Text>
                    )}
                  </View>
                  {job.status === 'pending' ? <Clock size={16} color={theme.textSecondary} /> : null}
                  {job.status === 'running' ? <ActivityIndicator size="small" color={theme.link} /> : null}
                  {job.status === 'success' ? <CheckCircle2 size={18} color={theme.link} /> : null}
                  {job.status === 'failed' ? <XCircle size={18} color={theme.error} /> : null}
                  {!running ? (
                    <TouchableOpacity onPress={() => removeJob(job.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <X size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {/* 底部：统计 + 开始转换 */}
          {jobs.length > 0 ? (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={[styles.statText, { color: theme.textSecondary }]}>
                共 {stats.total} · 成功 {stats.success} · 失败 {stats.failed}
              </Text>
              <TouchableOpacity
                style={[
                  styles.runBtn,
                  {
                    backgroundColor: stats.pending > 0 && !running ? theme.link : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={runBatch}
                disabled={stats.pending === 0 || running}
              >
                {running ? <ActivityIndicator size="small" color={theme.link} /> : null}
                <Text style={[styles.runBtnText, { color: stats.pending > 0 && !running ? '#FFFFFF' : theme.textSecondary }]}>
                  {running ? '转换中…' : `开始转换（${stats.pending}）`}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {msg ? <Text style={[styles.msg, { color: theme.textSecondary }]}>{msg}</Text> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  header: {
    fontSize: 18,
    fontWeight: '800',
  },
  subhead: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  formatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    paddingVertical: 6,
    gap: 8,
  },
  empty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 30,
    lineHeight: 20,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  jobName: {
    fontSize: 14,
    fontWeight: '600',
  },
  jobMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  statText: {
    fontSize: 12,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  runBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  msg: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
});
