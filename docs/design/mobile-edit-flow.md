# 手机端编辑流程设计

版本：v1  
日期：2026-07-04  
对应任务：D1.4  
依据：`mobile/src/components/EditSheet.tsx`、`mobile/src/json/format.ts`、`mobile/src/converter/fileConvert.ts`

## 1. 当前能力基线

| 能力 | 当前实现 | 证据 |
|---|---|---|
| Markdown 原文编辑 | `TextInput multiline` | `EditSheet.tsx` |
| Markdown 预览 | `Reader content={draft}` | `EditSheet.tsx` |
| JSON 原文编辑 | `TextInput multiline` | `EditSheet.tsx` |
| JSON 实时校验 | `JSON.parse(draft)` effect | `EditSheet.tsx` |
| JSON 格式化 | `formatJson` | `EditSheet.tsx` |
| JSON 错误提示 | error bar + 禁用保存按钮 | `EditSheet.tsx` |
| 自动保存草稿 | `AsyncStorage.setItem(DRAFT_KEY)` | `EditSheet.tsx` |
| 草稿恢复 | 打开时读取 `DRAFT_KEY` | `EditSheet.tsx` |
| 保存到当前文档 | `onSave(draft)` | `EditSheet.tsx` / `App.tsx` |
| 保存为副本 | `writeMdFile` / `writeJsonFile` + share sheet | `EditSheet.tsx` |
| 保存并分享 | 写临时文件后 `Sharing.shareAsync` | `EditSheet.tsx` |

## 2. 编辑入口

```text
阅读页
  -> 显式点击“编辑”
  -> EditSheet 全屏 Modal
  -> 根据当前文档类型进入 Markdown 或 JSON 编辑
```

裁定：

- 阅读态长按仍优先服务选择 / 复制，不进入编辑。
- 编辑必须通过显式按钮进入。
- 关闭编辑页不自动覆盖原文。
- 保存副本优先于覆盖原文件。

## 3. Markdown 编辑流程

```text
进入编辑
  -> 加载当前 Markdown 为 draft
  -> 用户编辑原文
  -> 1 秒后自动保存草稿
  -> 可切换预览
  -> 保存更改：更新当前 App 内文档
  -> 保存副本：写入临时 .md 并调起系统分享 / 保存
  -> 保存并分享：更新当前文档并分享临时 .md
```

状态：

| 状态 | UI | 允许动作 |
|---|---|---|
| 未修改 | 按钮显示“保存” | 关闭、预览、保存副本、保存并分享 |
| 已修改 | 按钮显示“保存更改” | 保存、预览、保存副本、保存并分享 |
| 自动草稿 | 无阻断提示 | 继续编辑 |
| 草稿恢复 | 文案“已恢复未保存的编辑” | 检查后保存或关闭 |
| 分享中 | busy / ActivityIndicator | 禁用重复分享 |

## 4. JSON 编辑流程

```text
进入编辑
  -> 加载当前 JSON 为 draft
  -> 用户编辑原文
  -> 实时 JSON.parse 校验
  -> 有错误：显示错误、禁用保存 / 副本 / 分享
  -> 无错误：允许格式化、保存、副本、分享
  -> 格式化：JSON.stringify(parsed, null, 2)
```

状态：

| 状态 | UI | 允许动作 |
|---|---|---|
| JSON 合法 | 无错误栏 | 格式化、保存、保存副本、保存并分享 |
| JSON 非法 | 错误栏 + 红色边框 | 只能继续编辑、关闭 |
| 格式化成功 | 文案“已格式化” | 保存或继续编辑 |
| 格式化失败 | 文案“格式化失败：...” | 修复 JSON |
| 保存被阻止 | 文案“JSON 格式有误，请先修复” | 返回编辑 |

非法 JSON 绝不能覆盖当前文档，也不能生成分享副本。

## 5. 草稿规则

| 规则 | 裁定 |
|---|---|
| 草稿 key | 当前实现 `molan.edit.draft`；后续需按文档 id / hash 拆分 |
| 自动保存时机 | 编辑内容变化 1 秒后 |
| 草稿恢复条件 | 标题相同且草稿内容不同于当前内容 |
| 草稿删除 | 保存、保存副本、保存并分享成功后删除 |
| 数据下沉 | 后续抽 `storage/draft.ts`，组件不直接调用 AsyncStorage |

## 6. 输出与分享规则

| 动作 | Markdown | JSON | 文件位置 | 后续记录 |
|---|---|---|---|---|
| 保存更改 | 更新当前 App 内 Markdown | 更新当前 App 内 JSON | 不写外部原文件 | `edited` |
| 保存副本 | `title（副本）.md` | `title（副本）.json` | cache 临时文件 | 用户通过系统保存 / 分享 |
| 保存并分享 | 先更新当前文档，再写临时文件 | 同左 | cache 临时文件 | `edited` + 后续 `shared` |

## 7. 错误与失败状态

| 场景 | UI |
|---|---|
| JSON 语法错误 | 错误栏展示 parse message，保存按钮 disabled |
| 导出失败 | `导出失败：error` |
| 保存副本失败 | `保存副本失败：error` |
| 系统分享不可用 | `当前环境不支持系统分享` |
| 草稿读取失败 | 静默忽略，不阻断编辑 |
| 草稿写入失败 | 静默忽略，后续可补非阻断提示 |

## 8. 待实现 / 待验收差距

| 项目 | 当前状态 | 后续任务 |
|---|---|---|
| 草稿存储下沉 | 组件直接 AsyncStorage | 抽 `storage/draft.ts` |
| 多文档草稿 | 单 key，按 title 恢复 | 用 document id / content hash |
| JSON 预览 | 只读 monospace 文本 | 后续可接 JsonTree |
| 分享后状态 | EditSheet 内只显示消息，状态回写由 App 侧部分完成 | 统一 `edited/shared` 状态 |
| 真机 safe-area | 设计已避让 insets | D1.13 / S1-QA 真机验收 |

## 9. D1.4 关闭标准

- 已设计 Markdown 编辑 / 预览流程。
- 已设计 JSON 编辑 / 格式化 / 校验 / 错误提示。
- 已设计草稿恢复和删除规则。
- 已设计保存更改、保存副本、保存并分享。
- 已明确非法 JSON 不覆盖原文件。
- 已记录数据下沉后续约束。
