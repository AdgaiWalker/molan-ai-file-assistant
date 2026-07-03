import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';

type DocKind = 'markdown' | 'json';

interface AiInsightSheetProps {
  visible: boolean;
  title: string;
  content: string;
  kind: DocKind;
  theme: Theme;
  onClose: () => void;
}

interface Insight {
  fileType: string;
  summary: string[];
  promptCandidates: string[];
  todoCandidates: string[];
  saveAdvice: string;
  sensitiveHints: string[];
}

const promptKeys = /(prompt|system|instruction|instructions|rules|role|content|message|messages|template)/i;
const secretKeys = /(token|secret|apikey|api_key|authorization|password|passwd|accessKey|privateKey)/i;
const todoPattern = /(^|\s)(todo|待办|任务|下一步|action|fix|review|完成|实现|优化)[:：\s]/i;

function compactLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstSentences(text: string, max = 3): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return ['暂无可分析内容。'];
  const parts = normalized
    .split(/[。！？.!?]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (parts.length ? parts : [normalized]).slice(0, max).map((item) => item.slice(0, 120));
}

function collectJsonHints(raw: string): Pick<Insight, 'promptCandidates' | 'sensitiveHints' | 'todoCandidates'> {
  const promptCandidates: string[] = [];
  const sensitiveHints: string[] = [];
  const todoCandidates: string[] = [];

  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.slice(0, 20).forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        const nextPath = path ? `${path}.${key}` : key;
        if (secretKeys.test(key)) sensitiveHints.push(nextPath);
        if (promptKeys.test(key) && typeof child === 'string' && child.trim()) {
          promptCandidates.push(`${nextPath}: ${child.trim().slice(0, 180)}`);
        }
        if (todoPattern.test(key) || (typeof child === 'string' && todoPattern.test(child))) {
          todoCandidates.push(`${nextPath}: ${String(child).slice(0, 140)}`);
        }
        walk(child, nextPath);
      });
    }
  };

  try {
    walk(JSON.parse(raw), '');
  } catch {
    // Invalid JSON is handled by the summary text.
  }

  return {
    promptCandidates: Array.from(new Set(promptCandidates)).slice(0, 5),
    sensitiveHints: Array.from(new Set(sensitiveHints)).slice(0, 5),
    todoCandidates: Array.from(new Set(todoCandidates)).slice(0, 5),
  };
}

function buildInsight(title: string, content: string, kind: DocKind): Insight {
  const lines = compactLines(content);
  const promptCandidates = lines
    .filter((line) => promptKeys.test(line) || /^\/[a-z]/i.test(line))
    .slice(0, 5)
    .map((line) => line.slice(0, 180));
  const todoCandidates = lines
    .filter((line) => todoPattern.test(line) || /^[-*]\s+\[[ x]\]/i.test(line))
    .slice(0, 5)
    .map((line) => line.slice(0, 160));

  if (kind === 'json') {
    const jsonHints = collectJsonHints(content);
    const parsedSummary = (() => {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return [`这是一个数组型 JSON，共 ${parsed.length} 项。`];
        if (parsed && typeof parsed === 'object') {
          const keys = Object.keys(parsed as Record<string, unknown>);
          return [`这是一个对象型 JSON，顶层包含 ${keys.length} 个字段。`, `主要字段：${keys.slice(0, 8).join(' / ') || '暂无字段'}`];
        }
        return ['这是一个基础值 JSON。'];
      } catch {
        return ['JSON 当前无法解析，建议先进入编辑页格式化或修正。'];
      }
    })();

    return {
      fileType: 'JSON / 结构化 AI 产物',
      summary: parsedSummary,
      promptCandidates: [...jsonHints.promptCandidates, ...promptCandidates].slice(0, 5),
      todoCandidates: [...jsonHints.todoCandidates, ...todoCandidates].slice(0, 5),
      sensitiveHints: jsonHints.sensitiveHints,
      saveAdvice: jsonHints.promptCandidates.length > 0 || jsonHints.sensitiveHints.length > 0
        ? '建议保留：它包含 prompt/config/API 等结构化字段。'
        : '可临时查看：如果只是一次性响应，可读完后不必归档。',
    };
  }

  const headingCount = lines.filter((line) => /^#{1,6}\s+/.test(line)).length;
  const codeBlockCount = (content.match(/```/g) ?? []).length / 2;
  const summary = [
    ...firstSentences(content),
    headingCount > 0 ? `检测到 ${headingCount} 个标题，适合作为文档阅读。` : '',
    codeBlockCount > 0 ? `检测到约 ${Math.floor(codeBlockCount)} 个代码块，建议保留格式。` : '',
  ].filter(Boolean);

  return {
    fileType: 'Markdown / 文档与提示词材料',
    summary,
    promptCandidates,
    todoCandidates,
    sensitiveHints: lines.filter((line) => secretKeys.test(line)).slice(0, 5),
    saveAdvice: promptCandidates.length > 0 || headingCount > 0
      ? `建议保留：${title || '当前文档'}包含可复用结构或提示词线索。`
      : '可临时查看：当前内容结构较弱，阅读后按需保留。',
  };
}

export function AiInsightSheet({ visible, title, content, kind, theme, onClose }: AiInsightSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [copied, setCopied] = useState<string | null>(null);
  const insight = useMemo(() => buildInsight(title, content, kind), [title, content, kind]);

  const copyText = async (label: string, text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(label);
    setTimeout(() => setCopied((cur) => (cur === label ? null : cur)), 1200);
  };

  const Section = ({ label, items, empty }: { label: string; items: string[]; empty: string }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.heading }]}>{label}</Text>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>{empty}</Text>
      ) : (
        items.map((item, index) => (
          <TouchableOpacity
            key={`${label}-${index}`}
            style={[styles.item, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => copyText(label, item)}
          >
            <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
            <Text style={[styles.itemAction, { color: theme.link }]}>{copied === label ? '已复制' : '复制'}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: Math.min(height * 0.84, 650),
              paddingBottom: Math.max(20, insets.bottom + 16),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>AI 阅读卡片</Text>
              <Text style={[styles.subhead, { color: theme.textSecondary }]}>本地识别预览，后续可接入真实 AI。</Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.link, fontSize: 14 }}>关闭</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.fileCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.fileType, { color: theme.link }]}>{insight.fileType}</Text>
              <Text style={[styles.fileTitle, { color: theme.heading }]} numberOfLines={2}>{title || '当前文件'}</Text>
              <Text style={[styles.advice, { color: theme.textSecondary }]}>{insight.saveAdvice}</Text>
            </View>

            <Section label="内容摘要" items={insight.summary} empty="暂无摘要。" />
            <Section label="提示词候选" items={insight.promptCandidates} empty="暂未识别到明显提示词。" />
            <Section label="待办候选" items={insight.todoCandidates} empty="暂未识别到待办。" />
            <Section label="敏感字段提醒" items={insight.sensitiveHints} empty="暂未发现明显 token / secret / key 字段。" />
          </ScrollView>
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
  },
  subhead: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  closeBtn: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  fileCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  fileType: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  fileTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  advice: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  item: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 19,
  },
  itemAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    fontSize: 13,
    lineHeight: 19,
  },
});
