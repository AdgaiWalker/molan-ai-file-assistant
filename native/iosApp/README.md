# 墨览 iOS 原生应用

- 技术栈：Swift 6 + SwiftUI；
- 当前 Bundle ID：`com.molan.reader`；后续若再调整，以 `config/product-identity.json` 为唯一来源；
- 最低系统：iOS / iPadOS 17；
- `project.yml` 是工程配置来源，已提交的 `Molan.xcodeproj` 可直接构建；
- `project.yml` 在 Compile Sources 前调用 `:shared:embedAndSignAppleFrameworkForXcode`，需要 JDK 17；
- View 只负责呈现和用户意图，初始化、文件读取与持久化放在模型/数据层。

验证：

```bash
JAVA_HOME="/path/to/jdk17" ANDROID_HOME="/path/to/android-sdk" xcodebuild \
  -project native/iosApp/Molan.xcodeproj \
  -scheme Molan \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath native/iosApp/build/ios-simulator \
  CODE_SIGNING_ALLOWED=NO \
  build
```

模拟器测试：

```bash
JAVA_HOME="/path/to/jdk17" ANDROID_HOME="/path/to/android-sdk" xcodebuild \
  -project native/iosApp/Molan.xcodeproj \
  -scheme Molan \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath native/iosApp/build/ios-tests \
  CODE_SIGNING_ALLOWED=NO \
  test
```

无人工 UI 验收：

```bash
JAVA_HOME="/path/to/jdk17" ANDROID_HOME="/path/to/android-sdk" \
  ./scripts/run_ios_ui_acceptance.sh
```

脚本会自行启动 iPhone 17 Pro 模拟器，把固定 JSON 样例放入“文件”，重置并启动墨览，操作系统文件选择器，进入阅读页，再从系统分享面板调用墨览 Share Extension；最后检查 App Group 的 `ShareInbox` 元数据。这里不能传 `CODE_SIGNING_ALLOWED=NO`，否则模拟器不会授予 App Group，分享扩展只能关闭面板，无法形成真实队列证据。

`MolanUITests` 通过稳定的 accessibility identifier 操作界面。iPhone 镜像只用于人工观察和截图，不再作为默认操作入口。真机运行同一套 UI 验收时优先使用 USB 数据通道，避免无线 XCTest DTX 中断。

构建与测试必须使用不同的 `derivedDataPath`，避免把 XCTest 注入后的测试宿主误当作普通 App 安装。模拟器验收记录见 [`verify-evidence/README.md`](verify-evidence/README.md)。
