import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MigrationClient, PostgresDatabase } from './database.js';

export async function applyMigrations(client: MigrationClient, directory: string): Promise<string[]> {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp())');
  const files = (await readdir(directory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  const applied: string[] = [];
  await client.query('SELECT pg_advisory_lock(684234914)');
  try {
    for (const file of files) {
      const rows = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]) as { rows?: unknown[] };
      if ((rows.rows?.length ?? 0) > 0) continue;
      await client.query('BEGIN');
      try {
        await client.query(await readFile(join(directory, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(684234914)');
  }
  return applied;
}

export async function migrateDatabase(database: PostgresDatabase): Promise<string[]> {
  const directory = join(dirname(dirname(fileURLToPath(import.meta.url))), 'migrations');
  return database.withClient((client) => applyMigrations(client, directory));
}
