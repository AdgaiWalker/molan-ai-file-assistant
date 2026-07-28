# iPhone 13 Pro 真机验收记录

日期：2026-07-24

## 环境

- 设备：iPhone 13 Pro（iPhone14,2）
- 系统：iOS 26.5.2（23F84）
- 连接：已配对，Developer Mode 已开启；本轮 Xcode 日志实际使用局域网传输，USB 数据通道未被识别
- Xcode：26.6（17F113）
- 应用：`com.molan.reader`
- 分享扩展：`com.molan.reader.share`
- App Group：`group.com.molan.reader`

## 已完成

1. Xcode 账号已登录，Apple Development 证书已生成并进入本机钥匙串。
2. Apple Developer 后台已注册 `group.com.molan.reader`。
3. 主应用和分享扩展两个 App ID 均已启用并绑定该 App Group。
4. `project.yml` 与 `.xcodeproj` 均已声明 App Groups Signing & Capabilities 元数据。
5. Xcode 自动生成了包含 App Group entitlement 的开发描述文件。
6. iPhoneOS Debug 真机构建成功，主应用和分享扩展的嵌入签名验证成功。
7. 应用成功安装并启动，进程列表确认 `Molan` 正在运行。
8. 主应用与分享扩展的签名 entitlement 均包含：
   - 正确的 application identifier；
   - 正确的开发团队 identifier；
   - `group.com.molan.reader`；
   - Debug 所需的 `get-task-allow`。
9. 真机首页截图已保存为 [`evidence/home.png`](evidence/home.png)。
10. Edge 从局域网固定样例地址下载 `normal.md` 后，经 iOS“文件”选择器由墨览打开成功；文件名、Markdown/UTF-8 类型及标题、列表、引用、表格、代码块均正确显示，见 [`evidence/normal_reader.jpeg`](evidence/normal_reader.jpeg)。
11. 从“文件”App 对同一文件调起 iOS 系统分享面板成功，见 [`evidence/system_share_sheet.jpeg`](evidence/system_share_sheet.jpeg)。该画面只证明系统分享入口可达，不代表“收集到墨览”已完成交接。
12. 新增真机专用 App Group 往返测试：模拟器关闭签名时明确跳过，避免把无 entitlement 的环境误报为失败。
13. 1.5 MB Markdown 在真机深色模式下打开成功，首屏显示后连续滚动无白屏、无崩溃，见 [`evidence/large_markdown_scrolled.jpeg`](evidence/large_markdown_scrolled.jpeg)。
14. 5.2 MB JSON 在真机深色模式下打开成功，树视图识别根对象 2 项和 `items` 数组 5014 项；展开数组并连续滚动正常，见 [`evidence/large_json_summary.jpeg`](evidence/large_json_summary.jpeg) 与 [`evidence/large_json_expanded.jpeg`](evidence/large_json_expanded.jpeg)。
15. 两次由 `devicectl --terminate-existing` 发起的冷启动请求分别在 1.85 秒和 1.91 秒返回；该数字只代表远程终止并启动命令完成，不冒充文件首屏耗时。
16. 从 Edge 切换回墨览时，大 JSON 仍保持为原文档与原滚动区间，后台返回未串文件。
17. 真机首次暴露出恢复缺陷：`session.json` 已落盘，但书签在 security-scoped 访问结束后创建，进程终止重启回到首页。修复后重新打开 5.2 MB JSON，立即终止并重启可恢复同一文件，见 [`evidence/process_recovery_green.jpeg`](evidence/process_recovery_green.jpeg)。
18. 用户主动关闭阅读器后，`session.json` 被删除；再次终止并重启保持首页，不会错误恢复已关闭的文件。
19. `devicectl` 可真实列出 `group.com.molan.reader` 的 App Group 数据容器，证明签名授权和容器可访问；该结果不替代 Share Extension 的写入、主应用认领往返测试。

## 关键命令与结果

```text
xcodebuild ... -destination 'id=<IPHONE_UDID>' \
  -allowProvisioningUpdates \
  -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM=<APPLE_TEAM_ID> build

结果：BUILD SUCCEEDED
```

```text
xcrun devicectl device install app --device <DEVICE_ID> <Molan.app>

结果：App installed，bundleID = com.molan.reader
```

```text
xcrun devicectl device process launch --device <DEVICE_ID> \
  --terminate-existing com.molan.reader

结果：Launched application with com.molan.reader bundle identifier.
```

```text
xcodebuild ... -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath native/iosApp/build/ios-tests \
  CODE_SIGNING_ALLOWED=NO test

结果：TEST SUCCEEDED；共执行 9 项，1 项按设计跳过、0 失败。跳过项是必须依赖真机签名描述文件的 App Group 往返测试。
```

```text
xcodebuild ... -destination 'id=<IPHONE_UDID>' \
  -only-testing:MolanTests/AppModelTests/testAppGroupInboxRoundTripUsesProvisionedContainer test

结果：应用安装和启动成功，但设备仅通过局域网连接，XCTest DTX 通道在执行测试前断开；
错误为 test runner exited with code 74 before establishing connection，未执行到业务断言。
```

```text
xcrun xctrace record --template 'Activity Monitor' \
  --device <IPHONE_UDID> --attach <MOLAN_PID> --time-limit 15s ...

结果：当前无线 CoreDevice 通道等待 DDI 服务超时，未生成有效内存采样；
不能用模拟器的 61/71 MB 代替真机峰值。
```

```text
xcrun devicectl device process launch --device <DEVICE_ID> \
  --terminate-existing com.molan.reader

修复前：`session.json` 已存在，但重启回到首页。
修复后：重启恢复 `large-5mb.json`，根对象 2 项、`items` 数组 5014 项；主动关闭后再次重启则保持首页。
```

## TDD 证据

- **目标行为**：外部文件进入就绪态后，即使进程被系统终止也能恢复同一文件；用户主动关闭后不再恢复。
- **RED**：真机打开 `large-5mb.json`，确认 `Library/Application Support/Reader/session.json` 为 338 字节后强制终止；旧实现重启回到首页。模拟器没有暴露该 security-scoped 书签问题。
- **GREEN**：创建书签时重新进入 security-scoped 访问窗口；会话写入完成后才把文档置为就绪；启动时以会话文件为恢复依据。真机同一步骤恢复到同一 5.2 MB JSON，主动关闭后会话文件消失且重启保持首页。
- **回归**：iPhone 17 Pro 模拟器测试共执行 9 项，1 项因无真机 App Group 签名授权按设计跳过、0 失败；iPhone 13 Pro 签名构建、安装、启动成功。
- **重构判断**：删除 `SceneStorage` 与会话文件对“是否恢复”的双重判断，让会话文件成为唯一依据；未增加兼容分支。

## 截图证据说明

- [`evidence/home.png`](evidence/home.png) 由真机截图命令取得。
- 其余 `.jpeg` 由 iPhone 镜像的实时画面取得，分别覆盖普通 Markdown、系统分享面板、大 Markdown 滚动、大 JSON 摘要与展开状态。
- 本轮无线 `devicectl screenshot` 曾返回全黑缓存帧；这些无效 PNG 已删除，未作为证据保留。

## 仍需真机操作

- 从 Safari、微信、QQ分别触发打开/分享入口；
- 在系统分享面板横向找到“收集到墨览”，验证 Share Extension 写入 App Group、主应用认领并显示正文；
- 使用 USB 数据通道重跑真机 App Group 往返测试，排除当前无线 XCTest DTX 中断；
- 记录 TXT、Markdown、JSON 的可重复首屏耗时（目前仅记录到冷启动命令耗时）；
- USB 数据通道恢复后记录 1 MB Markdown、5 MB JSON 的内存峰值；
- 验证横竖屏；后台返回、进程终止恢复和深色模式下的大 Markdown / JSON 已完成；
- iPad 真机仍需在上架前补测关键尺寸。

这些项目不由当前的“构建、安装、启动成功”替代。
