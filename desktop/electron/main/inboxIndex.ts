import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import path from 'node:path';
import type { DesktopInboxDocument, InboxChange } from '../../src/shared/sync';

const moduleRequire = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);

export interface DerivedArtifactRecord {
  id: string;
  documentId: string;
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

export interface AiResultRecord {
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
  localPath: string;
  generatorName: string;
  generatorVersion: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SaveConfirmedAiResultInput {
  title: string;
  format: 'markdown' | 'json';
  content: string;
  resultType: string;
  saveMode: 'new_document' | 'new_version';
  createdBy: 'cli' | 'mcp' | 'cloud_api';
  modelName: string | null;
  promptTextHash: string | null;
  sourceDocumentId: string | null;
  sourceVersionId: string | null;
  sourceArtifactId: string | null;
  createdAt: string;
}

export interface DesktopDocumentVersionRecord {
  id: string;
  documentId: string;
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

export interface DesktopDerivedArtifactRecord {
  id: string;
  documentId: string;
  sourceVersionId: string;
  sourceDeviceId: string;
  fileObjectId: string;
  format: string;
  mediaType: string;
  contentHash: string;
  sizeBytes: number;
  localPath: string;
  generator: { name: string; version: string };
  warnings: string[];
  durationMs: number;
  mediaDirectory: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DesktopAiResultRecord {
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
  localPath: string;
  generator: { name: string; version: string };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DesktopDocumentFamily {
  document: DesktopInboxDocument & {
    createdAt: string;
    deletedAt: string | null;
  };
  versions: DesktopDocumentVersionRecord[];
  derivedArtifacts: DesktopDerivedArtifactRecord[];
  aiResults: DesktopAiResultRecord[];
}

export interface ImportedInboxDocument {
  id: string;
  title: string;
  originalFormat: string;
  outputPath: string;
  updatedAt: string;
}

export interface AiReadStatus {
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

export interface PreferredReadableTarget {
  kind: string;
  outputPath: string;
  readableSource: 'derived_artifact' | 'original';
  sourceVersionId: string;
  sourceArtifactId: string | null;
}

export class InboxIndex {
  private constructor(
    private readonly database: Database,
    private readonly databasePath: string,
  ) {}

  static async open(root: string): Promise<InboxIndex> {
    await mkdir(root, { recursive: true });
    const databasePath = path.join(root, 'index.sqlite');
    const SQL = await initSqlJs({
      locateFile: () => moduleRequire.resolve('sql.js/dist/sql-wasm.wasm'),
    });
    const bytes = await readFile(databasePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    const database = bytes ? new SQL.Database(bytes) : new SQL.Database();
    const index = new InboxIndex(database, databasePath);
    index.migrate();
    if (!bytes) await index.persist();
    return index;
  }

  cursor(): string | null {
    return this.meta('cursor');
  }

  lastSyncAt(): string | null {
    return this.meta('last_sync_at');
  }

  listDocuments(): DesktopInboxDocument[] {
    return this.documents('d.deleted_at IS NULL');
  }

  listDeviceDeletedDocuments(): DesktopInboxDocument[] {
    return this.documents("d.state = 'device_deleted'");
  }

  aiReadStatus(documentId: string): AiReadStatus {
    const documentGrant = this.activeGrant('document', documentId);
    const collectionGrant = this.activeGrant('collection', 'all');
    const grant = documentGrant ?? collectionGrant;
    const audit = this.lastAiReadAudit(documentId);
    return {
      allowed: grant !== null,
      scopeType: grant?.scopeType ?? null,
      scopeKey: grant?.scopeKey ?? null,
      grantedAt: grant?.grantedAt ?? null,
      lastReadAt: audit?.createdAt ?? null,
      lastReadVia: audit?.entrypoint ?? null,
      lastReadResult: audit?.result ?? null,
      lastReadVersionId: audit?.sourceVersionId ?? null,
      lastReadArtifactId: audit?.sourceArtifactId ?? null,
      lastErrorCode: audit?.errorCode ?? null,
    };
  }

  preferredReadableTarget(documentId: string): PreferredReadableTarget | null {
    const artifact = this.database.prepare(`
      SELECT a.id, a.source_version_id, a.format, f.local_path
      FROM derived_artifacts a
      JOIN file_objects f ON f.id = a.file_object_id
      WHERE a.document_id = ? AND a.deleted_at IS NULL AND f.deleted_at IS NULL
      ORDER BY a.created_at DESC, a.id DESC
    `);
    try {
      artifact.bind([documentId]);
      while (artifact.step()) {
        const row = artifact.getAsObject();
        const format = requiredText(row.format);
        const localPath = requiredText(row.local_path);
        if (!isAiTextReadableFormat(format) || !fileExists(localPath)) continue;
        return {
          kind: format,
          outputPath: localPath,
          readableSource: 'derived_artifact',
          sourceVersionId: requiredText(row.source_version_id),
          sourceArtifactId: requiredText(row.id),
        };
      }
    } finally {
      artifact.free();
    }

    const version = this.database.prepare(`
      SELECT v.id, v.original_format, f.local_path
      FROM documents d
      JOIN document_versions v ON v.id = d.current_version_id
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE d.id = ? AND d.deleted_at IS NULL AND v.deleted_at IS NULL AND f.deleted_at IS NULL
      LIMIT 1
    `);
    try {
      version.bind([documentId]);
      if (!version.step()) return null;
      const row = version.getAsObject();
      const format = requiredText(row.original_format);
      const localPath = requiredText(row.local_path);
      if (!isAiTextReadableFormat(format) || !fileExists(localPath)) return null;
      return {
        kind: format,
        outputPath: localPath,
        readableSource: 'original',
        sourceVersionId: requiredText(row.id),
        sourceArtifactId: null,
      };
    } finally {
      version.free();
    }
  }

  documentFamily(documentId: string): DesktopDocumentFamily | null {
    const document = this.document(documentId);
    if (!document) return null;
    return {
      document,
      versions: this.versions(documentId),
      derivedArtifacts: this.derivedArtifacts(documentId),
      aiResults: this.aiResults(documentId),
    };
  }

  documentHead(documentId: string): { currentVersionId: string | null } | null {
    const statement = this.database.prepare('SELECT current_version_id FROM documents WHERE id = ? LIMIT 1');
    try {
      statement.bind([documentId]);
      if (!statement.step()) return null;
      return { currentVersionId: nullableText(statement.get()[0]) };
    } finally {
      statement.free();
    }
  }

  fileDescriptor(documentId: string): { fileObjectId: string; contentHash: string; sizeBytes: number; localPath: string } | null {
    const statement = this.database.prepare(`
      SELECT f.id, f.content_hash, f.size_bytes, f.local_path
      FROM documents d
      JOIN document_versions v ON v.id = d.current_version_id
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE d.id = ? LIMIT 1
    `);
    try {
      statement.bind([documentId]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        fileObjectId: requiredText(row.id),
        contentHash: requiredText(row.content_hash),
        sizeBytes: Number(row.size_bytes),
        localPath: requiredText(row.local_path),
      };
    } finally {
      statement.free();
    }
  }

  activePathReferenceCount(localPath: string, excludingDocumentId: string): number {
    const statement = this.database.prepare(`
      SELECT COUNT(*)
      FROM documents d
      JOIN document_versions v ON v.id = d.current_version_id
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE f.local_path = ? AND d.id <> ? AND d.deleted_at IS NULL
    `);
    try {
      statement.bind([localPath, excludingDocumentId]);
      return Number(statement.step() ? statement.get()[0] : 0);
    } finally {
      statement.free();
    }
  }

  async markDeviceDeleted(documentId: string, deletedAt: string): Promise<void> {
    this.database.run(
      "UPDATE documents SET state = 'device_deleted', deleted_at = ?, updated_at = ? WHERE id = ?",
      [deletedAt, deletedAt, documentId],
    );
    await this.persist();
  }

  async restoreOnDevice(documentId: string, localPath: string, restoredAt: string): Promise<void> {
    this.database.run('BEGIN IMMEDIATE');
    try {
      this.database.run(
        'UPDATE file_objects SET local_path = ?, deleted_at = NULL, updated_at = ? WHERE id IN (SELECT v.file_object_id FROM document_versions v JOIN documents d ON d.current_version_id = v.id WHERE d.id = ?)',
        [localPath, restoredAt, documentId],
      );
      this.database.run(
        "UPDATE documents SET state = 'synced', deleted_at = NULL, updated_at = ? WHERE id = ?",
        [restoredAt, documentId],
      );
      this.database.run('COMMIT');
      await this.persist();
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  async recordDerivedArtifact(input: DerivedArtifactRecord): Promise<void> {
    this.database.run('BEGIN IMMEDIATE');
    try {
      this.upsertFileObject({
        id: input.fileObjectId,
        sourceDeviceId: input.sourceDeviceId,
        role: 'derived_artifact',
        format: input.format,
        mediaType: input.mediaType,
        contentHash: input.contentHash,
        sizeBytes: input.sizeBytes,
        localPath: input.localPath,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        deletedAt: input.deletedAt,
      });
      this.database.run(
        `INSERT INTO derived_artifacts(
           id, document_id, source_version_id, source_device_id, file_object_id, format,
           generator_name, generator_version, warnings_json, duration_ms, media_dir,
           created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           file_object_id = excluded.file_object_id,
           format = excluded.format,
           generator_name = excluded.generator_name,
           generator_version = excluded.generator_version,
           warnings_json = excluded.warnings_json,
           duration_ms = excluded.duration_ms,
           media_dir = excluded.media_dir,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          input.id,
          input.documentId,
          input.sourceVersionId,
          input.sourceDeviceId,
          input.fileObjectId,
          input.format,
          input.generatorName,
          input.generatorVersion,
          JSON.stringify(input.warnings),
          input.durationMs,
          input.mediaDirectory,
          input.createdAt,
          input.updatedAt,
          input.deletedAt,
        ],
      );
      this.database.run('COMMIT');
      await this.persist();
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  async recordConversionArtifact(input: {
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
    const source = this.sourceVersionByLocalPath(input.inputPath);
    if (!source) return null;
    const output = await describeLocalFile(input.outputPath);
    const artifactId = newEntityId('art_');
    await this.recordDerivedArtifact({
      id: artifactId,
      documentId: source.documentId,
      sourceVersionId: source.versionId,
      sourceDeviceId: source.sourceDeviceId,
      fileObjectId: newEntityId('obj_'),
      format: input.outputFormat,
      mediaType: mediaTypeForFormat(input.outputFormat),
      contentHash: output.contentHash,
      sizeBytes: output.sizeBytes,
      localPath: input.outputPath,
      generatorName: input.generatorName,
      generatorVersion: input.generatorVersion,
      warnings: input.warnings,
      durationMs: input.durationMs,
      mediaDirectory: input.mediaDirectory,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      deletedAt: null,
    });
    return { id: artifactId, sourceVersionId: source.versionId };
  }

  async recordAiResult(input: AiResultRecord): Promise<void> {
    this.database.run('BEGIN IMMEDIATE');
    try {
      this.upsertFileObject({
        id: input.fileObjectId,
        sourceDeviceId: input.sourceDeviceId,
        role: 'ai_result',
        format: input.format,
        mediaType: input.mediaType,
        contentHash: input.contentHash,
        sizeBytes: input.sizeBytes,
        localPath: input.localPath,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
        deletedAt: input.deletedAt,
      });
      this.database.run(
        `INSERT INTO ai_results(
           id, document_id, source_version_id, source_artifact_id, source_device_id, file_object_id,
           result_type, format, generator_name, generator_version, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source_artifact_id = excluded.source_artifact_id,
           file_object_id = excluded.file_object_id,
           result_type = excluded.result_type,
           format = excluded.format,
           generator_name = excluded.generator_name,
           generator_version = excluded.generator_version,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          input.id,
          input.documentId,
          input.sourceVersionId,
          input.sourceArtifactId,
          input.sourceDeviceId,
          input.fileObjectId,
          input.resultType,
          input.format,
          input.generatorName,
          input.generatorVersion,
          input.createdAt,
          input.updatedAt,
          input.deletedAt,
        ],
      );
      this.database.run('COMMIT');
      await this.persist();
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  async saveConfirmedAiResult(input: SaveConfirmedAiResultInput): Promise<{
    documentId: string;
    versionId: string;
    aiResultId: string;
    title: string;
    outputPath: string;
    sourceVersionId: string | null;
  }> {
    const nowMs = Date.parse(input.createdAt);
    const deviceId = this.ensureLocalDeviceId(nowMs + 1);
    const extension = input.format === 'json' ? 'json' : 'md';
    const originalFileObjectId = newEntityId('obj_', nowMs + 2);
    const aiResultFileObjectId = newEntityId('obj_', nowMs + 3);
    const versionId = newEntityId('ver_', nowMs + 4);
    const aiResultId = newEntityId('air_', nowMs + 5);
    const documentId = input.saveMode === 'new_version'
      ? requiredDocumentId(input.sourceDocumentId)
      : newEntityId('doc_', nowMs + 6);
    const outputPath = path.join(this.rootPath(), 'ai-results', `${aiResultId}.${extension}`);
    const descriptor = await persistManagedTextFile(outputPath, input.content);
    const versionSourceId = input.saveMode === 'new_version'
      ? requiredVersionId(input.sourceVersionId)
      : input.sourceVersionId ?? versionId;
    const parentVersionId = input.saveMode === 'new_version' ? versionSourceId : null;
    const generatorVersion = input.modelName ?? 'unspecified';

    this.database.run('BEGIN IMMEDIATE');
    try {
      if (input.saveMode === 'new_version') {
        const head = this.documentHead(documentId);
        if (!head) throw new Error('AI 结果来源文档不存在');
        if (head.currentVersionId !== versionSourceId) throw new Error('AI 结果来源版本已更新');
      } else {
        this.database.run(
          `INSERT INTO documents(
             id, source_device_id, title, original_format, current_version_id, state,
             created_at, updated_at, deleted_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [documentId, deviceId, input.title, input.format, versionId, 'ai_result_ready', input.createdAt, input.createdAt, null],
        );
      }

      this.upsertFileObject({
        id: originalFileObjectId,
        sourceDeviceId: deviceId,
        role: 'original',
        format: input.format,
        mediaType: mediaTypeForFormat(input.format),
        contentHash: descriptor.contentHash,
        sizeBytes: descriptor.sizeBytes,
        localPath: outputPath,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        deletedAt: null,
      });
      this.database.run(
        `INSERT INTO document_versions(
           id, document_id, source_device_id, original_format, content_hash, size_bytes,
           file_object_id, parent_version_id, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          versionId,
          documentId,
          deviceId,
          input.format,
          descriptor.contentHash,
          descriptor.sizeBytes,
          originalFileObjectId,
          parentVersionId,
          input.createdAt,
          input.createdAt,
          null,
        ],
      );

      if (input.saveMode === 'new_version') {
        this.database.run(
          `UPDATE documents
           SET current_version_id = ?, state = 'ai_result_ready', updated_at = ?, deleted_at = NULL
           WHERE id = ?`,
          [versionId, input.createdAt, documentId],
        );
      }

      this.upsertFileObject({
        id: aiResultFileObjectId,
        sourceDeviceId: deviceId,
        role: 'ai_result',
        format: input.format,
        mediaType: mediaTypeForFormat(input.format),
        contentHash: descriptor.contentHash,
        sizeBytes: descriptor.sizeBytes,
        localPath: outputPath,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        deletedAt: null,
      });
      this.database.run(
        `INSERT INTO ai_results(
           id, document_id, source_version_id, source_artifact_id, source_device_id, file_object_id,
           result_type, format, generator_name, generator_version, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          aiResultId,
          documentId,
          versionSourceId,
          input.sourceArtifactId,
          deviceId,
          aiResultFileObjectId,
          input.resultType,
          input.format,
          input.createdBy,
          generatorVersion,
          input.createdAt,
          input.createdAt,
          null,
        ],
      );
      this.database.run('COMMIT');
      await this.persist();
      return {
        documentId,
        versionId,
        aiResultId,
        title: input.title,
        outputPath,
        sourceVersionId: input.saveMode === 'new_version' ? versionSourceId : input.sourceVersionId,
      };
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  async importLocalDocument(input: {
    inputPath: string;
    title: string;
    importedAt: string;
  }): Promise<ImportedInboxDocument> {
    const bytes = await readFile(input.inputPath);
    const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const objectPath = path.join(this.rootPath(), 'objects', contentHash.slice('sha256:'.length));
    const format = inferFormatFromPath(input.inputPath);
    await mkdir(path.dirname(objectPath), { recursive: true });
    const existing = await readFile(objectPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!existing) await writeFile(objectPath, bytes);

    const documentId = newEntityId('doc_', Date.parse(input.importedAt));
    const versionId = newEntityId('ver_', Date.parse(input.importedAt) + 1);
    const fileObjectId = newEntityId('obj_', Date.parse(input.importedAt) + 2);
    const deviceId = this.ensureLocalDeviceId(Date.parse(input.importedAt) + 3);

    this.database.run('BEGIN IMMEDIATE');
    try {
      this.upsertFileObject({
        id: fileObjectId,
        sourceDeviceId: deviceId,
        role: 'original',
        format,
        mediaType: mediaTypeForFormat(format),
        contentHash,
        sizeBytes: bytes.byteLength,
        localPath: objectPath,
        createdAt: input.importedAt,
        updatedAt: input.importedAt,
        deletedAt: null,
      });
      this.database.run(
        `INSERT INTO documents(
           id, source_device_id, title, original_format, current_version_id, state,
           created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [documentId, deviceId, input.title, format, versionId, 'collected', input.importedAt, input.importedAt, null],
      );
      this.database.run(
        `INSERT INTO document_versions(
           id, document_id, source_device_id, original_format, content_hash, size_bytes,
           file_object_id, parent_version_id, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [versionId, documentId, deviceId, format, contentHash, bytes.byteLength, fileObjectId, null, input.importedAt, input.importedAt, null],
      );
      this.database.run('COMMIT');
      await this.persist();
      return {
        id: documentId,
        title: input.title,
        originalFormat: format,
        outputPath: objectPath,
        updatedAt: input.importedAt,
      };
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  async setAiReadAccess(input: {
    scopeType: 'document' | 'collection';
    scopeKey: string;
    allowed: boolean;
    now: string;
  }): Promise<void> {
    this.database.run(
      `INSERT INTO ai_read_grants(scope_type, scope_key, granted_at, revoked_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(scope_type, scope_key) DO UPDATE SET
         granted_at = excluded.granted_at,
         revoked_at = excluded.revoked_at,
         updated_at = excluded.updated_at`,
      [
        input.scopeType,
        input.scopeKey,
        input.allowed ? input.now : null,
        input.allowed ? null : input.now,
        input.now,
      ],
    );
    await this.persist();
  }

  async recordAiReadAudit(input: {
    documentId: string;
    sourceVersionId: string | null;
    sourceArtifactId: string | null;
    entrypoint: string;
    result: 'success' | 'denied' | 'missing_readable';
    errorCode: string | null;
    readAt: string;
  }): Promise<void> {
    this.database.run(
      `INSERT INTO ai_read_audits(
         id, document_id, source_version_id, source_artifact_id, entrypoint, result, error_code, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newEntityId('aud_', Date.parse(input.readAt)),
        input.documentId,
        input.sourceVersionId,
        input.sourceArtifactId,
        input.entrypoint,
        input.result,
        input.errorCode,
        input.readAt,
      ],
    );
    await this.persist();
  }

  private documents(where: string): DesktopInboxDocument[] {
    const statement = this.database.prepare(`
      SELECT d.id, d.title, d.original_format, d.state, d.updated_at,
             d.current_version_id, v.content_hash, v.size_bytes, d.source_device_id
      FROM documents d
      LEFT JOIN document_versions v ON v.id = d.current_version_id
      WHERE ${where}
      ORDER BY d.updated_at DESC
    `);
    const documents: DesktopInboxDocument[] = [];
    try {
      while (statement.step()) {
        const row = statement.getAsObject();
        const id = requiredText(row.id);
        const aiReadStatus = this.aiReadStatus(id);
        const preferredReadableTarget = this.preferredReadableTarget(id);
        documents.push({
          id,
          title: requiredText(row.title),
          originalFormat: requiredText(row.original_format),
          state: requiredText(row.state),
          updatedAt: requiredText(row.updated_at),
          currentVersionId: nullableText(row.current_version_id),
          contentHash: nullableText(row.content_hash),
          sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
          sourceDeviceId: requiredText(row.source_device_id),
          readableFormat: preferredReadableTarget?.kind ?? null,
          readableSource: preferredReadableTarget?.readableSource ?? null,
          versionCount: this.countRows('document_versions', 'document_id', id),
          derivedArtifactCount: this.countRows('derived_artifacts', 'document_id', id),
          aiResultCount: this.countRows('ai_results', 'document_id', id),
          aiReadStatus,
        });
      }
    } finally {
      statement.free();
    }
    return documents;
  }

  private document(documentId: string): (DesktopDocumentFamily['document']) | null {
    const statement = this.database.prepare(`
      SELECT d.id, d.title, d.original_format, d.state, d.updated_at,
             d.current_version_id, v.content_hash, v.size_bytes, d.source_device_id, d.created_at, d.deleted_at
      FROM documents d
      LEFT JOIN document_versions v ON v.id = d.current_version_id
      WHERE d.id = ? LIMIT 1
    `);
    try {
      statement.bind([documentId]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      const aiReadStatus = this.aiReadStatus(documentId);
      const preferredReadableTarget = this.preferredReadableTarget(documentId);
      return {
        id: requiredText(row.id),
        title: requiredText(row.title),
        originalFormat: requiredText(row.original_format),
        state: requiredText(row.state),
        updatedAt: requiredText(row.updated_at),
        currentVersionId: nullableText(row.current_version_id),
        contentHash: nullableText(row.content_hash),
        sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
        sourceDeviceId: requiredText(row.source_device_id),
        readableFormat: preferredReadableTarget?.kind ?? null,
        readableSource: preferredReadableTarget?.readableSource ?? null,
        versionCount: this.countRows('document_versions', 'document_id', documentId),
        derivedArtifactCount: this.countRows('derived_artifacts', 'document_id', documentId),
        aiResultCount: this.countRows('ai_results', 'document_id', documentId),
        aiReadStatus,
        createdAt: requiredText(row.created_at),
        deletedAt: nullableText(row.deleted_at),
      };
    } finally {
      statement.free();
    }
  }

  private versions(documentId: string): DesktopDocumentVersionRecord[] {
    const statement = this.database.prepare(`
      SELECT v.id, v.document_id, v.source_device_id, v.original_format, v.content_hash, v.size_bytes,
             v.file_object_id, v.parent_version_id, v.created_at, v.updated_at, v.deleted_at, f.local_path
      FROM document_versions v
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE v.document_id = ?
      ORDER BY v.created_at DESC, v.id DESC
    `);
    const versions: DesktopDocumentVersionRecord[] = [];
    try {
      statement.bind([documentId]);
      while (statement.step()) {
        const row = statement.getAsObject();
        versions.push({
          id: requiredText(row.id),
          documentId: requiredText(row.document_id),
          sourceDeviceId: requiredText(row.source_device_id),
          originalFormat: requiredText(row.original_format),
          contentHash: requiredText(row.content_hash),
          sizeBytes: Number(row.size_bytes),
          fileObjectId: requiredText(row.file_object_id),
          parentVersionId: nullableText(row.parent_version_id),
          localPath: requiredText(row.local_path),
          createdAt: requiredText(row.created_at),
          updatedAt: requiredText(row.updated_at),
          deletedAt: nullableText(row.deleted_at),
        });
      }
    } finally {
      statement.free();
    }
    return versions;
  }

  private derivedArtifacts(documentId: string): DesktopDerivedArtifactRecord[] {
    const statement = this.database.prepare(`
      SELECT a.id, a.document_id, a.source_version_id, a.source_device_id, a.file_object_id, a.format,
             a.generator_name, a.generator_version, a.warnings_json, a.duration_ms, a.media_dir,
             a.created_at, a.updated_at, a.deleted_at,
             f.media_type, f.content_hash, f.size_bytes, f.local_path
      FROM derived_artifacts a
      JOIN file_objects f ON f.id = a.file_object_id
      WHERE a.document_id = ?
      ORDER BY a.created_at DESC, a.id DESC
    `);
    const artifacts: DesktopDerivedArtifactRecord[] = [];
    try {
      statement.bind([documentId]);
      while (statement.step()) {
        const row = statement.getAsObject();
        artifacts.push({
          id: requiredText(row.id),
          documentId: requiredText(row.document_id),
          sourceVersionId: requiredText(row.source_version_id),
          sourceDeviceId: requiredText(row.source_device_id),
          fileObjectId: requiredText(row.file_object_id),
          format: requiredText(row.format),
          mediaType: requiredText(row.media_type),
          contentHash: requiredText(row.content_hash),
          sizeBytes: Number(row.size_bytes),
          localPath: requiredText(row.local_path),
          generator: {
            name: requiredText(row.generator_name),
            version: requiredText(row.generator_version),
          },
          warnings: parseJsonArray(row.warnings_json),
          durationMs: Number(row.duration_ms),
          mediaDirectory: nullableText(row.media_dir),
          createdAt: requiredText(row.created_at),
          updatedAt: requiredText(row.updated_at),
          deletedAt: nullableText(row.deleted_at),
        });
      }
    } finally {
      statement.free();
    }
    return artifacts;
  }

  private aiResults(documentId: string): DesktopAiResultRecord[] {
    const statement = this.database.prepare(`
      SELECT r.id, r.document_id, r.source_version_id, r.source_artifact_id, r.source_device_id,
             r.file_object_id, r.result_type, r.format, r.generator_name, r.generator_version,
             r.created_at, r.updated_at, r.deleted_at, f.media_type, f.content_hash, f.size_bytes, f.local_path
      FROM ai_results r
      JOIN file_objects f ON f.id = r.file_object_id
      WHERE r.document_id = ?
      ORDER BY r.created_at DESC, r.id DESC
    `);
    const results: DesktopAiResultRecord[] = [];
    try {
      statement.bind([documentId]);
      while (statement.step()) {
        const row = statement.getAsObject();
        results.push({
          id: requiredText(row.id),
          documentId: requiredText(row.document_id),
          sourceVersionId: requiredText(row.source_version_id),
          sourceArtifactId: nullableText(row.source_artifact_id),
          sourceDeviceId: requiredText(row.source_device_id),
          fileObjectId: requiredText(row.file_object_id),
          resultType: requiredText(row.result_type),
          format: requiredText(row.format),
          mediaType: requiredText(row.media_type),
          contentHash: requiredText(row.content_hash),
          sizeBytes: Number(row.size_bytes),
          localPath: requiredText(row.local_path),
          generator: {
            name: requiredText(row.generator_name),
            version: requiredText(row.generator_version),
          },
          createdAt: requiredText(row.created_at),
          updatedAt: requiredText(row.updated_at),
          deletedAt: nullableText(row.deleted_at),
        });
      }
    } finally {
      statement.free();
    }
    return results;
  }

  private sourceVersionByLocalPath(localPath: string): {
    documentId: string;
    versionId: string;
    sourceDeviceId: string;
  } | null {
    const statement = this.database.prepare(`
      SELECT v.document_id, v.id, v.source_device_id
      FROM document_versions v
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE f.local_path = ? AND f.role = 'original' AND v.deleted_at IS NULL AND f.deleted_at IS NULL
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT 1
    `);
    try {
      statement.bind([localPath]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        documentId: requiredText(row.document_id),
        versionId: requiredText(row.id),
        sourceDeviceId: requiredText(row.source_device_id),
      };
    } finally {
      statement.free();
    }
  }

  readableFile(documentId: string): { title: string; format: string; localPath: string } | null {
    const statement = this.database.prepare(`
      SELECT d.title, d.original_format, f.local_path
      FROM documents d
      JOIN document_versions v ON v.id = d.current_version_id
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE d.id = ? AND d.deleted_at IS NULL AND f.deleted_at IS NULL
      LIMIT 1
    `);
    try {
      statement.bind([documentId]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        title: requiredText(row.title),
        format: requiredText(row.original_format),
        localPath: requiredText(row.local_path),
      };
    } finally {
      statement.free();
    }
  }

  conflictVersionFile(versionId: string): { title: string; format: string; localPath: string } | null {
    const statement = this.database.prepare(`
      SELECT d.title, v.original_format, f.local_path
      FROM document_versions v
      JOIN documents d ON d.id = v.document_id
      JOIN file_objects f ON f.id = v.file_object_id
      WHERE v.id = ? AND v.deleted_at IS NULL AND f.deleted_at IS NULL
      LIMIT 1
    `);
    try {
      statement.bind([versionId]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        title: requiredText(row.title),
        format: requiredText(row.original_format),
        localPath: requiredText(row.local_path),
      };
    } finally {
      statement.free();
    }
  }

  async applyChanges(changes: InboxChange[], cursor: string, syncedAt: string): Promise<void> {
    this.database.run('BEGIN IMMEDIATE');
    try {
      for (const change of changes) {
        this.database.run(
          `INSERT OR IGNORE INTO sync_events(id, cursor, document_id, operation, applied_at)
           VALUES (?, ?, ?, ?, ?)`,
          [change.eventId, change.cursor, documentId(change), change.operation, syncedAt],
        );
        if (this.database.getRowsModified() === 0) continue;
        this.applyChange(change);
      }
      this.setMeta('cursor', cursor);
      this.setMeta('last_sync_at', syncedAt);
      this.database.run('COMMIT');
      await this.persist();
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }

  private applyChange(change: InboxChange): void {
    if (change.kind === 'document') {
      this.database.run(
        `INSERT INTO documents(
           id, source_device_id, title, original_format, current_version_id, state,
           created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source_device_id = excluded.source_device_id,
           title = excluded.title,
           original_format = excluded.original_format,
           current_version_id = COALESCE(excluded.current_version_id, documents.current_version_id),
           state = excluded.state,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [change.id, change.sourceDeviceId, change.title, change.originalFormat,
          change.currentVersionId, change.state, change.createdAt, change.updatedAt, change.deletedAt],
      );
      return;
    }
    if (change.kind === 'version') {
      this.upsertFileObject({
        id: change.fileObjectId,
        sourceDeviceId: change.sourceDeviceId,
        role: 'original',
        format: change.originalFormat,
        mediaType: mediaTypeForFormat(change.originalFormat),
        contentHash: change.contentHash,
        sizeBytes: change.sizeBytes,
        localPath: change.localPath,
        createdAt: change.createdAt,
        updatedAt: change.updatedAt,
        deletedAt: change.deletedAt,
      });
      this.database.run(
        `INSERT INTO document_versions(
           id, document_id, source_device_id, original_format, content_hash, size_bytes,
           file_object_id, parent_version_id, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           file_object_id = excluded.file_object_id,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [change.id, change.documentId, change.sourceDeviceId, change.originalFormat,
          change.contentHash, change.sizeBytes, change.fileObjectId, change.parentVersionId,
          change.createdAt, change.updatedAt, change.deletedAt],
      );
      this.database.run(
        `UPDATE documents SET
           current_version_id = CASE WHEN ? THEN current_version_id ELSE ? END,
           state = ?, updated_at = ?, deleted_at = NULL
         WHERE id = ?`,
        [change.conflict ? 1 : 0, change.id, change.conflict ? 'conflict' : 'synced',
          change.updatedAt, change.documentId],
      );
      return;
    }
    if (change.kind === 'ai_result') {
      this.upsertFileObject({
        id: change.fileObjectId,
        sourceDeviceId: change.sourceDeviceId,
        role: 'ai_result',
        format: change.format,
        mediaType: change.mediaType,
        contentHash: change.contentHash,
        sizeBytes: change.sizeBytes,
        localPath: change.localPath,
        createdAt: change.createdAt,
        updatedAt: change.updatedAt,
        deletedAt: change.deletedAt,
      });
      this.database.run(
        `INSERT INTO ai_results(
           id, document_id, source_version_id, source_artifact_id, source_device_id, file_object_id,
           result_type, format, generator_name, generator_version, created_at, updated_at, deleted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           source_artifact_id = excluded.source_artifact_id,
           file_object_id = excluded.file_object_id,
           result_type = excluded.result_type,
           format = excluded.format,
           generator_name = excluded.generator_name,
           generator_version = excluded.generator_version,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at`,
        [
          change.id,
          change.documentId,
          change.sourceVersionId,
          change.sourceArtifactId,
          change.sourceDeviceId,
          change.fileObjectId,
          change.resultType,
          change.format,
          change.generatorName,
          change.generatorVersion,
          change.createdAt,
          change.updatedAt,
          change.deletedAt,
        ],
      );
      return;
    }
    this.database.run(
      'UPDATE documents SET state = ?, updated_at = ?, deleted_at = ? WHERE id = ?',
      [change.state, change.updatedAt, change.deletedAt, change.documentId],
    );
  }

  private migrate(): void {
    this.database.run('PRAGMA foreign_keys = ON');
    const version = Number(this.database.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0);
    if (version > 3) throw new Error(`不支持的收件箱索引版本：${version}`);
    if (version === 3) return;
    if (version === 2) {
      this.migrateV2ToV3();
      return;
    }
    if (version === 1) {
      this.migrateV1ToV2();
      this.migrateV2ToV3();
      return;
    }
    this.createSchemaV3();
  }

  private meta(key: string): string | null {
    const statement = this.database.prepare('SELECT value FROM app_meta WHERE key = ?');
    try {
      statement.bind([key]);
      return statement.step() ? requiredText(statement.get()[0]) : null;
    } finally {
      statement.free();
    }
  }

  private setMeta(key: string, value: string): void {
    this.database.run(
      'INSERT INTO app_meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  }

  private async persist(): Promise<void> {
    const temporary = `${this.databasePath}.tmp`;
    const bytes = this.database.export();
    const handle = await open(temporary, 'w');
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, this.databasePath);
    await rm(temporary, { force: true }).catch(() => undefined);
  }

  private rootPath(): string {
    return path.dirname(this.databasePath);
  }

  private upsertFileObject(input: {
    id: string;
    sourceDeviceId: string;
    role: 'original' | 'derived_artifact' | 'ai_result';
    format: string;
    mediaType: string;
    contentHash: string;
    sizeBytes: number;
    localPath: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  }): void {
    const existingRole = this.fileObjectRole(input.id);
    if (existingRole && existingRole !== input.role) {
      throw new Error(`FileObject ${input.id} 角色冲突：${existingRole} -> ${input.role}`);
    }
    this.database.run(
      `INSERT INTO file_objects(
         id, source_device_id, role, format, media_type, content_hash, size_bytes, local_path,
         created_at, updated_at, deleted_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         source_device_id = excluded.source_device_id,
         format = excluded.format,
         media_type = excluded.media_type,
         content_hash = excluded.content_hash,
         size_bytes = excluded.size_bytes,
         local_path = excluded.local_path,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at`,
      [
        input.id,
        input.sourceDeviceId,
        input.role,
        input.format,
        input.mediaType,
        input.contentHash,
        input.sizeBytes,
        input.localPath,
        input.createdAt,
        input.updatedAt,
        input.deletedAt,
      ],
    );
  }

  private fileObjectRole(fileObjectId: string): string | null {
    const statement = this.database.prepare('SELECT role FROM file_objects WHERE id = ? LIMIT 1');
    try {
      statement.bind([fileObjectId]);
      if (!statement.step()) return null;
      return requiredText(statement.get()[0]);
    } finally {
      statement.free();
    }
  }

  private countRows(table: 'document_versions' | 'derived_artifacts' | 'ai_results', field: 'document_id', value: string): number {
    const statement = this.database.prepare(`SELECT COUNT(*) FROM ${table} WHERE ${field} = ? AND deleted_at IS NULL`);
    try {
      statement.bind([value]);
      return Number(statement.step() ? statement.get()[0] : 0);
    } finally {
      statement.free();
    }
  }

  private ensureLocalDeviceId(now = Date.now()): string {
    const existing = this.meta('local_device_id');
    if (existing) return existing;
    const deviceId = newEntityId('dev_', now);
    this.setMeta('local_device_id', deviceId);
    return deviceId;
  }

  private activeGrant(scopeType: 'document' | 'collection', scopeKey: string): {
    scopeType: 'document' | 'collection';
    scopeKey: string;
    grantedAt: string;
  } | null {
    const statement = this.database.prepare(`
      SELECT scope_type, scope_key, granted_at
      FROM ai_read_grants
      WHERE scope_type = ? AND scope_key = ? AND revoked_at IS NULL
      LIMIT 1
    `);
    try {
      statement.bind([scopeType, scopeKey]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        scopeType: requiredText(row.scope_type) as 'document' | 'collection',
        scopeKey: requiredText(row.scope_key),
        grantedAt: requiredText(row.granted_at),
      };
    } finally {
      statement.free();
    }
  }

  private lastAiReadAudit(documentId: string): {
    createdAt: string;
    entrypoint: string;
    result: string;
    sourceVersionId: string | null;
    sourceArtifactId: string | null;
    errorCode: string | null;
  } | null {
    const statement = this.database.prepare(`
      SELECT created_at, entrypoint, result, source_version_id, source_artifact_id, error_code
      FROM ai_read_audits
      WHERE document_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `);
    try {
      statement.bind([documentId]);
      if (!statement.step()) return null;
      const row = statement.getAsObject();
      return {
        createdAt: requiredText(row.created_at),
        entrypoint: requiredText(row.entrypoint),
        result: requiredText(row.result),
        sourceVersionId: nullableText(row.source_version_id),
        sourceArtifactId: nullableText(row.source_artifact_id),
        errorCode: nullableText(row.error_code),
      };
    } finally {
      statement.free();
    }
  }

  private createSchemaV3(): void {
    this.database.exec(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        source_device_id TEXT NOT NULL,
        title TEXT NOT NULL,
        original_format TEXT NOT NULL,
        current_version_id TEXT,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE file_objects (
        id TEXT PRIMARY KEY,
        source_device_id TEXT NOT NULL,
        role TEXT NOT NULL,
        format TEXT NOT NULL,
        media_type TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        local_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX file_objects_hash ON file_objects(content_hash);
      CREATE TABLE document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id),
        source_device_id TEXT NOT NULL,
        original_format TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        file_object_id TEXT NOT NULL REFERENCES file_objects(id),
        parent_version_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX versions_document ON document_versions(document_id);
      CREATE UNIQUE INDEX versions_file_object ON document_versions(file_object_id);
      CREATE TABLE derived_artifacts (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id),
        source_version_id TEXT NOT NULL REFERENCES document_versions(id),
        source_device_id TEXT NOT NULL,
        file_object_id TEXT NOT NULL REFERENCES file_objects(id),
        format TEXT NOT NULL,
        generator_name TEXT NOT NULL,
        generator_version TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        media_dir TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX artifacts_document ON derived_artifacts(document_id);
      CREATE UNIQUE INDEX artifacts_file_object ON derived_artifacts(file_object_id);
      CREATE TABLE ai_results (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id),
        source_version_id TEXT NOT NULL REFERENCES document_versions(id),
        source_artifact_id TEXT REFERENCES derived_artifacts(id),
        source_device_id TEXT NOT NULL,
        file_object_id TEXT NOT NULL REFERENCES file_objects(id),
        result_type TEXT NOT NULL,
        format TEXT NOT NULL,
        generator_name TEXT NOT NULL,
        generator_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX ai_results_document ON ai_results(document_id);
      CREATE UNIQUE INDEX ai_results_file_object ON ai_results(file_object_id);
      CREATE TABLE ai_read_grants (
        scope_type TEXT NOT NULL,
        scope_key TEXT NOT NULL,
        granted_at TEXT,
        revoked_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(scope_type, scope_key)
      );
      CREATE TABLE ai_read_audits (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id),
        source_version_id TEXT,
        source_artifact_id TEXT,
        entrypoint TEXT NOT NULL,
        result TEXT NOT NULL,
        error_code TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX ai_read_audits_document ON ai_read_audits(document_id, created_at DESC);
      CREATE TABLE sync_events (
        id TEXT PRIMARY KEY,
        cursor TEXT NOT NULL,
        document_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 3;
    `);
  }

  private migrateV1ToV2(): void {
    this.database.run('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        ALTER TABLE file_objects ADD COLUMN source_device_id TEXT;
        ALTER TABLE file_objects ADD COLUMN role TEXT NOT NULL DEFAULT 'original';
        ALTER TABLE file_objects ADD COLUMN format TEXT;
        ALTER TABLE file_objects ADD COLUMN media_type TEXT NOT NULL DEFAULT 'application/octet-stream';
        CREATE UNIQUE INDEX IF NOT EXISTS versions_file_object ON document_versions(file_object_id);
        CREATE TABLE IF NOT EXISTS derived_artifacts (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES documents(id),
          source_version_id TEXT NOT NULL REFERENCES document_versions(id),
          source_device_id TEXT NOT NULL,
          file_object_id TEXT NOT NULL REFERENCES file_objects(id),
          format TEXT NOT NULL,
          generator_name TEXT NOT NULL,
          generator_version TEXT NOT NULL,
          warnings_json TEXT NOT NULL DEFAULT '[]',
          duration_ms INTEGER NOT NULL DEFAULT 0,
          media_dir TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS artifacts_document ON derived_artifacts(document_id);
        CREATE UNIQUE INDEX IF NOT EXISTS artifacts_file_object ON derived_artifacts(file_object_id);
        CREATE TABLE IF NOT EXISTS ai_results (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES documents(id),
          source_version_id TEXT NOT NULL REFERENCES document_versions(id),
          source_artifact_id TEXT REFERENCES derived_artifacts(id),
          source_device_id TEXT NOT NULL,
          file_object_id TEXT NOT NULL REFERENCES file_objects(id),
          result_type TEXT NOT NULL,
          format TEXT NOT NULL,
          generator_name TEXT NOT NULL,
          generator_version TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS ai_results_document ON ai_results(document_id);
        CREATE UNIQUE INDEX IF NOT EXISTS ai_results_file_object ON ai_results(file_object_id);
      `);

      const statement = this.database.prepare(`
        SELECT f.id, v.source_device_id, v.original_format
        FROM file_objects f
        LEFT JOIN document_versions v ON v.file_object_id = f.id
      `);
      try {
        while (statement.step()) {
          const row = statement.getAsObject();
          const sourceDeviceId = nullableText(row.source_device_id);
          const format = nullableText(row.original_format);
          if (!sourceDeviceId || !format) {
            throw new Error(`旧版收件箱索引缺少版本映射：${requiredText(row.id)}`);
          }
          this.database.run(
            `UPDATE file_objects
             SET source_device_id = ?, role = 'original', format = ?, media_type = ?
             WHERE id = ?`,
            [sourceDeviceId, format, mediaTypeForFormat(format), requiredText(row.id)],
          );
        }
      } finally {
        statement.free();
      }

      const incomplete = Number(this.database.exec(`
        SELECT COUNT(*) FROM file_objects
        WHERE source_device_id IS NULL OR format IS NULL
      `)[0]?.values[0]?.[0] ?? 0);
      if (incomplete > 0) throw new Error('旧版收件箱索引迁移后仍缺少统一模型字段');
      this.database.exec('PRAGMA user_version = 2');
      this.database.run('COMMIT');
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  private migrateV2ToV3(): void {
    this.database.run('BEGIN IMMEDIATE');
    try {
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS ai_read_grants (
          scope_type TEXT NOT NULL,
          scope_key TEXT NOT NULL,
          granted_at TEXT,
          revoked_at TEXT,
          updated_at TEXT NOT NULL,
          PRIMARY KEY(scope_type, scope_key)
        );
        CREATE TABLE IF NOT EXISTS ai_read_audits (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL REFERENCES documents(id),
          source_version_id TEXT,
          source_artifact_id TEXT,
          entrypoint TEXT NOT NULL,
          result TEXT NOT NULL,
          error_code TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ai_read_audits_document ON ai_read_audits(document_id, created_at DESC);
      `);
      this.database.exec('PRAGMA user_version = 3');
      this.database.run('COMMIT');
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }
}

function documentId(change: InboxChange): string {
  return change.kind === 'document' ? change.id : change.documentId;
}

function requiredText(value: SqlValue | undefined): string {
  if (typeof value !== 'string') throw new Error('收件箱索引字段损坏');
  return value;
}

function nullableText(value: SqlValue | undefined): string | null {
  if (value === null || value === undefined) return null;
  return requiredText(value);
}

function requiredDocumentId(value: string | null): string {
  if (!value) throw new Error('AI 结果缺少来源文档');
  return value;
}

function requiredVersionId(value: string | null): string {
  if (!value) throw new Error('AI 结果缺少来源版本');
  return value;
}

function mediaTypeForFormat(format: string): string {
  switch (format) {
    case 'markdown':
    case 'md':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

function inferFormatFromPath(filePath: string): string {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  if (!ext) return 'txt';
  if (ext === 'md') return 'markdown';
  return ext;
}

function isAiTextReadableFormat(format: string): boolean {
  return ['markdown', 'md', 'json', 'txt', 'text', 'csv', 'yaml', 'xml', 'log'].includes(format);
}

function fileExists(target: string): boolean {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function newEntityId(prefix: string, now = Date.now()): string {
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(Math.trunc(now), 0, 6);
  randomBytes(10).copy(bytes, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${prefix}${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function describeLocalFile(filePath: string): Promise<{ contentHash: string; sizeBytes: number }> {
  const bytes = await readFile(filePath);
  return {
    contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    sizeBytes: bytes.byteLength,
  };
}

async function persistManagedTextFile(filePath: string, content: string): Promise<{ contentHash: string; sizeBytes: number }> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf-8');
  return describeLocalFile(filePath);
}

function parseJsonArray(value: SqlValue | undefined): string[] {
  const text = nullableText(value);
  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}
