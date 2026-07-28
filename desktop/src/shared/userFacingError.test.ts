import { describe, expect, it } from 'vitest';
import { userFacingError } from './userFacingError';

describe('userFacingError', () => {
  it('移除 Electron IPC 前缀并保留服务端消息', () => {
    const error = new Error(
      "Error invoking remote method 'sync-login': Error: 手机号格式无效",
    );

    expect(userFacingError(error, '操作未完成')).toBe('手机号格式无效');
  });

  it('错误码和网络底层消息使用友好兜底', () => {
    expect(userFacingError(new Error('E_INTERNAL'), '操作未完成')).toBe('操作未完成');
    expect(userFacingError(new Error('fetch failed'), '操作未完成')).toBe('操作未完成');
  });
});
