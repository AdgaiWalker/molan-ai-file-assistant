# 移动真机批次（B/C） 验收记录模板

> 批次ID：mobile_true_device
> 状态：待执行模板。完成实际执行后，请手动改成“已执行”。

日期：2026-07-21

任务：

- B-002
- B-004
- B-008
- B-009
- C-002
- C-004
- C-008
- C-009

## 固定样例

| 文件 | 大小 | SHA256 |
|---|---:|---|
| `fixtures/mobile-reading/markdown/normal.md` | 292 B | `4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5` |
| `fixtures/mobile-reading/json/normal.json` | 167 B | `51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98` |
| `fixtures/mobile-reading/text/utf8.txt` | 77 B | `1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014` |
| `fixtures/mobile-reading/markdown/large-1mb.md` | 1512031 B | `6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256` |
| `fixtures/mobile-reading/json/large-5mb.json` | 5243566 B | `a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e` |

## 本地证据目录

- `native/androidApp/verify-evidence`（26 entries）
- `native/iosApp/verify-evidence`（20 entries）

## 默认落盘位置

- 报告：`docs/validation-runs/2026-07-21/mobile_true_device/mobile-true-device-report.md`
- 证据目录：`docs/validation-runs/2026-07-21/mobile_true_device/evidence`

## 建议证据文件名

- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-open.mp4`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-open.mp4`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ios-files-open.mp4`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-extension.mp4`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-large-json-memory.txt`
- `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ios-large-markdown-memory.txt`

## 建议执行步骤

1. Android 分别从微信、QQ、浏览器、文件管理器打开 Markdown / JSON / TXT，并记录首屏耗时。
2. iPhone 与 iPad 分别从微信、QQ、Safari、“文件”App、系统分享面板打开同一批样例。
3. 在中低端 Android 与 iPhone 上重复跑 1 MB Markdown 与 5 MB JSON，记录滚动与峰值内存。
4. 完成横竖屏、退后台、杀进程后的恢复验证，并保存录屏或截图路径。

## 必留证据

- 来源 App / 系统版本 / 设备型号
- 样例文件大小与 SHA256
- 首屏耗时 / 滚动表现 / 峰值内存
- 录屏或截图路径



## 填写模板

```text
任务ID：B-002 / B-004 / B-008 / B-009 / C-002 / C-004 / C-008 / C-009
设备 / 系统：
墨览版本：
来源App / 版本：
样例文件 / 大小 / hash：
操作步骤：
目标指标：
实测结果：
截图或录屏路径：
是否通过：
```
