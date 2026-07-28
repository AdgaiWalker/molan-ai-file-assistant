# KMP 最小共享模块

`shared/` 只验证三类纯契约逻辑：

- UUIDv7 实体 ID 编码；
- `contracts/v1/lifecycle-rules.json` 对应的生命周期转移判断；
- `contracts/v1/format-handlers.json` 对应的最小格式探测顺序。

生命周期和格式常量由 `contracts/src/generate-native-contracts.mjs` 从唯一 JSON 契约生成；`contracts/src/check.mjs` 会拒绝过期生成物，不允许在 Kotlin 中维护第二份规则表。

不共享 UI、文件权限、平台文件处理、WorkManager、Share Extension 或后台任务。

验证：

```bash
cd native
./gradlew :shared:allTests
```

生成契约：

```bash
cd contracts
npm run generate:native
npm run check
```

## A-006 验证结论（2026-07-16）

决定：**保留 KMP，但严格限定为纯契约核心**。

- `SharedContractEngine` 已被 Android `AppViewModel` 和 Swift `AppModel` 的启动检查实际调用；
- 5 项共享测试在 Android Host 与 iOS Simulator Arm64 各通过一次；
- 清理后 `:shared:allTests` + Android 构建/测试共 66 个任务，耗时 7.32 秒；
- 清理后的 iOS 构建与测试耗时 13.96 秒，增量构建耗时 1.85 秒；
- Xcode 使用官方 `embedAndSignAppleFrameworkForXcode` 直接集成，静态框架只链接、不嵌入；
- Kotlin 编译错误能定位到 `.kt` 行；Swift 能调试边界调用，但 Xcode 不原生单步进入 Kotlin，内部问题必须先用共享测试复现；
- 同时运行 Android 与 iOS 模拟器曾让 CoreSimulator 在 dyld 前停滞；关闭 Android 模拟器后 iOS 测试 7 秒通过，属于本机资源竞争，不是共享逻辑死锁。

继续保留的条件：共享代码只包含确定性、无平台副作用且必须跨端一致的规则。若开始共享 UI、文件系统、权限或需要频繁从 Xcode 单步进入 Kotlin，立即退回 Schema 生成 + 双端原生实现。
