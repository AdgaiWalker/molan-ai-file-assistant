# D5.5 渠道策略

## 1. 渠道优先级

| 优先级 | 渠道 | 阶段 | 用途 |
|---|---|---|---|
| 1 | GitHub Release | V1 | 版本产物、checksum、release notes 的源头 |
| 2 | 官网下载页 | V1 | 面向国内用户的下载和教程入口 |
| 3 | 国内镜像 | V1.5 | 解决 GitHub 下载慢或不可访问 |
| 4 | 安卓商店 | V1.5/V2 | 面向普通用户分发 |
| 5 | App Store | V2 | iOS 正式分发 |
| 6 | 企业/团队私有分发 | V3 | 团队与企业部署 |

## 2. GitHub Release

GitHub Release 是发布源头：
- 上传 APK/AAB/Windows installer/CLI zip。
- 上传 `checksums.txt`。
- 发布 `release-notes.md`。
- 标记版本 tag，例如 `v1.0.0`。

要求：
- tag 与 App/CLI 版本一致。
- release notes 写清已知限制。
- 没有真实产物不得创建“正式可用”下载描述。

## 3. 官网

官网职责：
- 指向 GitHub Release 或镜像下载。
- 提供微信/QQ 打开教程。
- 提供隐私说明和 FAQ。
- 提供反馈入口。

官网不作为产物源头；官网展示的版本、大小、SHA256 必须来自 release 清单。

## 4. 国内镜像

候选：
- 对象存储静态下载。
- 国内代码托管 release。
- 网盘临时下载。

规则：
- 镜像文件必须与 GitHub Release SHA256 一致。
- 镜像页面必须展示校验值。
- 网盘只做临时 fallback，不作为唯一渠道。
- 需要付费对象存储或账号时，先记录阻塞。

## 5. 安卓商店

候选：
- 应用宝。
- 华为/小米/OPPO/vivo 等商店。
- 酷安或其他社区渠道。

进入条件：
- APK/AAB 产物稳定。
- 隐私政策页面可访问。
- 微信/QQ 真机打开证据可提供。
- 包名、签名、图标、名称稳定。

阻塞：
- 商店开发者账号。
- 软著/资质。
- 隐私合规材料。
- 上架审核。

## 6. App Store

进入条件：
- iOS 文件打开、分享、safe-area 真机通过。
- Apple Developer 账号可用。
- 隐私政策、截图、描述、关键词准备完成。

V1 不以 App Store 为阻塞；没有账号或证书时记录材料和阻塞。

## 7. CLI 分发

CLI 渠道：
- GitHub Release zip。
- npm 包后置评估。
- README 中给 Agent 的安装说明。

V1 优先 zip，避免过早引入 npm 包名、权限和长期维护成本。

## 8. 验收口径

- GitHub Release 是源头，官网和镜像不得出现不一致产物。
- 国内用户有官网入口和镜像策略。
- 安卓商店/App Store 的账号、证书、审核阻塞明确。
- CLI 先 zip 分发，npm 后置。
- 每个渠道都必须能追溯到版本、大小、SHA256 和 release notes。
