# D5.3 下载发布包设计

## 1. V1 发布产物

V1 GitHub Release 至少包含：
- Android release APK。
- Windows installer 或 CLI zip 二选一；优先 CLI zip 作为 AI 工作流入口。
- `checksums.txt`。
- `release-notes.md`。

完整发布包目标：

| 产物 | 文件名示例 | 用途 |
|---|---|---|
| Android APK | `molan-android-v1.0.0-arm64.apk` | 国内用户手动安装 |
| Android AAB | `molan-android-v1.0.0.aab` | 商店提交材料 |
| Windows installer | `molan-desktop-v1.0.0-setup.exe` | 桌面 GUI 安装 |
| CLI zip | `molan-cli-v1.0.0-win-x64.zip` | AI/Agent 调用 |
| checksum | `checksums.txt` | 完整性校验 |
| release notes | `release-notes.md` | 版本说明 |

## 2. 构建命令

Android：

```bash
cd mobile
npm run typecheck
npm test
# release 构建命令按 Expo/EAS 或本地 Android Studio 环境记录
```

桌面：

```bash
cd desktop
npm run typecheck
npm run build:dist
```

CLI：

```bash
cd desktop/cli
npm run typecheck
npm run build
npm test
```

## 3. checksum

`checksums.txt` 格式：

```text
SHA256  filename  size_bytes
<sha256>  molan-android-v1.0.0-arm64.apk  <bytes>
<sha256>  molan-desktop-v1.0.0-setup.exe  <bytes>
<sha256>  molan-cli-v1.0.0-win-x64.zip  <bytes>
```

Windows 生成示例：

```powershell
Get-FileHash .\release\molan-cli-v1.0.0-win-x64.zip -Algorithm SHA256
```

## 4. release notes

模板：

```md
# 墨览 v1.0.0

## 本版重点
- 手机端可打开 Markdown / JSON。
- 支持阅读、复制、轻编辑、转换、分享。
- CLI 支持 Office/PDF/PPT/Excel/CSV 转 Markdown，并提供 JSON 输出。

## 下载
- Android APK:
- Windows installer:
- CLI zip:

## 校验
见 checksums.txt。

## 已知限制
- iOS 和应用商店发布需要真实账号/证书。
- 微信/QQ 真机打开需附本版设备证据。
- 云端后端尚未上线，CLI pull/read/push 当前为本地模拟。
```

## 5. 发布目录结构

```text
release/
  v1.0.0/
    molan-android-v1.0.0-arm64.apk
    molan-android-v1.0.0.aab
    molan-desktop-v1.0.0-setup.exe
    molan-cli-v1.0.0-win-x64.zip
    checksums.txt
    release-notes.md
```

`release/` 是生成目录，不手动编辑源码式内容，不纳入常规代码评审；最终上传产物时只记录路径、大小、SHA256 和下载链接。

## 6. 阻塞记录

遇到以下情况不得伪造完成：
- 缺少 Android 签名配置。
- 缺少 Apple Developer 账号或 iOS 证书。
- 缺少 GitHub Release 权限。
- 缺少商店后台账号。
- Windows installer 因 pandoc 或签名缺失无法构建。

记录模板：

```text
阻塞项：
需要账号/权限/设备：
已完成材料：
下一步：
```

## 7. 验收口径

- 发布包清单明确 APK/AAB/Windows installer/CLI zip。
- 每个产物都有文件名规则、构建命令、大小和 SHA256 记录要求。
- release notes 覆盖下载、校验、已知限制。
- 外部账号或证书缺失时记录阻塞，不冒充发布成功。
