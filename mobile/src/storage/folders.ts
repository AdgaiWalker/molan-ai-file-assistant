// 提示词分组（folder）存储 —— 纯逻辑 + AsyncStorage 持久化。
// folder 是轻量结构：id + name。提示词通过 PromptItem.folderId 关联（见 prompts.ts）。
// 分组函数（collectTags / groupByFolder）是纯逻辑，UI 状态错了不会立刻崩但筛选会乱，故单测覆盖。
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PromptItem } from './prompts';

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

const KEY = 'molan.folders';

/** 从所有提示词里收集去重后的标签，按字母序（中文按 unicode）。 */
export function collectTags(items: PromptItem[]): string[] {
  const set = new Set<string>();
  for (const p of items) {
    if (Array.isArray(p.tags)) {
      for (const t of p.tags) {
        const trimmed = (t || '').trim();
        if (trimmed) set.add(trimmed);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** 按分组归类提示词；folderId 为 undefined 的归到「未分组」。返回保持插入顺序。 */
export function groupByFolder(items: PromptItem[]): { folderId: string | null; items: PromptItem[] }[] {
  const order: (string | null)[] = [];
  const map = new Map<string | null, PromptItem[]>();
  for (const p of items) {
    const key = p.folderId ?? null;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(p);
  }
  return order.map((folderId) => ({ folderId, items: map.get(folderId)! }));
}

/** 筛选：按分组 + 标签。folderId=null 表示「未分组」；folderId=undefined 表示「全部」。
 *  tag=null/undefined 表示「不限标签」。 */
export function filterPrompts(
  items: PromptItem[],
  folderId: string | null | undefined,
  tag: string | null | undefined,
): PromptItem[] {
  return items.filter((p) => {
    if (folderId !== undefined) {
      const pFolder = p.folderId ?? null;
      if (pFolder !== folderId) return false;
    }
    if (tag) {
      if (!Array.isArray(p.tags) || !p.tags.includes(tag)) return false;
    }
    return true;
  });
}

// ── 持久化 CRUD ──

async function readAll(): Promise<Folder[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as Folder[];
    return Array.isArray(data) ? data.filter((f) => f && f.id && f.name) : [];
  } catch {
    return [];
  }
}

async function writeAll(folders: Folder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(folders));
  } catch {
    /* 忽略 */
  }
}

export async function listFolders(): Promise<Folder[]> {
  const folders = await readAll();
  return folders.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addFolder(name: string): Promise<Folder[]> {
  const trimmed = name.trim();
  if (!trimmed) return readAll();
  const folders = await readAll();
  // 重名不重复加
  if (folders.some((f) => f.name === trimmed)) return folders;
  const folder: Folder = {
    id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    createdAt: Date.now(),
  };
  const next = [...folders, folder];
  await writeAll(next);
  return next.sort((a, b) => a.createdAt - b.createdAt);
}

export async function renameFolder(id: string, name: string): Promise<Folder[]> {
  const trimmed = name.trim();
  if (!trimmed) return readAll();
  const folders = (await readAll()).map((f) => (f.id === id ? { ...f, name: trimmed } : f));
  await writeAll(folders);
  return folders.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFolder(id: string): Promise<Folder[]> {
  // 注意：删分组不删提示词，但要把该分组下提示词的 folderId 清掉（避免悬空引用）。
  // 提示词的清理在 prompts.ts 侧做；这里只删分组本身。
  const folders = (await readAll()).filter((f) => f.id !== id);
  await writeAll(folders);
  return folders.sort((a, b) => a.createdAt - b.createdAt);
}
