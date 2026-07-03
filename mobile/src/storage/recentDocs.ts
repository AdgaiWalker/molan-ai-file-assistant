import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentDocKind = 'markdown' | 'json';
export type DocSource = 'wechat' | 'qq' | 'fileManager' | 'documentPicker' | 'recent' | 'other';
export type DocumentStatus =
  | 'unprocessed'
  | 'read'
  | 'copied'
  | 'edited'
  | 'converted'
  | 'shared'
  | 'archived'
  | 'synced'
  | 'conflict';

export interface RecentDoc {
  id: string;
  title: string;
  kind: RecentDocKind;
  content: string;
  updatedAt: number;
  source?: DocSource;
  statuses?: DocumentStatus[];
  readAt?: number;
  lastEditedAt?: number;
  lastCopiedAt?: number;
  lastConvertedAt?: number;
  lastSharedAt?: number;
  archivedAt?: number;
  syncedAt?: number;
  conflictAt?: number;
}

const KEY = 'recentDocs:v1';
const LIMIT = 20;

function makeId(kind: RecentDocKind, title: string, content: string): string {
  return `${kind}:${title}:${content.length}:${content.slice(0, 64)}`;
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  unprocessed: '未处理',
  read: '已阅读',
  copied: '已复制',
  edited: '已编辑',
  converted: '已转换',
  shared: '已分享',
  archived: '已归档',
  synced: '已同步',
  conflict: '冲突',
};

const STATUS_ORDER: DocumentStatus[] = [
  'unprocessed',
  'read',
  'copied',
  'edited',
  'converted',
  'shared',
  'archived',
  'synced',
  'conflict',
];

export function mergeDocumentStatuses(...statusLists: Array<DocumentStatus[] | undefined>): DocumentStatus[] {
  const statuses = new Set<DocumentStatus>();
  for (const list of statusLists) {
    for (const status of list ?? []) statuses.add(status);
  }
  if (statuses.size === 0) statuses.add('unprocessed');
  if (statuses.size > 1) statuses.delete('unprocessed');
  return STATUS_ORDER.filter((status) => statuses.has(status));
}

export function documentStatusText(doc: Pick<RecentDoc, 'statuses'>): string {
  return mergeDocumentStatuses(doc.statuses).map((status) => DOCUMENT_STATUS_LABELS[status]).join(' · ');
}

export async function loadRecentDocs(): Promise<RecentDoc[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  const docs = JSON.parse(raw) as RecentDoc[];
  return docs
    .filter((doc) => doc && doc.id && doc.title && doc.kind && typeof doc.content === 'string')
    .map((doc) => ({ ...doc, statuses: mergeDocumentStatuses(doc.statuses) }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, LIMIT);
}

export async function saveRecentDoc(input: Omit<RecentDoc, 'id' | 'updatedAt'>): Promise<RecentDoc[]> {
  const current = await loadRecentDocs();
  const id = makeId(input.kind, input.title, input.content);
  const existing = current.find((doc) => doc.id === id);
  const nextDoc: RecentDoc = {
    ...existing,
    ...input,
    id,
    updatedAt: Date.now(),
    source: input.source ?? existing?.source,
    statuses: mergeDocumentStatuses(existing?.statuses, input.statuses),
    readAt: input.readAt ?? existing?.readAt,
    lastCopiedAt: input.lastCopiedAt ?? existing?.lastCopiedAt,
    lastEditedAt: input.lastEditedAt ?? existing?.lastEditedAt,
    lastConvertedAt: input.lastConvertedAt ?? existing?.lastConvertedAt,
    lastSharedAt: input.lastSharedAt ?? existing?.lastSharedAt,
    archivedAt: input.archivedAt ?? existing?.archivedAt,
    syncedAt: input.syncedAt ?? existing?.syncedAt,
    conflictAt: input.conflictAt ?? existing?.conflictAt,
  };
  const next = [nextDoc, ...current.filter((doc) => doc.id !== nextDoc.id)].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function removeRecentDoc(id: string): Promise<RecentDoc[]> {
  const next = (await loadRecentDocs()).filter((doc) => doc.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
