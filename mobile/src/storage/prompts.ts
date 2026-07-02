import AsyncStorage from '@react-native-async-storage/async-storage';

export type PromptFormat = 'md' | 'json' | 'text';

export interface PromptItem {
  id: string;
  title: string;
  content: string;
  format: PromptFormat;
  tags?: string[];
  folderId?: string;
  copyCount: number;
  lastCopiedAt?: number;
  createdAt: number;
}

export type NewPrompt = Omit<PromptItem, 'id' | 'copyCount' | 'createdAt'>;
export type PromptPatch = Partial<Omit<PromptItem, 'id' | 'createdAt'>>;

const KEY = 'molan.prompts';

const SEED_PROMPTS: PromptItem[] = [
  {
    id: 'seed-summary',
    title: '总结全文',
    content: '请用中文总结以下文档的核心要点，分条列出，每条不超过 30 字：',
    format: 'text',
    tags: ['总结', '摘要'],
    copyCount: 0,
    createdAt: 0,
  },
  {
    id: 'seed-keypoints',
    title: '提取关键信息',
    content: '请从以下内容中提取关键信息（实体、数值、结论），用表格呈现：',
    format: 'text',
    tags: ['提取', '关键信息'],
    copyCount: 0,
    createdAt: 0,
  },
  {
    id: 'seed-translate',
    title: '翻译为英文',
    content: '请将以下内容翻译为英文，保留 Markdown 格式与代码块：',
    format: 'text',
    tags: ['翻译', '英文'],
    copyCount: 0,
    createdAt: 0,
  },
  {
    id: 'seed-rewrite',
    title: '润色改写',
    content: '请将以下内容改写为正式、简洁的书面语气，不遗漏信息：',
    format: 'text',
    tags: ['润色', '改写'],
    copyCount: 0,
    createdAt: 0,
  },
];

async function readAll(): Promise<PromptItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as PromptItem[];
    if (!Array.isArray(data)) return [];
    return data.filter(
      (p) => p && p.id && p.title && typeof p.content === 'string',
    );
  } catch {
    return [];
  }
}

async function writeAll(items: PromptItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {
  }
}

export async function list(): Promise<PromptItem[]> {
  const items = await readAll();
  if (items.length === 0) {
    await writeAll(SEED_PROMPTS);
    return SEED_PROMPTS.slice();
  }
  return items;
}

export async function get(id: string): Promise<PromptItem | null> {
  const items = await readAll();
  return items.find((p) => p.id === id) ?? null;
}

export async function add(input: NewPrompt): Promise<PromptItem[]> {
  const items = await readAll();
  const item: PromptItem = {
    ...input,
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    copyCount: 0,
    createdAt: Date.now(),
  };
  const next = [item, ...items];
  await writeAll(next);
  return next;
}

export async function update(id: string, patch: PromptPatch): Promise<PromptItem[]> {
  const items = await readAll();
  const next = items.map((p) => (p.id === id ? { ...p, ...patch } : p));
  await writeAll(next);
  return next;
}

export async function remove(id: string): Promise<PromptItem[]> {
  const items = await readAll();
  const next = items.filter((p) => p.id !== id);
  await writeAll(next);
  return next;
}

export async function search(query: string): Promise<PromptItem[]> {
  const q = query.trim().toLowerCase();
  const items = await readAll();
  if (!q) return items;
  return items.filter((p) => {
    const inTitle = p.title.toLowerCase().includes(q);
    const inContent = p.content.toLowerCase().includes(q);
    const inTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
    return inTitle || inContent || inTags;
  });
}

export async function recentCopies(n = 10): Promise<PromptItem[]> {
  const items = await readAll();
  return items
    .filter((p) => typeof p.lastCopiedAt === 'number')
    .sort((a, b) => (b.lastCopiedAt ?? 0) - (a.lastCopiedAt ?? 0))
    .slice(0, n);
}

export async function recordCopy(id: string): Promise<void> {
  const items = await readAll();
  const next = items.map((p) =>
    p.id === id
      ? { ...p, copyCount: p.copyCount + 1, lastCopiedAt: Date.now() }
      : p,
  );
  await writeAll(next);
}
