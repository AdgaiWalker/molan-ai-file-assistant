import { describe, expect, it } from 'vitest';
import type { DesktopInboxDocument } from '../../shared/sync';
import {
  buildInboxSummary,
  convertDirectionForFormat,
  formatBytes,
  matchesFilter,
  matchesQuery,
  needsConversion,
} from './presentation';

const baseDocument: DesktopInboxDocument = {
  id: 'doc-1',
  title: '项目汇报.pdf',
  originalFormat: 'pdf',
  state: 'synced',
  updatedAt: '2026-07-26T06:31:43.198Z',
  currentVersionId: 'version-1',
  contentHash: 'hash-1',
  sizeBytes: 2_048,
  sourceDeviceId: 'phone-1',
  readableFormat: null,
  readableSource: null,
  versionCount: 1,
  derivedArtifactCount: 0,
  aiResultCount: 0,
  aiReadStatus: {
    allowed: false,
    scopeType: null,
    scopeKey: null,
    grantedAt: null,
    lastReadAt: null,
    lastReadVia: null,
    lastReadResult: null,
    lastReadVersionId: null,
    lastReadArtifactId: null,
    lastErrorCode: null,
  },
};

describe('收件箱展示规则', () => {
  it('按标题、格式、设备和可读格式搜索', () => {
    const document = { ...baseDocument, readableFormat: 'markdown' };

    expect(matchesQuery(document, '项目')).toBe(true);
    expect(matchesQuery(document, 'PDF')).toBe(true);
    expect(matchesQuery(document, 'phone-1')).toBe(true);
    expect(matchesQuery(document, 'markdown')).toBe(true);
    expect(matchesQuery(document, '不存在')).toBe(false);
  });

  it('筛选待转换与 AI 授权状态', () => {
    expect(matchesFilter(baseDocument, 'needs_readable')).toBe(true);
    expect(matchesFilter(baseDocument, 'ai_denied')).toBe(true);
    expect(matchesFilter(baseDocument, 'ai_allowed')).toBe(false);
    expect(matchesFilter({ ...baseDocument, state: 'conflict' }, 'conflict')).toBe(true);
  });

  it('只为支持的原始格式创建转换方向', () => {
    expect(convertDirectionForFormat('pdf')).toBe('pdf2md');
    expect(convertDirectionForFormat('xlsx')).toBe('xlsx2md');
    expect(convertDirectionForFormat('json')).toBeNull();
    expect(needsConversion(baseDocument)).toBe(true);
    expect(needsConversion({ ...baseDocument, readableFormat: 'markdown' })).toBe(false);
  });

  it('汇总文件、可读副本、待转换和冲突数量', () => {
    const readable = { ...baseDocument, id: 'doc-2', readableFormat: 'markdown' };

    expect(buildInboxSummary([baseDocument, readable], 2)).toEqual({
      all: 2,
      readable: 1,
      waiting: 1,
      conflicts: 2,
    });
  });

  it('用一致单位显示文件大小', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2_048)).toBe('2.0 KB');
    expect(formatBytes(2 * 1_024 * 1_024)).toBe('2.0 MB');
  });
});
