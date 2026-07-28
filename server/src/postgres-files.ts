import type { Pool, PoolClient } from 'pg';
import type {
  FileRepository,
  FileRole,
  StoredFileObject,
  UploadPart,
  UploadRecord,
} from './files.js';

export class PostgresFileRepository implements FileRepository {
  constructor(private readonly pool: Pool) {}

  async uploadByMutation(userId: string, mutationId: string): Promise<UploadRecord | null> {
    return this.oneUpload('user_id = $1 AND client_mutation_id = $2', [userId, mutationId]);
  }

  async objectByHash(userId: string, contentHash: string, role: FileRole): Promise<StoredFileObject | null> {
    const result = await this.pool.query<FileObjectRow>(
      'SELECT * FROM file_objects WHERE user_id = $1 AND content_hash = $2 AND role = $3 AND deleted_at IS NULL',
      [userId, contentHash, role],
    );
    return result.rows[0] ? rowToObject(result.rows[0]) : null;
  }

  async createUpload(record: UploadRecord): Promise<UploadRecord> {
    return this.transaction(async (client) => {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${record.userId}:${record.clientMutationId}`],
      );
      const existing = await client.query<UploadRow>(
        'SELECT * FROM upload_sessions WHERE user_id = $1 AND client_mutation_id = $2',
        [record.userId, record.clientMutationId],
      );
      if (existing.rows[0]) return rowToUpload(existing.rows[0]);
      const inserted = await client.query<UploadRow>(
        `INSERT INTO upload_sessions(
           id, user_id, device_id, client_mutation_id, request_hash, file_object_id, role, format,
           content_hash, size_bytes, media_type, status, expires_at, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [record.id, record.userId, record.deviceId, record.clientMutationId, record.requestHash,
          record.fileObjectId, record.role, record.format, record.contentHash, record.sizeBytes,
          record.mediaType, record.status, record.expiresAt, record.createdAt],
      );
      return rowToUpload(inserted.rows[0]!);
    });
  }

  async upload(userId: string, uploadId: string): Promise<UploadRecord | null> {
    return this.oneUpload('user_id = $1 AND id = $2', [userId, uploadId]);
  }

  async savePart(part: UploadPart): Promise<void> {
    await this.pool.query(
      `INSERT INTO upload_parts(upload_id, part_number, etag, size_bytes, object_key)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT(upload_id, part_number) DO UPDATE SET
         etag = EXCLUDED.etag, size_bytes = EXCLUDED.size_bytes, object_key = EXCLUDED.object_key`,
      [part.uploadId, part.partNumber, part.etag, part.sizeBytes, part.objectKey],
    );
  }

  async parts(uploadId: string): Promise<UploadPart[]> {
    const result = await this.pool.query<PartRow>(
      'SELECT * FROM upload_parts WHERE upload_id = $1 ORDER BY part_number',
      [uploadId],
    );
    return result.rows.map((row) => ({
      uploadId: row.upload_id,
      partNumber: row.part_number,
      etag: row.etag,
      sizeBytes: Number(row.size_bytes),
      objectKey: row.object_key,
    }));
  }

  async completeUpload(uploadId: string, object: StoredFileObject): Promise<StoredFileObject> {
    return this.transaction(async (client) => {
      const result = await client.query<FileObjectRow>(
        `INSERT INTO file_objects(
           id, user_id, source_device_id, role, format, media_type, content_hash, size_bytes,
           object_key, etag, ai_read_allowed, created_at, updated_at, deleted_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$11,NULL)
         ON CONFLICT(user_id, content_hash, role) DO UPDATE SET updated_at = EXCLUDED.updated_at
         RETURNING *`,
        [object.id, object.userId, object.sourceDeviceId, object.role, object.format, object.mediaType,
          object.contentHash, object.sizeBytes, object.objectKey, object.etag, object.createdAt],
      );
      const stored = rowToObject(result.rows[0]!);
      await client.query(
        'UPDATE upload_sessions SET status = $2, file_object_id = $3 WHERE id = $1',
        [uploadId, 'complete', stored.id],
      );
      return stored;
    });
  }

  async fileObject(userId: string, fileObjectId: string): Promise<StoredFileObject | null> {
    const result = await this.pool.query<FileObjectRow>(
      'SELECT * FROM file_objects WHERE user_id = $1 AND id = $2',
      [userId, fileObjectId],
    );
    return result.rows[0] ? rowToObject(result.rows[0]) : null;
  }

  async expiredUploads(before: string): Promise<UploadRecord[]> {
    const result = await this.pool.query<UploadRow>(
      "SELECT * FROM upload_sessions WHERE status != 'complete' AND expires_at <= $1 ORDER BY expires_at",
      [before],
    );
    return result.rows.map(rowToUpload);
  }

  async deleteUpload(uploadId: string): Promise<void> {
    await this.pool.query('DELETE FROM upload_sessions WHERE id = $1', [uploadId]);
  }

  async activeObjectKeys(): Promise<string[]> {
    const result = await this.pool.query<{ object_key: string }>(
      'SELECT object_key FROM file_objects WHERE object_key IS NOT NULL',
    );
    return result.rows.map((row) => row.object_key);
  }

  private async oneUpload(clause: string, values: unknown[]): Promise<UploadRecord | null> {
    const result = await this.pool.query<UploadRow>(`SELECT * FROM upload_sessions WHERE ${clause}`, values);
    return result.rows[0] ? rowToUpload(result.rows[0]) : null;
  }

  private async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await action(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

function rowToUpload(row: UploadRow): UploadRecord {
  return {
    id: row.id, userId: row.user_id, deviceId: row.device_id,
    clientMutationId: row.client_mutation_id, requestHash: row.request_hash,
    fileObjectId: row.file_object_id, role: row.role, format: row.format,
    contentHash: row.content_hash, sizeBytes: Number(row.size_bytes), mediaType: row.media_type,
    status: row.status, expiresAt: row.expires_at.toISOString(), createdAt: row.created_at.toISOString(),
  };
}

function rowToObject(row: FileObjectRow): StoredFileObject {
  return {
    id: row.id, userId: row.user_id, sourceDeviceId: row.source_device_id,
    role: row.role, format: row.format, mediaType: row.media_type, contentHash: row.content_hash,
    sizeBytes: Number(row.size_bytes), objectKey: row.object_key!, etag: row.etag!,
    aiReadAllowed: row.ai_read_allowed, createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(), deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

interface UploadRow {
  id: string; user_id: string; device_id: string; client_mutation_id: string; request_hash: string;
  file_object_id: string; role: FileRole; format: string; content_hash: string; size_bytes: string;
  media_type: string; status: UploadRecord['status']; expires_at: Date; created_at: Date;
}

interface PartRow {
  upload_id: string; part_number: number; etag: string; size_bytes: string; object_key: string;
}

interface FileObjectRow {
  id: string; user_id: string; source_device_id: string; role: FileRole; format: string;
  media_type: string; content_hash: string; size_bytes: string; object_key: string | null;
  etag: string | null; ai_read_allowed: boolean; created_at: Date; updated_at: Date; deleted_at: Date | null;
}
