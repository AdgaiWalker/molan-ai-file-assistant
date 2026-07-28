import path from 'node:path';

export interface PendingFileUpload {
  clientMutationId: string;
  fileObjectId: string;
  role: 'original' | 'ai_result';
  format: string;
  mediaType: string;
  contentHash: string;
  sizeBytes: number;
  localPath: string;
}

export interface PendingSyncMutation {
  clientMutationId: string;
  documentId: string;
  versionId: string | null;
  baseVersionId: string | null;
  operation: 'upsert';
  payload: Record<string, unknown>;
  upload: PendingFileUpload | null;
}

export interface PendingAiResultSync {
  queueId: string;
  createdAt: string;
  saveMode: 'new_document' | 'new_version';
  document: PendingSyncMutation | null;
  version: PendingSyncMutation;
  aiResult: PendingSyncMutation;
}

export function pendingAiResultDirectory(syncRoot: string): string {
  return path.join(syncRoot, 'pending-ai-results');
}

export function pendingAiResultPath(syncRoot: string, queueId: string): string {
  return path.join(pendingAiResultDirectory(syncRoot), `${queueId}.json`);
}
