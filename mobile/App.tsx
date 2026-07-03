import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  BackHandler,
  Linking,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Reader } from './src/components/Reader';
import { JsonView } from './src/components/JsonView';
import { ConvertSheet } from './src/components/ConvertSheet';
import { EditSheet } from './src/components/EditSheet';
import { RecentSheet } from './src/components/RecentSheet';
import { PromptSheet } from './src/components/PromptSheet';
import { AiInsightSheet } from './src/components/AiInsightSheet';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Theme, themes, ThemeMode } from './src/theme';
import { loadRecentDocs, RecentDoc, saveRecentDoc, removeRecentDoc, DocSource, DocumentStatus, documentStatusText } from './src/storage/recentDocs';

type DocKind = 'markdown' | 'json';

interface LoadedDoc {
  title: string;
  kind: DocKind;
  text: string;
}

interface HomeScreenProps {
  theme: Theme;
  recentDocs: RecentDoc[];
  onOpenFile: () => void;
  onOpenRecentSheet: () => void;
  onOpenPrompts: () => void;
  onOpenDoc: (doc: RecentDoc) => void;
  onOpenGuide: () => void;
}

type HomeTab = 'today' | 'files' | 'prompts' | 'me';

function HomeTabBar({
  theme,
  active,
  onChange,
  onOpenFile,
}: {
  theme: Theme;
  active: HomeTab;
  onChange: (tab: HomeTab) => void;
  onOpenFile: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(8, insets.bottom),
        },
      ]}
    >
      <TouchableOpacity style={styles.tabItem} onPress={() => onChange('today')}>
        <Text style={[styles.tabIcon, active === 'today' && { color: theme.link }]}>◐</Text>
        <Text style={[styles.tabLabel, { color: active === 'today' ? theme.link : theme.textSecondary }]}>今天</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => onChange('files')}>
        <Text style={[styles.tabIcon, active === 'files' && { color: theme.link }]}>☰</Text>
        <Text style={[styles.tabLabel, { color: active === 'files' ? theme.link : theme.textSecondary }]}>文件</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabCenter} onPress={onOpenFile}>
        <View style={[styles.tabCenterCircle, { backgroundColor: theme.link }]}>
          <Text style={styles.tabCenterIcon}>＋</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => onChange('prompts')}>
        <Text style={[styles.tabIcon, active === 'prompts' && { color: theme.link }]}>❐</Text>
        <Text style={[styles.tabLabel, { color: active === 'prompts' ? theme.link : theme.textSecondary }]}>提示词</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tabItem} onPress={() => onChange('me')}>
        <Text style={[styles.tabIcon, active === 'me' && { color: theme.link }]}>○</Text>
        <Text style={[styles.tabLabel, { color: active === 'me' ? theme.link : theme.textSecondary }]}>我的</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ theme, recentDocs, onOpenFile, onOpenRecentSheet, onOpenPrompts, onOpenDoc, onOpenGuide }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<HomeTab>('today');
  const maxWidth = Math.min(Math.max(width - 32, 260), 560);
  const latest = recentDocs.slice(0, 5);

  return (
    <SafeAreaView style={[styles.home, { backgroundColor: theme.background }]}>
      <View style={styles.homeHeader}>
        <View style={styles.homeTitleBlock}>
          <Text style={[styles.homeTitle, { color: theme.heading }]}>墨览</Text>
          <View style={styles.homeStatusRow}>
            <View style={[styles.homeStatusDot, { backgroundColor: '#34C759' }]} />
            <Text style={[styles.homeStatusText, { color: theme.textSecondary }]}>本地优先 · 可选云同步</Text>
          </View>
        </View>
        <View style={styles.homeHeaderActions}>
          <TouchableOpacity style={styles.homeHeaderBtn} onPress={onOpenGuide}>
            <Text style={[styles.homeHeaderBtnText, { color: theme.textSecondary }]}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeHeaderBtn} onPress={onOpenRecentSheet}>
            <Text style={[styles.homeHeaderBtnText, { color: theme.textSecondary }]}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.homeContent,
          {
            paddingBottom: Math.max(100, insets.bottom + 88),
            width: maxWidth,
          },
        ]}
      >
        {activeTab === 'today' ? (
          <>
            <TouchableOpacity style={[styles.homePrimary, { backgroundColor: theme.link }]} onPress={onOpenFile}>
              <Text style={styles.homePrimaryText}>打开文件</Text>
            </TouchableOpacity>

            <View style={styles.homeQuickRow}>
              <TouchableOpacity
                style={[styles.homeQuickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={onOpenPrompts}
              >
                <Text style={[styles.homeQuickIcon, { color: theme.link }]}>❐</Text>
                <Text style={[styles.homeQuickTitle, { color: theme.heading }]}>提示词快贴</Text>
                <Text style={[styles.homeQuickMeta, { color: theme.textSecondary }]}>快速复制并组合提示词与模板</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.homeQuickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={onOpenRecentSheet}
              >
                <Text style={[styles.homeQuickIcon, { color: theme.link }]}>☁</Text>
                <Text style={[styles.homeQuickTitle, { color: theme.heading }]}>云端收件箱</Text>
                <Text style={[styles.homeQuickMeta, { color: theme.textSecondary }]}>已同步到电脑，可供 AI 读取</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.homeQuickAction, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => onOpenDoc(recentDocs[0] || { id: 'placeholder', title: '占位', kind: 'markdown', content: '', updatedAt: Date.now() })}
              >
                <Text style={[styles.homeQuickIcon, { color: theme.link }]}>⇄</Text>
                <Text style={[styles.homeQuickTitle, { color: theme.heading }]}>转换中心</Text>
                <Text style={[styles.homeQuickMeta, { color: theme.textSecondary }]}>PDF / Word / Markdown 转换</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.homeSectionHeader}>
              <Text style={[styles.homeSectionTitle, { color: theme.heading }]}>最近文件</Text>
              {recentDocs.length > 5 ? (
                <TouchableOpacity onPress={onOpenRecentSheet}>
                  <Text style={[styles.homeSectionAction, { color: theme.link }]}>全部</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={[styles.homeList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {latest.length === 0 ? (
                <Text style={[styles.homeEmpty, { color: theme.textSecondary }]}>暂无最近文档</Text>
              ) : (
                latest.map((doc, index) => (
                  <TouchableOpacity
                    key={doc.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${doc.title}，${doc.kind === 'json' ? 'JSON' : 'Markdown'}，${new Date(doc.updatedAt).toLocaleDateString()}`}
                    style={[
                      styles.homeDocRow,
                      index < latest.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 },
                    ]}
                    onPress={() => onOpenDoc(doc)}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.homeDocTitle, { color: theme.text }]} numberOfLines={1}>
                        {doc.title}
                      </Text>
                      <Text style={[styles.homeDocMeta, { color: theme.textSecondary }]}>
                        {doc.kind === 'json' ? 'JSON' : 'Markdown'} · {new Date(doc.updatedAt).toLocaleDateString()}
                      </Text>
                      <Text style={[styles.homeDocStatus, { color: theme.link }]} numberOfLines={1}>
                        {documentStatusText(doc)}
                      </Text>
                    </View>
                    <Text
                      accessible={false}
                      importantForAccessibility="no"
                      style={[styles.homeDocArrow, { color: theme.textSecondary }]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.homePlaceholder}>
            <Text style={[styles.homePlaceholderText, { color: theme.textSecondary }]}>
              {activeTab === 'files' && '文件管理页面，后续接入云端收件箱与本地文件浏览'}
              {activeTab === 'prompts' && '提示词库页面，可点击底部“+”或首页“提示词快贴”进入'}
              {activeTab === 'me' && '我的页面，后续接入设置、云同步与隐私说明'}
            </Text>
            {activeTab === 'prompts' ? (
              <TouchableOpacity
                style={[styles.homePrimary, { backgroundColor: theme.link, marginTop: 20 }]}
                onPress={onOpenPrompts}
              >
                <Text style={styles.homePrimaryText}>打开提示词库</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>
      <HomeTabBar theme={theme} active={activeTab} onChange={setActiveTab} onOpenFile={onOpenFile} />
    </SafeAreaView>
  );
}

interface OpenGuideProps {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  onOpenFile: () => void;
}

function OpenGuide({ visible, theme, onClose, onOpenFile }: OpenGuideProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.guideOverlay} onPress={onClose}>
        <Pressable style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.guideTitle, { color: theme.heading }]}>从微信 / QQ 打开文件</Text>
          <View style={styles.guideSteps}>
            <Text style={[styles.guideStep, { color: theme.text }]}>1. 在聊天里点开 `.md` 或 `.json` 文件。</Text>
            <Text style={[styles.guideStep, { color: theme.text }]}>2. 选择“更多打开方式”或“其他应用”。</Text>
            <Text style={[styles.guideStep, { color: theme.text }]}>3. 选择“墨览”，打开后先进入阅读页。</Text>
            <Text style={[styles.guideHint, { color: theme.textSecondary }]}>如果系统不让读取，先把文件保存到本地，再从墨览里点“打开文件”。</Text>
          </View>
          <View style={styles.guideActions}>
            <TouchableOpacity style={[styles.guideSecondary, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>知道了</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.guidePrimary, { backgroundColor: theme.link }]}
              onPress={() => {
                onClose();
                onOpenFile();
              }}
            >
              <Text style={styles.guidePrimaryText}>现在选择文件</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function stripUriDecorations(uri: string): string {
  return uri.split('?')[0].split('#')[0];
}

function getNameFromUri(uri: string, fallback: string): string {
  const cleanUri = stripUriDecorations(uri);
  const rawName = cleanUri.split('/').pop() || fallback;
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function getDocKind(name: string, mimeType?: string | null): DocKind {
  if (/\.json$/i.test(name) || mimeType === 'application/json') return 'json';
  return 'markdown';
}

function titleFromName(name: string, kind: DocKind): string {
  const stripped = name.replace(/\.(md|markdown|json)$/i, '').trim();
  return stripped || (kind === 'json' ? 'JSON' : '文档');
}

function friendlyOpenError(error: unknown, sourceLabel: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/Missing 'READ' permission|Permission denied|EACCES|security/i.test(message)) {
    return `无法读取来自${sourceLabel}的文件。请先把文件保存到本地，或点“重新选择”从系统文件选择器里打开。`;
  }
  if (/ENOENT|No such file/i.test(message)) {
    return `来自${sourceLabel}的文件已经移动或不存在。请重新选择文件。`;
  }
  return `打开来自${sourceLabel}的文件失败。请重新选择文件，或确认它是 Markdown / JSON 文档。`;
}

function inferExternalSourceLabel(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('micromessenger') || lower.includes('wechat') || lower.includes('wx')) return '微信';
  if (lower.includes('qq')) return 'QQ';
  if (lower.startsWith('content://')) return '外部应用';
  return '文件管理器';
}

function inferExternalSource(uri: string): DocSource {
  const lower = uri.toLowerCase();
  if (lower.includes('micromessenger') || lower.includes('wechat') || lower.includes('wx')) return 'wechat';
  if (lower.includes('qq')) return 'qq';
  if (lower.startsWith('content://') || lower.startsWith('file://')) return 'fileManager';
  return 'other';
}

const OPEN_GUIDE_SEEN_KEY = 'openGuideSeen:v1';

export default function App() {
  const [content, setContent] = useState<string>('');
  const [hasDocument, setHasDocument] = useState(false);
  const [jsonRaw, setJsonRaw] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('文档');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<'openFile' | null>(null);
  const [convertVisible, setConvertVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [recentVisible, setRecentVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [aiVisible, setAiVisible] = useState(false);
  const [openGuideVisible, setOpenGuideVisible] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [immersive, setImmersive] = useState(true);
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const theme = themes[systemMode];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = width < 380;
  const dockWidth = Math.min(Math.max(width - 24, 256), 560);
  const dockEdge = Math.max(12, Math.round((width - dockWidth) / 2));
  const dockBottom = Math.max(12, insets.bottom + 12);
  const dockErrorOffset = hasDocument ? dockBottom + (compact || height < 680 ? 136 : 126) : Math.max(24, insets.bottom + 24);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadRecentDocs().then(setRecentDocs).catch(() => {});
    AsyncStorage.getItem(OPEN_GUIDE_SEEN_KEY)
      .then((seen) => {
        if (!seen) setOpenGuideVisible(true);
      })
      .catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const closeOpenGuide = useCallback(() => {
    setOpenGuideVisible(false);
    AsyncStorage.setItem(OPEN_GUIDE_SEEN_KEY, '1').catch(() => {});
  }, []);

  const remember = useCallback(async (
    name: string,
    kind: 'markdown' | 'json',
    text: string,
    source?: DocSource,
    statuses: DocumentStatus[] = ['read'],
  ) => {
    try {
      const now = Date.now();
      const docs = await saveRecentDoc({
        title: name,
        kind,
        content: text,
        source,
        statuses,
        readAt: statuses.includes('read') ? now : undefined,
        lastCopiedAt: statuses.includes('copied') ? now : undefined,
        lastEditedAt: statuses.includes('edited') ? now : undefined,
        lastConvertedAt: statuses.includes('converted') ? now : undefined,
        lastSharedAt: statuses.includes('shared') ? now : undefined,
      });
      setRecentDocs(docs);
    } catch {
      /* 最近文档失败不阻断阅读 */
    }
  }, []);

  const applyLoadedDoc = useCallback(async (doc: LoadedDoc, source: DocSource) => {
    setTitle(doc.title);
    if (doc.kind === 'json') {
      setJsonRaw(doc.text);
      setContent('');
    } else {
      setJsonRaw(null);
      setContent(doc.text);
    }
    await remember(doc.title, doc.kind, doc.text, source);
    setHasDocument(true);
    setImmersive(doc.kind !== 'json');
    setError(null);
    setErrorAction(null);
  }, [remember]);

  const loadMd = useCallback((md: string, name: string) => {
    setJsonRaw(null);
    setContent(md);
    setTitle(name);
    setHasDocument(true);
    setImmersive(true);
    setError(null);
    setErrorAction(null);
    remember(name, 'markdown', md, 'recent', ['converted', 'read']);
  }, [remember]);

  // 通过"打开方式"接收传入的 .md / .json 文件
  const loadFromUri = useCallback(async (uri: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      setErrorAction(null);
      const cleanUri = stripUriDecorations(uri);
      const text = await new File(cleanUri).text();
      const fileName = getNameFromUri(cleanUri, '文档');
      const kind = getDocKind(fileName);
      await applyLoadedDoc({ title: titleFromName(fileName, kind), kind, text }, inferExternalSource(uri));
    } catch (e) {
      setError(friendlyOpenError(e, inferExternalSourceLabel(uri)));
      setErrorAction('openFile');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [remember]);

  useEffect(() => {
    const handle = (url: string | null) => {
      if (url && (url.startsWith('file://') || url.startsWith('content://'))) {
        loadFromUri(url);
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [loadFromUri]);

  const openFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorAction(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/markdown', 'text/plain', 'application/json', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const text = await new File(file.uri).text();
      const kind = getDocKind(file.name, file.mimeType);
      await applyLoadedDoc({ title: titleFromName(file.name, kind), kind, text }, 'documentPicker');
    } catch (e) {
      setError(friendlyOpenError(e, '本地文件选择器'));
      setErrorAction('openFile');
    } finally {
      setLoading(false);
    }
  }, [remember]);

  const openRecent = useCallback((doc: RecentDoc) => {
    setRecentVisible(false);
    setTitle(doc.title);
    if (doc.kind === 'json') {
      setJsonRaw(doc.content);
      setContent('');
      setImmersive(false);
    } else {
      setJsonRaw(null);
      setContent(doc.content);
      setImmersive(true);
    }
    setHasDocument(true);
    remember(doc.title, doc.kind, doc.content, 'recent', ['read']);
  }, [remember]);

  const removeRecent = useCallback(async (id: string) => {
    try {
      const docs = await removeRecentDoc(id);
      setRecentDocs(docs);
    } catch {
      /* 忽略 */
    }
  }, []);

  const saveEdited = useCallback((newContent: string) => {
    if (jsonRaw !== null) {
      setJsonRaw(newContent);
      remember(title, 'json', newContent, 'recent', ['edited']);
    } else {
      setContent(newContent);
      remember(title, 'markdown', newContent, 'recent', ['edited']);
    }
  }, [remember, title, jsonRaw]);

  const shareCurrent = useCallback(async () => {
    try {
      setLoading(true);
      const isJson = jsonRaw !== null;
      const { writeJsonFile, writeMdFile } = await import('./src/converter/fileConvert');
      const result = isJson
        ? await writeJsonFile(jsonRaw, title || 'JSON')
        : await writeMdFile(content, title || '文档');
      if (!result.ok || !result.outputPath) {
        setError('分享失败：' + result.error);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.outputPath, {
          mimeType: isJson ? 'application/json' : 'text/markdown',
          dialogTitle: `${title || '文档'}.${isJson ? 'json' : 'md'}`,
        });
        await remember(title, isJson ? 'json' : 'markdown', isJson ? jsonRaw : content, 'recent', ['shared']);
      } else {
        setError('当前环境不支持系统分享');
      }
    } catch (e) {
      setError('分享失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [content, jsonRaw, remember, title]);

  const copyCurrent = useCallback(async () => {
    const text = jsonRaw !== null ? jsonRaw : content;
    if (!text.trim()) {
      setError('当前没有可复制内容');
      return;
    }
    try {
      await Clipboard.setStringAsync(text);
      await remember(title, jsonRaw !== null ? 'json' : 'markdown', text, 'recent', ['copied']);
      setError(null);
      setErrorAction(null);
    } catch (e) {
      setError('复制失败：' + (e as Error).message);
    }
  }, [content, jsonRaw, title]);

  const recordCopied = useCallback(() => {
    if (!hasDocument) return;
    const isJson = jsonRaw !== null;
    const text = isJson ? jsonRaw : content;
    if (!text.trim()) return;
    remember(title, isJson ? 'json' : 'markdown', text, 'recent', ['copied']);
  }, [content, hasDocument, jsonRaw, remember, title]);

  // Android 返回键：优先关 Sheet → 回到首页 → 不拦截让系统退出
  const handleBackPress = useCallback(() => {
    if (convertVisible) { setConvertVisible(false); return true; }
    if (editVisible)    { setEditVisible(false);    return true; }
    if (recentVisible)  { setRecentVisible(false);  return true; }
    if (promptVisible)  { setPromptVisible(false);  return true; }
    if (aiVisible)      { setAiVisible(false);      return true; }
    if (hasDocument) {
      setHasDocument(false);
      setContent('');
      setJsonRaw(null);
      setError(null);
      setErrorAction(null);
      return true;
    }
    return false;
  }, [hasDocument, convertVisible, editVisible, recentVisible, promptVisible, aiVisible]);

  const resetApp = useCallback(() => {
    setHasDocument(false);
    setContent('');
    setJsonRaw(null);
    setError(null);
    setErrorAction(null);
    setConvertVisible(false);
    setEditVisible(false);
    setRecentVisible(false);
    setPromptVisible(false);
    setAiVisible(false);
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => handler.remove();
  }, [handleBackPress]);

  return (
    <ErrorBoundary theme={theme} onReset={resetApp}>
    <View style={styles.container}>
      <StatusBar style={systemMode === 'night' ? 'light' : 'dark'} />
      {!hasDocument ? (
        <HomeScreen
          theme={theme}
          recentDocs={recentDocs}
          onOpenFile={openFile}
          onOpenRecentSheet={() => setRecentVisible(true)}
          onOpenPrompts={() => setPromptVisible(true)}
          onOpenDoc={openRecent}
          onOpenGuide={() => setOpenGuideVisible(true)}
        />
      ) : jsonRaw !== null ? (
        <JsonView
          raw={jsonRaw}
          title={title}
          onCopied={recordCopied}
          onClose={() => {
            setHasDocument(false);
            setContent('');
            setJsonRaw(null);
            setError(null);
            setErrorAction(null);
          }}
        />
      ) : (
        <Reader
          content={content}
          title={title}
          immersive={immersive}
          onToggleChrome={() => setImmersive((v) => !v)}
          onCopied={recordCopied}
          onClose={() => {
            setHasDocument(false);
            setContent('');
            setJsonRaw(null);
            setError(null);
            setErrorAction(null);
          }}
        />
      )}
      {hasDocument ? (
        <View
          style={[
            styles.readerDock,
            {
              left: dockEdge,
              right: dockEdge,
              bottom: dockBottom,
              backgroundColor: systemMode === 'night' ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)',
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.readerDockBtn, loading && styles.disabledAction]}
            onPress={copyCurrent}
            disabled={loading}
          >
            <Text style={[styles.readerDockIcon, { color: theme.textSecondary }]}>❐</Text>
            <Text style={[styles.readerDockLabel, { color: theme.textSecondary }]}>复制</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.readerDockBtn} onPress={() => setEditVisible(true)}>
            <Text style={[styles.readerDockIcon, { color: theme.textSecondary }]}>✎</Text>
            <Text style={[styles.readerDockLabel, { color: theme.textSecondary }]}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.readerDockBtn} onPress={() => setAiVisible(true)}>
            <Text style={[styles.readerDockIcon, { color: theme.textSecondary }]}>✦</Text>
            <Text style={[styles.readerDockLabel, { color: theme.textSecondary }]}>AI可读</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.readerDockBtn, loading && styles.disabledAction]}
            onPress={() => setConvertVisible(true)}
            disabled={loading}
          >
            <Text style={[styles.readerDockIcon, { color: theme.textSecondary }]}>⇄</Text>
            <Text style={[styles.readerDockLabel, { color: theme.textSecondary }]}>转换</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.readerDockBtn, loading && styles.disabledAction]}
            onPress={shareCurrent}
            disabled={loading}
          >
            <Text style={[styles.readerDockIcon, { color: theme.textSecondary }]}>↗</Text>
            <Text style={[styles.readerDockLabel, { color: theme.textSecondary }]}>分享</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <ConvertSheet
        visible={convertVisible}
        onClose={() => setConvertVisible(false)}
        kind={jsonRaw !== null ? 'json' : 'markdown'}
        content={jsonRaw !== null ? jsonRaw : content}
        title={title}
        onLoadMd={loadMd}
        onConverted={(shared) => remember(
          title,
          jsonRaw !== null ? 'json' : 'markdown',
          jsonRaw !== null ? jsonRaw : content,
          'recent',
          shared ? ['converted', 'shared'] : ['converted'],
        )}
        onShared={() => remember(
          title,
          jsonRaw !== null ? 'json' : 'markdown',
          jsonRaw !== null ? jsonRaw : content,
          'recent',
          ['shared'],
        )}
        themeMode={systemMode}
      />
      <EditSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        content={jsonRaw !== null ? jsonRaw : content}
        title={title}
        isJson={jsonRaw !== null}
        theme={theme}
        onSave={saveEdited}
      />
      <RecentSheet
        visible={recentVisible}
        docs={recentDocs}
        theme={theme}
        onClose={() => setRecentVisible(false)}
        onOpen={openRecent}
        onRemove={removeRecent}
      />
      <PromptSheet
        visible={promptVisible}
        theme={theme}
        onClose={() => setPromptVisible(false)}
        currentContent={jsonRaw !== null ? jsonRaw : content}
        currentTitle={title}
        onCopied={recordCopied}
      />
      <AiInsightSheet
        visible={aiVisible}
        theme={theme}
        onClose={() => setAiVisible(false)}
        title={title}
        kind={jsonRaw !== null ? 'json' : 'markdown'}
        content={jsonRaw !== null ? jsonRaw : content}
        onSave={() => {
          const text = jsonRaw !== null ? jsonRaw : content;
          if (text.trim()) {
            remember(title, jsonRaw !== null ? 'json' : 'markdown', text, 'recent', ['copied']);
            setError('已保存为 AI 可读资源，可在最近文档中查看');
          }
        }}
      />
      <OpenGuide
        visible={openGuideVisible && !hasDocument}
        theme={theme}
        onClose={closeOpenGuide}
        onOpenFile={openFile}
      />
      {error ? (
        <View style={[styles.errorBar, { bottom: dockErrorOffset }]}>
          <Text style={styles.errorText}>{error}</Text>
          {errorAction === 'openFile' ? (
            <TouchableOpacity style={styles.errorAction} onPress={openFile} disabled={loading}>
              <Text style={styles.errorActionText}>{loading ? '打开中...' : '重新选择'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  home: {
    flex: 1,
    alignItems: 'center',
  },
  homeHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  homeTitleBlock: {
    marginBottom: 20,
  },
  homeTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  homeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  homeStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  homeStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  homeHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  homeHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeHeaderBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  homeContent: {
    alignSelf: 'center',
    flexGrow: 1,
  },
  homePrimary: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  homePrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  guideEntry: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guideEntryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  homeQuickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  homeQuickAction: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  homeQuickIcon: {
    fontSize: 22,
    marginBottom: 8,
  },
  homeQuickTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  homeQuickMeta: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  homeSectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  homeSectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  homeList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  homeEmpty: {
    padding: 18,
    fontSize: 14,
    textAlign: 'center',
  },
  homeDocRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  homeDocTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  homeDocMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  homeDocStatus: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '700',
  },
  homeDocArrow: {
    fontSize: 28,
    lineHeight: 28,
  },
  bottomBar: {
    position: 'absolute',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  focusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  copyAction: {
    flex: 1,
    minWidth: 122,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyActionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryAction: {
    minWidth: 66,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disabledAction: {
    opacity: 0.56,
  },
  utilityButton: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(200,40,40,0.9)',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  errorAction: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  errorActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  guideOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  guideCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  guideSteps: {
    gap: 10,
  },
  guideStep: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  guideHint: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  guideActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  guidePrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidePrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  guideSecondary: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  readerDock: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  readerDockBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  readerDockIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  readerDockLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3,
    color: '#9CA3AF',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabCenter: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  tabCenterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  tabCenterIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  homePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    minHeight: 300,
  },
  homePlaceholderText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
