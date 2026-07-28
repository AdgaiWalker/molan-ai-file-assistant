import { strings } from '../../constants/strings';
import type { ConvertDirection } from '../../shared/ipc';
import type { DesktopInboxDocument } from '../../shared/sync';

export type InboxFilter = 'all' | 'needs_readable' | 'ai_allowed' | 'ai_denied' | 'conflict' | 'archived';

export interface InboxSummary {
  all: number;
  readable: number;
  waiting: number;
  conflicts: number;
}

export const inboxFilterOptions: ReadonlyArray<{ value: InboxFilter; label: string }> = [
  { value: 'all', label: strings.inboxFilterAll },
  { value: 'needs_readable', label: strings.inboxFilterNeedsReadable },
  { value: 'ai_allowed', label: strings.inboxFilterAiAllowed },
  { value: 'ai_denied', label: strings.inboxFilterAiDenied },
  { value: 'conflict', label: strings.inboxFilterConflict },
  { value: 'archived', label: strings.inboxFilterArchived },
];

const convertDirections: Readonly<Record<string, ConvertDirection>> = {
  docx: 'docx2md',
  pdf: 'pdf2md',
  pptx: 'pptx2md',
  xlsx: 'xlsx2md',
  csv: 'csv2md',
};

const bytesPerKilobyte = 1_024;
const bytesPerMegabyte = bytesPerKilobyte * bytesPerKilobyte;

export function buildInboxSummary(documents: DesktopInboxDocument[], conflictCount: number): InboxSummary {
  return {
    all: documents.length,
    readable: documents.filter((document) => document.readableFormat !== null).length,
    waiting: documents.filter(needsConversion).length,
    conflicts: conflictCount,
  };
}

export function matchesQuery(document: DesktopInboxDocument, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [
    document.title,
    document.originalFormat,
    document.id,
    document.sourceDeviceId,
    document.readableFormat ?? '',
  ].some((value) => value.toLowerCase().includes(query));
}

export function matchesFilter(document: DesktopInboxDocument, filter: InboxFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'needs_readable': return document.readableFormat === null;
    case 'ai_allowed': return document.aiReadStatus.allowed;
    case 'ai_denied': return !document.aiReadStatus.allowed;
    case 'conflict': return document.state === 'conflict';
    case 'archived': return document.state === 'archived';
  }
}

export function convertDirectionForFormat(format: string): ConvertDirection | null {
  return convertDirections[format] ?? null;
}

export function needsConversion(document: DesktopInboxDocument): boolean {
  return document.readableFormat === null && convertDirectionForFormat(document.originalFormat) !== null;
}

export function statusText(state: string): string {
  switch (state) {
    case 'conflict': return strings.conflict;
    case 'archived': return strings.archived;
    case 'collected': return strings.collected;
    case 'device_deleted': return strings.deviceDeleted;
    default: return strings.synced;
  }
}

export function formatBytes(value: number | null): string {
  if (value === null) return '—';
  if (value < bytesPerKilobyte) return `${value} B`;
  if (value < bytesPerMegabyte) return `${(value / bytesPerKilobyte).toFixed(1)} KB`;
  return `${(value / bytesPerMegabyte).toFixed(1)} MB`;
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
