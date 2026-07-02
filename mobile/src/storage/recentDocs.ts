import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentDocKind = 'markdown' | 'json';

export interface RecentDoc {
  id: string;
  title: string;
  kind: RecentDocKind;
  content: string;
  updatedAt: number;
}

const KEY = 'recentDocs:v1';
const LIMIT = 20;

function makeId(kind: RecentDocKind, title: string, content: string): string {
  return `${kind}:${title}:${content.length}:${content.slice(0, 64)}`;
}

export async function loadRecentDocs(): Promise<RecentDoc[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const docs = JSON.parse(raw) as RecentDoc[];
  return docs
    .filter((doc) => doc && doc.id && doc.title && doc.kind && typeof doc.content === 'string')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, LIMIT);
}

export async function saveRecentDoc(input: Omit<RecentDoc, 'id' | 'updatedAt'>): Promise<RecentDoc[]> {
  const nextDoc: RecentDoc = {
    ...input,
    id: makeId(input.kind, input.title, input.content),
    updatedAt: Date.now(),
  };
  const current = await loadRecentDocs();
  const next = [nextDoc, ...current.filter((doc) => doc.id !== nextDoc.id)].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentDoc(id: string): Promise<RecentDoc[]> {
  const next = (await loadRecentDocs()).filter((doc) => doc.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
