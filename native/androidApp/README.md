# 墨览 Android 原生应用

- 技术栈：Kotlin + Jetpack Compose；
- 当前 Application ID：`com.molan.reader`；后续若再调整，以 `config/product-identity.json` 为唯一来源；
- 最低系统：Android 8.0（API 26）；
- 构建：AGP 9.2.0、Gradle 9.4.1、JDK 17、compile SDK 37.0；
- Kotlin 使用 AGP 9 的内建支持，不启用旧 `kotlin-android` 兼容模式；
- App 启动检查实际调用 `native/shared/` 的纯契约模块；
- 依赖版本集中在 `native/gradle/libs.versions.toml`；
- Composable 只负责呈现与用户意图，路由、初始化与恢复状态位于 `app/`；
- 外部 URI 读取、草稿、分享缓存与受控对象存储位于 `data/` / `platform/`；
- Room v1 映射共享 `Document` / `DocumentVersion` / `FileObject` 关系，schema 位于 `schemas/`，不另建同义业务模型；
- 临时打开默认不入库；只有“收集到墨览”会复制原始字节并创建版本。

验证：

```bash
cd native
ANDROID_HOME="/path/to/android-sdk" JAVA_HOME="/path/to/jdk17" \
  ./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest
```

模拟器验收记录见 [`verify-evidence/README.md`](verify-evidence/README.md)。
