import { createApp, listen, close } from './app.js';
import { AuthService } from './auth.js';
import { loadConfig } from './config.js';
import { PostgresDatabase } from './database.js';
import { JsonLogger } from './logger.js';
import { migrateDatabase } from './migrate.js';
import { LocalObjectStorage } from './storage.js';
import { PostgresAuthRepository } from './postgres-auth.js';
import { FileService } from './files.js';
import { PostgresFileRepository } from './postgres-files.js';
import { SyncService } from './sync.js';
import { PostgresSyncRepository } from './postgres-sync.js';

const command = process.argv[2] ?? 'serve';
const config = loadConfig();
const logger = new JsonLogger(config.logLevel);
const database = new PostgresDatabase(config.databaseUrl);

if (command === 'migrate') {
  try {
    const applied = await migrateDatabase(database);
    logger.write('info', 'migration_completed', { applied });
    await database.close();
  } catch (error) {
    logger.write('error', 'migration_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    await database.close().catch(() => undefined);
    process.exitCode = 1;
  }
} else if (command === 'serve') {
  const objectStorage = new LocalObjectStorage(config.objectDirectory);
  const auth = new AuthService(new PostgresAuthRepository(database.pool), config.localAuthCode);
  const files = new FileService(new PostgresFileRepository(database.pool), objectStorage);
  const sync = new SyncService(new PostgresSyncRepository(database.pool));
  const server = createApp({ database, objectStorage, logger, auth, files, sync });
  try {
    await listen(server, config.host, config.port);
    logger.write('info', 'server_started', { host: config.host, port: config.port });
    let cleanupRunning = false;
    const cleanup = async () => {
      if (cleanupRunning) return;
      cleanupRunning = true;
      try {
        const result = await files.cleanupOrphans();
        logger.write('info', 'orphan_cleanup_completed', result);
      } catch (error) {
        logger.write('warn', 'orphan_cleanup_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
      } finally {
        cleanupRunning = false;
      }
    };
    void cleanup();
    const cleanupTimer = setInterval(() => void cleanup(), 60 * 60 * 1_000);
    cleanupTimer.unref();
    const shutdown = async (signal: string) => {
      clearInterval(cleanupTimer);
      logger.write('info', 'server_stopping', { signal });
      await close(server);
      await database.close();
    };
    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.write('error', 'server_start_failed', {
      errorCode: (error as NodeJS.ErrnoException).code ?? 'E_UNKNOWN',
    });
    await database.close().catch(() => undefined);
    process.exitCode = 1;
  }
} else {
  logger.write('error', 'command_invalid', { command });
  await database.close();
  process.exitCode = 1;
}
