# 工程身份一致性快照

日期：2026-07-21

对应任务：

- A-007
- G-001

配置源：`config/product-identity.json`

## 当前实际值

### Android

- applicationId：`com.molan.reader`
- displayName：`墨览`

### iOS

- bundleId：`com.molan.reader`
- testBundleId：`com.molan.reader.tests`
- shareBundleId：`com.molan.reader.share`
- displayName：`墨览`
- urlName：`com.molan.reader.inbox`
- urlScheme：`molan`
- appGroupId：`group.com.molan.reader`
- shareEntitlementsAppGroupId：`group.com.molan.reader`
- keychainService：`com.molan.reader.sync`
- backgroundSessionIdentifier：`com.molan.reader.sync-upload`
- appGroupOpenUrl：`molan://inbox`
- xcodeprojBundleIds：`com.molan.reader.tests`, `com.molan.reader.share`, `com.molan.reader`, `com.molan.reader.share`, `com.molan.reader`, `com.molan.reader.tests`

### 桌面

- appId：`com.molan.desktop`
- packageName：`molan-desktop`
- productName：`墨览`

## 检查结果

当前工程内开发身份与 `config/product-identity.json` 一致。

## 停止条件

- Android / iOS / 桌面的开发身份统一由 `config/product-identity.json` 表达；
- 正式切换身份时，先更新该配置，再同步工程文件与公开文案；
- 本快照与 `identity-readiness-snapshot` 同步通过后，才继续商店与签名动作。

