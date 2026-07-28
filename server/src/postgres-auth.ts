import type { Pool, PoolClient } from 'pg';
import type {
  AuthRepository,
  ChallengeRecord,
  DeviceRecord,
  DeviceRegistration,
  SessionRecord,
} from './auth.js';
import { newEntityId } from './ids.js';

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async userDeletionAtByPhone(phoneNumber: string): Promise<string | null> {
    const result = await this.pool.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM users WHERE phone_number = $1',
      [phoneNumber],
    );
    return result.rows[0]?.deleted_at?.toISOString() ?? null;
  }

  async userDeletionAt(userId: string): Promise<string | null> {
    const result = await this.pool.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0]?.deleted_at?.toISOString() ?? null;
  }

  async latestChallengeAt(phoneNumber: string): Promise<string | null> {
    const result = await this.pool.query<{ created_at: Date }>(
      'SELECT created_at FROM auth_challenges WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1',
      [phoneNumber],
    );
    return result.rows[0]?.created_at.toISOString() ?? null;
  }

  async saveChallenge(challenge: ChallengeRecord, createdAt: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO auth_challenges(id, phone_number, code_hash, expires_at, consumed_at, created_at)
       VALUES ($1, $2, $3, $4, NULL, $5)`,
      [challenge.id, challenge.phoneNumber, challenge.codeHash, challenge.expiresAt, createdAt],
    );
  }

  async challenge(id: string): Promise<ChallengeRecord | null> {
    const result = await this.pool.query<ChallengeRow>(
      'SELECT id, phone_number, code_hash, expires_at, consumed_at FROM auth_challenges WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    return row ? {
      id: row.id,
      phoneNumber: row.phone_number,
      codeHash: row.code_hash,
      expiresAt: row.expires_at.toISOString(),
      consumedAt: row.consumed_at?.toISOString() ?? null,
    } : null;
  }

  async consumeChallenge(id: string, consumedAt: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE auth_challenges SET consumed_at = $2 WHERE id = $1 AND consumed_at IS NULL',
      [id, consumedAt],
    );
    return result.rowCount === 1;
  }

  async upsertUserAndDevice(
    phoneNumber: string,
    registration: DeviceRegistration,
    now: string,
  ): Promise<DeviceRecord> {
    return this.transaction(async (client) => {
      const userId = newEntityId('usr_', Date.parse(now));
      const user = await client.query<{ id: string }>(
        `INSERT INTO users(id, phone_number, created_at, updated_at)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT(phone_number) DO UPDATE SET updated_at = EXCLUDED.updated_at
         RETURNING id`,
        [userId, phoneNumber, now],
      );
      const deviceId = newEntityId('dev_', Date.parse(now));
      const device = await client.query<DeviceRow>(
        `INSERT INTO devices(
           id, user_id, installation_id, name, type, platform, app_version, trusted,
           last_seen_at, last_sync_at, created_at, updated_at, revoked_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NULL, $8, $8, NULL)
         ON CONFLICT(user_id, installation_id) DO UPDATE SET
           name = EXCLUDED.name, type = EXCLUDED.type, platform = EXCLUDED.platform,
           app_version = EXCLUDED.app_version, trusted = true, last_seen_at = EXCLUDED.last_seen_at,
           updated_at = EXCLUDED.updated_at, revoked_at = NULL
         RETURNING *`,
        [deviceId, user.rows[0]!.id, registration.installationId, registration.name.trim(),
          registration.type, registration.platform, registration.appVersion, now],
      );
      return rowToDevice(device.rows[0]!);
    });
  }

  async saveSession(session: SessionRecord, createdAt: string): Promise<void> {
    await insertSession(this.pool, session, createdAt);
  }

  async sessionByAccessHash(hash: string): Promise<SessionRecord | null> {
    return this.session('s.access_token_hash = $1', hash);
  }

  async sessionByRefreshHash(hash: string): Promise<SessionRecord | null> {
    return this.session('s.refresh_token_hash = $1', hash);
  }

  async rotateSession(previousId: string, next: SessionRecord, now: string): Promise<boolean> {
    return this.transaction(async (client) => {
      const updated = await client.query(
        `UPDATE auth_sessions SET revoked_at = $2, replaced_by_session_id = $3
         WHERE id = $1 AND revoked_at IS NULL AND replaced_by_session_id IS NULL`,
        [previousId, now, next.id],
      );
      if (updated.rowCount !== 1) return false;
      await insertSession(client, next, now);
      return true;
    });
  }

  async revokeSession(sessionId: string, now: string): Promise<void> {
    await this.pool.query('UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE id = $1', [sessionId, now]);
  }

  async revokeRefreshFamily(familyId: string, now: string): Promise<void> {
    await this.pool.query(
      'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE refresh_family_id = $1',
      [familyId, now],
    );
  }

  async devices(userId: string): Promise<DeviceRecord[]> {
    const result = await this.pool.query<DeviceRow>(
      'SELECT * FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [userId],
    );
    return result.rows.map(rowToDevice);
  }

  async revokeDevice(userId: string, deviceId: string, now: string): Promise<boolean> {
    return this.transaction(async (client) => {
      const result = await client.query(
        `UPDATE devices SET revoked_at = COALESCE(revoked_at, $3), trusted = false, updated_at = $3
         WHERE user_id = $1 AND id = $2`,
        [userId, deviceId, now],
      );
      if (result.rowCount !== 1) return false;
      await client.query(
        'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE device_id = $1',
        [deviceId, now],
      );
      return true;
    });
  }

  private async session(clause: string, value: string): Promise<SessionRecord | null> {
    const result = await this.pool.query<SessionRow>(
      `SELECT s.*, d.installation_id, d.name, d.type, d.platform, d.app_version,
              d.trusted, d.last_seen_at, d.last_sync_at, d.created_at AS device_created_at,
              d.updated_at AS device_updated_at, d.revoked_at AS device_revoked_at
       FROM auth_sessions s JOIN devices d ON d.id = s.device_id WHERE ${clause}`,
      [value],
    );
    return result.rows[0] ? rowToSession(result.rows[0]) : null;
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

async function insertSession(client: Pick<Pool, 'query'> | PoolClient, session: SessionRecord, createdAt: string): Promise<void> {
  await client.query(
    `INSERT INTO auth_sessions(
       id, user_id, device_id, access_token_hash, refresh_token_hash, refresh_family_id,
       expires_at, refresh_expires_at, created_at, revoked_at, replaced_by_session_id
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,NULL)`,
    [session.id, session.userId, session.device.id, session.accessTokenHash, session.refreshTokenHash,
      session.refreshFamilyId, session.expiresAt, session.refreshExpiresAt, createdAt],
  );
}

function rowToDevice(row: DeviceRow): DeviceRecord {
  return {
    id: row.id, userId: row.user_id, installationId: row.installation_id, name: row.name,
    type: row.type, platform: row.platform, appVersion: row.app_version, trusted: row.trusted,
    lastSeenAt: row.last_seen_at.toISOString(), lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
  };
}

function rowToSession(row: SessionRow): SessionRecord {
  return {
    id: row.id, userId: row.user_id, accessTokenHash: row.access_token_hash,
    refreshTokenHash: row.refresh_token_hash, refreshFamilyId: row.refresh_family_id,
    expiresAt: row.expires_at.toISOString(), refreshExpiresAt: row.refresh_expires_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null, replacedBySessionId: row.replaced_by_session_id,
    device: rowToDevice({
      id: row.device_id, user_id: row.user_id, installation_id: row.installation_id,
      name: row.name, type: row.type, platform: row.platform, app_version: row.app_version,
      trusted: row.trusted, last_seen_at: row.last_seen_at, last_sync_at: row.last_sync_at,
      created_at: row.device_created_at, updated_at: row.device_updated_at,
      revoked_at: row.device_revoked_at,
    }),
  };
}

interface ChallengeRow {
  id: string; phone_number: string; code_hash: string; expires_at: Date; consumed_at: Date | null;
}

interface DeviceRow {
  id: string; user_id: string; installation_id: string; name: string;
  type: DeviceRecord['type']; platform: DeviceRecord['platform']; app_version: string;
  trusted: boolean; last_seen_at: Date; last_sync_at: Date | null; created_at: Date;
  updated_at: Date; revoked_at: Date | null;
}

interface SessionRow {
  id: string; user_id: string; device_id: string; access_token_hash: string; refresh_token_hash: string;
  refresh_family_id: string; expires_at: Date; refresh_expires_at: Date; revoked_at: Date | null;
  replaced_by_session_id: string | null; installation_id: string; name: string;
  type: DeviceRecord['type']; platform: DeviceRecord['platform']; app_version: string;
  trusted: boolean; last_seen_at: Date; last_sync_at: Date | null; device_created_at: Date;
  device_updated_at: Date; device_revoked_at: Date | null;
}
