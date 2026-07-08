import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import {
  add as addPrompt,
  list as listPrompts,
  update as updatePrompt,
  PromptItem,
  recentCopies,
  recordCopy,
  search as searchPrompts,
  clearFolder,
} from '../storage/prompts';
import {
  listFolders,
  addFolder,
  renameFolder,
  removeFolder,
  collectTags,
  filterPrompts,
  type Folder,
} from '../storage/folders';
import { extractVars, fillVars } from '../storage/promptVars';
import { Search, X, Copy, Check, ClipboardPaste, FilePlus, Combine, FolderPlus, Folder as FolderIcon, MoreHorizontal } from 'lucide-react-native';

interface PromptSheetProps {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
  currentContent?: string;
  currentTitle?: string;
  onCopied?: () => void;
}

export function PromptSheet({ visible, theme, onClose, currentContent, currentTitle, onCopied }: PromptSheetProps) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const compact = width < 380;
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [results, setResults] = useState<PromptItem[]>([]);
  const [recent, setRecent] = useState<PromptItem[]>([]);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  // 分组 / 标签筛选
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null | undefined>(undefined); // undefined=全部
  const [activeTag, setActiveTag] = useState<string | null | undefined>(undefined);
  const [folderMgr, setFolderMgr] = useState(false); // 分组管理面板
  const [newFolderName, setNewFolderName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  // 单条提示词的分组选择面板
  const [assigningId, setAssigningId] = useState<string | null>(null);
  // 组合复制工作台：多选模式
  const [combineMode, setCombineMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 变量模板：填充面板（见 M-V15-06）
  const [fillingId, setFillingId] = useState<string | null>(null);

  const reload = async () => {
    const all = await listPrompts();
    setPrompts(all);
    setRecent(await recentCopies(5));
    setFolders(await listFolders());
  };

  useEffect(() => {
    if (!visible) return;
    reload();
  }, [visible]);

  // 所有标签（供筛选 chip 行）
  const allTags = useMemo(() => collectTags(prompts), [prompts]);

  // 搜索 + 分组 + 标签 三重筛选
  useEffect(() => {
    let active = true;
    (async () => {
      const q = query.trim();
      let base = prompts;
      // 有搜索词时走搜索接口（它跨分组），否则用本地筛选
      if (q) base = await searchPrompts(q);
      const filtered = filterPrompts(base, activeFolder, activeTag);
      if (active) setResults(filtered);
    })();
    return () => {
      active = false;
    };
  }, [query, prompts, activeFolder, activeTag]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 1500);
  };

  const copy = async (item: PromptItem) => {
    await Clipboard.setStringAsync(item.content);
    onCopied?.();
    await recordCopy(item.id);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1200);
    await reload();
  };

  const startImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text || !text.trim()) {
      showToast('剪贴板为空');
      return;
    }
    setImportContent(text);
    setImportTitle(text.slice(0, 20));
    setImporting(true);
  };

  const confirmImport = async () => {
    const content = importContent;
    if (!content.trim()) {
      setImporting(false);
      return;
    }
    const title = importTitle.trim() || content.slice(0, 20);
    await addPrompt({ title, content, format: 'text' });
    setImporting(false);
    setImportTitle('');
    setImportContent('');
    setQuery('');
    await reload();
    showToast('已导入');
  };

  const cancelImport = () => {
    setImporting(false);
    setImportTitle('');
    setImportContent('');
  };

  const importCurrent = async () => {
    if (!currentContent || !currentContent.trim()) {
      showToast('当前无可导入内容');
      return;
    }
    const content = currentContent;
    const title2 = currentTitle?.slice(0, 20) || content.slice(0, 20);
    await addPrompt({ title: title2, content, format: isJsonLike(content) ? 'json' : 'md' });
    await reload();
    showToast('已导入当前文档');
  };

  // 组合复制工作台：进入多选模式
  const enterCombine = () => {
    setSelected(new Set());
    setCombineMode(true);
  };
  const exitCombine = () => {
    setCombineMode(false);
    setSelected(new Set());
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => {
    setSelected(new Set(results.map((r) => r.id)));
  };
  // 合并复制已勾选的提示词；未勾选则提示
  const copySelected = async () => {
    const items = results.filter((r) => selected.has(r.id));
    if (items.length === 0) {
      showToast('未勾选任何提示词');
      return;
    }
    const merged = items.map((item) => item.content.trim()).filter(Boolean).join('\n\n---\n\n');
    await Clipboard.setStringAsync(merged);
    onCopied?.();
    // 记录每条的复制计数
    for (const item of items) await recordCopy(item.id);
    showToast(`已合并复制 ${items.length} 条`);
    exitCombine();
    await reload();
  };

  // ── 分组管理 ──
  const handleAddFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    await addFolder(name);
    setNewFolderName('');
    setFolders(await listFolders());
    showToast('已新建分组');
  };

  const handleRenameFolder = async (id: string) => {
    const name = renameText.trim();
    if (!name) { setRenameId(null); return; }
    await renameFolder(id, name);
    setRenameId(null);
    setRenameText('');
    setFolders(await listFolders());
  };

  const handleRemoveFolder = async (id: string) => {
    await removeFolder(id);
    await clearFolder(id);
    if (activeFolder === id) setActiveFolder(undefined);
    setFolders(await listFolders());
    await reload();
    showToast('已删除分组（提示词移至未分组）');
  };

  // 把某条提示词归入分组
  const handleAssignFolder = async (promptId: string, folderId: string | undefined) => {
    await updatePrompt(promptId, { folderId });
    setAssigningId(null);
    await reload();
  };

  // ── 变量模板填充 ──
  const fillingPrompt = fillingId ? prompts.find((p) => p.id === fillingId) : null;
  const fillingVars = fillingPrompt ? extractVars(fillingPrompt.content) : [];
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const openFilling = (item: PromptItem) => {
    setFillingId(item.id);
    setVarValues({});
  };
  const fillAndCopy = async () => {
    if (!fillingPrompt) return;
    const filled = fillVars(fillingPrompt.content, varValues);
    await Clipboard.setStringAsync(filled);
    onCopied?.();
    await recordCopy(fillingPrompt.id);
    setFillingId(null);
    setVarValues({});
    setCopiedId(fillingPrompt.id);
    setTimeout(() => setCopiedId((cur) => (cur === fillingPrompt.id ? null : cur)), 1200);
    await reload();
    showToast('已填充并复制');
  };

  const isJsonLike = (text: string): boolean => {
    try { JSON.parse(text); return true; } catch { return false; }
  };

  const renderRow = (item: PromptItem) => {
    const checked = selected.has(item.id);
    if (combineMode) {
      // 多选模式：整行勾选，左侧勾选框
      return (
        <TouchableOpacity
          style={[styles.item, { borderColor: checked ? theme.link : theme.border, backgroundColor: checked ? `${theme.link}10` : 'transparent' }]}
          onPress={() => toggleSelect(item.id)}
        >
          <View style={[styles.checkbox, { borderColor: checked ? theme.link : theme.border, backgroundColor: checked ? theme.link : 'transparent' }]}>
            {checked ? <Check size={14} color="#FFFFFF" /> : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>{item.content}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[styles.item, { borderColor: theme.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.content}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
            {item.folderId ? (
              <Text style={[styles.folderHint, { color: theme.link }]} numberOfLines={1}>
                {folders.find((f) => f.id === item.folderId)?.name ?? '已删分组'}
              </Text>
            ) : null}
            {item.content.includes('{{') ? (
              <TouchableOpacity style={styles.varBadge} onPress={() => openFilling(item)}>
                <Text style={styles.varBadgeText}>变量</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { borderColor: theme.border }]}
          onPress={() => setAssigningId(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <MoreHorizontal size={16} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.copyBtn, { backgroundColor: copiedId === item.id ? '#34C759' : theme.link }]}
          onPress={() => copy(item)}
        >
          {copiedId === item.id ? (
            <Check size={16} color="#FFFFFF" />
          ) : (
            <Copy size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const showRecent = !query.trim() && recent.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              maxHeight: Math.min(height * 0.84, 640),
              paddingBottom: Math.max(24, insets.bottom + 18),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.header, { color: theme.heading }]}>提示词快贴</Text>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                搜索后点按复制，或组合多条后一起复制。
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: theme.border }]} onPress={onClose}>
              <X size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.search, { color: theme.text }]}
              placeholder="搜索提示词"
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 分组筛选行 */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.chip, activeFolder === undefined && { backgroundColor: theme.link, borderColor: theme.link }]}
                onPress={() => setActiveFolder(undefined)}
              >
                <Text style={[styles.chipText, activeFolder === undefined && { color: '#fff' }]}>全部</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, activeFolder === null && { backgroundColor: theme.link, borderColor: theme.link }]}
                onPress={() => setActiveFolder(null)}
              >
                <Text style={[styles.chipText, activeFolder === null && { color: '#fff' }]}>未分组</Text>
              </TouchableOpacity>
              {folders.map((f) => {
                const on = activeFolder === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, on && { backgroundColor: theme.link, borderColor: theme.link }]}
                    onPress={() => setActiveFolder(on ? undefined : f.id)}
                  >
                    <FolderIcon size={12} color={on ? '#fff' : theme.textSecondary} />
                    <Text style={[styles.chipText, on && { color: '#fff' }]} numberOfLines={1}>{f.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[styles.chip, { borderStyle: 'dashed' }]} onPress={() => setFolderMgr(true)}>
                <FolderPlus size={12} color={theme.link} />
                <Text style={[styles.chipText, { color: theme.link }]}>管理</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 标签筛选行（仅当有标签时显示） */}
          {allTags.length > 0 ? (
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.chipSmall, activeTag === undefined && { backgroundColor: theme.surface }]}
                  onPress={() => setActiveTag(undefined)}
                >
                  <Text style={[styles.chipSmallText, { color: activeTag === undefined ? theme.link : theme.textSecondary }]}>不限标签</Text>
                </TouchableOpacity>
                {allTags.map((t) => {
                  const on = activeTag === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chipSmall, on && { backgroundColor: theme.link }]}
                      onPress={() => setActiveTag(on ? undefined : t)}
                    >
                      <Text style={[styles.chipSmallText, { color: on ? '#fff' : theme.textSecondary }]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={[styles.importActions, compact && styles.importActionsCompact]}>
            <TouchableOpacity
              style={[styles.importBtn, { borderColor: theme.border, backgroundColor: combineMode ? theme.link : theme.codeBackground }]}
              onPress={combineMode ? exitCombine : enterCombine}
            >
              <Combine size={14} color={combineMode ? '#fff' : theme.text} />
              <Text style={{ color: combineMode ? '#fff' : theme.text, fontSize: 13, marginLeft: 6 }}>{combineMode ? '退出多选' : '组合复制'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
              onPress={startImport}
            >
              <ClipboardPaste size={14} color={theme.text} />
              <Text style={{ color: theme.text, fontSize: 13, marginLeft: 6 }}>从剪贴板导入</Text>
            </TouchableOpacity>
            {currentContent ? (
              <TouchableOpacity
                style={[styles.importBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
                onPress={importCurrent}
              >
                <FilePlus size={14} color={theme.text} />
                <Text style={{ color: theme.text, fontSize: 13, marginLeft: 6 }}>从当前文件导入</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            style={styles.list}
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderRow(item)}
            ListHeaderComponent={
              showRecent ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>最近复制</Text>
                  {recent.map((item) => (
                    <View key={item.id}>{renderRow(item)}</View>
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                {query.trim() ? '没有匹配的提示词' : '暂无提示词'}
              </Text>
            }
          />

          {/* 多选模式底部操作栏 */}
          {combineMode ? (
            <View style={[styles.combineBar, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
              <Text style={[styles.combineCount, { color: theme.textSecondary }]}>
                已选 {selected.size} / {results.length}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.combineBtn, { borderColor: theme.border, backgroundColor: theme.codeBackground }]}
                  onPress={selectAllVisible}
                >
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>全选</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.combineBtn, { backgroundColor: theme.link, borderColor: theme.link }]}
                  onPress={copySelected}
                  disabled={selected.size === 0}
                >
                  <Combine size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 4 }}>合并复制</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {toast ? <Text style={[styles.toast, { color: theme.textSecondary }]}>{toast}</Text> : null}
        </Pressable>
      </Pressable>

      <Modal visible={importing} animationType="fade" transparent onRequestClose={cancelImport}>
        <Pressable style={styles.overlay} onPress={cancelImport}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[styles.dialogTitle, { color: theme.heading }]}>导入提示词</Text>
            <Text style={[styles.dialogHint, { color: theme.textSecondary }]}>
              可编辑标题，留空则使用内容前 20 字。
            </Text>
            <TextInput
              style={[
                styles.dialogInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
              placeholder="标题（可省略）"
              placeholderTextColor={theme.textSecondary}
              value={importTitle}
              onChangeText={setImportTitle}
              autoFocus
            />
            <Text style={[styles.dialogPreview, { color: theme.textSecondary }]} numberOfLines={3}>
              {importContent}
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { borderColor: theme.border }]}
                onPress={cancelImport}
              >
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: theme.link }]}
                onPress={confirmImport}
              >
                <Text style={styles.copyText}>导入</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 分组管理面板 */}
      <Modal visible={folderMgr} animationType="fade" transparent onRequestClose={() => setFolderMgr(false)}>
        <Pressable style={styles.subOverlay} onPress={() => setFolderMgr(false)}>
          <Pressable style={[styles.subSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.subHeader, { color: theme.heading }]}>分组管理</Text>
            <View style={[styles.subInputRow, { borderColor: theme.border }]}>
              <TextInput
                style={[styles.subInput, { color: theme.text }]}
                placeholder="新分组名"
                placeholderTextColor={theme.textSecondary}
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <TouchableOpacity style={[styles.subAddBtn, { backgroundColor: theme.link }]} onPress={handleAddFolder}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>新建</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {folders.length === 0 ? (
                <Text style={[styles.subEmpty, { color: theme.textSecondary }]}>暂无分组</Text>
              ) : (
                folders.map((f) => (
                  <View key={f.id} style={[styles.subItem, { borderColor: theme.border }]}>
                    {renameId === f.id ? (
                      <>
                        <TextInput
                          style={[styles.subInput, { flex: 1, color: theme.text }]}
                          value={renameText}
                          onChangeText={setRenameText}
                          autoFocus
                          onSubmitEditing={() => handleRenameFolder(f.id)}
                        />
                        <TouchableOpacity onPress={() => handleRenameFolder(f.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Check size={16} color={theme.link} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setRenameId(null); setRenameText(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <X size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <FolderIcon size={14} color={theme.link} />
                        <Text style={[styles.subItemName, { color: theme.text }]} numberOfLines={1}>{f.name}</Text>
                        <TouchableOpacity
                          onPress={() => { setRenameId(f.id); setRenameText(f.name); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={{ color: theme.link, fontSize: 12 }}>重命名</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveFolder(f.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ color: theme.error, fontSize: 12 }}>删除</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.subCloseBtn, { borderColor: theme.border }]} onPress={() => setFolderMgr(false)}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>关闭</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 归入分组面板（单条提示词） */}
      <Modal visible={assigningId !== null} animationType="fade" transparent onRequestClose={() => setAssigningId(null)}>
        <Pressable style={styles.subOverlay} onPress={() => setAssigningId(null)}>
          <Pressable style={[styles.subSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.subHeader, { color: theme.heading }]}>归入分组</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[styles.subItem, { borderColor: theme.border }]}
                onPress={() => assigningId && handleAssignFolder(assigningId, undefined)}
              >
                <Text style={[styles.subItemName, { color: theme.textSecondary }]}>未分组</Text>
              </TouchableOpacity>
              {folders.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.subItem, { borderColor: theme.border }]}
                  onPress={() => assigningId && handleAssignFolder(assigningId, f.id)}
                >
                  <FolderIcon size={14} color={theme.link} />
                  <Text style={[styles.subItemName, { color: theme.text }]} numberOfLines={1}>{f.name}</Text>
                </TouchableOpacity>
              ))}
              {folders.length === 0 ? (
                <Text style={[styles.subEmpty, { color: theme.textSecondary }]}>还没有分组，先到「管理」新建</Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={[styles.subCloseBtn, { borderColor: theme.border }]} onPress={() => setAssigningId(null)}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 变量模板填充面板 */}
      <Modal visible={fillingId !== null} animationType="fade" transparent onRequestClose={() => setFillingId(null)}>
        <Pressable style={styles.subOverlay} onPress={() => setFillingId(null)}>
          <Pressable style={[styles.subSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.subHeader, { color: theme.heading }]} numberOfLines={1}>
              {fillingPrompt?.title ?? '填充变量'}
            </Text>
            {fillingVars.length === 0 ? (
              <Text style={[styles.subEmpty, { color: theme.textSecondary }]}>该提示词没有可填充的变量</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {fillingVars.map((v) => (
                  <View key={v} style={[styles.subInputRow, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.link, fontSize: 13, fontWeight: '700', minWidth: 80 }} numberOfLines={1}>{v}</Text>
                    <TextInput
                      style={[styles.subInput, { color: theme.text }]}
                      placeholder={`填入 ${v}`}
                      placeholderTextColor={theme.textSecondary}
                      value={varValues[v] ?? ''}
                      onChangeText={(t) => setVarValues((prev) => ({ ...prev, [v]: t }))}
                      multiline
                    />
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.subCloseBtn, { borderColor: theme.border, flex: 1 }]}
                onPress={() => setFillingId(null)}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subCloseBtn, { backgroundColor: theme.link, borderColor: theme.link, flex: 1 }]}
                onPress={fillAndCopy}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>填充并复制</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  searchRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  search: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  clearQuery: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  importActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  importActionsCompact: {
    flexDirection: 'column',
  },
  list: {
    flex: 1,
  },
  section: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  preview: {
    fontSize: 12,
    marginTop: 3,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
  },
  toast: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  dialog: {
    marginHorizontal: 32,
    padding: 16,
    borderRadius: 12,
    alignSelf: 'center',
    width: '80%',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dialogHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  dialogInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  dialogPreview: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  // 分组 / 标签筛选
  filterRow: {
    marginTop: 8,
  },
  filterScroll: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F2F4F7',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  chipSmall: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSmallText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  folderHint: {
    fontSize: 10,
    fontWeight: '600',
  },
  varBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
  },
  varBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  // 多选
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  combineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    paddingHorizontal: 4,
  },
  combineCount: {
    fontSize: 13,
  },
  combineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  // 子面板（分组管理 / 归入分组）
  subOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subSheet: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  subInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  subInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
  subAddBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 6,
  },
  subItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 0,
  },
  subEmpty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
  },
  subCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
