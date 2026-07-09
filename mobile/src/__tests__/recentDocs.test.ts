import { describe, expect, it } from 'vitest';
import { documentStatusText, mergeDocumentStatuses } from '../storage/recentDocs';

describe('recent document status helpers', () => {
  it('defaults to unprocessed when no status exists', () => {
    expect(mergeDocumentStatuses()).toEqual(['unprocessed']);
    expect(documentStatusText({})).toBe('未处理');
  });

  it('merges statuses in stable product order', () => {
    expect(mergeDocumentStatuses(['shared'], ['read', 'copied'], ['converted'])).toEqual([
      'read',
      'copied',
      'converted',
      'shared',
    ]);
  });

  it('removes unprocessed once actionable statuses exist', () => {
    expect(mergeDocumentStatuses(['unprocessed'], ['read'])).toEqual(['read']);
  });

  it('renders user-facing Chinese labels', () => {
    expect(documentStatusText({ statuses: ['read', 'edited', 'synced'] })).toBe('已阅读 · 已编辑 · 已同步');
  });
});
