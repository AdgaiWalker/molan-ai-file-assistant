# 发布就绪清单快照

日期：2026-07-21

> 作用：自动提取当前仓库中的版本号、标识、产物目录、已发现产物与 SHA256，给 G-002～G-007 提供统一入口。它不代表已完成签名、上架、真机或商店验收。

## 使用方式

```bash
node scripts/release_readiness_report.mjs
node scripts/release_readiness_report.mjs --json
node scripts/release_readiness_report.mjs --out default
```

默认 `--out default` 会写入：

- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.md`
- `docs/validation-runs/2026-07-21/release_dry_run/release-readiness-snapshot.json`

## 当前官网公开发布状态

| 渠道 | 状态 | 说明 | 入口 |
|---|---|---|---|
| 源码 / GitHub | 可用 | 仓库、README、TODO、契约和验证样例已可直接查看。 | https://github.com/AdgaiWalker/molan-ai-file-assistant |
| CLI 源码 | 可用 | 当前可从仓库拉取 `desktop/cli` 并本地构建体验。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli |
| Android | 准备中 | 真机与渠道验收未关闭，公开下载仍准备中。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md |
| iPhone / iPad | 准备中 | TestFlight 与真机入口矩阵仍在集中验收中。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md |
| Windows | 准备中 | 本地已产出 NSIS 安装包与 win-unpacked 包，但全新 Windows 手测、下载渠道与升级/回滚验收仍未关闭。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md |
| macOS | 准备中 | 本地已产出 arm64 DMG / ZIP，但签名、公证、Gatekeeper 与正式下载入口仍未完成。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md |
| Office / PDF 固定样例 | 可用 | 已补齐 docx / xlsx / pptx / pdf 固定对象，可直接用于同步与 AI 读取验收。 | https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli/test-fixtures |

## 当前对外交付首选产物

| 平台 | 官网状态 | 当前公开入口 | 本地首选产物 | SHA256 | 备注 |
|---|---|---|---|---|---|
| Android | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | `native/androidApp/build/outputs/apk/debug/androidApp-debug.apk` | `f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77` | 本地已发现 1 个候选包；真机与渠道验收未关闭，公开下载仍准备中。 |
| iPhone / iPad | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | 当前无本地候选包 | — | 当前还没有可公开分发的 iOS Archive / IPA；正式签名、Archive 和 TestFlight 仍未完成。 |
| Windows | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | `desktop/release/墨览-1.0.0-setup.exe` | `fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182` | 本地已发现 2 个候选包；本地已产出 NSIS 安装包与 win-unpacked 包，但全新 Windows 手测、下载渠道与升级/回滚验收仍未关闭。 |
| macOS | 准备中 | [查看进度](https://github.com/AdgaiWalker/molan-ai-file-assistant/blob/main/TODO.md) | `desktop/release/墨览-1.0.0-arm64.dmg` | `25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca` | 本地已发现 2 个候选包；本地已产出 arm64 DMG / ZIP，但签名、公证、Gatekeeper 与正式下载入口仍未完成。 |
| CLI | 可用 | [查看 CLI](https://github.com/AdgaiWalker/molan-ai-file-assistant/tree/main/desktop/cli) | `desktop/cli/dist/molan-cli-1.0.0.tgz` | `ac1fcb3de274db4f4b7137a23fc77244609b4ec74322f17a491758c7ef0f710f` | 本地已发现 1 个候选包；当前可从仓库拉取 `desktop/cli` 并本地构建体验。 |

## Android

### 当前配置

- packageId: `com.molan.reader`
- namespace: `com.molan.reader`
- versionName: `0.1.0-dev`
- versionCode: `1`
- artifactRoot: `native/androidApp/build/outputs`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `native/androidApp/build/outputs/apk/debug/androidApp-debug.apk` | 12567943 B | 2026-07-21T22:51:44.513Z | `f4b8aa5f100a144dab2095145f1172688c79243f61ef66b26e427b6c463e1d77` |
| `native/androidApp/build/outputs/apk/debug/output-metadata.json` | 411 B | 2026-07-21T22:51:44.520Z | `d3c0819b8b9e1c3f968b6045c4e4d37f6eecbd60252be981611d61901dbe1ef7` |

### 下一步

1. cd native && ./gradlew :androidApp:assembleDebug :androidApp:testDebugUnitTest
2. 准备 release 签名后再执行 AAB / Release APK 构建

## iOS / iPadOS

### 当前配置

- bundleId: `com.molan.reader`
- displayName: `墨览`
- urlScheme: `molan`
- deploymentTarget: `17.0`
- versionName: `1.0`
- buildNumber: `1`
- artifactRoot: `native/iosApp/build`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `native/iosApp/build/ios-conflict-export/Build/Products/Debug-iphonesimulator/Molan.app/Info.plist` | 1561 B | 2026-07-18T16:35:12.631Z | `235fe317cd8ab161ac8cdc5608779cbf3d58b018e521f7fa29831b542fd1642a` |
| `native/iosApp/build/ios-conflict-export/Build/Products/Debug-iphonesimulator/Molan.app/PlugIns/MolanShare.appex/Info.plist` | 1183 B | 2026-07-18T16:35:15.730Z | `cab8561798a0518e05ba29d7290826c9a2ce5f6e0a8f839f37babebe07e84df8` |
| `native/iosApp/build/ios-conflict-export/Build/Products/Debug-iphonesimulator/MolanShare.appex/Info.plist` | 1183 B | 2026-07-18T16:34:57.913Z | `cab8561798a0518e05ba29d7290826c9a2ce5f6e0a8f839f37babebe07e84df8` |

### 下一步

1. xcodebuild -project native/iosApp/Molan.xcodeproj -scheme Molan -destination 'generic/platform=iOS Simulator' build
2. 准备正式 Team / Profile / App Groups 后再做 Archive 与 TestFlight

## 桌面 GUI

### 当前配置

- appId: `com.molan.desktop`
- productName: `墨览`
- version: `1.0.0`
- artifactRoot: `desktop/release`
- windowsArtifactPattern: `${productName}-${version}-setup.${ext}`
- bundledPandocWindows: `desktop/resources/pandoc.exe`
- bundledPandocMacLike: `未准备；当前依赖系统 PATH 中的 pandoc`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `desktop/release/win-unpacked/resources/pandoc.exe` | 231772424 B | 2026-07-21T22:14:06.871Z | `0e5d21f8b10537048ad5ba31d575d0792286fe682172fe67ea7267bccd1cabf8` |
| `desktop/release/win-unpacked/墨览.exe` | 188784128 B | 2026-07-21T22:14:07.021Z | `7d4f6bc4df43640ca4fd805b6f4abd1ab667f4435098bef8fae3de5d54b64d48` |
| `desktop/release/墨览-1.0.0-arm64-mac.zip` | 106094291 B | 2026-07-21T22:10:00.821Z | `621f338897299059016797a68e183388d34defd1b0a42613f356f48b8ed68ef6` |
| `desktop/release/墨览-1.0.0-arm64-mac.zip.blockmap` | 111124 B | 2026-07-21T22:10:06.901Z | `6d4c4149f64c8cae87559888d8700dab5c62235089a8905ef32098ce7aeacbd1` |
| `desktop/release/墨览-1.0.0-arm64.dmg` | 106062472 B | 2026-07-21T22:09:59.003Z | `25b7b13a130db8564b82bb4dfdb70d836d826b932889e4fa5724a6c0ee0d29ca` |
| `desktop/release/墨览-1.0.0-arm64.dmg.blockmap` | 112809 B | 2026-07-21T22:10:04.646Z | `42340e9446a50af24cd1517a508f29b27b07427769f288cd94754be4e0a0d1ec` |
| `desktop/release/墨览-1.0.0-setup.exe` | 110647343 B | 2026-07-21T22:14:46.899Z | `fe1adb655b159914a8a49a290c1709d21ffabbad780120121ab902a6f45bd182` |
| `desktop/release/墨览-1.0.0-setup.exe.blockmap` | 116345 B | 2026-07-21T22:14:50.438Z | `0ab1293c3d9d5f1f48aa3516dfa8d16c1a1c3e179bc5badfbe80f53c7bb78651` |
| `desktop/out/main/index.js` | 100689 B | 2026-07-23T21:36:00.056Z | `90981c05c540590b93d2cea4d7275748afc1db3a123b10b00c69aed39c864a84` |
| `desktop/out/preload/index.js` | 3902 B | 2026-07-23T21:36:00.073Z | `ef343cf9466506ca849aba24342b0422e8d7d5e184259f8c8f60d56d6fae40f1` |
| `desktop/out/renderer/assets/index-Cenlgfk0.css` | 16030 B | 2026-07-23T21:36:01.173Z | `29e8befad1025d8058fa07ddb035751ea84a0e724a64e7fe1b8090b674306572` |
| `desktop/out/renderer/assets/index-uYr4TmEU.js` | 647350 B | 2026-07-23T21:36:01.173Z | `5e577ce9ea118194b6997a0d7f6b5b5a38fbe90814ee51a0b48ff944602bec0f` |
| `desktop/out/renderer/index.html` | 411 B | 2026-07-23T21:36:01.172Z | `6663001dca23ab89f748c9cdc10c8bb28b82ef5bfef5fb4785180a62b6b34c7b` |
| `desktop/resources/pandoc.exe` | 231772424 B | 2026-07-21T22:12:16.493Z | `0e5d21f8b10537048ad5ba31d575d0792286fe682172fe67ea7267bccd1cabf8` |

### 下一步

1. cd desktop && npm run typecheck && npm run build
2. 在目标平台执行 cd desktop && npm run build:dist，生成对应平台发布包
3. Windows 随包 pandoc 已准备；正式发布前确认其来源版本、SHA256 与签名策略
4. macOS 当前仍依赖系统 PATH 中的 pandoc；若后续要随包携带，再单独补原生 pandoc 资源
5. Windows 侧补安装、升级、回滚与下载渠道验收；macOS 侧补签名、公证与 Gatekeeper 验证

## CLI

### 当前配置

- packageName: `molan-cli`
- version: `1.0.0`
- artifactRoot: `desktop/cli/dist`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `desktop/cli/dist/index.js` | 319785 B | 2026-07-23T21:35:08.144Z | `cf25fec951e2374b134970db2c88918c713e046ebf2467cea865d7905890604a` |
| `desktop/cli/dist/molan-cli-1.0.0.tgz` | 64268 B | 2026-07-21T22:02:03.963Z | `ac1fcb3de274db4f4b7137a23fc77244609b4ec74322f17a491758c7ef0f710f` |

### 下一步

1. cd desktop/cli && npm run typecheck && npm run build && npm run test && npm run pack:dist
2. 如需公开下载，再补发布说明、SHA256 和官网入口

## 官网

### 当前配置

- packageName: `molan-site`
- version: `0.1.0`
- artifactRoot: `site/dist`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `site/dist/assets/index-BFx8wg5_.css` | 21024 B | 2026-07-21T22:18:16.255Z | `60e8212c4f00ddfbd11a24eb00262e0e21adeba6c588ea7e1793c43b67dc5bbd` |
| `site/dist/assets/index-C6odM_wr.js` | 529459 B | 2026-07-21T22:18:16.255Z | `98d2418040f7e0ea2a0bab3452c025119568c25d40dbc0352a68848d68969b48` |
| `site/dist/index.html` | 722 B | 2026-07-21T22:18:16.255Z | `4bb24103d3d3192c561a4080a02eb2a545937261fd6de6e4332172631f13393d` |
| `site/dist/logo.png` | 725407 B | 2026-07-21T22:18:15.958Z | `467a686f0b033923823d3eebdaaa9246b4b8020f3461a6c74763f77fb13eb1f7` |

### 下一步

1. cd site && npm run typecheck && npm run build
2. 真实渠道就绪后再把下载链接、SHA256 和教程截图补上

## 同步后端

### 当前配置

- packageName: `@molan/sync-server`
- version: `0.1.0`
- artifactRoot: `server/dist`

### 已发现产物

| 文件 | 大小 | 修改时间 | SHA256 |
|---|---:|---|---|
| `server/dist/index.js` | 76446 B | 2026-07-21T19:25:22.707Z | `b1e6d2e0169c5f7a934fcbcfacac67d65017d9425361e4d28e8eb0f885429482` |

### 下一步

1. cd server && npm run typecheck && npm test
2. 正式部署前补 PostgreSQL 18 Compose / 生产部署 / 回滚演练证据

