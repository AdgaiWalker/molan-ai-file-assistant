export interface DesktopSyncLoginRequest {
  serverUrl: string;
  phoneNumber: string;
  code: string;
}

export interface DesktopSyncStatus {
  loggedIn: boolean;
  deviceId: string | null;
  serverUrl: string | null;
  cursor: string | null;
  lastSyncAt: string | null;
  syncing: boolean;
  errorCode: string | null;
}

export interface DesktopAiReadStatus {
  allowed: boolean;
  scopeType: 'document' | 'collection' | null;
  scopeKey: string | null;
  grantedAt: string | null;
  lastReadAt: string | null;
  lastReadVia: string | null;
  lastReadResult: string | null;
  lastReadVersionId: string | null;
  lastReadArtifactId: string | null;
  lastErrorCode: string | null;
}

export interface DesktopReadableTarget {
  kind: string;
  outputPath: string;
  readableSource: 'derived_artifact' | 'original';
  sourceVersionId: string;
  sourceArtifactId: string | null;
}

export interface DesktopInboxDocument {
  id: string;
  title: string;
  originalFormat: string;
  state: string;
  updatedAt: string;
  currentVersionId: string | null;
  contentHash: string | null;
  sizeBytes: number | null;
  sourceDeviceId: string;
  readableFormat: string | null;
  readableSource: 'derived_artifact' | 'original' | null;
  versionCount: number;
  derivedArtifactCount: number;
  aiResultCount: number;
  aiReadStatus: DesktopAiReadStatus;
}

export interface DesktopDocumentVersionSnapshot {
  id: string;
  sourceDeviceId: string;
  originalFormat: string;
  contentHash: string;
  sizeBytes: number;
  fileObjectId: string;
  parentVersionId: string | null;
  localPath: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DesktopDerivedArtifactSnapshot {
  id: string;
  sourceVersionId: string;
  sourceDeviceId: string;
  fileObjectId: string;
  format: string;
  mediaType: string;
  contentHash: string;
  sizeBytes: number;
  localPath: string;
  generatorName: string;
  generatorVersion: string;
  warnings: string[];
  durationMs: number;
  mediaDirectory: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DesktopAiResultSnapshot {
  id: string;
  sourceVersionId: string;
  sourceArtifactId: string | null;
  sourceDeviceId: string;
  fileObjectId: string;
  resultType: string;
  format: string;
  mediaType: string;
  contentHash: string;
  sizeBytes: number;
  localPath: string;
  generatorName: string;
  generatorVersion: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DesktopDocumentFamilySnapshot {
  document: DesktopInboxDocument & {
    createdAt: string;
    deletedAt: string | null;
  };
  versions: DesktopDocumentVersionSnapshot[];
  derivedArtifacts: DesktopDerivedArtifactSnapshot[];
  aiResults: DesktopAiResultSnapshot[];
  aiReadStatus: DesktopAiReadStatus;
  preferredReadableTarget: DesktopReadableTarget | null;
}

export interface DesktopSyncSnapshot {
  status: DesktopSyncStatus;
  documents: DesktopInboxDocument[];
  deviceDeletedDocuments: DesktopInboxDocument[];
  conflicts: DesktopConflict[];
}

export interface DesktopConflict {
  id: string;
  documentId: string;
  localVersionId: string;
  remoteVersionId: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: 'keep_local' | 'keep_remote' | 'save_copy' | 'manual_merge' | null;
}

export type DeleteScope = 'current_device' | 'cloud' | 'all_devices';
export type ConflictResolution = 'keep_local' | 'keep_remote' | 'save_copy' | 'manual_merge';

export type InboxChange = {
  eventId: string;
  cursor: string;
  operation: 'upsert' | 'delete' | 'archive' | 'restore';
} & (
  | {
      kind: 'document';
      id: string;
      sourceDeviceId: string;
      title: string;
      originalFormat: string;
      currentVersionId: string | null;
      state: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
    }
  | {
      kind: 'version';
      id: string;
      documentId: string;
      sourceDeviceId: string;
      originalFormat: string;
      contentHash: string;
      sizeBytes: number;
      fileObjectId: string;
      parentVersionId: string | null;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      localPath: string;
      conflict: boolean;
    }
  | {
      kind: 'ai_result';
      id: string;
      documentId: string;
      sourceVersionId: string;
      sourceArtifactId: string | null;
      sourceDeviceId: string;
      fileObjectId: string;
      resultType: string;
      format: string;
      mediaType: string;
      contentHash: string;
      sizeBytes: number;
      generatorName: string;
      generatorVersion: string;
      createdAt: string;
      updatedAt: string;
      deletedAt: string | null;
      localPath: string;
    }
  | {
      kind: 'state';
      documentId: string;
      state: string;
      updatedAt: string;
      deletedAt: string | null;
    }
);
