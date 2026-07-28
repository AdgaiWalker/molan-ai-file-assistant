# 发布 / 上架 / 官网 / 回滚逐项执行清单

日期：2026-07-21

用途：把 G-002～G-007 的正式发布与演练拆成逐行执行项。真实账号、签名、渠道和下载入口到位后，按本表逐行补负责人、后台入口、SHA256、截图和结论；本表为空模板时不算完成证据。

## 汇总

- 执行行数：12
- 分组数：6
- 覆盖任务：G-002、G-003、G-004、G-005、G-006、G-007

## 分组

| 分组 | 行数 | 覆盖任务 |
| --- | ---: | --- |
| Android 正式渠道 | 2 | G-002 |
| iOS / TestFlight | 2 | G-003 |
| Windows 发布 | 2 | G-004 |
| macOS 发布 | 2 | G-005 |
| 官网真实发布内容 | 2 | G-006 |
| 发布演练 | 2 | G-007 |

## 执行表

| ID | 任务 | 分组 | 对象 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- |
| g002-android-signed-build | G-002 | Android 正式渠道 | Android signed AAB / APK | 包名、版本号、签名、目标 API、权限声明和 SHA256 均可被截图或命令输出证明。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt` |
| g002-android-device-channel | G-002 | Android 正式渠道 | Google Play / 国内首发渠道 | 内部测试轨道或首发渠道可安装；崩溃 / ANR 基线可观察；商店素材与真实界面一致。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-channel-device-check.txt` |
| g003-ios-archive-testflight | G-003 | iOS / TestFlight | Archive / TestFlight | TestFlight 构建号、Bundle ID、扩展签名、隐私清单和审核备注均可截图证明。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt` |
| g003-ios-true-device-review | G-003 | iOS / TestFlight | iPhone / iPad TestFlight 真机 | 无阻断反馈；审核网络、演示账号、隐私和删除入口材料齐全。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-device-check.txt` |
| g004-windows-package-sign | G-004 | Windows 发布 | NSIS / MSIX / CLI / Pandoc | 全新 Windows 环境可安装；签名有效；随包可执行文件来源明确；SHA256 可公开核对。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt` |
| g004-windows-install-upgrade-rollback | G-004 | Windows 发布 | Windows 全新环境 | 安装/升级/回滚/卸载可重复；文件关联与转换可用；正式下载渠道可获取。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/windows-install-upgrade-rollback.txt` |
| g005-macos-sign-notarize | G-005 | macOS 发布 | DMG / ZIP 签名与公证 | Electron、CLI、Pandoc 等可执行文件签名正确；notary 结果可追溯。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/macos-sign-notarize.txt` |
| g005-macos-gatekeeper-install | G-005 | macOS 发布 | Gatekeeper 全新机 | 首次打开、权限提示、文件关联、转换和卸载均通过；若进 Mac App Store，沙盒能力单独验证。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/macos-gatekeeper-install.txt` |
| g006-site-download-links | G-006 | 官网真实发布内容 | 官网下载入口 | 所有按钮指向真实目标；链接、SHA256、版本号和发布说明与实际产物一致。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt` |
| g006-site-network-tutorials | G-006 | 官网真实发布内容 | 国内网络 / 教程 / 公开说明 | 无空链接；旧版本不被缓存；教程使用真机截图；公开身份与 G-001 证据一致。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-network-tutorials.txt` |
| g007-release-dry-run | G-007 | 发布演练 | 测试版本完整演练 | 每步有负责人、命令或后台入口、产物、SHA256、截图和结论。 | `docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md` |
| g007-monitoring-rollback | G-007 | 发布演练 | 监控与回滚 | 监控不上传正文、提示词或敏感字段；回滚后入口、版本和公告状态可证明。 | `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt` |

## 每行填写字段

### g002-android-signed-build

```text
行项：g002-android-signed-build
任务：G-002
分组：Android 正式渠道
对象：Android signed AAB / APK

候选产物 / 当前公开状态：
native/androidApp/build/outputs/apk/debug/androidApp-debug.apk
12567943 B
f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77

动作：准备正式 release 签名，构建 signed AAB、arm64 APK、universal APK、mapping / 符号文件并记录 SHA256。
验收点：包名、版本号、签名、目标 API、权限声明和 SHA256 均可被截图或命令输出证明。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g002-android-device-channel

```text
行项：g002-android-device-channel
任务：G-002
分组：Android 正式渠道
对象：Google Play / 国内首发渠道

候选产物 / 当前公开状态：
native/androidApp/build/outputs/apk/debug/androidApp-debug.apk
12567943 B
f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77

动作：在至少两种国产 Android 品牌真机上执行安装、升级、降级拒绝、文件入口、后台同步和渠道上传材料核对。
验收点：内部测试轨道或首发渠道可安装；崩溃 / ANR 基线可观察；商店素材与真实界面一致。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/android-channel-device-check.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g003-ios-archive-testflight

```text
行项：g003-ios-archive-testflight
任务：G-003
分组：iOS / TestFlight
对象：Archive / TestFlight

候选产物 / 当前公开状态：
当前无候选产物

动作：配置 Apple Team、Profile、App Groups 和 Share Extension 签名，执行 Archive 并上传 TestFlight。
验收点：TestFlight 构建号、Bundle ID、扩展签名、隐私清单和审核备注均可截图证明。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g003-ios-true-device-review

```text
行项：g003-ios-true-device-review
任务：G-003
分组：iOS / TestFlight
对象：iPhone / iPad TestFlight 真机

候选产物 / 当前公开状态：
当前无候选产物

动作：通过 TestFlight 在 iPhone / iPad 验证 Share Extension、App Groups、后台同步、账号删除和文件入口。
验收点：无阻断反馈；审核网络、演示账号、隐私和删除入口材料齐全。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-device-check.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g004-windows-package-sign

```text
行项：g004-windows-package-sign
任务：G-004
分组：Windows 发布
对象：NSIS / MSIX / CLI / Pandoc

候选产物 / 当前公开状态：
desktop/release/墨览-1.0.0-setup.exe
110647343 B
fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182

动作：生成正式 Windows 安装包，完成签名、随包 Pandoc 来源核对、CLI 打包、SHA256 和更新元数据。
验收点：全新 Windows 环境可安装；签名有效；随包可执行文件来源明确；SHA256 可公开核对。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g004-windows-install-upgrade-rollback

```text
行项：g004-windows-install-upgrade-rollback
任务：G-004
分组：Windows 发布
对象：Windows 全新环境

候选产物 / 当前公开状态：
desktop/release/墨览-1.0.0-setup.exe
110647343 B
fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182

动作：验证文件关联、转换、同步、升级、回滚和卸载，并记录 Microsoft Store 或正式下载渠道状态。
验收点：安装/升级/回滚/卸载可重复；文件关联与转换可用；正式下载渠道可获取。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/windows-install-upgrade-rollback.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g005-macos-sign-notarize

```text
行项：g005-macos-sign-notarize
任务：G-005
分组：macOS 发布
对象：DMG / ZIP 签名与公证

候选产物 / 当前公开状态：
desktop/release/墨览-1.0.0-arm64.dmg
106062472 B
25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca

动作：生成 macOS arm64/x64 或 universal 构建，完成签名、公证、DMG/ZIP、SHA256 和更新元数据。
验收点：Electron、CLI、Pandoc 等可执行文件签名正确；notary 结果可追溯。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/macos-sign-notarize.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g005-macos-gatekeeper-install

```text
行项：g005-macos-gatekeeper-install
任务：G-005
分组：macOS 发布
对象：Gatekeeper 全新机

候选产物 / 当前公开状态：
desktop/release/墨览-1.0.0-arm64.dmg
106062472 B
25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca

动作：在全新 macOS 机器验证 Gatekeeper、文件关联、同步、转换、升级和卸载。
验收点：首次打开、权限提示、文件关联、转换和卸载均通过；若进 Mac App Store，沙盒能力单独验证。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/macos-gatekeeper-install.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g006-site-download-links

```text
行项：g006-site-download-links
任务：G-006
分组：官网真实发布内容
对象：官网下载入口

候选产物 / 当前公开状态：
Android: native/androidApp/build/outputs/apk/debug/androidApp-debug.apk
12567943 B
f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77

iPhone / iPad: 当前无候选产物

Windows: desktop/release/墨览-1.0.0-setup.exe
110647343 B
fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182

macOS: desktop/release/墨览-1.0.0-arm64.dmg
106062472 B
25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca

CLI: desktop/cli/dist/molan-cli-1.0.0.tgz
64268 B
ac1fcb3de274db4f4b7137a23fc77244609b4ec74322f17a491758c7ef0f710f

动作：把真实 Android / TestFlight / Windows / macOS / CLI 入口和 SHA256 回填到公开发布渠道源。
验收点：所有按钮指向真实目标；链接、SHA256、版本号和发布说明与实际产物一致。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g006-site-network-tutorials

```text
行项：g006-site-network-tutorials
任务：G-006
分组：官网真实发布内容
对象：国内网络 / 教程 / 公开说明

候选产物 / 当前公开状态：
源码 / GitHub: available / https://github.com/AdgaiWalker/molan-ai-file-assistant
CLI 源码: available / https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli
Android: coming / https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md
iPhone / iPad: coming / https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md
Windows: coming / https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md
macOS: coming / https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md
Office / PDF 固定样例: available / https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli/test-fixtures

动作：用国内网络验证官网入口，补微信/QQ教程真机截图、真实客服邮箱、隐私/删除/FAQ/更新日志。
验收点：无空链接；旧版本不被缓存；教程使用真机截图；公开身份与 G-001 证据一致。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/site-network-tutorials.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g007-release-dry-run

```text
行项：g007-release-dry-run
任务：G-007
分组：发布演练
对象：测试版本完整演练

候选产物 / 当前公开状态：
Android: native/androidApp/build/outputs/apk/debug/androidApp-debug.apk
12567943 B
f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77

iPhone / iPad: 当前无候选产物

Windows: desktop/release/墨览-1.0.0-setup.exe
110647343 B
fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182

macOS: desktop/release/墨览-1.0.0-arm64.dmg
106062472 B
25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca

CLI: desktop/cli/dist/molan-cli-1.0.0.tgz
64268 B
ac1fcb3de274db4f4b7137a23fc77244609b4ec74322f17a491758c7ef0f710f

动作：按 Android / iOS / Windows / macOS / CLI / 官网 / 同步后端执行一次测试版本发布演练。
验收点：每步有负责人、命令或后台入口、产物、SHA256、截图和结论。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```

### g007-monitoring-rollback

```text
行项：g007-monitoring-rollback
任务：G-007
分组：发布演练
对象：监控与回滚

候选产物 / 当前公开状态：
发布演练版本

动作：记录崩溃/ANR、同步成功率、下载状态和回滚动作，执行一次回滚或等价演练。
验收点：监控不上传正文、提示词或敏感字段；回滚后入口、版本和公告状态可证明。
建议证据：docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt

负责人：
执行日期：
版本号 / 构建号：
候选产物 / SHA256：
后台或发布入口：
截图 / 录屏 / 日志路径：
是否通过：
问题与下一步：
```


