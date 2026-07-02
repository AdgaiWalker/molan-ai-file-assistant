import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Linking, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Reader } from './src/components/Reader';
import { JsonView } from './src/components/JsonView';
import { ConvertSheet } from './src/components/ConvertSheet';
import { EditSheet } from './src/components/EditSheet';
import { RecentSheet } from './src/components/RecentSheet';
import { PromptSheet } from './src/components/PromptSheet';
import { SAMPLE_MD } from './src/sampleMd';
import { themes, ThemeMode } from './src/theme';
import { loadRecentDocs, RecentDoc, saveRecentDoc, removeRecentDoc, DocSource } from './src/storage/recentDocs';
import { writeMdFile } from './src/converter/fileConvert';

export default function App() {
  const [content, setContent] = useState<string>(SAMPLE_MD);
  const [jsonRaw, setJsonRaw] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('示例文档');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertVisible, setConvertVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [recentVisible, setRecentVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [immersive, setImmersive] = useState(true);
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const theme = themes[systemMode];
  const insets = useSafeAreaInsets();
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const loadingRef = useRef(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    Animated.timing(bottomOpacity, {
      toValue: immersive ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [immersive, bottomOpacity]);

  useEffect(() => {
    (async () => {
      try {
        if ((await AsyncStorage.getItem('hintSeen')) !== '1') setShowHint(true);
      } catch {
        /* 忽略存储读取失败 */
      }
    })();
  }, []);

  useEffect(() => {
    loadRecentDocs().then(setRecentDocs).catch(() => {});
  }, []);

  const dismissHint = useCallback(async () => {
    setShowHint(false);
    try {
      await AsyncStorage.setItem('hintSeen', '1');
    } catch {
      /* 忽略 */
    }
  }, []);

  const remember = useCallback(async (name: string, kind: 'markdown' | 'json', text: string, source?: DocSource) => {
    try {
      const docs = await saveRecentDoc({ title: name, kind, content: text, source });
      setRecentDocs(docs);
    } catch {
      /* 最近文档失败不阻断阅读 */
    }
  }, []);

  const loadMd = useCallback((md: string, name: string) => {
    setJsonRaw(null);
    setContent(md);
    setTitle(name);
    setImmersive(true);
    remember(name, 'markdown', md);
  }, [remember]);

  // 通过"打开方式"接收传入的 .md / .json 文件
  const loadFromUri = useCallback(async (uri: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const cleanUri = uri.split('?')[0].split('#')[0];
      const text = await new File(cleanUri).text();
      const fileSeg = decodeURIComponent(cleanUri.split('/').pop() || '文档');
      const isJson = /\.json$/i.test(fileSeg);
      if (isJson) {
        setJsonRaw(text);
        setContent('');
        await remember(fileSeg.replace(/\.json$/i, '') || 'JSON', 'json', text, 'fileManager');
      } else {
        setJsonRaw(null);
        setContent(text);
        await remember(fileSeg.replace(/\.(md|markdown)$/i, '') || '文档', 'markdown', text, 'fileManager');
      }
      setTitle(fileSeg.replace(/\.(md|markdown|json)$/i, '') || '文档');
      setImmersive(!isJson);
    } catch (e) {
      setError('打开文件失败：' + (e as Error).message);
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
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/markdown', 'text/plain', 'application/json', 'application/octet-stream'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const text = await new File(file.uri).text();
      const isJson = /\.json$/i.test(file.name);
      if (isJson) {
        setJsonRaw(text);
        setContent('');
        await remember(file.name.replace(/\.json$/i, '') || 'JSON', 'json', text, 'documentPicker');
      } else {
        setJsonRaw(null);
        setContent(text);
        await remember(file.name.replace(/\.(md|markdown)$/i, '') || '文档', 'markdown', text, 'documentPicker');
      }
      setTitle(file.name.replace(/\.(md|markdown|json)$/i, ''));
      setImmersive(!isJson);
    } catch (e) {
      setError('打开文件失败：' + (e as Error).message);
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
    remember(doc.title, doc.kind, doc.content, 'recent');
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
      remember(title, 'json', newContent);
    } else {
      setContent(newContent);
      remember(title, 'markdown', newContent);
    }
  }, [remember, title, jsonRaw]);

  const shareCurrent = useCallback(async () => {
    if (jsonRaw !== null) {
      setError('JSON 分享请先复制美化内容，或后续导出为文件。');
      return;
    }
    try {
      setLoading(true);
      const result = await writeMdFile(content, title || '文档');
      if (!result.ok || !result.outputPath) {
        setError('分享失败：' + result.error);
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.outputPath, {
          mimeType: 'text/markdown',
          dialogTitle: `${title || '文档'}.md`,
        });
      } else {
        setError('当前环境不支持系统分享');
      }
    } catch (e) {
      setError('分享失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [content, jsonRaw, title]);

  return (
    <View style={styles.container}>
      {jsonRaw !== null ? (
        <JsonView raw={jsonRaw} title={title} />
      ) : (
        <Reader
          content={content}
          title={title}
          immersive={immersive}
          onToggleChrome={() => setImmersive((v) => !v)}
        />
      )}
      <Animated.View
        style={[styles.bottomBar, { bottom: insets.bottom + 12, opacity: bottomOpacity }]}
        pointerEvents={immersive ? 'none' : 'auto'}
      >
        <View style={styles.primaryRow}>
          <TouchableOpacity style={styles.bottomBtn} onPress={shareCurrent} disabled={loading || jsonRaw !== null}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bottomBtnText}>分享</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => setConvertVisible(true)}
            disabled={loading || jsonRaw !== null}
          >
            <Text style={styles.bottomBtnText}>转换</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setEditVisible(true)}>
            <Text style={styles.ghostBtnText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={openFile} disabled={loading}>
            <Text style={styles.ghostBtnText}>打开</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setRecentVisible(true)}>
            <Text style={styles.ghostBtnText}>最近</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setPromptVisible(true)}>
            <Text style={styles.ghostBtnText}>提示词库</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      <ConvertSheet
        visible={convertVisible}
        onClose={() => setConvertVisible(false)}
        content={content}
        title={title}
        onLoadMd={loadMd}
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
      />
      {error ? (
        <View style={[styles.errorBar, { bottom: insets.bottom + 68 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {showHint ? (
        <View style={styles.hintOverlay}>
          <View style={styles.hintCard}>
            <Text style={styles.hintTitle}>使用提示</Text>
            <Text style={styles.hintText}>
              {'· 在微信/QQ 中收到 .md / .json 文件 → 「其他应用」→「墨览 文档阅读助手」\n· 文件管理器点 .md / .json → 选墨览打开\n· 轻点屏幕中部唤出操作面板\n· 长按正文复制文字；代码块点"复制"；顶部"目录"跳转章节'}
            </Text>
            <TouchableOpacity style={styles.hintBtn} onPress={dismissHint}>
              <Text style={styles.hintBtnText}>知道了</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  bottomBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  ghostBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: 'rgba(26,115,232,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostBtnText: {
    color: '#1A73E8',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(200,40,40,0.9)',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
  hintOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  hintCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  hintTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
    marginBottom: 16,
  },
  hintBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#1A73E8',
    borderRadius: 8,
  },
  hintBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
