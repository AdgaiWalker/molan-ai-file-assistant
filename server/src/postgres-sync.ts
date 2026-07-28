import type { Pool, PoolClient } from 'pg';
import type {
  ConflictRecord,
  DocumentHead,
  SyncEvent,
  SyncMutation,
  SyncRepository,
} from './sync.js';

export class PostgresSyncRepository implements SyncRepository {
  constructor(private readonly pool: Pool) {}

  async eventByMutation(userId: string, mutationId: string) {
    const result = await this.pool.query<EventRow>(
      'SELECT payload_hash, event_payload FROM sync_events WHERE user_id = $1 AND client_mutation_id = $2',
      [userId, mutationId],
    );
    return result.rows[0] ? { payloadHash: result.rows[0].payload_hash, event: result.rows[0].event_payload } : null;
  }

  async documentHead(userId: string, documentId: string): Promise<DocumentHead | null> {
    const result = await this.pool.query<{ current_version_id: string | null; deleted_at: Date | null }>(
      'SELECT current_version_id, deleted_at FROM documents WHERE user_id = $1 AND id = $2',
      [userId, documentId],
    );
    const row = result.rows[0];
    return row ? { currentVersionId: row.current_version_id, deletedAt: row.deleted_at?.toISOString() ?? null } : null;
  }

  async commit(
    userId: string,
    mutation: SyncMutation,
    payloadHash: string,
    rawEvent: Omit<SyncEvent, 'cursor'>,
    conflict: ConflictRecord | null,
  ): Promise<SyncEvent> {
    return this.transaction(async (client) => {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${userId}:${mutation.clientMutationId}`],
      );
      const existing = await client.query<EventRow>(
        'SELECT payload_hash, event_payload FROM sync_events WHERE user_id = $1 AND client_mutation_id = $2',
        [userId, mutation.clientMutationId],
      );
      if (existing.rows[0]) return existing.rows[0].event_payload;
      await applyPayload(client, userId, mutation, conflict !== null);
      await applyOperation(client, userId, mutation, rawEvent.createdAt, conflict !== null);
      if (conflict) {
        await client.query(
          `INSERT INTO conflicts(id, user_id, document_id, local_version_id, remote_version_id, detected_at, resolved_at, resolution)
           VALUES ($1,$2,$3,$4,$5,$6,NULL,NULL)`,
          [conflict.id, userId, conflict.documentId, conflict.localVersionId, conflict.remoteVersionId, conflict.detectedAt],
        );
      }
      const inserted = await client.query<{ sequence: string }>(
        `INSERT INTO sync_events(
           id, user_id, client_mutation_id, payload_hash, device_id, document_id, version_id,
           base_version_id, operation, phase, retry_count, object_storage_ref, tombstone,
           error_code, event_payload, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
         RETURNING sequence`,
        [rawEvent.id, userId, mutation.clientMutationId, payloadHash, mutation.deviceId,
          mutation.documentId, mutation.versionId, mutation.baseVersionId, mutation.operation,
          rawEvent.phase, mutation.retryCount, rawEvent.objectStorageRef, rawEvent.tombstone,
          rawEvent.errorCode, rawEvent, rawEvent.createdAt],
      );
      const event: SyncEvent = { ...rawEvent, cursor: `cur_${inserted.rows[0]!.sequence}` };
      await client.query('UPDATE sync_events SET event_payload = $2 WHERE id = $1', [event.id, event]);
      return event;
    });
  }

  async pull(userId: string, afterSequence: number, limit: number) {
    const result = await this.pool.query<{ sequence: string; event_payload: SyncEvent }>(
      `SELECT sequence, event_payload FROM sync_events
       WHERE user_id = $1 AND sequence > $2 ORDER BY sequence ASC LIMIT $3`,
      [userId, afterSequence, limit + 1],
    );
    const page = result.rows.slice(0, limit);
    return {
      events: page.map((row) => row.event_payload),
      lastSequence: page.length ? Number(page.at(-1)!.sequence) : afterSequence,
      hasMore: result.rows.length > limit,
    };
  }

  async conflicts(userId: string): Promise<ConflictRecord[]> {
    const result = await this.pool.query<ConflictRow>(
      'SELECT * FROM conflicts WHERE user_id = $1 AND resolved_at IS NULL ORDER BY detected_at DESC',
      [userId],
    );
    return result.rows.map(rowToConflict);
  }

  async resolveConflict(
    userId: string,
    conflictId: string,
    resolution: NonNullable<ConflictRecord['resolution']>,
    now: string,
  ): Promise<ConflictRecord | null> {
    return this.transaction(async (client) => {
      const result = await client.query<ConflictRow>(
        `UPDATE conflicts SET resolution = $3, resolved_at = $4
         WHERE user_id = $1 AND id = $2 AND resolved_at IS NULL RETURNING *`,
        [userId, conflictId, resolution, now],
      );
      const row = result.rows[0];
      if (!row) return null;
      await client.query(
        `UPDATE documents SET state = 'synced', updated_at = $3,
         current_version_id = CASE WHEN $4 = 'keep_remote' THEN $5 ELSE current_version_id END
         WHERE user_id = $1 AND id = $2`,
        [userId, row.document_id, now, resolution, row.remote_version_id],
      );
      return rowToConflict(row);
    });
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

async function applyPayload(
  client: PoolClient,
  userId: string,
  mutation: SyncMutation,
  conflict: boolean,
): Promise<void> {
  if (mutation.operation !== 'upsert') return;
  const payload = mutation.payload;
  const id = stringField(payload, 'id');
  if (id.startsWith('doc_')) {
    await client.query(
      `INSERT INTO documents(id, user_id, source_device_id, title, original_format, current_version_id, state, created_at, updated_at, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT(id) DO UPDATE SET
         title = EXCLUDED.title, original_format = EXCLUDED.original_format,
         current_version_id = CASE WHEN $11 THEN documents.current_version_id ELSE COALESCE(EXCLUDED.current_version_id, documents.current_version_id) END,
         state = CASE WHEN $11 THEN 'conflict' ELSE EXCLUDED.state END,
         updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at`,
      [id, userId, stringField(payload, 'sourceDeviceId'), stringField(payload, 'title'),
        stringField(payload, 'originalFormat'), nullableString(payload, 'currentVersionId'),
        conflict ? 'conflict' : 'synced', stringField(payload, 'createdAt'), stringField(payload, 'updatedAt'),
        nullableString(payload, 'deletedAt'), conflict],
    );
  } else if (id.startsWith('ver_')) {
    await client.query(
      `INSERT INTO document_versions(
         id, document_id, source_device_id, original_format, content_hash, size_bytes,
         file_object_id, parent_version_id, created_at, updated_at, deleted_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT(id) DO NOTHING`,
      [id, stringField(payload, 'documentId'), stringField(payload, 'sourceDeviceId'),
        stringField(payload, 'originalFormat'), stringField(payload, 'contentHash'),
        numberField(payload, 'sizeBytes'), stringField(payload, 'fileObjectId'),
        nullableString(payload, 'parentVersionId'), stringField(payload, 'createdAt'),
        stringField(payload, 'updatedAt'), nullableString(payload, 'deletedAt')],
    );
  } else if (id.startsWith('obj_')) {
    const storage = objectField(payload, 'objectStorageRef');
    await client.query(
      `INSERT INTO file_objects(
         id, user_id, source_device_id, role, format, media_type, content_hash, size_bytes,
         object_key, etag, ai_read_allowed, created_at, updated_at, deleted_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13)
       ON CONFLICT(id) DO UPDATE SET updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at`,
      [id, userId, stringField(payload, 'sourceDeviceId'), stringField(payload, 'role'),
        stringField(payload, 'format'), stringField(payload, 'mediaType'), stringField(payload, 'contentHash'),
        numberField(payload, 'sizeBytes'), stringField(storage, 'objectKey'), nullableString(storage, 'etag'),
        stringField(payload, 'createdAt'), stringField(payload, 'updatedAt'), nullableString(payload, 'deletedAt')],
    );
  }
}

async function applyOperation(
  client: PoolClient,
  userId: string,
  mutation: SyncMutation,
  now: string,
  conflict: boolean,
): Promise<void> {
  if (conflict) {
    await client.query("UPDATE documents SET state = 'conflict', updated_at = $3 WHERE user_id = $1 AND id = $2", [userId, mutation.documentId, now]);
    return;
  }
  if (mutation.operation === 'upsert' && mutation.versionId) {
    await client.query(
      "UPDATE documents SET current_version_id = $3, state = 'synced', deleted_at = NULL, updated_at = $4 WHERE user_id = $1 AND id = $2",
      [userId, mutation.documentId, mutation.versionId, now],
    );
  } else if (mutation.operation === 'delete') {
    await client.query("UPDATE documents SET state = 'deleted', deleted_at = $3, updated_at = $3 WHERE user_id = $1 AND id = $2", [userId, mutation.documentId, now]);
    await client.query(
      `UPDATE file_objects SET deleted_at = $3, updated_at = $3
       WHERE user_id = $1 AND id IN (SELECT file_object_id FROM document_versions WHERE document_id = $2)`,
      [userId, mutation.documentId, now],
    );
  } else if (mutation.operation === 'archive') {
    await client.query("UPDATE documents SET state = 'archived', updated_at = $3 WHERE user_id = $1 AND id = $2", [userId, mutation.documentId, now]);
  } else if (mutation.operation === 'restore') {
    await client.query("UPDATE documents SET state = 'synced', deleted_at = NULL, updated_at = $3 WHERE user_id = $1 AND id = $2", [userId, mutation.documentId, now]);
    await client.query(
      `UPDATE file_objects SET deleted_at = NULL, updated_at = $3
       WHERE user_id = $1 AND id IN (SELECT file_object_id FROM document_versions WHERE document_id = $2)`,
      [userId, mutation.documentId, now],
    );
  }
}

function rowToConflict(row: ConflictRow): ConflictRecord {
  return {
    id: row.id, documentId: row.document_id, localVersionId: row.local_version_id,
    remoteVersionId: row.remote_version_id, detectedAt: row.detected_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null, resolution: row.resolution,
  };
}

function stringField(value: Record<string, unknown>, key: string): string {
  const item = value[key];
  if (typeof item !== 'string') throw new Error(`invalid payload field ${key}`);
  return item;
}

function nullableString(value: Record<string, unknown>, key: string): string | null {
  const item = value[key];
  if (item === null || item === undefined) return null;
  if (typeof item !== 'string') throw new Error(`invalid payload field ${key}`);
  return item;
}

function numberField(value: Record<string, unknown>, key: string): number {
  const item = value[key];
  if (typeof item !== 'number' || !Number.isSafeInteger(item)) throw new Error(`invalid payload field ${key}`);
  return item;
}

function objectField(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const item = value[key];
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`invalid payload field ${key}`);
  return item as Record<string, unknown>;
}

interface EventRow { payload_hash: string; event_payload: SyncEvent }
interface ConflictRow {
  id: string; document_id: string; local_version_id: string; remote_version_id: string;
  detected_at: Date; resolved_at: Date | null; resolution: ConflictRecord['resolution'];
}
