# Clean Code Review: 最近 UI 重设计代码

## Summary

最高杠杆风险不是命名，而是“拆分已经发生、旧实现却没有删除”：Android 首页同时存在拆分后的 `LibraryDocumentCard.kt` / `HomeSyncPanel.kt` 与 `HomeScreen.kt` 内的私有副本，私有函数遮蔽了新实现，使维护者可能修改一套完全不生效的代码。第二风险是超长 UI 入口与 1866 行单体样式继续聚合变化。裁决是先删除影子实现并提取可测试的筛选规则，再清理提示词数据与样式死代码；iOS 大组件和 CSS 正式拆文件留在下一波，避免一次重构跨越过多平台。

## Findings

### P1: Android 首页保留两套同名实现，拆分文件实际被遮蔽
- **原则**: DRY / YAGNI / 结构清晰度
- **位置**: `native/androidApp/src/main/kotlin/com/molan/reader/ui/home/HomeScreen.kt:199`
- **级别**: 高
- **问题**: `HomeScreen.kt` 内仍定义私有 `LibraryDocumentCard` 和 `SyncPanel`，同时同包已有 `LibraryDocumentCard.kt` 与 `HomeSyncPanel.kt`。调用优先绑定私有函数，因此新文件中的常量、子组件拆分和去重均不生效。
- **建议**: 删除 `HomeScreen.kt` 中两套私有副本及其专属 imports，只保留拆分文件作为唯一实现。
- **Why now**: 修改错误文件不会报错，却不会改变运行行为，这是最危险的维护性失败类型。

### P2: Android 与 iOS 首页入口仍承担过多职责
- **原则**: 单一职责 / 结构清晰度
- **位置**: `native/androidApp/src/main/kotlin/com/molan/reader/ui/home/HomeScreen.kt:51`；`native/iosApp/Molan/Features/Home/HomeView.swift:4`
- **级别**: 高
- **问题**: 两个入口同时负责打开文件、同步展开、冲突处理、筛选、结果关联、文件卡动作和删除确认；分别约 490 行和 423 行，且构造参数超过 10 个。
- **建议**: Android 先复用已拆出的卡片/同步面板，并把筛选与结果映射提取为纯函数；iOS 下一波拆出 Library 列表、Document Row、Sync Panel 文件。
- **Why now**: 每个新状态都会继续扩大条件分支，原生两端很快出现不同的状态解释。

### P3: 桌面样式文件横跨六个界面且含已失效选择器
- **原则**: 结构清晰度 / YAGNI / 项目规范
- **位置**: `desktop/src/styles.css:1`；`desktop/src/styles.css:1522`
- **级别**: 中
- **问题**: 单文件 1866 行，包含基础、壳层、阅读、转换、快贴、收件箱和响应式规则；`.inbox-meta-row` / `.inbox-chip` 已无 JSX 使用，`.sync-dot` 仍残留在选择器中。
- **建议**: 先删除无引用规则和陈旧选择器；下一波按 `base/shell/reader/convert/prompt/inbox/responsive` 拆分并由入口 CSS 导入。
- **Why now**: 继续追加规则会提高选择器误伤和响应式回归概率。

### P4: 文案常量同时承载提示词领域数据
- **原则**: 单一职责 / 结构清晰度
- **位置**: `desktop/src/constants/strings.ts:72`
- **级别**: 中
- **问题**: `strings.prompt.defaults` 把 ID、分组、标签和完整模板内容放进 UI 文案对象，导致本地化资源与提示词目录共同变化，组件还要从字符串对象反推领域类型。
- **建议**: 将 `PromptItem` 与默认模板移动到独立 `defaultPrompts.ts`，`strings` 仅保留真正的界面文案。
- **Why now**: 后续增加导入、持久化或同步时，这种混合会迫使存储层依赖文案层。

### P5: iOS 删除范围与状态使用重复裸字符串
- **原则**: 魔法字符串 / 命名
- **位置**: `native/iosApp/Molan/Features/Home/HomeView.swift:139`
- **级别**: 中
- **问题**: `current_device`、`cloud`、`all_devices`、`archived`、`deleted` 等值在渲染、确认与回调之间重复，拼写错误只能在运行时暴露。
- **建议**: 下一波引入文件内私有枚举或集中常量，在调用现有字符串契约时统一转换。
- **Why now**: Android 拆分文件已经开始集中常量，iOS 若不跟进会出现两端维护方式漂移。

### P6: 复制反馈时间是无语义数字
- **原则**: 魔法数字
- **位置**: `desktop/src/components/PromptPanel.tsx:69`
- **级别**: 低
- **问题**: `1200` 无法从调用处判断含义和单位。
- **建议**: 提取为 `COPY_FEEDBACK_DURATION_MS`。
- **Why now**: 与提示词数据拆分同时处理成本最低。

## Good Patterns To Keep

- `desktop/src/components/inbox/presentation.ts` 已把搜索、筛选、转换判断和格式化提取为纯函数，并有小而有意义的测试。
- `useInboxController` 用统一 `perform` 处理 busy、错误和提交，避免每个操作复制 try/catch。
- Android 拆分文件已经使用命名常量替代哈希长度、字节单位和删除范围，方向正确；问题只在旧实现尚未删除。
- UI 文案已集中，组件中几乎没有散落中文字符串。

## Test Gaps

- Android 文件库筛选、查询和“来源文档 → 最新 AI 结果”映射目前只有 Compose 内联逻辑，应提取为纯函数并先写测试。
- CSS 拆分不需要增加行为测试，但必须通过 production build 与真实界面截图对比。
- iOS 首页拆分前应继续依赖现有 XCUITest 的打开入口和模拟器 build；不增加 mock-heavy SwiftUI 测试。

## Optimization Status

- [x] 删除 Android 影子实现：`HomeScreen.kt` 由 490 行降至 218 行
- [x] 提取 Android 文件库展示规则并补充纯逻辑测试
- [x] 分离提示词目录与文案常量
- [x] 清理桌面样式死代码
- [x] 桌面回归：32 个非网络测试、TypeScript 类型检查、production build
- [ ] Android 回归：当前电脑未安装可用 JDK，Gradle 无法启动

## Verification Evidence

- `npx vitest run src/components/prompt/presentation.test.ts`：3/3 通过。
- 桌面非网络测试：5 个测试文件、32/32 通过。
- `npm run typecheck`：通过。
- `npm run build`：Electron main、preload、renderer production build 均通过。
- Android 静态检查：`LibraryDocumentCard` 与 `SyncPanel` 均只剩一处实现。
- Android Gradle：执行 `GRADLE_USER_HOME=/private/tmp/molan-gradle-home ./gradlew :androidApp:testDebugUnitTest --offline --no-daemon`，在配置项目前因系统找不到 Java Runtime 终止，未获得测试结果。
