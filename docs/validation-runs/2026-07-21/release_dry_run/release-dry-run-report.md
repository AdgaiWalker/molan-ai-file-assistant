# 发布前演练批次（G-007） 验收记录模板

> 批次ID：release_dry_run
> 状态：待执行模板。完成实际执行后，请手动改成“已执行”。

日期：2026-07-21

任务：

- G-007

## 固定样例

| 文件 | 大小 | SHA256 |
|---|---:|---|
| 无 | - | - |

## 本地证据目录

- `site`（13 entries）
- `desktop`（16 entries）
- `server`（15 entries）

## 默认落盘位置

- 报告：`docs/validation-runs/2026-07-21/release_dry_run/release-dry-run-report.md`
- 证据目录：`docs/validation-runs/2026-07-21/release_dry_run/evidence`

## 建议证据文件名

- `docs/validation-runs/2026-07-21/release_dry_run/evidence/android-release-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/ios-testflight-build.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/desktop-package-sha256.txt`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/site-links-check.png`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/monitoring-dashboard.png`
- `docs/validation-runs/2026-07-21/release_dry_run/evidence/rollback-record.txt`

## 建议执行步骤

1. 按发布、监控与回滚清单执行一次测试版本演练。
2. 对 Android / iOS / Windows / macOS / CLI / 官网 / 同步后端分别记录产物、SHA256、入口和回滚动作。
3. 验证官网链接、隐私说明、样例链接和发布说明与实际产物一致。
4. 保留监控截图与回滚后状态，补齐负责人占位。

## 必留证据

- 版本号 / 构建号 / SHA256
- 发布入口与回滚入口
- 官网链接与下载产物对照
- 监控截图与回滚结果

## 当前可直接引用的候选产物

> 来源：`docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.json` 中的 `deliveryManifest`。

| 平台 | 本地首选产物 | SHA256 | 官网状态 | 当前公开入口 | 备注 |
|---|---|---|---|---|---|
| Android | `native/androidApp/build/outputs/apk/debug/androidApp-debug.apk` | `f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77` | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | 真机与渠道验收未关闭，公开下载仍准备中。 |
| iPhone / iPad | 当前无本地候选包 | — | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | 当前还没有可公开分发的 iOS Archive / IPA；正式签名、Archive 和 TestFlight 仍未完成。 |
| Windows | `desktop/release/墨览-1.0.0-setup.exe` | `fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182` | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | 本地已产出 NSIS 安装包与 win-unpacked 包，但全新 Windows 手测、下载渠道与升级/回滚验收仍未关闭。 |
| macOS | `desktop/release/墨览-1.0.0-arm64.dmg` | `25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca` | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | 本地已产出 arm64 DMG / ZIP，但签名、公证、Gatekeeper 与正式下载入口仍未完成。 |
| CLI | `desktop/cli/dist/molan-cli-1.0.0.tgz` | `ac1fcb3de274db4f4b7137a23fc77244609b4ec74322f17a491758c7ef0f710f` | 可用 | [查看 CLI](https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli) | 当前可从仓库拉取 `desktop/cli` 并本地构建体验。 |


## 填写模板

```text
任务ID：G-007
平台 / 渠道：
版本 / 构建号：
产物文件：
签名主体：
SHA256：
安装 / 升级 / 回滚结果：
隐私与权限检查：
下载或测试链接：
已知问题：
```
