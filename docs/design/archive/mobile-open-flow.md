# 手机端微信 / QQ / 文件管理器打开流程设计

版本：v1  
日期：2026-07-04  
对应任务：D1.1  
依据：`mobile/app.json`、`mobile/App.tsx`、`docs/design/key-metrics-design.md`

## 1. 当前实现依据

| 项目 | 当前状态 | 证据 |
|---|---|---|
| App 名 | 墨览 | `mobile/app.json` `expo.name` / `CFBundleDisplayName` |
| 包名 / Bundle ID | `com.mdreader.app` | `mobile/app.json` |
| Android `.md` / `.markdown` | 已注册 `content` / `file` / `text/markdown` / `text/plain` / `octet-stream` | `mobile/app.json` `android.intentFilters` |
| Android `.json` | 已注册 `application/json` / `text/plain` / `octet-stream` | `mobile/app.json` `android.intentFilters` |
| iOS Markdown | 已注册 `net.daringfireball.markdown` 和扩展名 | `mobile/app.json` `CFBundleDocumentTypes` / `UTImportedTypeDeclarations` |
| iOS JSON | 已注册 `public.json` | `mobile/app.json` `CFBundleDocumentTypes` |
| 外部 URL 接收 | `Linking.getInitialURL` + `Linking.addEventListener` | `mobile/App.tsx` |
| `content://` 读取 | `new File(cleanUri).text()` | `mobile/App.tsx` |
| 读取失败兜底 | 友好错误 + “重新选择” | `friendlyOpenError` / `errorAction='openFile'` |
| 首次引导 | 首页弹出“从微信 / QQ 打开文件” | `OpenGuide` |

## 2. 微信打开流程

```text
微信聊天文件
  -> 点开 .md / .json
  -> 选择“其他应用”或“更多打开方式”
  -> 系统打开列表显示“墨览”
  -> 用户选择墨览
  -> Android intent / iOS document handoff 传入 URI
  -> App 通过 Linking 接收 URI
  -> 读取文件文本
  -> 根据文件名 / mime 判断 Markdown 或 JSON
  -> 直达阅读页
  -> 记录最近文档 source=wechat 或 fileManager
```

验收：

- 打开列表中最多滑动 1-2 次找到墨览。
- 从点击墨览到正文首屏可读小于 5 秒。
- 读取失败时出现明确原因和“重新选择”。

## 3. QQ 打开流程

```text
QQ 聊天文件
  -> 点开 .md / .json
  -> 选择“其他应用”或“用其他应用打开”
  -> 系统打开列表显示“墨览”
  -> 用户选择墨览
  -> App 接收 content:// 或 file:// URI
  -> 读取文件文本
  -> Markdown 进入 Reader，JSON 进入 JsonView
  -> 记录最近文档 source=qq 或 fileManager
```

验收同微信；若 QQ 返回的 URI 不含 `qq` 字样，来源允许先记录为 `fileManager`，后续通过真机样本再优化来源识别。

## 4. 文件管理器打开流程

```text
系统文件管理器
  -> 用户选择 .md / .markdown / .json
  -> 打开方式选择墨览
  -> App 接收 content:// 或 file:// URI
  -> 读取文件
  -> 直达阅读页
  -> 最近文档 source=fileManager
```

兜底流程：

```text
用户主动打开墨览
  -> 首页“打开文件”
  -> DocumentPicker
  -> copyToCacheDirectory=true
  -> 读取缓存副本
  -> 直达阅读页
```

## 5. 状态与失败分支

| 状态 | 触发条件 | UI |
|---|---|---|
| 首次引导 | `openGuideSeen:v1` 不存在 | 展示微信 / QQ 打开说明 |
| 加载中 | 外部 URI 或 DocumentPicker 读取中 | loading 状态 |
| Markdown 成功 | 文件名非 `.json` 且可读 | Reader，沉浸模式 |
| JSON 成功 | 文件名 `.json` 或 mime `application/json` | JsonView，非沉浸 |
| 权限失败 | READ permission / EACCES / security | 提示保存到本地或重新选择 |
| 文件不存在 | ENOENT / No such file | 提示重新选择 |
| 类型不支持 | 读取失败或内容不可用 | 提示确认 Markdown / JSON |

## 6. 真机验证脚本

| 编号 | 来源 | 文件 | 步骤 | 通过标准 | 证据 |
|---|---|---|---|---|---|
| O1 | 微信 | `sample.md` | 聊天发送文件 -> 其他应用 -> 墨览 | 1-2 次滑动内找到，5 秒内看到标题 | 录屏 / 截图 |
| O2 | 微信 | `sample.json` | 同 O1 | 进入 JSON 树 | 录屏 / 截图 |
| O3 | QQ | `sample.md` | 聊天发送文件 -> 其他应用 -> 墨览 | 1-2 次滑动内找到，5 秒内看到标题 | 录屏 / 截图 |
| O4 | QQ | `sample.json` | 同 O3 | 进入 JSON 树 | 录屏 / 截图 |
| O5 | 文件管理器 | `sample.md` | 打开方式 -> 墨览 | source=fileManager，正文可读 | 录屏 / 截图 |
| O6 | 文件管理器 | `sample.json` | 打开方式 -> 墨览 | JSON 树可读 | 录屏 / 截图 |
| O7 | 权限兜底 | 模拟无法读取 URI | 打开失败 | 显示友好错误和重新选择 | 截图 |

## 7. 当前阻塞

本机已找到 Android SDK adb：

```text
C:\Users\26296\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

当前检测结果：

```text
List of devices attached
```

没有已连接设备或启动中的模拟器。因此微信 / QQ 真机截图证据尚不能补齐。接入已安装微信、QQ 的 Android 真机或可用模拟器后，按第 6 节脚本补证据。

## 8. D1.1 关闭标准

- 流程图已覆盖微信、QQ、文件管理器。
- 已列出读取成功和失败状态。
- 已列出真机验证脚本。
- 待补微信 / QQ 真机截图或录屏证据后，从 `[v]` 改为 `[x]`。
