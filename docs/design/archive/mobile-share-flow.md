# 手机端分享流程设计

版本：v1  
日期：2026-07-04  
对应任务：D1.7  
依据：`mobile/App.tsx`、`mobile/src/components/ConvertSheet.tsx`、`mobile/src/components/EditSheet.tsx`、`mobile/src/converter/fileConvert.ts`

## 1. 分享定位

分享入口统一叫“分享”，不叫“发给微信”。微信、QQ、保存到本地都先通过系统分享面板覆盖，后续根据真机验证决定是否做 SDK 深度直达。

## 2. 分享类型

| 分享类型 | 当前入口 | 当前状态 | V1 目标 | 记录 |
|---|---|---|---|---|
| 原始 `.md` 文件 | 阅读页“分享” | 已实现 | 写临时 `.md` 后系统分享 | RecentDoc `shared` |
| 原始 `.json` 文件 | 阅读页“分享” / ConvertSheet | 已实现 | 写临时 `.json` 后系统分享 | RecentDoc `shared` |
| 纯文本 | 待统一入口 | 待补 | 直接分享正文文本或写 `.txt` | RecentDoc `shared` |
| PDF | ConvertSheet | 已实现 | Markdown / JSON 规则化后导出 PDF 分享 | `converted` + `shared` |
| Word | ConvertSheet | 已实现 | Markdown / JSON 规则化后导出 docx 分享 | `converted` + `shared` |
| Markdown 导出 | ConvertSheet | 已实现 | JSON 可转 Markdown 并分享 | `converted` + `shared` |
| 保存副本 | EditSheet | 已实现 | 写临时文件，由系统面板保存到本地 | `edited` |
| 保存并分享 | EditSheet | 已实现 | 保存当前文档后分享临时文件 | `edited` + `shared` |

## 3. 阅读页分享流程

```text
阅读页
  -> 点击“分享”
  -> 判断当前类型
     -> Markdown：writeMdFile(content, title)
     -> JSON：writeJsonFile(raw, title)
  -> Sharing.isAvailableAsync
  -> Sharing.shareAsync(outputPath, mimeType, dialogTitle)
  -> 成功后记录 shared 状态
```

失败分支：

| 场景 | UI |
|---|---|
| 写文件失败 | `分享失败：error` |
| 系统分享不可用 | `当前环境不支持系统分享` |
| 当前无内容 | 后续补“当前没有可分享内容” |

## 4. 转换后分享流程

```text
阅读页
  -> 转换
  -> 选择格式
     -> PDF
     -> Word
     -> Markdown
     -> 原 JSON
  -> 生成临时文件
  -> 调起系统分享面板
  -> 回写 converted / shared 状态
```

格式推荐：

| 目的 | 推荐格式 |
|---|---|
| 给别人看 | PDF |
| 给别人继续编辑 | Word |
| 给 AI 读取 | Markdown |
| 给开发 / 配置 | JSON 原文件或 Markdown |

## 5. 微信 / QQ 分享策略

V1：

- 使用系统分享面板。
- 真机验证微信 / QQ 是否出现在分享面板中。
- 记录从点击分享到微信 / QQ 可见的步骤和耗时。

V1.5：

- 记录最近分享目标。
- 分享面板打开前可展示“最近：微信 / QQ / 保存到本地”。

不做：

- V1 不强接微信 / QQ SDK。
- 不绕过系统分享面板。
- 不默认上传到云端再分享链接。

## 6. 保存到本地

系统分享面板中的“保存到文件 / 文件管理器 / WPS / 网盘”先作为保存路径。后续如果真机发现保存路径难找，再补“保存到墨览导出目录”。

| 输出 | 文件名 | 目录 |
|---|---|---|
| Markdown | `${title}.md` | cache 临时文件，用户从系统面板保存 |
| JSON | `${title}.json` | cache 临时文件 |
| PDF | Expo Print 输出 URI | cache 临时文件 |
| Word | `${title}.docx` | cache 临时文件 |

## 7. 最近分享方式

V1.5 设计：

```ts
type ShareTarget = 'wechat' | 'qq' | 'system' | 'local' | 'other';

interface ShareRecord {
  id: string;
  documentId: string;
  format: 'markdown' | 'json' | 'text' | 'pdf' | 'word';
  target: ShareTarget;
  createdAt: number;
  ok: boolean;
}
```

V1 不强行判断系统分享最终目标；真机验证后再决定是否能从平台回调或用户选择中记录。

## 8. 真机验收脚本

| 编号 | 输入 | 分享动作 | 通过标准 | 证据 |
|---|---|---|---|---|
| S1 | Markdown | 分享原 `.md` | 系统面板出现，微信 / QQ 可见 | 录屏 |
| S2 | JSON | 分享原 `.json` | 系统面板出现，微信 / QQ 可见 | 录屏 |
| S3 | Markdown | 转 PDF 后分享 | 20 秒内到分享面板 | 录屏 + 耗时 |
| S4 | Markdown | 转 Word 后分享 | 20 秒内到分享面板 | 录屏 + 耗时 |
| S5 | JSON | JSON -> Markdown 并分享 | 输出 Markdown 可读 | 录屏 |
| S6 | 编辑页 | 保存副本 | 系统面板可保存到本地 | 录屏 |
| S7 | 分享不可用模拟 | 关闭分享能力或 Web 环境 | 显示错误，不崩溃 | 截图 |

## 9. 待实现 / 待验收差距

| 项目 | 当前状态 | 后续任务 |
|---|---|---|
| 纯文本分享 | 未提供显式入口 | S1-SHARE-003 补齐 |
| 最近分享方式 | 未记录 | S1-SHARE-006 |
| 微信 / QQ 真机分享面板 | 未验收 | S1-SHARE-004 / S1-SHARE-005 |
| 分享后目标识别 | 系统分享无统一回调 | 真机验证后裁定 |
| 保存到本地独立入口 | 依赖系统面板 | S1-SHARE-003 / S4 发布前验收 |

## 10. D1.7 关闭标准

- 已覆盖原文件、纯文本、PDF、Word。
- 已覆盖微信 / QQ / 系统面板 / 保存到本地。
- 已设计最近分享目标记录。
- 已列出失败状态和真机验收脚本。
- 已明确 V1 不强接平台 SDK。
