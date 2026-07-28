import * as fs from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { InboxIndex } from '../../electron/main/inboxIndex.js';
import { pendingAiResultPath, type PendingAiResultSync } from '../../src/shared/pendingAiResultSync.js';
// @ts-expect-error contracts 目录当前导出的是共享 JS 参考实现，尚未提供单独声明文件
import { validateAiResultEnvelope } from '../../../contracts/src/ai-result.mjs';

export const SYNC_ERROR_CODES = {
  SYNC_ROOT_REQUIRED: 'E_SYNC_ROOT_REQUIRED',
  SYNC_EMPTY: 'E_SYNC_EMPTY',
  SYNC_DOCUMENT_NOT_FOUND: 'E_SYNC_DOCUMENT_NOT_FOUND',
  SYNC_READABLE_COPY_MISSING: 'E_SYNC_READABLE_COPY_MISSING',
  AI_READ_NOT_ALLOWED: 'E_AI_READ_NOT_ALLOWED',
  ACCESS_SCOPE_INVALID: 'E_ACCESS_SCOPE_INVALID',
  AI_RESULT_INPUT_REQUIRED: 'E_AI_RESULT_INPUT_REQUIRED',
  AI_RESULT_JSON_INVALID: 'E_AI_RESULT_JSON_INVALID',
  AI_RESULT_DRAFT_NOT_FOUND: 'E_AI_RESULT_DRAFT_NOT_FOUND',
  AI_RESULT_SOURCE_CONFLICT: 'E_AI_RESULT_SOURCE_CONFLICT',
  AI_RESULT_CONFIRM_NOT_ALLOWED: 'E_AI_RESULT_CONFIRM_NOT_ALLOWED',
} as const;

type AiResultDraft = {
  draftId: string;
  requestId: string | null;
  confirmed: boolean;
  confirmedAt: string | null;
  discardedAt: string | null;
  envelope: {
    schemaVersion: '1.0.0';
    sourceDocumentId: string | null;
    sourceVersionId: string | null;
    sourceArtifactId: string | null;
    title: string;
    resultType: string;
    format: 'markdown' | 'json';
    content: string;
    saveMode: 'draft' | 'new_document' | 'new_version';
    createdBy: 'cli' | 'mcp' | 'cloud_api';
    modelName: string | null;
    promptTextHash: string | null;
    createdAt: string;
  };
};

export function resolveSyncRoot(value: unknown): string {
  const explicit = typeof value === 'string' && value.trim() ? value.trim() : process.env['MOLAN_SYNC_ROOT'];
  if (!explicit) throw new Error(SYNC_ERROR_CODES.SYNC_ROOT_REQUIRED);
  return path.resolve(explicit);
}

export async function listSyncedDocuments(
  syncRoot: string,
  options?: { authorizedOnly?: boolean; query?: string; limit?: number },
) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const query = options?.query?.trim().toLowerCase() ?? '';
    const limit = clampLimit(options?.limit);
    const documents = index.listDocuments()
      .filter((doc) => {
        const access = index.aiReadStatus(doc.id);
        if (options?.authorizedOnly && !access.allowed) return false;
        if (!query) return true;
        return [doc.id, doc.title, doc.originalFormat].some((value) => value.toLowerCase().includes(query));
      })
      .slice(0, limit);

    if (documents.length === 0) {
      return {
        ok: false,
        errorCode: query ? SYNC_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND : SYNC_ERROR_CODES.SYNC_EMPTY,
        error: query ? '未找到匹配的真实收件箱文件' : '真实收件箱为空',
        results: [],
      };
    }

    return {
      ok: true,
      total: documents.length,
      success: documents.length,
      failed: 0,
      results: documents.map((doc) => {
        const access = index.aiReadStatus(doc.id);
        const readable = access.allowed ? index.preferredReadableTarget(doc.id) : null;
        return {
          ok: true,
          id: doc.id,
          title: doc.title,
          kind: readable?.kind ?? doc.originalFormat,
          outputPath: readable?.outputPath ?? '',
          updatedAt: doc.updatedAt,
          source: 'synced' as const,
          readableSource: readable?.readableSource ?? null,
          aiReadable: access.allowed,
          aiGrantScope: access.scopeType,
          aiGrantScopeKey: access.scopeKey,
          grantedAt: access.grantedAt,
          lastReadAt: access.lastReadAt,
          lastReadVia: access.lastReadVia,
          lastReadResult: access.lastReadResult,
          lastReadVersionId: access.lastReadVersionId,
          lastReadArtifactId: access.lastReadArtifactId,
          lastReadErrorCode: access.lastErrorCode,
        };
      }),
    };
  } finally {
    index.close();
  }
}

export async function readSyncedDocument(syncRoot: string, idOrTitle: string, entrypoint: 'cli' | 'mcp') {
  const index = await InboxIndex.open(syncRoot);
  try {
    const document = findDocument(index, idOrTitle);
    if (!document) {
      return { ok: false, errorCode: SYNC_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    const access = index.aiReadStatus(document.id);
    const readable = index.preferredReadableTarget(document.id);
    if (!access.allowed) {
      await index.recordAiReadAudit({
        documentId: document.id,
        sourceVersionId: readable?.sourceVersionId ?? null,
        sourceArtifactId: readable?.sourceArtifactId ?? null,
        entrypoint,
        result: 'denied',
        errorCode: SYNC_ERROR_CODES.AI_READ_NOT_ALLOWED,
        readAt: new Date().toISOString(),
      });
      return {
        ok: false,
        errorCode: SYNC_ERROR_CODES.AI_READ_NOT_ALLOWED,
        error: '该文件尚未授权 AI 读取，请先显式授权。',
        results: [],
      };
    }
    if (!readable || !fs.existsSync(readable.outputPath)) {
      await index.recordAiReadAudit({
        documentId: document.id,
        sourceVersionId: readable?.sourceVersionId ?? document.currentVersionId,
        sourceArtifactId: readable?.sourceArtifactId ?? null,
        entrypoint,
        result: 'missing_readable',
        errorCode: SYNC_ERROR_CODES.SYNC_READABLE_COPY_MISSING,
        readAt: new Date().toISOString(),
      });
      return {
        ok: false,
        errorCode: SYNC_ERROR_CODES.SYNC_READABLE_COPY_MISSING,
        error: '真实收件箱中没有可供 AI 读取的文本副本，请先完成转换。',
        results: [],
      };
    }

    const content = fs.readFileSync(readable.outputPath, 'utf-8');
    await index.recordAiReadAudit({
      documentId: document.id,
      sourceVersionId: readable.sourceVersionId,
      sourceArtifactId: readable.sourceArtifactId,
      entrypoint,
      result: 'success',
      errorCode: null,
      readAt: new Date().toISOString(),
    });
    return {
      ok: true,
      total: 1,
      success: 1,
      failed: 0,
      results: [{
        ok: true,
        id: document.id,
        title: document.title,
        kind: readable.kind,
        outputPath: readable.outputPath,
        content,
        updatedAt: document.updatedAt,
        source: 'synced' as const,
        readableSource: readable.readableSource,
        aiGrantScope: access.scopeType,
        aiGrantScopeKey: access.scopeKey,
        auditResult: 'success',
        sourceVersionId: readable.sourceVersionId,
        sourceArtifactId: readable.sourceArtifactId,
      }],
    };
  } finally {
    index.close();
  }
}

export async function setSyncedAccess(syncRoot: string, target: string, scope: unknown, allowed: boolean) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const now = new Date().toISOString();
    if (scope === 'collection') {
      const scopeKey = target.trim() || 'all';
      if (scopeKey !== 'all') {
        return { ok: false, errorCode: SYNC_ERROR_CODES.ACCESS_SCOPE_INVALID, error: '当前只支持 all 集合授权', results: [] };
      }
      await index.setAiReadAccess({ scopeType: 'collection', scopeKey, allowed, now });
      return {
        ok: true,
        total: 1,
        success: 1,
        failed: 0,
        results: [{
          ok: true,
          allowed,
          scopeType: 'collection' as const,
          scopeKey,
          updatedAt: now,
        }],
      };
    }

    const document = findDocument(index, target);
    if (!document) {
      return { ok: false, errorCode: SYNC_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    await index.setAiReadAccess({ scopeType: 'document', scopeKey: document.id, allowed, now });
    return {
      ok: true,
      total: 1,
      success: 1,
      failed: 0,
      results: [{
        ok: true,
        id: document.id,
        title: document.title,
        allowed,
        scopeType: 'document' as const,
        scopeKey: document.id,
        updatedAt: now,
      }],
    };
  } finally {
    index.close();
  }
}

export async function getSyncedDocumentVersions(syncRoot: string, idOrTitle: string) {
  const index = await InboxIndex.open(syncRoot);
  try {
    const document = findDocument(index, idOrTitle);
    if (!document) {
      return { ok: false, errorCode: SYNC_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    const access = index.aiReadStatus(document.id);
    if (!access.allowed) {
      return { ok: false, errorCode: SYNC_ERROR_CODES.AI_READ_NOT_ALLOWED, error: '该文件尚未授权 AI 读取，请先显式授权。', results: [] };
    }
    const family = index.documentFamily(document.id);
    if (!family) {
      return { ok: false, errorCode: SYNC_ERROR_CODES.SYNC_DOCUMENT_NOT_FOUND, error: '未找到真实收件箱文件', results: [] };
    }
    return {
      ok: true,
      total: 1,
      success: 1,
      failed: 0,
      results: [{
        ok: true,
        documentId: family.document.id,
        title: family.document.title,
        currentVersionId: family.document.currentVersionId,
        versions: family.versions.map((version) => ({
          id: version.id,
          originalFormat: version.originalFormat,
          contentHash: version.contentHash,
          sizeBytes: version.sizeBytes,
          parentVersionId: version.parentVersionId,
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
          deletedAt: version.deletedAt,
        })),
        derivedArtifacts: family.derivedArtifacts.map((artifact) => ({
          id: artifact.id,
          sourceVersionId: artifact.sourceVersionId,
          format: artifact.format,
          generator: artifact.generator,
          warnings: artifact.warnings,
          durationMs: artifact.durationMs,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt,
          deletedAt: artifact.deletedAt,
        })),
      }],
    };
  } finally {
    index.close();
  }
}

export async function writeSyncedResultDraft(syncRoot: string, input: {
  title: string;
  format: 'markdown' | 'json';
  resultType: string;
  saveMode: 'draft' | 'new_document' | 'new_version';
  content: string;
  createdBy: 'cli' | 'mcp' | 'cloud_api';
  modelName?: string;
  promptTextHash?: string;
  documentIdOrTitle?: string;
  sourceVersionId?: string;
  sourceArtifactId?: string;
  requestId?: string;
  confirmed?: boolean;
}) {
  const now = new Date().toISOString();
  const index = await InboxIndex.open(syncRoot);
  try {
    const sourceDocument = input.documentIdOrTitle ? findDocument(index, input.documentIdOrTitle) : null;
    const sourceVersionId = sourceDocument
      ? input.sourceVersionId?.trim() || sourceDocument.currentVersionId
      : null;
    const envelope = {
      schemaVersion: '1.0.0' as const,
      sourceDocumentId: sourceDocument?.id ?? null,
      sourceVersionId,
      sourceArtifactId: input.sourceArtifactId?.trim() || null,
      title: input.title,
      resultType: input.resultType,
      format: input.format,
      content: input.content,
      saveMode: input.saveMode,
      createdBy: input.createdBy,
      modelName: input.modelName?.trim() || null,
      promptTextHash: input.promptTextHash?.trim() || null,
      createdAt: now,
    };
    try {
      validateAiResultEnvelope(envelope);
    } catch (error) {
      return {
        ok: false,
        errorCode: error instanceof Error && error.message.includes('JSON.parse')
          ? SYNC_ERROR_CODES.AI_RESULT_JSON_INVALID
          : SYNC_ERROR_CODES.AI_RESULT_INPUT_REQUIRED,
        error: error instanceof Error ? error.message : String(error),
        results: [],
      };
    }

    const existing = input.requestId ? await findDraftByRequestId(syncRoot, input.requestId) : null;
    const draft = existing ?? {
      draftId: newDraftId(),
      requestId: input.requestId?.trim() || null,
      confirmed: false,
      confirmedAt: null,
      discardedAt: null,
      envelope,
    };
    if (!existing) await persistDraft(syncRoot, draft);
    if (input.confirmed) {
      return confirmExistingDraft(syncRoot, draft.draftId);
    }
    return {
      ok: true,
      confirmed: false,
      draftId: draft.draftId,
      requestId: draft.requestId,
      saveMode: draft.envelope.saveMode,
      title: draft.envelope.title,
      sourceDocumentId: draft.envelope.sourceDocumentId,
      sourceVersionId: draft.envelope.sourceVersionId,
      sourceArtifactId: draft.envelope.sourceArtifactId,
      results: [{
        ok: true,
        draftId: draft.draftId,
        confirmed: false,
        saveMode: draft.envelope.saveMode,
        title: draft.envelope.title,
      }],
    };
  } finally {
    index.close();
  }
}

export async function confirmExistingDraft(syncRoot: string, draftId: string) {
  const draft = await readDraft(syncRoot, draftId);
  if (!draft || draft.discardedAt) {
    return {
      ok: false,
      errorCode: SYNC_ERROR_CODES.AI_RESULT_DRAFT_NOT_FOUND,
      error: '未找到待确认的 AI 结果草稿',
      results: [],
    };
  }
  if (draft.envelope.saveMode === 'draft') {
    return {
      ok: false,
      errorCode: SYNC_ERROR_CODES.AI_RESULT_CONFIRM_NOT_ALLOWED,
      error: '草稿模式不会生成正式版本，请改用 new_document 或 new_version',
      results: [],
    };
  }
  if (draft.confirmed) {
    return {
      ok: true,
      confirmed: true,
      draftId: draft.draftId,
      results: [{
        ok: true,
        draftId: draft.draftId,
        confirmed: true,
      }],
    };
  }

  const index = await InboxIndex.open(syncRoot);
  try {
    try {
      const saved = await index.saveConfirmedAiResult({
        ...draft.envelope,
        saveMode: draft.envelope.saveMode,
      });
      await persistPendingAiResultSync(
        syncRoot,
        buildPendingAiResultSync(index, saved, draft.envelope.saveMode),
      );
      draft.confirmed = true;
      draft.confirmedAt = new Date().toISOString();
      await persistDraft(syncRoot, draft);
      return {
        ok: true,
        confirmed: true,
        draftId: draft.draftId,
        documentId: saved.documentId,
        versionId: saved.versionId,
        aiResultId: saved.aiResultId,
        title: saved.title,
        outputPath: saved.outputPath,
        saveMode: draft.envelope.saveMode,
        sourceVersionId: saved.sourceVersionId,
        results: [{
          ok: true,
          draftId: draft.draftId,
          confirmed: true,
          documentId: saved.documentId,
          versionId: saved.versionId,
          aiResultId: saved.aiResultId,
          title: saved.title,
          outputPath: saved.outputPath,
          saveMode: draft.envelope.saveMode,
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConflict = message.includes('来源版本已更新');
      return {
        ok: false,
        errorCode: isConflict ? SYNC_ERROR_CODES.AI_RESULT_SOURCE_CONFLICT : SYNC_ERROR_CODES.AI_RESULT_INPUT_REQUIRED,
        error: message,
        results: [],
      };
    }
  } finally {
    index.close();
  }
}

export async function discardExistingDraft(syncRoot: string, draftId: string) {
  const draft = await readDraft(syncRoot, draftId);
  if (!draft) {
    return {
      ok: false,
      errorCode: SYNC_ERROR_CODES.AI_RESULT_DRAFT_NOT_FOUND,
      error: '未找到待删除的 AI 结果草稿',
      results: [],
    };
  }
  draft.discardedAt = new Date().toISOString();
  await persistDraft(syncRoot, draft);
  await rm(draftPath(syncRoot, draftId), { force: true });
  return {
    ok: true,
    discarded: true,
    draftId,
    results: [{
      ok: true,
      discarded: true,
      draftId,
    }],
  };
}

function findDocument(index: InboxIndex, idOrTitle: string) {
  const normalized = idOrTitle.trim();
  if (!normalized || normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
    return null;
  }
  return index.listDocuments().find((item) => item.id === normalized || item.title === normalized) ?? null;
}

function clampLimit(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || value === undefined) return 50;
  return Math.max(1, Math.min(value, 200));
}

async function persistDraft(syncRoot: string, draft: AiResultDraft) {
  await mkdir(draftDirectory(syncRoot), { recursive: true });
  await writeFile(draftPath(syncRoot, draft.draftId), JSON.stringify(draft, null, 2), 'utf-8');
}

async function persistPendingAiResultSync(syncRoot: string, queue: PendingAiResultSync) {
  const target = pendingAiResultPath(syncRoot, queue.queueId);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(queue, null, 2), 'utf-8');
}

async function readDraft(syncRoot: string, draftId: string): Promise<AiResultDraft | null> {
  const target = draftPath(syncRoot, draftId.trim());
  try {
    return JSON.parse(await readFile(target, 'utf-8')) as AiResultDraft;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function findDraftByRequestId(syncRoot: string, requestId: string): Promise<AiResultDraft | null> {
  try {
    const entries = await readdir(draftDirectory(syncRoot));
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const draft = await readDraft(syncRoot, entry.replace(/\.json$/, ''));
      if (draft?.requestId === requestId.trim() && !draft.discardedAt) return draft;
    }
    return null;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function draftDirectory(syncRoot: string) {
  return path.join(syncRoot, 'result-drafts');
}

function draftPath(syncRoot: string, draftId: string) {
  return path.join(draftDirectory(syncRoot), `${draftId}.json`);
}

function newDraftId() {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildPendingAiResultSync(
  index: InboxIndex,
  saved: Awaited<ReturnType<InboxIndex['saveConfirmedAiResult']>>,
  saveMode: 'new_document' | 'new_version',
): PendingAiResultSync {
  const family = index.documentFamily(saved.documentId);
  if (!family) throw new Error('AI 结果对应文档不存在，无法加入同步队列');
  const version = family.versions.find((item) => item.id === saved.versionId);
  if (!version) throw new Error('AI 结果对应版本不存在，无法加入同步队列');
  const aiResult = family.aiResults.find((item) => item.id === saved.aiResultId);
  if (!aiResult) throw new Error('AI 结果记录不存在，无法加入同步队列');
  const queueId = saved.aiResultId;

  return {
    queueId,
    createdAt: aiResult.createdAt,
    saveMode,
    document: saveMode === 'new_document' ? {
      clientMutationId: newMutationId(),
      documentId: family.document.id,
      versionId: null,
      baseVersionId: null,
      operation: 'upsert',
      upload: null,
      payload: {
        id: family.document.id,
        sourceDeviceId: family.document.sourceDeviceId,
        title: family.document.title,
        originalFormat: family.document.originalFormat,
        currentVersionId: version.id,
        state: family.document.state,
        createdAt: family.document.createdAt,
        updatedAt: family.document.updatedAt,
        deletedAt: family.document.deletedAt,
      },
    } : null,
    version: {
      clientMutationId: newMutationId(),
      documentId: family.document.id,
      versionId: version.id,
      baseVersionId: version.parentVersionId,
      operation: 'upsert',
      upload: {
        clientMutationId: newMutationId(),
        fileObjectId: version.fileObjectId,
        role: 'original',
        format: version.originalFormat,
        mediaType: mediaTypeForFormat(version.originalFormat),
        contentHash: version.contentHash,
        sizeBytes: version.sizeBytes,
        localPath: version.localPath,
      },
      payload: {
        id: version.id,
        documentId: version.documentId,
        sourceDeviceId: version.sourceDeviceId,
        originalFormat: version.originalFormat,
        contentHash: version.contentHash,
        sizeBytes: version.sizeBytes,
        fileObjectId: version.fileObjectId,
        parentVersionId: version.parentVersionId,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        deletedAt: version.deletedAt,
      },
    },
    aiResult: {
      clientMutationId: newMutationId(),
      documentId: aiResult.documentId,
      versionId: null,
      baseVersionId: null,
      operation: 'upsert',
      upload: {
        clientMutationId: newMutationId(),
        fileObjectId: aiResult.fileObjectId,
        role: 'ai_result',
        format: aiResult.format,
        mediaType: aiResult.mediaType,
        contentHash: aiResult.contentHash,
        sizeBytes: aiResult.sizeBytes,
        localPath: aiResult.localPath,
      },
      payload: {
        id: aiResult.id,
        documentId: aiResult.documentId,
        sourceVersionId: aiResult.sourceVersionId,
        sourceArtifactId: aiResult.sourceArtifactId,
        sourceDeviceId: aiResult.sourceDeviceId,
        fileObjectId: aiResult.fileObjectId,
        resultType: aiResult.resultType,
        format: aiResult.format,
        mediaType: aiResult.mediaType,
        contentHash: aiResult.contentHash,
        sizeBytes: aiResult.sizeBytes,
        generatorName: aiResult.generator.name,
        generatorVersion: aiResult.generator.version,
        createdAt: aiResult.createdAt,
        updatedAt: aiResult.updatedAt,
        deletedAt: aiResult.deletedAt,
      },
    },
  };
}

function newMutationId() {
  return `mut_${randomUUID()}`;
}

function mediaTypeForFormat(format: string): string {
  return format === 'json' ? 'application/json' : 'text/markdown';
}
