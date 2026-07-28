import { randomBytes } from 'node:crypto';

export function newEntityId(prefix: string, now = Date.now()): string {
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(Math.trunc(now), 0, 6);
  randomBytes(10).copy(bytes, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${prefix}${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
