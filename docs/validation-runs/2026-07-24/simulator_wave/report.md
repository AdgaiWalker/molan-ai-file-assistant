# 移动端模拟器集中验收记录

日期：2026-07-24

结论：Android 16、iPhone 17 Pro 与 iPad (A16) 均完成当前代码的构建、安装和首屏启动；没有发现阻断级崩溃。此记录是本地 V1 回归证明，不替代 TODO.md 明确要求的真机、来源 App、签名或商店 V2 证据。

## 环境

| 平台 | 设备 / 运行时 | 工具 |
|---|---|---|
| Android | `medium_phone`，Android 16，API 36，`sdk_gphone64_arm64`，1080×2400，420 dpi | Android Emulator 36.6.11.0、adb |
| iPhone | iPhone 17 Pro，iOS 26.5，UDID `AA674B72-105C-41BC-992F-89BA3FF0406C` | Xcode 26.6（17F113） |
| iPad | iPad (A16)，iOS 26.5，UDID `BF282115-CAE3-447E-A739-2E551F239125` | Xcode 26.6（17F113） |
| JVM | Temurin 17.0.19 | `JAVA_HOME=/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home` |

## 必要验证结果

### 共享契约

命令：

```bash
node --test contracts/test/*.test.mjs
node contracts/src/check.mjs
```

结果：37 项通过，0 失败；核心实体、生命周期、格式处理器、OpenAPI 与 AI 结果包检查通过。

### Android / KMP

命令：

```bash
env \
  JAVA_HOME=/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home \
  ANDROID_HOME=/Users/happy/Library/Android/sdk \
  ./gradlew :shared:allTests :androidApp:assembleDebug :androidApp:testDebugUnitTest
```

结果：`BUILD SUCCESSFUL`，64 个任务中 3 个执行、61 个命中缓存；KMP 全测、Android 单测与 Debug APK 构建均通过。

运行结果：

- APK 安装：`Success`
- 包名 / Activity：`com.molan.reader/.MainActivity`
- 冷启动：`Status: ok`，`LaunchState: COLD`，`TotalTime: 4300 ms`
- 应用进程：PID `4241`
- crash buffer：空
- 首屏截图：[android-home.png](android-home.png)

### iOS / iPadOS

无正式证书测试命令：

```bash
env \
  JAVA_HOME=/Users/happy/.cache/molan-toolchains/jdk17/jdk-17.0.19+10/Contents/Home \
  ANDROID_HOME=/Users/happy/Library/Android/sdk \
  xcodebuild \
    -project native/iosApp/Molan.xcodeproj \
    -scheme Molan \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' \
    -derivedDataPath native/iosApp/build/ios-simulator-wave \
    CODE_SIGNING_ALLOWED=NO \
    test
```

结果：8 项通过，0 失败，`TEST SUCCEEDED`。测试覆盖启动失败恢复、收集幂等与版本、编码、非法/深层 JSON、JSONPath/截断/搜索、Markdown 结构和重试。

安装运行使用 Xcode 的 `Sign to Run Locally` 临时签名，不依赖 Apple 开发证书：

- `BUILD SUCCEEDED`
- Bundle ID：`com.molan.reader`
- 版本：`1.0 (1)`
- 最低系统：iOS 17.0
- iPhone 安装成功，启动 PID `55885`，进程存活，最近两分钟 error/fault 日志为空
- iPad 安装成功，启动 PID `56496`，进程存活，最近两分钟 error/fault 日志为空
- iPhone 首屏：[iphone-home.png](iphone-home.png)
- iPad 首屏：[ipad-home.png](ipad-home.png)

## 产物哈希

| 产物 | SHA-256 |
|---|---|
| `native/androidApp/build/outputs/apk/debug/androidApp-debug.apk` | `f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77` |
| `native/iosApp/build/ios-simulator-run/Build/Products/Debug-iphonesimulator/Molan.app/Molan` | `8a4cc5582fb1aa42f1834bf9379a34244a52da39690ffe4953a94b7c9483e131` |
| `android-home.png` | `65d5742050db331c697080c2b6de194029f75cef198216ece31e0a405cd28c9a` |
| `iphone-home.png` | `0e5f04b709b731c09d4027d7aa31468a4356a3172de5993e154d7ec9381641c5` |
| `ipad-home.png` | `78e76119b7e74714e28719aad078e6cda1b96adc1abc52bf94e86cfa63619b93` |

## 执行观察

- 三台虚拟设备同时运行时，16 GB 内存下 iOS 首次数据迁移明显排队；改为 Android 取证后关闭，再顺序执行 iPhone、iPad，启动恢复正常。
- 无签名 iOS 产物适合构建和单测；直接安装运行使用模拟器本地临时签名，仍不需要正式证书。
- 本轮没有修改产品代码，也没有新增兼容分支。

## TODO 判定

- B-002、B-004、B-008、B-009：本地模拟器回归继续通过，但缺少两种国产 Android 品牌、真实来源 App 和中低端性能证据，保持 `[v]`。
- C-002、C-004、C-008、C-009：iPhone/iPad 模拟器回归继续通过，但缺少真机入口、物理内存、系统终止和录屏，保持 `[v]`。
- F-005：本轮只证明两端应用可运行，没有伪造真机结果回流录屏，保持 `[v]`。

