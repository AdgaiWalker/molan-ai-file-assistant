import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  pendingAiResultDirectory,
  pendingAiResultPath,
  type PendingAiResultSync,
  type PendingFileUpload,
  type PendingSyncMutation,
} from '../../src/shared/pendingAiResultSync';
import type {
  DesktopDocumentFamilySnapshot,
  DesktopSyncLoginRequest,
  DesktopSyncSnapshot,
  DesktopSyncStatus,
  ConflictResolution,
  DeleteScope,
  DesktopConflict,
  InboxChange,
} from '../../src/shared/sync';
import { type DerivedArtifactRecord, InboxIndex } from './inboxIndex';

interface SyncCredentials {
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  deviceId: string;
}

interface CredentialCipher {
  seal(value: string): Buffer;
  open(value: Buffer): string;
}

export class DesktopSyncClient {
  private credentials: SyncCredentials | null = null;
  private syncing = false;
  private errorCode: string | null = null;
  private activeSync: Promise<DesktopSyncSnapshot> | null = null;
  private conflicts: DesktopConflict[] = [];

  private constructor(
    private readonly root: string,
    private readonly index: InboxIndex,
    private readonly cipher: CredentialCipher,
  ) {}

  static async open(userData: string, cipher: CredentialCipher): Promise<DesktopSyncClient> {
    const root = path.join(userData, 'sync-inbox');
    const index = await InboxIndex.open(root);
    const client = new DesktopSyncClient(root, index, cipher);
    client.credentials = await client.loadCredentials();
    return client;
  }

  snapshot(): DesktopSyncSnapshot {
    return {
      status: this.status(),
      documents: this.index.listDocuments(),
      deviceDeletedDocuments: this.index.listDeviceDeletedDocuments(),
      conflicts: this.conflicts,
    };
  }

  async login(input: DesktopSyncLoginRequest): Promise<DesktopSyncSnapshot> {
    const serverUrl = normalizeServerUrl(input.serverUrl);
    const installationId = await this.installationId();
    const challenge = await requestJson(serverUrl, '/v1/auth/code/request', {
      method: 'POST',
      body: { phoneNumber: input.phoneNumber },
    });
    const response = await requestJson(serverUrl, '/v1/auth/code/verify', {
      method: 'POST',
      body: {
        challengeId: requiredString(challenge, 'challengeId'),
        code: input.code,
        device: {
          installationId,
          name: os.hostname(),
          type: 'desktop',
          platform: desktopPlatform(),
          appVersion: '1.0.0-dev',
        },
      },
    });
    const device = requiredObject(response, 'device');
    this.credentials = {
      serverUrl,
      accessToken: requiredString(response, 'accessToken'),
      refreshToken: requiredString(response, 'refreshToken'),
      expiresAt: requiredString(response, 'expiresAt'),
      deviceId: requiredString(device, 'id'),
    };
    await this.saveCredentials(this.credentials);
    this.errorCode = null;
    return this.snapshot();
  }

  async logout(): Promise<DesktopSyncSnapshot> {
    const credentials = this.credentials;
    this.credentials = null;
    this.conflicts = [];
    await rm(this.credentialsPath, { force: true });
    if (credentials) {
      await fetch(`${credentials.serverUrl}/v1/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${credentials.accessToken}` },
      }).catch(() => undefined);
    }
    this.errorCode = null;
    return this.snapshot();
  }

  sync(): Promise<DesktopSyncSnapshot> {
    if (this.activeSync) return this.activeSync;
    this.activeSync = this.performSync().finally(() => {
      this.activeSync = null;
      this.syncing = false;
    });
    return this.activeSync;
  }

  readablePath(documentId: string): string | null {
    return this.index.readableFile(documentId)?.localPath ?? null;
  }

  preferredReadablePath(documentId: string): string | null {
    return this.index.preferredReadableTarget(documentId)?.outputPath ?? null;
  }

  documentFamily(documentId: string): DesktopDocumentFamilySnapshot | null {
    const family = this.index.documentFamily(documentId);
    if (!family) return null;
    const preferredReadableTarget = this.index.preferredReadableTarget(documentId);
    return {
      document: family.document,
      versions: family.versions.map((version) => ({
        id: version.id,
        sourceDeviceId: version.sourceDeviceId,
        originalFormat: version.originalFormat,
        contentHash: version.contentHash,
        sizeBytes: version.sizeBytes,
        fileObjectId: version.fileObjectId,
        parentVersionId: version.parentVersionId,
        localPath: version.localPath,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        deletedAt: version.deletedAt,
      })),
      derivedArtifacts: family.derivedArtifacts.map((artifact) => ({
        id: artifact.id,
        sourceVersionId: artifact.sourceVersionId,
        sourceDeviceId: artifact.sourceDeviceId,
        fileObjectId: artifact.fileObjectId,
        format: artifact.format,
        mediaType: artifact.mediaType,
        contentHash: artifact.contentHash,
        sizeBytes: artifact.sizeBytes,
        localPath: artifact.localPath,
        generatorName: artifact.generator.name,
        generatorVersion: artifact.generator.version,
        warnings: artifact.warnings,
        durationMs: artifact.durationMs,
        mediaDirectory: artifact.mediaDirectory,
        createdAt: artifact.createdAt,
        updatedAt: artifact.updatedAt,
        deletedAt: artifact.deletedAt,
      })),
      aiResults: family.aiResults.map((result) => ({
        id: result.id,
        sourceVersionId: result.sourceVersionId,
        sourceArtifactId: result.sourceArtifactId,
        sourceDeviceId: result.sourceDeviceId,
        fileObjectId: result.fileObjectId,
        resultType: result.resultType,
        format: result.format,
        mediaType: result.mediaType,
        contentHash: result.contentHash,
        sizeBytes: result.sizeBytes,
        localPath: result.localPath,
        generatorName: result.generator.name,
        generatorVersion: result.generator.version,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        deletedAt: result.deletedAt,
      })),
      aiReadStatus: this.index.aiReadStatus(documentId),
      preferredReadableTarget: preferredReadableTarget ? {
        kind: preferredReadableTarget.kind,
        outputPath: preferredReadableTarget.outputPath,
        readableSource: preferredReadableTarget.readableSource,
        sourceVersionId: preferredReadableTarget.sourceVersionId,
        sourceArtifactId: preferredReadableTarget.sourceArtifactId,
      } : null,
    };
  }

  async setAiReadAccess(scopeType: 'document' | 'collection', scopeKey: string, allowed: boolean): Promise<DesktopSyncSnapshot> {
    await this.index.setAiReadAccess({
      scopeType,
      scopeKey,
      allowed,
      now: new Date().toISOString(),
    });
    return this.snapshot();
  }

  async archiveDocument(documentId: string): Promise<DesktopSyncSnapshot> {
    const credentials = this.credentials;
    const head = this.index.documentHead(documentId);
    if (!credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    if (!head) throw new DesktopSyncError('E_DOCUMENT_NOT_FOUND', 404);
    await this.authorizedJson(`/v1/documents/${documentId}/archive`, {
      method: 'POST',
      body: {
        clientMutationId: newEntityId('mut_'),
        deviceId: credentials.deviceId,
        baseVersionId: head.currentVersionId,
      },
    });
    return this.sync();
  }

  conflictVersionFile(versionId: string): { title: string; format: string; localPath: string } | null {
    return this.index.conflictVersionFile(versionId);
  }

  recordDerivedArtifact(input: DerivedArtifactRecord): Promise<void> {
    return this.index.recordDerivedArtifact(input);
  }

  recordConversionArtifact(input: {
    inputPath: string;
    outputPath: string;
    outputFormat: string;
    generatorName: string;
    generatorVersion: string;
    warnings: string[];
    durationMs: number;
    mediaDirectory: string | null;
    createdAt: string;
  }): Promise<{ id: string; sourceVersionId: string } | null> {
    return this.index.recordConversionArtifact(input);
  }

  async deleteDocument(documentId: string, scope: DeleteScope): Promise<DesktopSyncSnapshot> {
    const descriptor = this.index.fileDescriptor(documentId);
    const head = this.index.documentHead(documentId);
    if (!descriptor || !head) throw new DesktopSyncError('E_DOCUMENT_NOT_FOUND', 404);
    if (scope === 'current_device') {
      const deletedAt = new Date().toISOString();
      await this.index.markDeviceDeleted(documentId, deletedAt);
      if (this.index.activePathReferenceCount(descriptor.localPath, documentId) === 0) {
        await rm(descriptor.localPath, { force: true });
      }
      return this.snapshot();
    }
    const credentials = this.credentials;
    if (!credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    await this.authorizedJson(`/v1/documents/${documentId}`, {
      method: 'DELETE',
      body: {
        clientMutationId: newEntityId('mut_'),
        deviceId: credentials.deviceId,
        baseVersionId: head.currentVersionId,
        scope,
      },
    });
    return this.sync();
  }

  async restoreDocument(documentId: string, scope: 'current_device' | 'cloud'): Promise<DesktopSyncSnapshot> {
    const descriptor = this.index.fileDescriptor(documentId);
    if (!descriptor) throw new DesktopSyncError('E_DOCUMENT_NOT_FOUND', 404);
    if (scope === 'current_device') {
      const localPath = await this.downloadObject(
        descriptor.fileObjectId,
        descriptor.contentHash,
        descriptor.sizeBytes,
      );
      await this.index.restoreOnDevice(documentId, localPath, new Date().toISOString());
      return this.snapshot();
    }
    const credentials = this.credentials;
    if (!credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    await this.authorizedJson(`/v1/documents/${documentId}/restore`, {
      method: 'POST',
      body: { clientMutationId: newEntityId('mut_'), deviceId: credentials.deviceId },
    });
    return this.sync();
  }

  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<DesktopSyncSnapshot> {
    await this.authorizedJson(`/v1/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: { clientMutationId: newEntityId('mut_'), resolution },
    });
    await this.loadConflicts();
    return this.snapshot();
  }

  private async performSync(): Promise<DesktopSyncSnapshot> {
    if (!this.credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    this.syncing = true;
    this.errorCode = null;
    try {
      await this.pushPendingAiResults();
      let hasMore = true;
      while (hasMore) {
        const page = await this.authorizedJson('/v1/sync/pull', {
          method: 'POST',
          body: {
            deviceId: this.credentials.deviceId,
            cursor: this.index.cursor(),
            limit: 100,
          },
        });
        const events = requiredArray(page, 'events');
        const changes: InboxChange[] = [];
        for (const item of events) changes.push(await this.eventChange(requiredRecord(item)));
        const cursor = requiredString(page, 'cursor');
        await this.index.applyChanges(changes, cursor, new Date().toISOString());
        hasMore = page.hasMore === true;
      }
      await this.loadConflicts();
      return this.snapshot();
    } catch (error) {
      this.errorCode = error instanceof DesktopSyncError ? error.code : 'E_INTERNAL';
      throw error;
    }
  }

  private async pushPendingAiResults(): Promise<void> {
    for (const item of await this.loadPendingAiResults()) {
      if (item.document) await this.pushPendingMutation(item.document);
      await this.pushPendingMutation(item.version);
      await this.pushPendingMutation(item.aiResult);
      await rm(pendingAiResultPath(this.root, item.queueId), { force: true });
    }
  }

  private async loadPendingAiResults(): Promise<PendingAiResultSync[]> {
    try {
      const entries = await readdir(pendingAiResultDirectory(this.root));
      const items: PendingAiResultSync[] = [];
      for (const entry of entries.sort()) {
        if (!entry.endsWith('.json')) continue;
        const raw = JSON.parse(await readFile(path.join(pendingAiResultDirectory(this.root), entry), 'utf8')) as PendingAiResultSync;
        items.push(raw);
      }
      return items;
    } catch (error: any) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  private async pushPendingMutation(mutation: PendingSyncMutation): Promise<void> {
    const uploadedFileObjectId = mutation.upload ? await this.uploadPendingFile(mutation.upload) : null;
    const payload = { ...mutation.payload };
    if (uploadedFileObjectId) payload['fileObjectId'] = uploadedFileObjectId;
    const response = await this.authorizedJson('/v1/sync/push', {
      method: 'POST',
      body: {
        deviceId: this.requiredCredentials().deviceId,
        mutations: [{
          clientMutationId: mutation.clientMutationId,
          deviceId: this.requiredCredentials().deviceId,
          documentId: mutation.documentId,
          versionId: mutation.versionId,
          baseVersionId: mutation.baseVersionId,
          operation: mutation.operation,
          retryCount: 0,
          payload,
        }],
      },
    });
    const results = requiredArray(response, 'results');
    const first = requiredRecord(results[0]);
    if (first.ok !== true) {
      const failure = requiredRecord(first.error);
      throw new DesktopSyncError(requiredString(failure, 'errorCode'), 409);
    }
  }

  private async uploadPendingFile(upload: PendingFileUpload): Promise<string> {
    const bytes = await readFile(upload.localPath);
    if (bytes.byteLength !== upload.sizeBytes) throw new DesktopSyncError('E_HASH_MISMATCH', 422);
    const hash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (hash !== upload.contentHash) throw new DesktopSyncError('E_HASH_MISMATCH', 422);
    const created = await this.authorizedJson('/v1/files/uploads', {
      method: 'POST',
      body: {
        clientMutationId: upload.clientMutationId,
        fileObjectId: upload.fileObjectId,
        role: upload.role,
        format: upload.format,
        contentHash: upload.contentHash,
        sizeBytes: upload.sizeBytes,
        mediaType: upload.mediaType,
      },
    });
    const fileObjectId = optionalString(created, 'fileObjectId');
    if (created.alreadyComplete === true) return fileObjectId ?? upload.fileObjectId;
    const uploadId = requiredString(created, 'uploadId');
    const partSize = requiredSafeInteger(created, 'partSize');
    const parts: Array<{ partNumber: number; etag: string }> = [];
    for (let offset = 0, partNumber = 1; offset < bytes.byteLength; offset += partSize, partNumber += 1) {
      const chunk = bytes.subarray(offset, Math.min(offset + partSize, bytes.byteLength));
      const response = await this.authorizedFetch(`/v1/files/uploads/${uploadId}/parts/${partNumber}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream' },
        body: chunk,
      });
      const body = requiredRecord(await response.json());
      parts.push({
        partNumber: requiredSafeInteger(body, 'partNumber'),
        etag: requiredString(body, 'etag'),
      });
    }
    const completed = await this.authorizedJson(`/v1/files/uploads/${uploadId}/complete`, {
      method: 'POST',
      body: { parts },
    });
    return requiredString(requiredObject(completed, 'fileObject'), 'id');
  }

  private requiredCredentials(): SyncCredentials {
    if (!this.credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    return this.credentials;
  }

  private async eventChange(event: Record<string, unknown>): Promise<InboxChange> {
    const eventBase = {
      eventId: requiredString(event, 'id'),
      cursor: requiredString(event, 'cursor'),
      operation: requiredOperation(event),
    } as const;
    const documentId = requiredString(event, 'documentId');
    const updatedAt = requiredString(event, 'updatedAt');
    if (eventBase.operation !== 'upsert') {
      const deleteScope = eventBase.operation === 'delete'
        ? optionalString(requiredObject(event, 'payload'), 'scope')
        : null;
      const deletedAt = eventBase.operation === 'delete' && deleteScope !== 'cloud'
        ? requiredString(requiredObject(event, 'tombstone'), 'deletedAt') : null;
      return {
        ...eventBase,
        kind: 'state',
        documentId,
        state: eventBase.operation === 'delete' ? (deleteScope === 'cloud' ? 'collected' : 'deleted') :
          eventBase.operation === 'archive' ? 'archived' : 'synced',
        updatedAt,
        deletedAt,
      };
    }
    const payload = requiredObject(event, 'payload');
    const id = requiredString(payload, 'id');
    const conflict = event.phase === 'conflict';
    if (id.startsWith('doc_')) {
      return {
        ...eventBase,
        kind: 'document',
        id,
        sourceDeviceId: requiredString(payload, 'sourceDeviceId'),
        title: requiredString(payload, 'title'),
        originalFormat: requiredString(payload, 'originalFormat'),
        currentVersionId: optionalString(payload, 'currentVersionId'),
        state: conflict ? 'conflict' : 'synced',
        createdAt: requiredString(payload, 'createdAt'),
        updatedAt: requiredString(payload, 'updatedAt'),
        deletedAt: optionalString(payload, 'deletedAt'),
      };
    }
    if (id.startsWith('air_')) {
      const contentHash = requiredString(payload, 'contentHash');
      const sizeBytes = requiredSafeInteger(payload, 'sizeBytes');
      const fileObjectId = requiredString(payload, 'fileObjectId');
      const localPath = await this.downloadObject(fileObjectId, contentHash, sizeBytes);
      return {
        ...eventBase,
        kind: 'ai_result',
        id,
        documentId,
        sourceVersionId: requiredString(payload, 'sourceVersionId'),
        sourceArtifactId: optionalString(payload, 'sourceArtifactId'),
        sourceDeviceId: requiredString(payload, 'sourceDeviceId'),
        fileObjectId,
        resultType: requiredString(payload, 'resultType'),
        format: requiredString(payload, 'format'),
        mediaType: requiredString(payload, 'mediaType'),
        contentHash,
        sizeBytes,
        generatorName: requiredString(payload, 'generatorName'),
        generatorVersion: requiredString(payload, 'generatorVersion'),
        createdAt: requiredString(payload, 'createdAt'),
        updatedAt,
        deletedAt: optionalString(payload, 'deletedAt'),
        localPath,
      };
    }
    if (!id.startsWith('ver_')) throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
    const contentHash = requiredString(payload, 'contentHash');
    const sizeBytes = requiredSafeInteger(payload, 'sizeBytes');
    const fileObjectId = requiredString(payload, 'fileObjectId');
    const localPath = await this.downloadObject(fileObjectId, contentHash, sizeBytes);
    return {
      ...eventBase,
      kind: 'version',
      id,
      documentId,
      sourceDeviceId: requiredString(payload, 'sourceDeviceId'),
      originalFormat: requiredString(payload, 'originalFormat'),
      contentHash,
      sizeBytes,
      fileObjectId,
      parentVersionId: optionalString(payload, 'parentVersionId'),
      createdAt: requiredString(payload, 'createdAt'),
      updatedAt,
      deletedAt: optionalString(payload, 'deletedAt'),
      localPath,
      conflict,
    };
  }

  private async downloadObject(fileObjectId: string, contentHash: string, sizeBytes: number): Promise<string> {
    if (!/^sha256:[0-9a-f]{64}$/.test(contentHash)) throw new DesktopSyncError('E_HASH_MISMATCH', 422);
    const objects = path.join(this.root, 'objects');
    await mkdir(objects, { recursive: true });
    const target = path.join(objects, contentHash.slice('sha256:'.length));
    if (await matchesFile(target, contentHash, sizeBytes)) return target;
    await rm(target, { force: true });
    const temporary = `${target}.tmp-${randomUUID()}`;
    try {
      const response = await this.authorizedFetch(`/v1/files/${fileObjectId}`, { method: 'GET' });
      if (!response.body) throw new DesktopSyncError('E_OBJECT_MISSING', response.status);
      const handle = await open(temporary, 'wx');
      const hash = createHash('sha256');
      let total = 0;
      try {
        for await (const chunk of response.body) {
          const bytes = Buffer.from(chunk);
          total += bytes.length;
          if (total > sizeBytes) throw new DesktopSyncError('E_HASH_MISMATCH', 422);
          hash.update(bytes);
          await handle.write(bytes);
        }
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (total !== sizeBytes || `sha256:${hash.digest('hex')}` !== contentHash) {
        throw new DesktopSyncError('E_HASH_MISMATCH', 422);
      }
      await rename(temporary, target);
      return target;
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  private async authorizedJson(pathname: string, request: JsonRequest): Promise<Record<string, unknown>> {
    const response = await this.authorizedFetch(pathname, {
      method: request.method,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(request.body),
    });
    return requiredRecord(await response.json());
  }

  private async loadConflicts(): Promise<void> {
    if (!this.credentials) {
      this.conflicts = [];
      return;
    }
    const response = await this.authorizedFetch('/v1/conflicts', { method: 'GET' });
    const body = requiredRecord(await response.json());
    this.conflicts = requiredArray(body, 'conflicts').map((value) => {
      const conflict = requiredRecord(value);
      return {
        id: requiredString(conflict, 'id'),
        documentId: requiredString(conflict, 'documentId'),
        localVersionId: requiredString(conflict, 'localVersionId'),
        remoteVersionId: requiredString(conflict, 'remoteVersionId'),
        detectedAt: requiredString(conflict, 'detectedAt'),
        resolvedAt: optionalString(conflict, 'resolvedAt'),
        resolution: optionalResolution(conflict.resolution),
      };
    });
  }

  private async authorizedFetch(pathname: string, init: RequestInit): Promise<Response> {
    let credentials = this.credentials;
    if (!credentials) throw new DesktopSyncError('E_AUTH_REQUIRED', 401);
    let response = await fetch(`${credentials.serverUrl}${pathname}`, withToken(init, credentials.accessToken));
    if (response.status === 401) {
      const failure = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
      if (failure.errorCode === 'E_DEVICE_REVOKED') throw new DesktopSyncError('E_DEVICE_REVOKED', 401);
      credentials = await this.refresh(credentials);
      response = await fetch(`${credentials.serverUrl}${pathname}`, withToken(init, credentials.accessToken));
    }
    if (!response.ok) {
      const failure = await response.json().catch(() => ({})) as Record<string, unknown>;
      throw new DesktopSyncError(
        typeof failure.errorCode === 'string' ? failure.errorCode : 'E_INTERNAL',
        response.status,
        typeof failure.error === 'string' ? failure.error : undefined,
      );
    }
    return response;
  }

  private async refresh(credentials: SyncCredentials): Promise<SyncCredentials> {
    const response = await requestJson(credentials.serverUrl, '/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: credentials.refreshToken },
    });
    const updated = {
      ...credentials,
      accessToken: requiredString(response, 'accessToken'),
      refreshToken: requiredString(response, 'refreshToken'),
      expiresAt: requiredString(response, 'expiresAt'),
    };
    this.credentials = updated;
    await this.saveCredentials(updated);
    return updated;
  }

  private status(): DesktopSyncStatus {
    return {
      loggedIn: this.credentials !== null,
      deviceId: this.credentials?.deviceId ?? null,
      serverUrl: this.credentials?.serverUrl ?? null,
      cursor: this.index.cursor(),
      lastSyncAt: this.index.lastSyncAt(),
      syncing: this.syncing,
      errorCode: this.errorCode,
    };
  }

  private async installationId(): Promise<string> {
    const file = path.join(this.root, 'installation-id');
    const existing = await readFile(file, 'utf8').catch(() => null);
    if (existing?.trim()) return existing.trim();
    const id = randomUUID();
    await mkdir(this.root, { recursive: true });
    const handle = await open(file, 'wx');
    try {
      await handle.writeFile(id);
      await handle.sync();
    } finally {
      await handle.close();
    }
    return id;
  }

  private async loadCredentials(): Promise<SyncCredentials | null> {
    const encrypted = await readFile(this.credentialsPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    return encrypted ? JSON.parse(this.cipher.open(encrypted)) as SyncCredentials : null;
  }

  private async saveCredentials(credentials: SyncCredentials): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const temporary = `${this.credentialsPath}.tmp`;
    const handle = await open(temporary, 'w');
    try {
      await handle.writeFile(this.cipher.seal(JSON.stringify(credentials)));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, this.credentialsPath);
  }

  private get credentialsPath(): string {
    return path.join(this.root, 'credentials.secure');
  }
}

export class DesktopSyncError extends Error {
  constructor(readonly code: string, readonly status: number, message = code) {
    super(message);
  }
}

interface JsonRequest { method: 'POST' | 'DELETE'; body: Record<string, unknown> }

async function requestJson(serverUrl: string, pathname: string, request: JsonRequest): Promise<Record<string, unknown>> {
  const response = await fetch(`${serverUrl}${pathname}`, {
    method: request.method,
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(request.body),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = requiredRecord(body);
    throw new DesktopSyncError(
      typeof error.errorCode === 'string' ? error.errorCode : 'E_INTERNAL',
      response.status,
      typeof error.error === 'string' ? error.error : undefined,
    );
  }
  return requiredRecord(body);
}

function withToken(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  return { ...init, headers };
}

async function matchesFile(file: string, contentHash: string, sizeBytes: number): Promise<boolean> {
  const info = await stat(file).catch(() => null);
  if (!info?.isFile() || info.size !== sizeBytes) return false;
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return `sha256:${hash.digest('hex')}` === contentHash;
}

function normalizeServerUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new DesktopSyncError('E_SERVER_URL_INVALID', 400);
  }
  return url.toString().replace(/\/$/, '');
}

function desktopPlatform(): 'macos' | 'windows' | 'linux' {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  return 'linux';
}

function requiredRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  return value as Record<string, unknown>;
}

function requiredObject(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return requiredRecord(value[key]);
}

function requiredArray(value: Record<string, unknown>, key: string): unknown[] {
  const result = value[key];
  if (!Array.isArray(result)) throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  return result;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== 'string') throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  return result;
}

function optionalString(value: Record<string, unknown>, key: string): string | null {
  const result = value[key];
  if (result === null || result === undefined) return null;
  if (typeof result !== 'string') throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  return result;
}

function requiredSafeInteger(value: Record<string, unknown>, key: string): number {
  const result = value[key];
  if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 0) {
    throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  }
  return result;
}

function requiredOperation(value: Record<string, unknown>): 'upsert' | 'delete' | 'archive' | 'restore' {
  const operation = value.operation;
  if (!['upsert', 'delete', 'archive', 'restore'].includes(operation as string)) {
    throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  }
  return operation as 'upsert' | 'delete' | 'archive' | 'restore';
}

function optionalResolution(value: unknown): ConflictResolution | null {
  if (value === null || value === undefined) return null;
  if (!['keep_local', 'keep_remote', 'save_copy', 'manual_merge'].includes(value as string)) {
    throw new DesktopSyncError('E_SYNC_PAYLOAD_INVALID', 422);
  }
  return value as ConflictResolution;
}

function newEntityId(prefix: string, now = Date.now()): string {
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(now, 0, 6);
  const random = randomBytes(10);
  random.copy(bytes, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${prefix}${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
