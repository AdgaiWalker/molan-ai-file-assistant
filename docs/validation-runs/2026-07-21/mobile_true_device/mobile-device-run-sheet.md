# 移动真机逐项执行清单

日期：2026-07-21

对应批次：移动真机批次（B/C）

用途：把 B/C 真机验收拆成逐行执行项。真实设备到位后，按本表逐行补设备、来源 App、耗时、内存和证据路径；本表为空模板时不算完成证据。

## 汇总

- 执行行数：48
- 分组数：4
- 证据目录：`docs/validation-runs/2026-07-21/mobile_true_device/evidence`

## 分组

| 分组 | 行数 | 覆盖任务 |
| --- | ---: | --- |
| Android 外部来源打开 | 12 | B-002、B-009 |
| Android 性能与恢复 | 2 | B-004、B-008、B-009 |
| iOS / iPadOS 外部来源打开 | 30 | C-002、C-009 |
| iOS / iPadOS 性能与恢复 | 4 | C-004、C-008、C-009 |

## 执行表

| ID | 分组 | 任务 | 设备槽位 | 来源 | 样例 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| android-open-wechat-normal-md | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 微信 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-normal-md.mp4` |
| android-open-wechat-normal-json | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 微信 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-normal-json.mp4` |
| android-open-wechat-utf8-txt | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 微信 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-utf8-txt.mp4` |
| android-open-qq-normal-md | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | QQ | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-normal-md.mp4` |
| android-open-qq-normal-json | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | QQ | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-normal-json.mp4` |
| android-open-qq-utf8-txt | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | QQ | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-utf8-txt.mp4` |
| android-open-browser-normal-md | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 浏览器 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-normal-md.mp4` |
| android-open-browser-normal-json | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 浏览器 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-normal-json.mp4` |
| android-open-browser-utf8-txt | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 浏览器 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-utf8-txt.mp4` |
| android-open-file-manager-normal-md | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 文件管理器 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-normal-md.mp4` |
| android-open-file-manager-normal-json | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 文件管理器 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-normal-json.mp4` |
| android-open-file-manager-utf8-txt | Android 外部来源打开 | B-002、B-009 | Android 真机 A；另用真机 B 抽查微信 / 文件管理器 | 文件管理器 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-utf8-txt.mp4` |
| android-performance-large-1mb-md | Android 性能与恢复 | B-004、B-008、B-009 | 中低端 Android 真机；至少覆盖两个国产品牌中的一台 | 文件管理器或浏览器下载目录 | fixtures/mobile-reading/markdown/large-1mb.md<br>1512031 B<br>6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256 | 外部打开到正文 5 秒内；1 MB Markdown / 5 MB JSON 不 ANR；恢复后不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-performance-large-1mb-md.txt` |
| android-performance-large-5mb-json | Android 性能与恢复 | B-004、B-008、B-009 | 中低端 Android 真机；至少覆盖两个国产品牌中的一台 | 文件管理器或浏览器下载目录 | fixtures/mobile-reading/json/large-5mb.json<br>5243566 B<br>a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e | 外部打开到正文 5 秒内；1 MB Markdown / 5 MB JSON 不 ANR；恢复后不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-performance-large-5mb-json.txt` |
| iphone-open-wechat-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 微信 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-normal-md.mp4` |
| iphone-open-wechat-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 微信 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-normal-json.mp4` |
| iphone-open-wechat-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 微信 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-utf8-txt.mp4` |
| iphone-open-qq-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | QQ | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-normal-md.mp4` |
| iphone-open-qq-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | QQ | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-normal-json.mp4` |
| iphone-open-qq-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | QQ | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-utf8-txt.mp4` |
| iphone-open-safari-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | Safari | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-normal-md.mp4` |
| iphone-open-safari-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | Safari | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-normal-json.mp4` |
| iphone-open-safari-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | Safari | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-utf8-txt.mp4` |
| iphone-open-files-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | “文件”App | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-normal-md.mp4` |
| iphone-open-files-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | “文件”App | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-normal-json.mp4` |
| iphone-open-files-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | “文件”App | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-utf8-txt.mp4` |
| iphone-open-share-sheet-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 系统分享面板 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-normal-md.mp4` |
| iphone-open-share-sheet-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 系统分享面板 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-normal-json.mp4` |
| iphone-open-share-sheet-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPhone 真机 | 系统分享面板 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-utf8-txt.mp4` |
| ipad-open-wechat-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 微信 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-normal-md.mp4` |
| ipad-open-wechat-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 微信 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-normal-json.mp4` |
| ipad-open-wechat-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 微信 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-utf8-txt.mp4` |
| ipad-open-qq-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | QQ | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-normal-md.mp4` |
| ipad-open-qq-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | QQ | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-normal-json.mp4` |
| ipad-open-qq-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | QQ | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-utf8-txt.mp4` |
| ipad-open-safari-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | Safari | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-normal-md.mp4` |
| ipad-open-safari-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | Safari | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-normal-json.mp4` |
| ipad-open-safari-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | Safari | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-utf8-txt.mp4` |
| ipad-open-files-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | “文件”App | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-normal-md.mp4` |
| ipad-open-files-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | “文件”App | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-normal-json.mp4` |
| ipad-open-files-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | “文件”App | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-utf8-txt.mp4` |
| ipad-open-share-sheet-normal-md | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 系统分享面板 | fixtures/mobile-reading/markdown/normal.md<br>292 B<br>4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-normal-md.mp4` |
| ipad-open-share-sheet-normal-json | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 系统分享面板 | fixtures/mobile-reading/json/normal.json<br>167 B<br>51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-normal-json.mp4` |
| ipad-open-share-sheet-utf8-txt | iOS / iPadOS 外部来源打开 | C-002、C-009 | iPad 真机 | 系统分享面板 | fixtures/mobile-reading/text/utf8.txt<br>77 B<br>1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014 | 5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-utf8-txt.mp4` |
| iphone-performance-large-1mb-md | iOS / iPadOS 性能与恢复 | C-004、C-008、C-009 | iPhone 真机 | “文件”App 或系统分享面板 | fixtures/mobile-reading/markdown/large-1mb.md<br>1512031 B<br>6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256 | 可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-performance-large-1mb-md.txt` |
| iphone-performance-large-5mb-json | iOS / iPadOS 性能与恢复 | C-004、C-008、C-009 | iPhone 真机 | “文件”App 或系统分享面板 | fixtures/mobile-reading/json/large-5mb.json<br>5243566 B<br>a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e | 可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-performance-large-5mb-json.txt` |
| ipad-performance-large-1mb-md | iOS / iPadOS 性能与恢复 | C-004、C-008、C-009 | iPad 真机 | “文件”App 或系统分享面板 | fixtures/mobile-reading/markdown/large-1mb.md<br>1512031 B<br>6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256 | 可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-performance-large-1mb-md.txt` |
| ipad-performance-large-5mb-json | iOS / iPadOS 性能与恢复 | C-004、C-008、C-009 | iPad 真机 | “文件”App 或系统分享面板 | fixtures/mobile-reading/json/large-5mb.json<br>5243566 B<br>a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e | 可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。 | `docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-performance-large-5mb-json.txt` |

## 每行填写字段

### android-open-wechat-normal-md

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：微信
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-wechat-normal-json

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：微信
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-wechat-utf8-txt

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：微信
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-wechat-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-qq-normal-md

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：QQ
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-qq-normal-json

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：QQ
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-qq-utf8-txt

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：QQ
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-qq-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-browser-normal-md

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：浏览器
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-browser-normal-json

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：浏览器
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-browser-utf8-txt

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：浏览器
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-browser-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-file-manager-normal-md

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：文件管理器
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-file-manager-normal-json

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：文件管理器
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-open-file-manager-utf8-txt

```text
任务：B-002、B-009
设备槽位：Android 真机 A；另用真机 B 抽查微信 / 文件管理器
平台：Android
来源：文件管理器
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，进入阅读页后返回，再次打开同一文件。
验收点：5 秒内出现首屏或明确错误；返回和再次打开不白屏；临时打开不自动收集。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-file-manager-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-performance-large-1mb-md

```text
任务：B-004、B-008、B-009
设备槽位：中低端 Android 真机；至少覆盖两个国产品牌中的一台
平台：Android
来源：文件管理器或浏览器下载目录
样例：fixtures/mobile-reading/markdown/large-1mb.md
大小：1512031 B
SHA256：6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256
动作：打开大样例，记录首屏、滚动、横竖屏、退后台、杀进程恢复和内存。
验收点：外部打开到正文 5 秒内；1 MB Markdown / 5 MB JSON 不 ANR；恢复后不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-performance-large-1mb-md.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### android-performance-large-5mb-json

```text
任务：B-004、B-008、B-009
设备槽位：中低端 Android 真机；至少覆盖两个国产品牌中的一台
平台：Android
来源：文件管理器或浏览器下载目录
样例：fixtures/mobile-reading/json/large-5mb.json
大小：5243566 B
SHA256：a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e
动作：打开大样例，记录首屏、滚动、横竖屏、退后台、杀进程恢复和内存。
验收点：外部打开到正文 5 秒内；1 MB Markdown / 5 MB JSON 不 ANR；恢复后不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/android-performance-large-5mb-json.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-wechat-normal-md

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：微信
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-wechat-normal-json

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：微信
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-wechat-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：微信
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-wechat-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-qq-normal-md

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：QQ
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-qq-normal-json

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：QQ
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-qq-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：QQ
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-qq-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-safari-normal-md

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：Safari
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-safari-normal-json

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：Safari
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-safari-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：Safari
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-safari-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-files-normal-md

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：“文件”App
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-files-normal-json

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：“文件”App
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-files-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：“文件”App
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-files-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-share-sheet-normal-md

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：系统分享面板
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-share-sheet-normal-json

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：系统分享面板
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-open-share-sheet-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPhone 真机
平台：iOS
来源：系统分享面板
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-share-sheet-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-wechat-normal-md

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：微信
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-wechat-normal-json

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：微信
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-wechat-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：微信
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-wechat-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-qq-normal-md

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：QQ
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-qq-normal-json

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：QQ
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-qq-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：QQ
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-qq-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-safari-normal-md

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：Safari
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-safari-normal-json

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：Safari
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-safari-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：Safari
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-safari-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-files-normal-md

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：“文件”App
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-files-normal-json

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：“文件”App
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-files-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：“文件”App
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-files-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-share-sheet-normal-md

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：系统分享面板
样例：fixtures/mobile-reading/markdown/normal.md
大小：292 B
SHA256：4243d4826b909c17ae9c79ffa7ed9be10a1776c7dd3e99e21deba17113f04ca5
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-normal-md.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-share-sheet-normal-json

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：系统分享面板
样例：fixtures/mobile-reading/json/normal.json
大小：167 B
SHA256：51f9b1e74ff7e5dc536eb9b75d5929558531b2af23230d8326b1198a927a3c98
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-normal-json.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-open-share-sheet-utf8-txt

```text
任务：C-002、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：系统分享面板
样例：fixtures/mobile-reading/text/utf8.txt
大小：77 B
SHA256：1324da8679e295705c1688a13afa9da9d1e7b831adbeccbe08986a28ac530014
动作：从真实来源打开样例，确认 Share Extension / 主应用交接，再返回并再次打开。
验收点：5 秒内显示正文或明确进度 / 错误；扩展只复制 / 排队，不重解析；重复分享不白屏。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-share-sheet-utf8-txt.mp4

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-performance-large-1mb-md

```text
任务：C-004、C-008、C-009
设备槽位：iPhone 真机
平台：iOS
来源：“文件”App 或系统分享面板
样例：fixtures/mobile-reading/markdown/large-1mb.md
大小：1512031 B
SHA256：6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256
动作：打开大样例，记录首屏、滚动、后台返回、系统终止后恢复和内存。
验收点：可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-performance-large-1mb-md.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### iphone-performance-large-5mb-json

```text
任务：C-004、C-008、C-009
设备槽位：iPhone 真机
平台：iOS
来源：“文件”App 或系统分享面板
样例：fixtures/mobile-reading/json/large-5mb.json
大小：5243566 B
SHA256：a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e
动作：打开大样例，记录首屏、滚动、后台返回、系统终止后恢复和内存。
验收点：可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/iphone-performance-large-5mb-json.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-performance-large-1mb-md

```text
任务：C-004、C-008、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：“文件”App 或系统分享面板
样例：fixtures/mobile-reading/markdown/large-1mb.md
大小：1512031 B
SHA256：6edb341c9924a33d7af8f511d825b3214eb975ff414d7a8edb1acf3ffb1ab256
动作：打开大样例，记录首屏、滚动、后台返回、系统终止后恢复和内存。
验收点：可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-performance-large-1mb-md.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```

### ipad-performance-large-5mb-json

```text
任务：C-004、C-008、C-009
设备槽位：iPad 真机
平台：iPadOS
来源：“文件”App 或系统分享面板
样例：fixtures/mobile-reading/json/large-5mb.json
大小：5243566 B
SHA256：a56fa9b549895042de2e131317696bdb389636b1378755f6ad4c8d1139934f0e
动作：打开大样例，记录首屏、滚动、后台返回、系统终止后恢复和内存。
验收点：可用内容尽快首屏；大 Markdown / 大 JSON 不崩溃、不长时间冻结；恢复不串文件。
建议证据：docs/validation-runs/2026-07-21/mobile_true_device/evidence/ipad-performance-large-5mb-json.txt

设备型号 / 系统版本：
来源 App / 版本：
墨览版本 / 构建号：
首屏耗时：
滚动表现：
峰值内存或系统内存记录：
截图 / 录屏路径：
是否通过：
问题与下一步：
```


