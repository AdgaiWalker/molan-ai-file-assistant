import type { Writable } from 'node:stream';
import {
  confirmExistingDraft,
  discardExistingDraft,
  getSyncedDocumentVersions,
  listSyncedDocuments,
  readSyncedDocument,
  resolveSyncRoot,
  SYNC_ERROR_CODES,
  writeSyncedResultDraft,
} from './syncedInbox.js';

type JsonRpcMessage = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export async function startMcpStdioServer(syncRootInput: unknown, input: NodeJS.ReadableStream, output: Writable): Promise<void> {
  const syncRoot = resolveSyncRoot(syncRootInput);
  let initialized = false;
  let buffer = '';

  input.setEncoding?.('utf-8');
  input.on('data', async (chunk: string) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const message = JSON.parse(line) as JsonRpcMessage;
      const response = await handleMessage(syncRoot, message, () => {
        initialized = true;
      }, initialized);
      if (response) output.write(`${JSON.stringify(response)}\n`);
    }
  });
}

async function handleMessage(
  syncRoot: string,
  message: JsonRpcMessage,
  markInitialized: () => void,
  initialized: boolean,
) {
  if (message.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: 'molan-mcp',
          version: '1.0.0',
        },
      },
    };
  }

  if (message.method === 'notifications/initialized') {
    markInitialized();
    return null;
  }

  if (!initialized) {
    return rpcError(message.id, -32002, 'MCP 会话尚未完成初始化');
  }

  if (message.method === 'ping') {
    return { jsonrpc: '2.0', id: message.id ?? null, result: {} };
  }

  if (message.method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: message.id ?? null,
      result: {
        tools: [
          {
            name: 'list_documents',
            title: 'List Authorized Documents',
            description: '列出已授权给 AI 的真实收件箱文档元数据。',
            annotations: READ_ONLY_TOOL_ANNOTATIONS,
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'integer', minimum: 1, maximum: 200 },
              },
            },
          },
          {
            name: 'read_document',
            title: 'Read Authorized Document',
            description: '读取已授权文档的 AI 可读正文。',
            annotations: READ_ONLY_TOOL_ANNOTATIONS,
            inputSchema: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
              },
              required: ['documentId'],
            },
          },
          {
            name: 'search_documents',
            title: 'Search Authorized Documents',
            description: '按标题、格式或 ID 搜索已授权文档。',
            annotations: READ_ONLY_TOOL_ANNOTATIONS,
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                limit: { type: 'integer', minimum: 1, maximum: 200 },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_document_versions',
            title: 'Get Document Versions',
            description: '查看已授权文档的版本与派生副本关系。',
            annotations: READ_ONLY_TOOL_ANNOTATIONS,
            inputSchema: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
              },
              required: ['documentId'],
            },
          },
          {
            name: 'write_result',
            title: 'Write AI Result',
            description: '把 AI 结果写成草稿，或在 confirmed=true 时直接写成新版本/新文档。',
            annotations: {
              readOnlyHint: false,
              destructiveHint: false,
              idempotentHint: false,
              openWorldHint: false,
            },
            inputSchema: {
              type: 'object',
              properties: {
                draftId: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                format: { type: 'string', enum: ['markdown', 'json'] },
                resultType: { type: 'string' },
                saveMode: { type: 'string', enum: ['draft', 'new_document', 'new_version'] },
                documentId: { type: 'string' },
                sourceVersionId: { type: 'string' },
                sourceArtifactId: { type: 'string' },
                modelName: { type: 'string' },
                promptTextHash: { type: 'string' },
                requestId: { type: 'string' },
                confirmed: { type: 'boolean' },
                discard: { type: 'boolean' },
              },
            },
          },
        ],
      },
    };
  }

  if (message.method !== 'tools/call') {
    return rpcError(message.id, -32601, '未实现的 MCP 方法');
  }

  const params = message.params ?? {};
  const name = typeof params.name === 'string' ? params.name : '';
  const args = isRecord(params.arguments) ? params.arguments : {};

  if (name === 'list_documents') {
    const result = await listSyncedDocuments(syncRoot, {
      authorizedOnly: true,
      query: typeof args.query === 'string' ? args.query : undefined,
      limit: typeof args.limit === 'number' ? args.limit : undefined,
    });
    return toolResult(message.id, sanitizeListResult(result), result.ok);
  }

  if (name === 'search_documents') {
    const result = await listSyncedDocuments(syncRoot, {
      authorizedOnly: true,
      query: typeof args.query === 'string' ? args.query : undefined,
      limit: typeof args.limit === 'number' ? args.limit : undefined,
    });
    return toolResult(message.id, sanitizeListResult(result), result.ok);
  }

  if (name === 'read_document') {
    const result = await readSyncedDocument(syncRoot, String(args.documentId ?? ''), 'mcp');
    return toolResult(message.id, sanitizeReadResult(result), result.ok);
  }

  if (name === 'get_document_versions') {
    const result = await getSyncedDocumentVersions(syncRoot, String(args.documentId ?? ''));
    return toolResult(message.id, sanitizeVersionsResult(result), result.ok);
  }

  if (name === 'write_result') {
    if (args.discard === true) {
      const result = await discardExistingDraft(syncRoot, String(args.draftId ?? ''));
      return toolResult(message.id, result as any, result.ok);
    }
    if (typeof args.draftId === 'string' && args.confirmed === true) {
      const result = await confirmExistingDraft(syncRoot, args.draftId);
      return toolResult(message.id, result as any, result.ok);
    }
    const result = await writeSyncedResultDraft(syncRoot, {
      title: String(args.title ?? ''),
      format: args.format === 'json' ? 'json' : 'markdown',
      resultType: String(args.resultType ?? 'summary'),
      saveMode: (typeof args.saveMode === 'string' ? args.saveMode : 'draft') as 'draft' | 'new_document' | 'new_version',
      content: String(args.content ?? ''),
      createdBy: 'mcp',
      modelName: typeof args.modelName === 'string' ? args.modelName : undefined,
      promptTextHash: typeof args.promptTextHash === 'string' ? args.promptTextHash : undefined,
      documentIdOrTitle: typeof args.documentId === 'string' ? args.documentId : undefined,
      sourceVersionId: typeof args.sourceVersionId === 'string' ? args.sourceVersionId : undefined,
      sourceArtifactId: typeof args.sourceArtifactId === 'string' ? args.sourceArtifactId : undefined,
      requestId: typeof args.requestId === 'string' ? args.requestId : undefined,
      confirmed: args.confirmed === true,
    });
    return toolResult(message.id, result as any, result.ok);
  }

  return rpcError(message.id, -32601, '未实现的 MCP 工具');
}

function sanitizeListResult(result: any) {
  if (!result.ok) return result;
  return {
    documents: result.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      updatedAt: item.updatedAt,
      aiReadable: item.aiReadable,
      aiGrantScope: item.aiGrantScope,
      aiGrantScopeKey: item.aiGrantScopeKey,
      grantedAt: item.grantedAt,
      lastReadAt: item.lastReadAt,
      lastReadVia: item.lastReadVia,
      lastReadResult: item.lastReadResult,
      lastReadVersionId: item.lastReadVersionId,
      lastReadArtifactId: item.lastReadArtifactId,
      lastReadErrorCode: item.lastReadErrorCode,
    })),
  };
}

function sanitizeReadResult(result: any) {
  if (!result.ok) return result;
  const item = result.results[0];
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    content: item.content,
    updatedAt: item.updatedAt,
    readableSource: item.readableSource,
    aiGrantScope: item.aiGrantScope,
    aiGrantScopeKey: item.aiGrantScopeKey,
    auditResult: item.auditResult,
    sourceVersionId: item.sourceVersionId,
    sourceArtifactId: item.sourceArtifactId,
  };
}

function sanitizeVersionsResult(result: any) {
  if (!result.ok) return result;
  return result.results[0];
}

function toolResult(id: string | number | null | undefined, structuredContent: Record<string, unknown>, ok: boolean) {
  const errorContent = !ok && typeof structuredContent.errorCode === 'string'
    ? `${structuredContent.errorCode}: ${structuredContent.error ?? 'tool failed'}`
    : `ok: ${Array.isArray((structuredContent as any).documents) ? (structuredContent as any).documents.length : 1}`;
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    result: {
      content: [{ type: 'text', text: ok ? JSON.stringify(structuredContent) : errorContent }],
      structuredContent,
      isError: !ok,
    },
  };
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export { SYNC_ERROR_CODES };
