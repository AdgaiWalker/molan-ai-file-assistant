# D5.2 包体策略

## 1. 目标

包体策略服务两个目标：
- 用户能快速下载安装。
- 发布产物可重复验证大小、架构和用途。

V1 不追求极限压缩，但必须记录 APK/AAB、Windows installer、CLI zip 的大小和 SHA256。

## 2. Android 包

| 产物 | 用途 | 策略 |
|---|---|---|
| debug APK | 本地调试、真机验收 | 不作为公开下载 |
| release APK | 官网/国内镜像直接下载 | V1 必备 |
| release AAB | 应用商店提交 | 有商店账号后生成 |
| arm64 APK | 主流安卓设备 | 优先 |
| universal APK | 兼容验收和手动安装 | 可选，记录体积 |

门槛：
- release APK 目标小于 80 MB。
- universal APK 目标小于 120 MB。
- AAB 记录大小，不直接面向用户下载。

## 3. 手机端依赖裁定

保留：
- React Native / Expo 基础运行时。
- Markdown/JSON 阅读和轻转换所需 JS 库。
- `expo-print` 等手机端轻转换能力。

禁止：
- 把 pandoc 打进手机包。
- 把桌面 Office 重转换引擎打进手机包。
- 为 V1 未使用的云端/AI SDK 增加大依赖。

## 4. Windows 桌面包

| 产物 | 用途 | 策略 |
|---|---|---|
| Windows installer | 普通用户安装 | V1/V1.5 发布产物 |
| portable zip | 临时验证 | 可选 |
| CLI zip | Agent/开发者下载 | 独立发布 |

桌面包可以包含 `pandoc.exe`，但必须记录：
- pandoc 版本。
- pandoc 文件大小。
- pandoc SHA256。
- installer SHA256。

## 5. CLI 包

CLI zip 内容：
- `dist/index.js`
- `package.json`
- README/使用说明
- 示例输入或链接
- checksum 文件

CLI zip 目标：
- 不包含 Electron。
- 不包含手机依赖。
- 可在 Node.js 环境下运行。

## 6. 体积记录模板

```text
产物：
版本：
构建命令：
文件路径：
文件大小：
SHA256：
构建时间：
备注：
```

## 7. 优化顺序

当包体超门槛时，按顺序处理：
1. 确认是否误打入 `dist/`、`logs/`、`.expo/`、`out/`、`release/`。
2. 检查是否误引入桌面转换依赖到手机。
3. 检查图片资源尺寸。
4. 拆分架构包，优先 arm64。
5. 延后非 V1 功能依赖。

## 8. 验收口径

- Android release APK/AAB 有明确用途与体积门槛。
- arm64 与 universal 包策略明确。
- 手机端不包含 pandoc。
- Windows installer 与 CLI zip 分开记录。
- 每个发布产物都记录大小和 SHA256。
