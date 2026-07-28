import { describe, expect, it } from 'vitest';
import {
  AuthService,
  tokenHash,
  type AuthRepository,
  type ChallengeRecord,
  type DeviceRecord,
  type DeviceRegistration,
  type SessionRecord,
} from '../src/auth.js';
import { newEntityId } from '../src/ids.js';
import { close, createApp, listen } from '../src/app.js';
import { JsonLogger } from '../src/logger.js';

class MemoryAuthRepository implements AuthRepository {
  challenges = new Map<string, ChallengeRecord & { createdAt: string }>();
  deviceRecords = new Map<string, DeviceRecord>();
  sessions = new Map<string, SessionRecord>();
  deletingPhones = new Set<string>();
  deletingUsers = new Set<string>();

  async userDeletionAtByPhone(phoneNumber: string) { return this.deletingPhones.has(phoneNumber) ? '2026-07-17T00:00:00.000Z' : null; }
  async userDeletionAt(userId: string) { return this.deletingUsers.has(userId) ? '2026-07-17T00:00:00.000Z' : null; }

  async latestChallengeAt(phoneNumber: string) {
    return [...this.challenges.values()].filter((item) => item.phoneNumber === phoneNumber)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt ?? null;
  }
  async saveChallenge(challenge: ChallengeRecord, createdAt: string) { this.challenges.set(challenge.id, { ...challenge, createdAt }); }
  async challenge(id: string) { return this.challenges.get(id) ?? null; }
  async consumeChallenge(id: string, consumedAt: string) {
    const value = this.challenges.get(id);
    if (!value || value.consumedAt) return false;
    value.consumedAt = consumedAt;
    return true;
  }
  async upsertUserAndDevice(phone: string, input: DeviceRegistration, now: string) {
    const existing = [...this.deviceRecords.values()].find((item) => item.installationId === input.installationId);
    const value: DeviceRecord = existing ? { ...existing, ...input, trusted: true, revokedAt: null, updatedAt: now, lastSeenAt: now } : {
      ...input,
      id: newEntityId('dev_', Date.parse(now)),
      userId: `usr_${tokenHash(phone).slice(0, 36)}`,
      trusted: true,
      lastSeenAt: now,
      lastSyncAt: null,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    this.deviceRecords.set(value.id, value);
    return value;
  }
  async saveSession(session: SessionRecord) { this.sessions.set(session.id, session); }
  async sessionByAccessHash(hash: string) { return [...this.sessions.values()].find((item) => item.accessTokenHash === hash) ?? null; }
  async sessionByRefreshHash(hash: string) { return [...this.sessions.values()].find((item) => item.refreshTokenHash === hash) ?? null; }
  async rotateSession(previousId: string, next: SessionRecord, now: string) {
    const previous = this.sessions.get(previousId);
    if (!previous || previous.revokedAt || previous.replacedBySessionId) return false;
    previous.revokedAt = now;
    previous.replacedBySessionId = next.id;
    this.sessions.set(next.id, next);
    return true;
  }
  async revokeSession(id: string, now: string) { const value = this.sessions.get(id); if (value) value.revokedAt ??= now; }
  async revokeRefreshFamily(id: string, now: string) { for (const value of this.sessions.values()) if (value.refreshFamilyId === id) value.revokedAt ??= now; }
  async devices(userId: string) { return [...this.deviceRecords.values()].filter((item) => item.userId === userId); }
  async revokeDevice(userId: string, deviceId: string, now: string) {
    const device = this.deviceRecords.get(deviceId);
    if (!device || device.userId !== userId) return false;
    device.revokedAt ??= now;
    device.trusted = false;
    for (const session of this.sessions.values()) if (session.device.id === deviceId) session.revokedAt ??= now;
    return true;
  }
}

const device: DeviceRegistration = {
  installationId: 'installation-1234567890',
  name: 'iPhone 测试机',
  type: 'phone',
  platform: 'ios',
  appVersion: '0.1.0',
};

async function login(service: AuthService, phone = '+8613800000000') {
  const challenge = await service.requestCode(phone);
  return service.verify(challenge.challengeId, '246810', device);
}

describe('账号、设备与会话', () => {
  it('验证码登录、设备列表、退出形成完整 HTTP 链路且忽略未知字段', async () => {
    const service = new AuthService(new MemoryAuthRepository(), '246810');
    const app = createApp({
      database: { check: async () => true, close: async () => undefined },
      objectStorage: { check: async () => true },
      logger: new JsonLogger('error', () => undefined),
      auth: service,
    });
    const port = await listen(app, '127.0.0.1', 0);
    try {
      const challengeResponse = await fetch(`http://127.0.0.1:${port}/v1/auth/code/request`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phoneNumber: '+8613800000000', futureField: 'ignored' }),
      });
      const challenge = await challengeResponse.json() as { challengeId: string };
      const loginResponse = await fetch(`http://127.0.0.1:${port}/v1/auth/code/verify`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.challengeId, code: '246810', device }),
      });
      const session = await loginResponse.json() as { accessToken: string; device: { id: string } };
      expect(session.accessToken).toBeTruthy();
      const devices = await fetch(`http://127.0.0.1:${port}/v1/devices`, {
        headers: { authorization: `Bearer ${session.accessToken}` },
      });
      expect(await devices.json()).toMatchObject({ ok: true, devices: [{ id: session.device.id }] });
      expect((await fetch(`http://127.0.0.1:${port}/v1/auth/logout`, {
        method: 'POST', headers: { authorization: `Bearer ${session.accessToken}` },
      })).status).toBe(204);
    } finally {
      await close(app);
    }
  });

  it('错误验证码和过期验证码不能创建会话', async () => {
    let time = new Date('2026-07-17T00:00:00.000Z');
    const service = new AuthService(new MemoryAuthRepository(), '246810', () => time);
    const first = await service.requestCode('+8613800000001');
    await expect(service.verify(first.challengeId, '000000', device)).rejects.toMatchObject({ code: 'E_AUTH_CODE_INVALID' });
    time = new Date('2026-07-17T00:06:00.000Z');
    await expect(service.verify(first.challengeId, '246810', device)).rejects.toMatchObject({ code: 'E_AUTH_CODE_EXPIRED' });
  });

  it('refresh 轮换后重放会撤销整个凭据家族', async () => {
    const service = new AuthService(new MemoryAuthRepository(), '246810');
    const first = await login(service, '+8613800000002');
    const second = await service.refresh(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({ code: 'E_REFRESH_REUSED' });
    await expect(service.authenticate(`Bearer ${second.accessToken}`)).rejects.toMatchObject({ code: 'E_AUTH_REQUIRED' });
  });

  it('设备撤销后现有 access token 立即被拒绝', async () => {
    const service = new AuthService(new MemoryAuthRepository(), '246810');
    const session = await login(service, '+8613800000003');
    const context = await service.authenticate(`Bearer ${session.accessToken}`);
    await service.revokeDevice(context, context.deviceId);
    await expect(service.authenticate(`Bearer ${session.accessToken}`)).rejects.toMatchObject({ code: 'E_DEVICE_REVOKED' });
  });

  it('账号进入删除流程后拒绝新登录、刷新和现有 access token', async () => {
    const repository = new MemoryAuthRepository();
    const service = new AuthService(repository, '246810');
    const session = await login(service, '+8613800000004');
    const context = await service.authenticate(`Bearer ${session.accessToken}`);
    repository.deletingUsers.add(context.userId);
    await expect(service.authenticate(`Bearer ${session.accessToken}`)).rejects.toMatchObject({ code: 'E_ACCOUNT_DELETING' });
    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({ code: 'E_ACCOUNT_DELETING' });

    repository.deletingPhones.add('+8613800000005');
    const challenge = await service.requestCode('+8613800000005');
    await expect(service.verify(challenge.challengeId, '246810', device)).rejects.toMatchObject({ code: 'E_ACCOUNT_DELETING' });
  });
});
