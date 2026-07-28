import { Pool, type PoolClient } from 'pg';

export interface DatabaseHealth {
  check(): Promise<boolean>;
  close(): Promise<void>;
}

export interface MigrationClient {
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
}

export class PostgresDatabase implements DatabaseHealth {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 3_000 });
  }

  async check(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async withClient<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      return await action(client);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
