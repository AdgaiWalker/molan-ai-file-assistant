# 身份与公开入口当前状态快照

日期：2026-07-21

对应任务：

- A-007
- G-001

用途：把当前仓库里已经确定的产品身份、包名、公开文案入口和仍待补的占位集中拉平，避免后续签名、商店、官网和应用内各填各的。

## 1. 当前已识别的产品身份

### 品牌

- 正式产品名候选：`墨览`
- 品牌 slug：`molan`

### Android

- applicationId：`com.molan.reader`
- 对外显示名：`墨览`
- versionName：`0.1.0-dev`

### iOS / iPadOS

- Bundle ID：`com.molan.reader`
- 对外显示名：`墨览`
- URL Scheme：`molan`
- App Group ID：`group.com.molan.reader`
- versionName：`1.0`
- buildNumber：`1`

### 桌面 / CLI

- 桌面 App ID：`com.molan.desktop`
- 桌面对外名称：`墨览`
- 桌面 package：`molan-desktop`
- CLI package：`molan-cli`

## 2. 当前公开入口

### 隐私说明

- 源文件：`docs/public/privacy-policy.md`
- 当前站点链接：#/privacy
- 待补占位数：4
- 待补项：[待补正式主体]、[待补支持邮箱]、[待补正式域名]、[待补支持邮箱]

### 服务条款

- 源文件：`docs/public/terms-of-service.md`
- 当前站点链接：#/terms
- 待补占位数：3
- 待补项：[待补正式主体]、[待补支持邮箱]、[待补支持邮箱]

### 账号与数据删除说明

- 源文件：`docs/public/account-and-data-deletion.md`
- 当前站点链接：#/deletion
- 待补占位数：2
- 待补项：[待补支持邮箱]、[待补正式域名]

### 支持与反馈

- 源文件：`docs/public/support.md`
- 当前站点链接：#/support
- 待补占位数：2
- 待补项：[待补支持邮箱]、[待补正式域名]

## 3. 当前缺口

- 高优先级缺口：1
- 中优先级缺口：3
- 公开文案待补占位总数：11

1. [medium] 隐私说明 仍有待补占位：文件 `docs/public/privacy-policy.md` 当前还有 4 个占位：[待补正式主体]、[待补支持邮箱]、[待补正式域名]、[待补支持邮箱]。
2. [medium] 服务条款 仍有待补占位：文件 `docs/public/terms-of-service.md` 当前还有 3 个占位：[待补正式主体]、[待补支持邮箱]、[待补支持邮箱]。
3. [medium] 账号与数据删除说明 仍有待补占位：文件 `docs/public/account-and-data-deletion.md` 当前还有 2 个占位：[待补支持邮箱]、[待补正式域名]。
4. [high] 支持与反馈 仍有待补占位：文件 `docs/public/support.md` 当前还有 2 个占位：[待补支持邮箱]、[待补正式域名]。

## 4. 建议回填顺序

1. 先确定正式主体、域名、支持邮箱；
2. 再统一 Android applicationId、iOS Bundle ID / URL Scheme / App Group、桌面 App ID；
3. 用真实值替换 `docs/public/` 下的占位文案；
4. 最后同步回官网、应用内入口、商店后台和 `TODO.md` 当前记录。

## 5. 停止条件

- 正式产品名、Android applicationId、iOS Bundle ID、URL Scheme、App Group ID、桌面 App ID 都已切到可发布值；
- 公开隐私、条款、删除和支持页不再包含待补占位；
- 官网、应用内和商店后台展示同一套主体、域名、支持邮箱和发布入口。

