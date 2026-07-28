import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors.js';
import { newEntityId } from './ids.js';

export type DeviceType = 'phone' | 'desktop' | 'cli' | 'web';
export type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';

export interface DeviceRegistration {
  installationId: string;
  name: string;
  type: DeviceType;
  platform: Platform;
  appVersion: string;
}

export interface DeviceRecord extends DeviceRegistration {
  id: string;
  userId: string;
  trusted: boolean;
  lastSeenAt: string;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export interface ChallengeRecord {
  id: string;
  phoneNumber: string;
  codeHash: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  device: DeviceRecord;
  accessTokenHash: string;
  refreshTokenHash: string;
  refreshFamilyId: string;
  expiresAt: string;
  refreshExpiresAt: string;
  revokedAt: string | null;
  replacedBySessionId: string | null;
}

export interface AuthRepository {
  userDeletionAtByPhone(phoneNumber: string): Promise<string | null>;
  userDeletionAt(userId: string): Promise<string | null>;
  latestChallengeAt(phoneNumber: string): Promise<string | null>;
  saveChallenge(challenge: ChallengeRecord, createdAt: string): Promise<void>;
  challenge(id: string): Promise<ChallengeRecord | null>;
  consumeChallenge(id: string, consumedAt: string): Promise<boolean>;
  upsertUserAndDevice(phoneNumber: string, registration: DeviceRegistration, now: string): Promise<DeviceRecord>;
  saveSession(session: SessionRecord, createdAt: string): Promise<void>;
  sessionByAccessHash(hash: string): Promise<SessionRecord | null>;
  sessionByRefreshHash(hash: string): Promise<SessionRecord | null>;
  rotateSession(previousId: string, next: SessionRecord, now: string): Promise<boolean>;
  revokeSession(sessionId: string, now: string): Promise<void>;
  revokeRefreshFamily(familyId: string, now: string): Promise<void>;
  devices(userId: string): Promise<DeviceRecord[]>;
  revokeDevice(userId: string, deviceId: string, now: string): Promise<boolean>;
}

export interface AuthContext {
  userId: string;
  deviceId: string;
  sessionId: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  device: DeviceRecord;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly localCode: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async requestCode(phoneNumber: string) {
    if (!/^\+[1-9][0-9]{6,14}$/.test(phoneNumber)) {
      throw new ApiError(400, 'E_AUTH_CODE_INVALID', '手机号格式无效', false);
    }
    const now = this.now();
    const latest = await this.repository.latestChallengeAt(phoneNumber);
    if (latest && now.getTime() - Date.parse(latest) < CodeRetrySeconds * 1_000) {
      throw new ApiError(429, 'E_RATE_LIMITED', '请求过于频繁', true, { retryAfterSeconds: CodeRetrySeconds });
    }
    const id = newEntityId('chl_', now.getTime());
    const expiresAt = new Date(now.getTime() + CodeLifetimeMillis).toISOString();
    await this.repository.saveChallenge({
      id,
      phoneNumber,
      codeHash: tokenHash(`${id}:${this.localCode}`),
      expiresAt,
      consumedAt: null,
    }, now.toISOString());
    return { ok: true as const, challengeId: id, expiresAt, retryAfterSeconds: CodeRetrySeconds };
  }

  async verify(challengeId: string, code: string, device: DeviceRegistration): Promise<SessionTokens> {
    validateDevice(device);
    const challenge = await this.repository.challenge(challengeId);
    if (!challenge || challenge.consumedAt || !constantEqual(challenge.codeHash, tokenHash(`${challengeId}:${code}`))) {
      throw new ApiError(401, 'E_AUTH_CODE_INVALID', '验证码不正确', false);
    }
    const now = this.now();
    if (Date.parse(challenge.expiresAt) <= now.getTime()) {
      throw new ApiError(401, 'E_AUTH_CODE_EXPIRED', '验证码已过期', false);
    }
    if (await this.repository.userDeletionAtByPhone(challenge.phoneNumber)) {
      throw new ApiError(423, 'E_ACCOUNT_DELETING', '账号正在删除，不能创建新会话', false);
    }
    if (!await this.repository.consumeChallenge(challengeId, now.toISOString())) {
      throw new ApiError(401, 'E_AUTH_CODE_INVALID', '验证码已使用', false);
    }
    const record = await this.repository.upsertUserAndDevice(challenge.phoneNumber, device, now.toISOString());
    return this.createSession(record, newEntityId('fam_', now.getTime()), now);
  }

  async refresh(refreshToken: string): Promise<SessionTokens> {
    const previous = await this.repository.sessionByRefreshHash(tokenHash(refreshToken));
    if (!previous) throw new ApiError(401, 'E_AUTH_REQUIRED', '会话无效，请重新登录', false);
    const now = this.now();
    if (await this.repository.userDeletionAt(previous.userId)) {
      throw new ApiError(423, 'E_ACCOUNT_DELETING', '账号正在删除', false);
    }
    if (previous.device.revokedAt) throw new ApiError(401, 'E_DEVICE_REVOKED', '当前设备已被撤销', false);
    if (previous.revokedAt || previous.replacedBySessionId) {
      await this.repository.revokeRefreshFamily(previous.refreshFamilyId, now.toISOString());
      throw new ApiError(401, 'E_REFRESH_REUSED', '刷新凭据已被重复使用，请重新登录', false);
    }
    if (Date.parse(previous.refreshExpiresAt) <= now.getTime()) {
      throw new ApiError(401, 'E_AUTH_REQUIRED', '会话已过期，请重新登录', false);
    }
    return this.createSession(previous.device, previous.refreshFamilyId, now, previous.id);
  }

  async authenticate(authorization: string | undefined): Promise<AuthContext> {
    const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1];
    if (!token) throw new ApiError(401, 'E_AUTH_REQUIRED', '需要登录', false);
    const session = await this.repository.sessionByAccessHash(tokenHash(token));
    if (!session) {
      throw new ApiError(401, 'E_AUTH_REQUIRED', '登录已失效', false);
    }
    if (session.device.revokedAt) throw new ApiError(401, 'E_DEVICE_REVOKED', '当前设备已被撤销', false);
    if (await this.repository.userDeletionAt(session.userId)) {
      throw new ApiError(423, 'E_ACCOUNT_DELETING', '账号正在删除', false);
    }
    if (session.revokedAt || Date.parse(session.expiresAt) <= this.now().getTime()) {
      throw new ApiError(401, 'E_AUTH_REQUIRED', '登录已失效', false);
    }
    return { userId: session.userId, deviceId: session.device.id, sessionId: session.id };
  }

  async logout(context: AuthContext): Promise<void> {
    await this.repository.revokeSession(context.sessionId, this.now().toISOString());
  }

  async listDevices(context: AuthContext): Promise<DeviceRecord[]> {
    return this.repository.devices(context.userId);
  }

  async revokeDevice(context: AuthContext, deviceId: string): Promise<void> {
    if (!await this.repository.revokeDevice(context.userId, deviceId, this.now().toISOString())) {
      throw new ApiError(404, 'E_FILE_NOT_FOUND', '设备不存在', false);
    }
  }

  private async createSession(
    device: DeviceRecord,
    refreshFamilyId: string,
    now: Date,
    previousId?: string,
  ): Promise<SessionTokens> {
    const accessToken = randomBytes(32).toString('base64url');
    const refreshToken = randomBytes(48).toString('base64url');
    const session: SessionRecord = {
      id: newEntityId('ses_', now.getTime()),
      userId: device.userId,
      device,
      accessTokenHash: tokenHash(accessToken),
      refreshTokenHash: tokenHash(refreshToken),
      refreshFamilyId,
      expiresAt: new Date(now.getTime() + AccessLifetimeMillis).toISOString(),
      refreshExpiresAt: new Date(now.getTime() + RefreshLifetimeMillis).toISOString(),
      revokedAt: null,
      replacedBySessionId: null,
    };
    const saved = previousId
      ? await this.repository.rotateSession(previousId, session, now.toISOString())
      : (await this.repository.saveSession(session, now.toISOString()), true);
    if (!saved) {
      await this.repository.revokeRefreshFamily(refreshFamilyId, now.toISOString());
      throw new ApiError(401, 'E_REFRESH_REUSED', '刷新凭据已被重复使用，请重新登录', false);
    }
    return { accessToken, refreshToken, expiresAt: session.expiresAt, device };
  }
}

export function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validateDevice(device: DeviceRegistration): void {
  if (device.installationId.length < 16 || device.installationId.length > 256 ||
      !device.name.trim() || device.name.length > 128 || !device.appVersion.trim()) {
    throw new ApiError(400, 'E_AUTH_CODE_INVALID', '设备信息无效', false);
  }
  if (!['phone', 'desktop', 'cli', 'web'].includes(device.type) ||
      !['ios', 'android', 'windows', 'macos', 'linux', 'web'].includes(device.platform)) {
    throw new ApiError(400, 'E_AUTH_CODE_INVALID', '设备平台无效', false);
  }
}

const CodeLifetimeMillis = 5 * 60 * 1_000;
const CodeRetrySeconds = 60;
const AccessLifetimeMillis = 15 * 60 * 1_000;
const RefreshLifetimeMillis = 30 * 24 * 60 * 60 * 1_000;
