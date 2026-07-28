import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createHash, randomUUID } from 'node:crypto';

export interface ObjectStorageHealth {
  check(): Promise<boolean>;
}

export class LocalObjectStorage implements ObjectStorageHealth {
  constructor(readonly root: string) {}

  async check(): Promise<boolean> {
    const id = randomUUID();
    const temporary = join(this.root, `.health-${id}.tmp`);
    const committed = join(this.root, `.health-${id}`);
    try {
      await mkdir(this.root, { recursive: true });
      const handle = await open(temporary, 'wx');
      await handle.writeFile('ok');
      await handle.sync();
      await handle.close();
      await rename(temporary, committed);
      await rm(committed);
      return true;
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      await rm(committed, { force: true }).catch(() => undefined);
      return false;
    }
  }

  async write(key: string, bytes: Buffer): Promise<{ sizeBytes: number; etag: string }> {
    const target = this.path(key);
    const temporary = `${target}.tmp-${randomUUID()}`;
    await mkdir(dirname(target), { recursive: true });
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
    return { sizeBytes: bytes.length, etag: sha256(bytes) };
  }

  async compose(sourceKeys: string[], destinationKey: string): Promise<{ sizeBytes: number; etag: string }> {
    const target = this.path(destinationKey);
    const temporary = `${target}.tmp-${randomUUID()}`;
    await mkdir(dirname(target), { recursive: true });
    const output = createWriteStream(temporary, { flags: 'wx' });
    try {
      for (const key of sourceKeys) await pipeline(createReadStream(this.path(key)), output, { end: false });
      output.end();
      await new Promise<void>((resolvePromise, reject) => {
        output.once('finish', resolvePromise);
        output.once('error', reject);
      });
      const handle = await open(temporary, 'r');
      await handle.sync();
      await handle.close();
      const result = await fileHash(temporary);
      await rename(temporary, target);
      return result;
    } catch (error) {
      output.destroy();
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }

  async move(sourceKey: string, destinationKey: string): Promise<void> {
    const destination = this.path(destinationKey);
    await mkdir(dirname(destination), { recursive: true });
    await rename(this.path(sourceKey), destination);
  }

  async info(key: string): Promise<{ path: string; sizeBytes: number }> {
    const path = this.path(key);
    return { path, sizeBytes: (await stat(path)).size };
  }

  async entries(prefix: string): Promise<Array<{ key: string; modifiedAt: number }>> {
    const base = this.path(prefix);
    const result: Array<{ key: string; modifiedAt: number }> = [];
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      for (const entry of entries) {
        const item = join(directory, entry.name);
        if (entry.isDirectory()) await visit(item);
        else if (entry.isFile()) {
          const info = await stat(item);
          result.push({ key: item.slice(resolve(this.root).length + 1).split(sep).join('/'), modifiedAt: info.mtimeMs });
        }
      }
    };
    await visit(base);
    return result;
  }

  path(key: string): string {
    const target = resolve(this.root, key);
    const root = resolve(this.root);
    if (target !== root && !target.startsWith(`${root}${sep}`)) throw new Error('object key escapes storage root');
    return target;
  }
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fileHash(path: string): Promise<{ sizeBytes: number; etag: string }> {
  const hash = createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of createReadStream(path)) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    sizeBytes += bytes.length;
    hash.update(bytes);
  }
  return { sizeBytes, etag: hash.digest('hex') };
}
