# 发布与下载架构

## 目标

墨览的发布目标分成两类用户：

- 普通用户：从官网或国内镜像下载手机 APK、Windows 安装包。
- 开发者 / AI agent：从 GitHub 获取源码、Release、CLI 脚本包和校验文件。

发布原则：

- GitHub 做可信源头。
- 官网做国内用户入口。
- 国内对象存储做下载加速。
- 安装包和脚本包都要有版本号、更新日志和 SHA256 校验值。

## 发布渠道

### GitHub

用途：
- 源码仓库
- Issue / 需求讨论
- Release 版本记录
- 二进制产物归档
- 构建说明

Release 附件建议：

```text
molan-mobile-android-v0.1.0.apk
molan-desktop-win-x64-v0.1.0-setup.exe
molan-cli-win-x64-v0.1.0.zip
checksums-sha256.txt
release-notes.md
```

### 官网 / 下载页

用途：
- 给普通用户一个比 GitHub 更友好的入口。
- 说明墨览是什么、解决什么问题、如何下载、如何在微信 / QQ 中打开文件。

页面必须包含：
- Android APK 下载
- Windows 桌面版下载
- Windows CLI / 脚本包下载
- 微信 / QQ “其他应用”打开教程
- 离线优先、本地处理、不默认上传文件的隐私说明
- 更新日志
- SHA256 校验值

### 国内镜像

建议使用：
- 阿里云 OSS
- 腾讯云 COS
- 七牛云
- 又拍云
- Gitee Release

用途：
- 加速国内下载。
- 避免普通用户因为 GitHub 访问慢而放弃。

## 各端发布策略

## 技术栈与体积策略

### 总体原则

- React / TypeScript 作为主栈，服务 AI 辅助开发效率。
- 移动端采用轻 React Native，不把电脑端重转换能力塞进 APK。
- 电脑端 CLI 和 GUI 继续使用 TypeScript 生态。
- Pandoc / LibreOffice 作为外部转换引擎，不用 TypeScript 重写底层转换。

### 移动端体积与启动

目标：
- 打开文件后尽快看到阅读内容。
- APK / AAB 尽量小，但不牺牲核心体验。

策略：
- 使用 Hermes。
- 使用 AAB 上架，官网 APK 尽量分架构。
- 转换模块懒加载。
- 首页只加载最近文档和提示词元数据。
- 不在启动时扫描文件、不预加载转换器、不做阻断式 AI 识别。
- Office / PDF / PPT / Excel → Markdown 下沉到电脑端 CLI。

### 电脑端 / CLI

定位：
- AI 可调用的格式转换脚本。
- 人用的轻量批量转换与编辑器。

策略：
- CLI 优先于 GUI。
- 命令行输出必须稳定、可机器读取。
- GUI 用 Electron + React 保持和主技术栈一致。
- 重转换依赖 Pandoc / LibreOffice。

### Android

V1 可先发布 APK：
- 官网下载
- GitHub Release 归档
- 国内镜像加速

注意：
- APK 必须签名。
- 后续再考虑国内安卓商店：华为、小米、OPPO、vivo、应用宝等。

### iOS

iOS 不作为网站直装下载目标。

推荐路径：
- TestFlight 内测
- App Store 正式发布

### Windows 桌面端

发布两种形态：

- 安装包：适合普通用户批量转换、轻量阅读编辑。
- CLI zip：适合 AI / agent / 脚本调用。

CLI 必须具备：
- 稳定命令行参数
- 结构化错误输出
- 可指定输入 / 输出路径
- 批量转换

## 版本命名

建议使用语义化版本：

```text
v0.1.0
v0.2.0
v1.0.0
```

文件命名：

```text
molan-mobile-android-v0.1.0.apk
molan-desktop-win-x64-v0.1.0-setup.exe
molan-cli-win-x64-v0.1.0.zip
```

## 最小上线清单

第一阶段先完成：

- GitHub 仓库
- README
- PRD
- 市场调研文档
- TODO
- Android APK 构建说明
- Windows 桌面端构建说明
- CLI 脚本规划
- GitHub Release 规范
- 官网下载页规划

## UI / UX 调试与体验验证

Chrome / DevTools 用于快速调 UI：
- Expo Web 调手机页面布局
- Electron DevTools 调电脑端界面
- Chrome Device Toolbar 模拟常见手机尺寸

但 Chrome 不能替代真机验证。

必须用真机验证：
- 微信“其他应用”列表中能否快速找到墨览
- QQ“其他应用”列表中能否快速找到墨览
- 从点击文件到看到内容是否足够快
- Android `content://` 文件是否稳定读取
- 底部按钮是否避开系统导航栏 / 手势条
- 分享面板中微信 / QQ 是否好找

体验目标：
- 微信 / QQ 中找到墨览：最多滑动 1-2 次
- 从点击文件到看到内容：5 秒内
- 从打开文档到复制提示词：10 秒内
- 从打开文档到转换并分享出去：20 秒内

第二阶段再做：

- 自动构建
- 自动 Release
- 官网下载页
- 国内镜像同步
- 自动更新检查

## 信任与安全

必须明确告诉用户：

- 墨览离线优先。
- 文件默认本地处理。
- 不默认上传用户文件。
- 云备份和同步必须用户主动开启。
- Release 文件提供 SHA256 校验值。
