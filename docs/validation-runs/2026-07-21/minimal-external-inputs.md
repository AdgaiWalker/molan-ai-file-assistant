# 剩余任务最小外部输入清单

日期：2026-07-21

用途：把当前未完成任务里真正无法靠本地继续推进的部分，压成一份最小外部输入与资源清单。能本地决定的身份值已单独列出，不再重复索要。

## 当前结论

- 未完成任务数：19
- 阻塞任务数：[!] 2
- 待外部验收任务数：[v] 16
- 仍需外部资源的活动组数：5
- 真正还缺的身份类输入数：8 / 8

## 已在本地定死的身份值

- 正式产品名：`墨览`
- 品牌 slug：`molan`
- Android applicationId：`com.molan.reader`
- Android 显示名：`墨览`
- iOS Bundle ID：`com.molan.reader`
- iOS URL Scheme：`molan`
- iOS App Group ID：`group.com.molan.reader`
- 桌面 App ID：`com.molan.desktop`
- 桌面 packageName：`molan-desktop`

## 现在只缺的身份类输入

1. 正式主体名称
   - 当前值：`[待补正式主体]`
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-002、G-003、G-004、G-005、G-006、G-007

2. 支持邮箱
   - 当前值：`[待补支持邮箱]`
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-006

3. 正式域名
   - 当前值：`[待补正式域名]`
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-006

4. 账号 / 数据删除入口 URL
   - 当前值：`[待补正式域名]/account/delete（待确认）`
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：G-001、G-006

5. Apple 开发者账号主体
   - 当前值：未填写
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-003、G-005

6. Google Play 开发者账号主体
   - 当前值：未填写
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-002

7. Windows / Microsoft 发布主体
   - 当前值：未填写
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-004

8. 域名持有人
   - 当前值：未填写
   - 建议回填位置：`config/release-identity-inputs.json`
   - 直接影响：A-007、G-001、G-006

## 外部资源组

### 身份 / 账号 / 公开主体

- 覆盖任务：A-007、G-001
- 类型：需要填写真实值
- 说明：这一组已经不是工程实现问题；现在统一在 config/release-identity-inputs.json 里补值，随后运行 node scripts/apply_release_identity_inputs.mjs --check 预检。

#### 最小输入

- 正式主体名称
- 支持邮箱
- 正式域名
- 账号 / 数据删除入口 URL
- Apple 开发者账号主体
- Google Play 开发者账号主体
- Windows / Microsoft 发布主体
- 域名持有人

#### 已准备好的入口

- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-checklist-seed.txt`
- `docs/validation-runs/2026-07-21/identity_and_accounts/evidence/identity-evidence-templates.txt`
- `config/release-identity-inputs.json`

### 移动真机来源与性能矩阵

- 覆盖任务：B-002、B-004、B-008、B-009、C-002、C-004、C-008、C-009
- 类型：需要拿到真实设备 / 账号 / 渠道
- 说明：这一组缺的是设备和真实来源，不缺模板、样例或字段定义。

#### 最少需要到位的资源

- 至少 2 台 Android 真机（最好覆盖两个国产品牌）
- 至少 1 台 iPhone 与 1 台 iPad
- 微信 / QQ / 浏览器 / 文件 App / 系统分享面板的真实入口
- 录屏与性能记录能力

#### 已准备好的入口

- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-prep-summary.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/mobile-device-run-sheet.md`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-device-matrix.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/mobile-run-checklist.txt`

### 同步 / AI / 回流联调环境

- 覆盖任务：D-010、F-005
- 类型：需要拿到真实设备 / 账号 / 渠道
- 说明：真实 Codex 读取/写回与电脑确认已完成；这一组现在缺的是 Docker Compose 编排/卷隔离和 Android/iOS 真机矩阵。

#### 最少需要到位的资源

- Docker Compose 可运行环境（真实 PostgreSQL 18.4 数据库主链已通过）
- 桌面端真实收件箱联调机器
- Android / iOS 真机

#### 已准备好的入口

- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-prep-summary.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/sync-ai-run-sheet.md`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-environment-checklist.txt`
- `docs/validation-runs/2026-07-21/sync_ai_return/evidence/sync-ai-run-order.txt`

### 正式发布渠道 / 签名 / 公证 / 官网替换

- 覆盖任务：G-002、G-003、G-004、G-005、G-006、G-007
- 类型：需要拿到真实设备 / 账号 / 渠道
- 说明：这一组缺的是正式渠道和账号能力，不缺候选产物、SHA256 占位和演练模板。

#### 最少需要到位的资源

- Android release 签名与渠道后台
- Apple Team / Profile / TestFlight / macOS 公证信息
- Windows 安装包发布渠道
- 官网真实下载链接、真实客服邮箱、回滚演练记录

#### 已准备好的入口

- `docs/validation-runs/2026-07-21/release_dry_run/release-prep-summary.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-run-sheet.md`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/release-candidate-manifest.json`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

### 旧 React Native mobile 最终清理窗口

- 覆盖任务：G-008
- 类型：需要拿到真实设备 / 账号 / 渠道
- 说明：这一组缺的是发布完成后的安全删除窗口；在 G-002～G-007 关闭前，不执行真实删除。

#### 最少需要到位的资源

- G-002～G-007 全部已关闭
- 旧 mobile 删除前审计 must_remove 为 0
- 可执行删除后的 Android / iOS / desktop / CLI 全量验证窗口

#### 已准备好的入口

- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json`
- `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt`


## 当前建议顺序

1. 先补完上面的 8 个身份类输入；
2. 再启动移动真机矩阵；
3. 然后共用一次同步 / AI / 回流联调环境；
4. 最后进入正式发布与官网替换；
5. G-008 永远最后做。

