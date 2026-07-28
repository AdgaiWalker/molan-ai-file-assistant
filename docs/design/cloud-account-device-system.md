# D3.2 账号与设备体系设计

## 1. 目标

账号与设备体系只服务三件事：

1. 让用户在多设备之间找回自己主动保存的资料。
2. 让云端同步能知道“哪台设备在什么时候做了什么”。
3. 让用户能撤销设备、退出登录、删除云端资料。

真实账号服务在 `TODO.md` 阶段 D 启动；在此之前不改变当前 CLI 本地模拟行为。

## 2. 登录方式

| 阶段 | 登录方式 | 说明 |
|---|---|---|
| 同步 MVP | 手机号 + 验证码 | 国内优先，最少账号心智，不要求密码 |
| 后续 | 微信登录 | 只做便捷登录，不把微信文件自动上传 |
| 团队阶段 | 企业 SSO | 团队空间和企业部署再接入 |

登录边界：
- 未登录也能打开、阅读、编辑、转换、复制、分享本地文件。
- 云同步、跨设备恢复、云端收件箱需要登录。
- 登录不等于上传文件；上传仍需用户主动确认。
- 验证码、token、refresh token 不写入日志，不进入 CLI JSON 内容输出。

## 3. 用户模型

```ts
interface UserAccount {
  id: string;
  phoneNumber: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

字段规则：
- `id` 由服务端生成，客户端只保存引用。
- `phoneNumber` 只用于登录与找回，不暴露给 AI 读取入口。
- `deletedAt` 存在时账号进入删除流程，所有设备 token 失效。

## 4. 设备模型

```ts
interface UserDevice {
  id: string;
  userId: string;
  name: string;
  type: 'phone' | 'desktop' | 'cli' | 'web';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
  appVersion: string;
  trusted: boolean;
  lastSeenAt: string;
  lastSyncAt?: string;
  syncCursor?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}
```

设备名规则：
- 默认：`iPhone 15`、`Xiaomi 14 Pro`、`Windows 桌面端`、`CLI on Windows`。
- 用户可改名，改名只影响显示，不影响设备 ID。
- 同名设备允许存在，但 UI 需要显示平台与最后同步时间辅助区分。

设备绑定规则：
- 登录成功后自动创建或恢复当前设备记录。
- 同一安装实例保留稳定 `deviceId`；重装后视为新设备。
- 用户可在设置页查看设备列表并撤销任意非当前设备。
- 当前设备退出登录时只清除会话，不默认删除本地文件与本地最近记录。

## 5. 会话与 token

```ts
interface AuthSession {
  userId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}
```

会话规则：
- `accessToken` 短期有效，`refreshToken` 绑定设备。
- 设备被撤销后，refresh token 立即失效。
- CLI 登录后也注册为设备，`molan pull/read/push` 使用同一设备身份。
- 真实云端上线前，CLI 本地模拟不需要登录；上线后新增登录命令时必须保持 `pull/read/push --json` 输出契约可解析。

## 6. 最后同步时间

展示层使用两个时间：

| 字段 | 用途 |
|---|---|
| `lastSeenAt` | 最近打开 App、CLI 或桌面端的时间 |
| `lastSyncAt` | 最近一次成功同步完成的时间 |

显示规则：
- 设置页：展示所有设备的设备名、平台、最后在线、最后同步。
- 云端收件箱：展示当前文件来自哪台设备，以及该设备的最后同步时间。
- CLI `pull`：未来可在扩展字段里返回 `sourceDeviceName`、`sourceDeviceLastSyncAt`，但不能移除现有 `ok/results/errorCode/error` 字段。

## 7. 隐私边界

- 设备体系只同步账号、设备、同步游标和用户主动保存的记录。
- 文件内容默认不上传；设备绑定不会触发文件扫描。
- 设备列表不显示完整手机号，只显示脱敏账号标识。
- 撤销设备后，该设备不能继续读取云端内容。
- 账号删除必须删除云端元数据、文件对象和服务端会话；本地副本由用户确认是否删除。

## 8. 失败状态

| 场景 | 用户可见反馈 | 后续动作 |
|---|---|---|
| 验证码错误 | 验证码不正确 | 保留手机号，允许重试 |
| 验证码过期 | 验证码已过期 | 重新发送 |
| 网络不可用 | 当前离线，稍后同步 | 本地功能继续可用 |
| 设备被撤销 | 当前设备登录已失效 | 回到登录页，本地文件不删除 |
| token 刷新失败 | 需要重新登录 | 暂停云同步队列 |

## 9. 验收口径

- 未登录状态下，本地阅读、复制、编辑、转换、分享不受影响。
- 登录后设备列表能看到当前设备名、平台、最后在线和最后同步。
- 撤销设备后，该设备无法继续云端 `pull/read/push`。
- CLI 真实云端登录接入前，本地模拟 `push -> pull -> read` 契约不变。
- 文件上传仍由 D3.5 的上传边界控制，不能因登录自动上传。
