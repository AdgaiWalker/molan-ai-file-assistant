# D2.4 桌面 GUI 阅读与转换设计

## 1. 定位

桌面 GUI 是“人用的轻量批量转换与阅读器”，低于手机 V1 主线，但服务两个场景：

- 人手动批量把 Office/PDF/PPT/Excel 转成 Markdown。
- 快速阅读、编辑、校验 Markdown / JSON / 转换结果。

桌面 GUI 不承担微信/QQ 社交分享主流程，不做完整 Office 编辑器。

## 2. 设计范围

实现参考：`desktop/src/App.tsx`、`desktop/src/components/ReaderPanel.tsx`、`ConvertPanel.tsx`、Electron 主进程 IPC。

## 3. 桌面信息架构

| Tab | 主职责 | 不做 |
|---|---|---|
| 阅读 | 打开 `.md/.json`、预览、轻编辑、复制、保存副本 | 完整 Markdown IDE |
| 转换 | 拖拽/选择 Office/PDF/PPT/Excel/CSV/Markdown，批量转 Markdown/Word | 办公格式深度编辑 |
| 快贴 | 搜索提示词、复制、独立置顶窗 | 文档编辑器 |

窗口尺寸：

- 主窗口最小 `720x480`，推荐 `960x680`。
- 转换队列在窄窗口下保持单列。
- 阅读内容最大宽度可后续限制，避免超宽行难读。

## 4. 阅读页

### 4.1 支持格式

| 格式 | 行为 |
|---|---|
| Markdown `.md/.markdown` | marked 渲染，代码块/表格/图片基础显示 |
| JSON `.json` | 格式化预览，非法 JSON 显示错误和原文 |
| 转换输出 `.md` | 打开后进入 Markdown 阅读 |

### 4.2 操作

- 打开文件。
- 编辑/预览切换。
- 复制全文。
- JSON 格式化。
- JSON 压缩。
- JSON 校验。
- 保存副本。

### 4.3 错误恢复

| 场景 | 展示 | 动作 |
|---|---|---|
| 文件读取失败 | 错误条 | 重新打开 |
| JSON 解析失败 | 错误条 + 原文 | 编辑修正、保存副本 |
| 保存副本取消 | 不提示错误 | 留在当前页 |
| 保存失败 | 错误条 | 重试 |

原则：非法 JSON 不覆盖原文件；保存副本优先。

## 5. 转换页

### 5.1 输入

支持来源：

- 点击选择文件。
- 系统文件拖拽。
- 后续从 CLI/收件箱拉取。

支持格式：

| 格式 | 默认输出 |
|---|---|
| `.docx` | Markdown |
| `.pdf` | Markdown |
| `.pptx` | Markdown |
| `.xlsx` | Markdown |
| `.csv` | Markdown |
| `.md/.markdown` | Word `.docx` |
| `.json` | Markdown 或 JSON 日志，后续配方选择 |

当前 `ConvertPanel` 拖拽筛选只接受 md/docx，S3/S6 实现时需扩展到 `docx/pdf/pptx/xlsx/csv/md/markdown/json`。

### 5.2 队列

每个任务字段：

```ts
interface DesktopConvertTask {
  id: string;
  inputPath: string;
  fileName: string;
  inputFormat: string;
  outputFormat: string;
  status: 'pending' | 'converting' | 'success' | 'failed';
  outputPath?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];
}
```

队列规则：

- 同一 `inputPath` 去重。
- 转换前可移除 pending/failed 项。
- 转换中禁用清空/移除。
- 成功项可打开输出所在目录。
- 失败项可重试或移除。

### 5.3 输出目录

- 默认读取 settings 的 `outputDir`。
- 未设置时必须先选择输出目录。
- 每次转换后保存输出目录。
- 输出路径不覆盖已有文件，沿用 `makeOutputPath`。

## 6. 转换日志

GUI 需要显示人可读日志，底层 JSON 供 AI/调试使用。

日志分两层：

| 层 | 内容 |
|---|---|
| 队列摘要 | 成功/失败/总数、输出目录、耗时 |
| 单项详情 | inputPath、outputPath、errorCode、error、warnings、durationMs |

日志入口：

- 转换页底部“查看日志”。
- 失败项“详情”。
- 后续可保存为 `molan-convert-log.json`。

日志不记录文件正文，避免泄漏内容。

## 7. 阅读预览与转换联动

| 动作 | 行为 |
|---|---|
| 转换成功 Markdown | 可点击“预览”载入阅读 tab |
| 转换成功 Word/PDF | 打开系统默认应用或所在目录 |
| 转换失败 | 保留任务在队列，展示错误 |
| 批量全部成功 | 可打开输出目录 |

预览 Markdown 时只读输出文件内容，不修改源文件。

## 8. JSON 编辑

桌面 JSON 编辑比手机端更适合轻量处理转换结果：

- 格式化。
- 压缩。
- 校验。
- 保存副本。
- 后续树形视图可复用手机端 JSONPath 规则，但不强制 V1。

非法 JSON：

- 预览可显示原文。
- 保存副本前必须校验或明确“保存原文副本”。
- 不做 schema 校验。

## 9. 错误恢复

| 错误 | 恢复 |
|---|---|
| pandoc 缺失 | 转换页显示 `molan check` 建议和下载入口 |
| 单文件转换失败 | 该项 failed，其他项继续 |
| 输出目录不可写 | 顶部错误，要求重新选择输出目录 |
| 文件被删除 | 标记 failed，允许移除 |
| GUI 崩溃重启 | 后续从 settings 恢复 outputDir/lastTab，队列可后续持久化 |

## 10. 设置记忆

当前已保存：

- `outputDir`
- `lastTab`

后续应保存：

- 最近打开目录。
- 最近输出格式。
- 转换并发数。
- 是否转换后自动预览。
- 快贴窗 bounds 已单独保存到 `prompt-window.json`。

设置文件只存本地，不同步云端，除非用户主动开启跨设备设置同步。

## 11. 验收口径

- 拖拽/选择多文件进入队列。
- 队列显示 pending/converting/success/failed。
- 转换调用 `desktop/src/shared/converter.ts`，不复制 pandoc 逻辑。
- 输出目录可选择和记忆。
- Markdown/JSON 可阅读，JSON 错误可恢复，编辑保存为副本。
- 转换失败有日志、错误码和可重试入口。
