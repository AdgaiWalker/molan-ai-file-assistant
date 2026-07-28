import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigrations } from '../src/migrate.js';
import type { MigrationClient } from '../src/database.js';

class FakeMigrationClient implements MigrationClient {
  readonly statements: string[] = [];
  constructor(private readonly failOn = '') {}

  async query(sql: string): Promise<{ rows: unknown[] }> {
    this.statements.push(sql);
    if (this.failOn && sql.includes(this.failOn)) throw new Error('injected migration failure');
    return { rows: [] };
  }
}

describe('数据库迁移', () => {
  it('按文件顺序执行并登记版本', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'molan-migrations-'));
    await writeFile(join(directory, '002_second.sql'), 'SELECT 2;');
    await writeFile(join(directory, '001_first.sql'), 'SELECT 1;');
    const client = new FakeMigrationClient();
    expect(await applyMigrations(client, directory)).toEqual(['001_first.sql', '002_second.sql']);
    expect(client.statements.indexOf('SELECT 1;')).toBeLessThan(client.statements.indexOf('SELECT 2;'));
  });

  it('迁移失败时回滚并释放全局锁', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'molan-migrations-failure-'));
    await writeFile(join(directory, '001_broken.sql'), 'BROKEN MIGRATION;');
    const client = new FakeMigrationClient('BROKEN');
    await expect(applyMigrations(client, directory)).rejects.toThrow('injected migration failure');
    expect(client.statements).toContain('ROLLBACK');
    expect(client.statements.at(-1)).toBe('SELECT pg_advisory_unlock(684234914)');
  });
});
