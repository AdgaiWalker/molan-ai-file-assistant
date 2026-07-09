import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StatusBar,
  useColorScheme,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { marked, Token } from 'marked';
import { renderBlock } from '../markdown/renderer';
import { parseToc, TocItem } from '../markdown/toc';
import { themes, ThemeMode, FONT_SCALES, DEFAULT_FONT_SCALE_INDEX } from '../theme';
import { findMarkdownMatches } from '../markdown/search';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Search, MoreHorizontal, List, Minus, Plus, Sun, Moon, Monitor } from 'lucide-react-native';

interface ReaderProps {
  content: string;
  title?: string;
  immersive?: boolean;
  onToggleChrome?: () => void;
  onCopied?: () => void;
  onClose?: () => void;
}

export function Reader({ content, title = '阅读', immersive = false, onToggleChrome, onCopied, onClose }: ReaderProps) {
  const systemMode: ThemeMode = useColorScheme() === 'dark' ? 'night' : 'day';
  const [override, setOverride] = useState<'day' | 'night' | null>(null);
  const [fontScaleIndex, setFontScaleIndex] = useState(DEFAULT_FONT_SCALE_INDEX);
  const [tocVisible, setTocVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moreVisible, setMoreVisible] = useState(false);

  const themeMode: ThemeMode = override ?? systemMode;
  const theme = themes[themeMode];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const scrollRef = useRef<FlatList<Token>>(null);
  const tokens = useMemo(() => marked.lexer(content), [content]);
  const toc = useMemo(() => parseToc(tokens), [tokens]);
  const searchMatches = useMemo(() => findMarkdownMatches(tokens, searchQuery), [tokens, searchQuery]);

  const fontScale = FONT_SCALES[fontScaleIndex];
  const topOpacity = useRef(new Animated.Value(immersive ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(topOpacity, { toValue: immersive ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  }, [immersive, topOpacity]);

  // 阅读连续性：按文档键记忆上次滚动位置
  const offsetRef = useRef(0);
  const docKey = `${content.length}:${content.slice(0, 50)}`;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(`readPos:${docKey}`)
      .then((v) => {
        if (mounted && v) {
          const off = Number(v);
          if (off > 0) {
            requestAnimationFrame(() =>
              scrollRef.current?.scrollToOffset({ offset: off, animated: false }),
            );
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [docKey]);

  const savePos = () => {
    AsyncStorage.setItem(`readPos:${docKey}`, String(offsetRef.current)).catch(() => {});
  };

  // 自动 → 日 → 夜 → 自动
  const cycleTheme = () =>
    setOverride((cur) => (cur === null ? 'day' : cur === 'day' ? 'night' : null));

  const changeFont = (delta: number) => {
    setFontScaleIndex((i) => {
      const next = Math.max(0, Math.min(FONT_SCALES.length - 1, i + delta));
      return next;
    });
  };

  const jumpTo = (index: number) => {
    setTocVisible(false);
    setSearchVisible(false);
    scrollRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  };

  // 目标块尚未测量时：先用平均高度估算偏移量滚到附近，触发测量后重试精确跳转
  const onScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    scrollRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: false,
    });
    setTimeout(() => {
      scrollRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0 });
    }, 120);
  };

  const renderTocItem = ({ item }: { item: TocItem }) => (
    <TouchableOpacity
      style={[styles.tocItem, { paddingLeft: 12 + (item.level - 1) * 16 }]}
      onPress={() => jumpTo(item.index)}
    >
      <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={1}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );

  const renderBlockItem = ({ item, index }: { item: Token; index: number }) => (
    <>{renderBlock(item, `b-${index}`, theme, fontScale, onCopied)}</>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'day' ? 'dark-content' : 'light-content'} />

      {/* 正文：FlatList 直接渲染，避免外层 Pressable 吞掉滚动手势。
          滚动时自动唤出顶栏（immersive→false）；点顶栏标题切换沉浸态。 */}
      <FlatList
        ref={scrollRef}
        data={tokens}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderBlockItem}
        contentContainerStyle={[
          styles.content,
          {
            backgroundColor: theme.background,
            paddingHorizontal: compact ? 14 : 20,
            paddingTop: insets.top + 56,
            paddingBottom: compact ? 190 : 180,
          },
        ]}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScroll={({ nativeEvent: { contentOffset } }) => {
          offsetRef.current = contentOffset.y;
        }}
        onScrollBeginDrag={() => {
          // 用户开始滚动时唤出顶栏（沉浸→非沉浸）
          if (immersive && onToggleChrome) onToggleChrome();
        }}
        onScrollEndDrag={savePos}
        onMomentumScrollEnd={savePos}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
      />

      {/* 顶部工具栏：沉浸态淡出，轻点正文唤出 */}
      <Animated.View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            opacity: topOpacity,
            height: insets.top + 48,
            paddingTop: insets.top,
          },
        ]}
        pointerEvents={immersive ? 'none' : 'auto'}
      >
        <View style={styles.toolLeft}>
          {onClose ? (
            <TouchableOpacity style={styles.toolBtn} onPress={onClose}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.titleWrap}
            onPress={onToggleChrome}
            disabled={!onToggleChrome}
            activeOpacity={0.6}
          >
            <Text style={[styles.title, { color: theme.heading }]} numberOfLines={1}>{title}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.toolRight}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setSearchVisible(true)}>
            <Search size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setMoreVisible(true)}>
            <MoreHorizontal size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 目录抽屉 */}
      <Modal visible={tocVisible} animationType="slide" transparent={true} onRequestClose={() => setTocVisible(false)}>
        <TouchableOpacity style={styles.tocOverlay} activeOpacity={1} onPress={() => setTocVisible(false)}>
          <View style={[styles.tocPanel, { backgroundColor: theme.surface, marginTop: insets.top + 48 }]}>
            <View style={[styles.tocHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.tocTitle, { color: theme.heading }]}>目录</Text>
            </View>
            <FlatList
              data={toc}
              keyExtractor={(item) => item.id}
              renderItem={renderTocItem}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 当前文档搜索 */}
      <Modal visible={searchVisible} animationType="slide" transparent={true} onRequestClose={() => setSearchVisible(false)}>
        <TouchableOpacity style={styles.tocOverlay} activeOpacity={1} onPress={() => setSearchVisible(false)}>
          <View style={[styles.searchPanel, { backgroundColor: theme.surface, marginTop: insets.top + 48 }]}>
            <View style={[styles.searchHeader, { borderBottomColor: theme.border }]}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                placeholder="搜索当前文档"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="search"
                style={[styles.searchInput, { color: theme.text, backgroundColor: theme.codeBackground }]}
              />
            </View>
            {searchQuery.trim() && searchMatches.length === 0 ? (
              <Text style={[styles.searchEmpty, { color: theme.textSecondary }]}>没有找到匹配内容</Text>
            ) : (
              <FlatList
                data={searchMatches}
                keyExtractor={(item) => String(item.index)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.searchItem, { borderBottomColor: theme.border }]}
                    onPress={() => jumpTo(item.index)}
                  >
                    <Text style={[styles.searchMeta, { color: theme.textSecondary }]}>第 {item.index + 1} 段</Text>
                    <Text style={[styles.searchSnippet, { color: theme.text }]} numberOfLines={2}>
                      {item.snippet}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 更多菜单：目录、字号、主题 */}
      <Modal visible={moreVisible} animationType="fade" transparent={true} onRequestClose={() => setMoreVisible(false)}>
        <TouchableOpacity style={styles.moreOverlay} activeOpacity={1} onPress={() => setMoreVisible(false)}>
          <View style={[styles.morePanel, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: insets.top + 48, marginRight: 12 }]}>
            <TouchableOpacity
              style={[styles.moreItem, { borderBottomColor: theme.border }]}
              onPress={() => { setMoreVisible(false); setTocVisible(true); }}
            >
              <List size={18} color={theme.text} />
              <Text style={[styles.moreItemText, { color: theme.text }]}>目录</Text>
            </TouchableOpacity>
            <View style={[styles.moreItem, { borderBottomColor: theme.border }]}>
              <Minus size={18} color={theme.text} />
              <Text style={[styles.moreItemText, { color: theme.text }]}>字号</Text>
              <View style={styles.fontActions}>
                <TouchableOpacity style={styles.fontBtn} onPress={() => changeFont(-1)}>
                  <Minus size={16} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.fontBtn} onPress={() => changeFont(1)}>
                  <Plus size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.moreItem} onPress={() => { setMoreVisible(false); cycleTheme(); }}>
              {override === 'day' ? <Sun size={18} color={theme.text} /> : override === 'night' ? <Moon size={18} color={theme.text} /> : <Monitor size={18} color={theme.text} />}
              <Text style={[styles.moreItemText, { color: theme.text }]}>
                {override === 'day' ? '浅色模式' : override === 'night' ? '深色模式' : '跟随系统'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  toolBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toolLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 56,
  },
  tocOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  tocPanel: {
    width: '70%',
    maxWidth: 320,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tocHeader: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tocTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tocItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  searchPanel: {
    width: '82%',
    maxWidth: 420,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  searchEmpty: {
    padding: 16,
    fontSize: 14,
  },
  searchItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  searchSnippet: {
    fontSize: 14,
    lineHeight: 20,
  },
  moreOverlay: {
    flex: 1,
    alignItems: 'flex-end',
  },
  morePanel: {
    minWidth: 180,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  moreItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  fontActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fontBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
