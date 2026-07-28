import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { AuthService, DeviceRecord, DeviceRegistration } from './auth.js';
import type { DatabaseHealth } from './database.js';
import { ApiError, errorBody } from './errors.js';
import type { JsonLogger } from './logger.js';
import type { ObjectStorageHealth } from './storage.js';
import { publicFileObject, type CreateUploadInput, type FileService } from './files.js';
import type { SyncMutation, SyncService } from './sync.js';

export interface AppDependencies {
  database: DatabaseHealth;
  objectStorage: ObjectStorageHealth;
  logger: JsonLogger;
  auth?: AuthService;
  files?: FileService;
  sync?: SyncService;
}

export function createApp(dependencies: AppDependencies): Server {
  return createHttpServer(async (request, response) => {
    const requestId = request.headers['x-request-id']?.toString().slice(0, 128) || randomUUID();
    const startedAt = performance.now();
    response.setHeader('x-request-id', requestId);
    try {
      await route(request, response, requestId, dependencies);
    } catch (error) {
      const failure = error instanceof ApiError
        ? error
        : new ApiError(500, 'E_INTERNAL', '服务器内部错误', false);
      sendJson(response, failure.status, errorBody(failure, requestId));
      dependencies.logger.write('error', 'request_failed', {
        requestId,
        method: request.method,
        path: request.url?.split('?')[0],
        status: failure.status,
        errorCode: failure.code,
      });
    } finally {
      dependencies.logger.write('info', 'request_completed', {
        requestId,
        method: request.method,
        path: request.url?.split('?')[0],
        status: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
    }
  });
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  dependencies: AppDependencies,
): Promise<void> {
  const path = request.url?.split('?')[0];
  if (request.method === 'GET' && path === '/v1/health') {
    const [database, objectStorage] = await Promise.all([
      dependencies.database.check(),
      dependencies.objectStorage.check(),
    ]);
    if (!database) throw new ApiError(503, 'E_DATABASE_UNAVAILABLE', '数据库不可用', true);
    if (!objectStorage) throw new ApiError(503, 'E_STORAGE_UNAVAILABLE', '对象存储不可用', true);
    sendJson(response, 200, { ok: true, database: 'up', objectStorage: 'up', requestId });
    return;
  }
  const auth = dependencies.auth;
  if (request.method === 'POST' && path === '/v1/auth/code/request') {
    const body = await readJson(request);
    sendJson(response, 202, await requireAuthService(auth).requestCode(requiredString(body, 'phoneNumber')));
    return;
  }
  if (request.method === 'POST' && path === '/v1/auth/code/verify') {
    const body = await readJson(request);
    const session = await requireAuthService(auth).verify(
      requiredString(body, 'challengeId'),
      requiredString(body, 'code'),
      requiredDevice(body['device']),
    );
    sendJson(response, 200, { ok: true, ...session, device: publicDevice(session.device) });
    return;
  }
  if (request.method === 'POST' && path === '/v1/auth/refresh') {
    const body = await readJson(request);
    const session = await requireAuthService(auth).refresh(requiredString(body, 'refreshToken'));
    sendJson(response, 200, { ok: true, ...session, device: publicDevice(session.device) });
    return;
  }
  if (request.method === 'POST' && path === '/v1/auth/logout') {
    const service = requireAuthService(auth);
    await service.logout(await service.authenticate(request.headers.authorization));
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method === 'GET' && path === '/v1/devices') {
    const service = requireAuthService(auth);
    const devices = await service.listDevices(await service.authenticate(request.headers.authorization));
    sendJson(response, 200, { ok: true, devices: devices.map(publicDevice) });
    return;
  }
  const deviceMatch = path?.match(/^\/v1\/devices\/(dev_[0-9a-f-]+)$/);
  if (request.method === 'DELETE' && deviceMatch) {
    const service = requireAuthService(auth);
    const context = await service.authenticate(request.headers.authorization);
    await service.revokeDevice(context, deviceMatch[1]!);
    response.statusCode = 204;
    response.end();
    return;
  }
  if (request.method === 'POST' && path === '/v1/files/uploads') {
    const service = requireFileService(dependencies.files);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const input: CreateUploadInput = {
      clientMutationId: requiredString(body, 'clientMutationId'),
      fileObjectId: requiredString(body, 'fileObjectId'),
      role: requiredString(body, 'role') as CreateUploadInput['role'],
      format: requiredString(body, 'format'),
      contentHash: requiredString(body, 'contentHash'),
      sizeBytes: requiredNumber(body, 'sizeBytes'),
      mediaType: requiredString(body, 'mediaType'),
    };
    sendJson(response, 201, await service.createUpload(context, input));
    return;
  }
  const partMatch = path?.match(/^\/v1\/files\/uploads\/(upl_[0-9a-f-]+)\/parts\/([0-9]+)$/);
  if (request.method === 'PUT' && partMatch) {
    const service = requireFileService(dependencies.files);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    sendJson(response, 200, await service.uploadPart(
      context,
      partMatch[1]!,
      Number(partMatch[2]),
      await readBinary(request, MaximumUploadPartBytes),
    ));
    return;
  }
  const completeMatch = path?.match(/^\/v1\/files\/uploads\/(upl_[0-9a-f-]+)\/complete$/);
  if (request.method === 'POST' && completeMatch) {
    const service = requireFileService(dependencies.files);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const rawParts = body['parts'];
    if (!Array.isArray(rawParts)) throw new ApiError(400, 'E_HASH_MISMATCH', '缺少分片清单', false);
    const parts = rawParts.map((part) => {
      if (!part || typeof part !== 'object' || Array.isArray(part)) throw new ApiError(400, 'E_HASH_MISMATCH', '分片清单无效', false);
      const record = part as Record<string, unknown>;
      return { partNumber: requiredNumber(record, 'partNumber'), etag: requiredString(record, 'etag') };
    });
    const object = await service.completeUpload(context, completeMatch[1]!, parts);
    sendJson(response, 200, { ok: true, fileObject: publicFileObject(object) });
    return;
  }
  const fileMatch = path?.match(/^\/v1\/files\/(obj_[0-9a-f-]+)$/);
  if (request.method === 'GET' && fileMatch) {
    const service = requireFileService(dependencies.files);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const object = await service.download(context, fileMatch[1]!);
    const range = parseRange(request.headers.range, object.sizeBytes);
    response.statusCode = range ? 206 : 200;
    response.setHeader('content-type', object.mediaType);
    response.setHeader('accept-ranges', 'bytes');
    response.setHeader('etag', object.etag);
    response.setHeader('content-length', (range ? range.end - range.start + 1 : object.sizeBytes).toString());
    if (range) response.setHeader('content-range', `bytes ${range.start}-${range.end}/${object.sizeBytes}`);
    createReadStream(object.path, range ?? undefined).pipe(response);
    return;
  }
  if (request.method === 'POST' && path === '/v1/sync/push') {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const raw = body['mutations'];
    if (!Array.isArray(raw)) throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步批次无效', false);
    const mutations = raw.map(requiredMutation);
    sendJson(response, 200, await service.push(context, requiredString(body, 'deviceId'), mutations, requestId));
    return;
  }
  if (request.method === 'POST' && path === '/v1/sync/pull') {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    sendJson(response, 200, await service.pull(
      context,
      requiredString(body, 'deviceId'),
      nullableString(body, 'cursor'),
      requiredNumber(body, 'limit'),
    ));
    return;
  }
  const documentMatch = path?.match(/^\/v1\/documents\/(doc_[0-9a-f-]+)$/);
  if (request.method === 'DELETE' && documentMatch) {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const mutation: SyncMutation = {
      clientMutationId: requiredString(body, 'clientMutationId'),
      deviceId: requiredString(body, 'deviceId'),
      documentId: documentMatch[1]!,
      versionId: null,
      baseVersionId: nullableString(body, 'baseVersionId'),
      operation: 'delete',
      retryCount: 0,
      payload: { documentId: documentMatch[1]!, scope: requiredString(body, 'scope') },
    };
    const result = await service.push(context, mutation.deviceId, [mutation], requestId);
    const item = result.results[0];
    if (!item?.ok) throw new ApiError(409, item?.error?.errorCode ?? 'E_INTERNAL', item?.error?.error ?? '删除失败', false);
    sendJson(response, 202, { ok: true, event: item.event });
    return;
  }
  const restoreMatch = path?.match(/^\/v1\/documents\/(doc_[0-9a-f-]+)\/restore$/);
  if (request.method === 'POST' && restoreMatch) {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const mutation: SyncMutation = {
      clientMutationId: requiredString(body, 'clientMutationId'),
      deviceId: requiredString(body, 'deviceId'),
      documentId: restoreMatch[1]!, versionId: null, baseVersionId: null,
      operation: 'restore', retryCount: 0, payload: { documentId: restoreMatch[1]! },
    };
    const result = await service.push(context, mutation.deviceId, [mutation], requestId);
    const item = result.results[0];
    if (!item?.ok) throw new ApiError(409, item?.error?.errorCode ?? 'E_INTERNAL', item?.error?.error ?? '恢复失败', false);
    sendJson(response, 202, { ok: true, event: item.event });
    return;
  }
  const archiveMatch = path?.match(/^\/v1\/documents\/(doc_[0-9a-f-]+)\/archive$/);
  if (request.method === 'POST' && archiveMatch) {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const mutation: SyncMutation = {
      clientMutationId: requiredString(body, 'clientMutationId'),
      deviceId: requiredString(body, 'deviceId'),
      documentId: archiveMatch[1]!,
      versionId: null,
      baseVersionId: nullableString(body, 'baseVersionId'),
      operation: 'archive',
      retryCount: 0,
      payload: { documentId: archiveMatch[1]! },
    };
    const result = await service.push(context, mutation.deviceId, [mutation], requestId);
    const item = result.results[0];
    if (!item?.ok) throw new ApiError(409, item?.error?.errorCode ?? 'E_INTERNAL', item?.error?.error ?? '归档失败', false);
    sendJson(response, 202, { ok: true, event: item.event });
    return;
  }
  if (request.method === 'GET' && path === '/v1/conflicts') {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    sendJson(response, 200, { ok: true, conflicts: await service.listConflicts(context) });
    return;
  }
  const conflictMatch = path?.match(/^\/v1\/conflicts\/(con_[0-9a-f-]+)\/resolve$/);
  if (request.method === 'POST' && conflictMatch) {
    const service = requireSyncService(dependencies.sync);
    const context = await requireAuthService(auth).authenticate(request.headers.authorization);
    const body = await readJson(request);
    const conflict = await service.resolveConflict(
      context,
      conflictMatch[1]!,
      requiredString(body, 'resolution') as 'keep_local' | 'keep_remote' | 'save_copy' | 'manual_merge',
    );
    sendJson(response, 200, { ok: true, conflict });
    return;
  }
  throw new ApiError(404, 'E_FILE_NOT_FOUND', '接口不存在', false);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MaximumJsonBodyBytes) throw new ApiError(413, 'E_FILE_TOO_LARGE', '请求体过大', false);
    chunks.push(buffer);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'E_AUTH_CODE_INVALID', '请求 JSON 无效', false);
  }
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value) throw new ApiError(400, 'E_AUTH_CODE_INVALID', `缺少字段 ${key}`, false);
  return value;
}

function requiredNumber(body: Record<string, unknown>, key: string): number {
  const value = body[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ApiError(400, 'E_FILE_NOT_FOUND', `字段 ${key} 无效`, false);
  }
  return value;
}

function nullableString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new ApiError(400, 'E_FILE_NOT_FOUND', `字段 ${key} 无效`, false);
  return value;
}

function requiredMutation(value: unknown): SyncMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步事件无效', false);
  }
  const body = value as Record<string, unknown>;
  const payload = body['payload'];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'E_FILE_NOT_FOUND', '同步载荷无效', false);
  }
  return {
    clientMutationId: requiredString(body, 'clientMutationId'),
    deviceId: requiredString(body, 'deviceId'),
    documentId: requiredString(body, 'documentId'),
    versionId: nullableString(body, 'versionId'),
    baseVersionId: nullableString(body, 'baseVersionId'),
    operation: requiredString(body, 'operation') as SyncMutation['operation'],
    retryCount: requiredNumber(body, 'retryCount'),
    payload: payload as Record<string, unknown>,
  };
}

async function readBinary(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBytes) throw new ApiError(413, 'E_FILE_TOO_LARGE', '上传分片过大', false);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function requiredDevice(value: unknown): DeviceRegistration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'E_AUTH_CODE_INVALID', '设备信息无效', false);
  }
  const body = value as Record<string, unknown>;
  return {
    installationId: requiredString(body, 'installationId'),
    name: requiredString(body, 'name'),
    type: requiredString(body, 'type') as DeviceRegistration['type'],
    platform: requiredString(body, 'platform') as DeviceRegistration['platform'],
    appVersion: requiredString(body, 'appVersion'),
  };
}

function publicDevice(device: DeviceRecord) {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    platform: device.platform,
    appVersion: device.appVersion,
    trusted: device.trusted,
    lastSeenAt: device.lastSeenAt,
    lastSyncAt: device.lastSyncAt,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
    revokedAt: device.revokedAt,
  };
}

function requireAuthService(service: AuthService | undefined): AuthService {
  if (!service) throw new ApiError(503, 'E_DATABASE_UNAVAILABLE', '账号服务不可用', true);
  return service;
}

function requireFileService(service: FileService | undefined): FileService {
  if (!service) throw new ApiError(503, 'E_STORAGE_UNAVAILABLE', '文件服务不可用', true);
  return service;
}

function requireSyncService(service: SyncService | undefined): SyncService {
  if (!service) throw new ApiError(503, 'E_DATABASE_UNAVAILABLE', '同步服务不可用', true);
  return service;
}

function parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = header.match(/^bytes=([0-9]+)-([0-9]*)$/);
  if (!match) throw new ApiError(416, 'E_FILE_NOT_FOUND', 'Range 无效', false);
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= size) {
    throw new ApiError(416, 'E_FILE_NOT_FOUND', 'Range 超出文件范围', false);
  }
  return { start, end };
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('content-length', Buffer.byteLength(data));
  response.end(data);
}

export async function listen(server: Server, host: string, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    const failed = (error: Error) => reject(error);
    server.once('error', failed);
    server.listen(port, host, () => {
      server.off('error', failed);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('服务器监听地址不可用');
  return address.port;
}

export async function close(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const MaximumJsonBodyBytes = 64 * 1024;
const MaximumUploadPartBytes = 4 * 1024 * 1024;
