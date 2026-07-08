# 手机端复制系统设计

版本：v1  
日期：2026-07-04  
对应任务：D1.5  
依据：`mobile/App.tsx`、`mobile/src/markdown/renderer.tsx`、`mobile/src/components/JsonTree.tsx`、`mobile/src/components/PromptSheet.tsx`、`mobile/src/components/AiInsightSheet.tsx`

## 1. 复制动作总表

| 复制类型 | 入口 | 当前状态 | 目标反馈 | 状态记录 |
|---|---|---|---|---|
| 全文复制 | 阅读页底部“复制全文” | 已实现 | toast / 按钮反馈 | RecentDoc `copied` |
| 代码块复制 | Markdown 代码块右上角 | 已实现 | 按钮变“已复制” | 后续可记录 CopyEvent |
| 图片地址复制 | 图片长按 | 已实现 | 系统 Alert | 不记文档状态 |
| JSON 字段值复制 | JSON 叶子节点点击 | 已实现 | 后续统一 toast | 后续记录 CopyEvent |
| JSONPath 复制 | JSON 节点长按 | 已实现 | Alert 显示 path | 后续记录 CopyEvent |
| 美化 JSON 复制 | JSON 顶栏 | 已实现 | 后续统一 toast | RecentDoc `copied` 可后补 |
| 压缩 JSON 复制 | JSON 顶栏 | 已实现 | 后续统一 toast | RecentDoc `copied` 可后补 |
| 提示词一键复制 | PromptSheet 行按钮 | 已实现 | 按钮变“已复制” | PromptItem `copyCount` / `lastCopiedAt` |
| 提示词列表全部复制 | PromptSheet 批量按钮 | 已实现 | toast 显示数量 | 后续记录 CopyEvent |
| 当前文件导入提示词 | PromptSheet | 已实现 | toast | PromptItem 入库 |
| 剪贴板片段导入 | PromptSheet | 已实现 | toast / 导入对话框 | PromptItem 入库 |
| AI 卡片片段复制 | AiInsightSheet | 已实现 | 按钮变“已复制” | 后续记录 CopyEvent |
| 选中片段复制 | 系统文本选择 | 部分依赖 selectable | 统一成显式片段入口 | S1-COPY-004 |
| 多段组合复制 | 组合复制工作台 | 待实现 | 显示已选数量和复制成功 | S6-PROMPT-003 |

## 2. 复制优先级

1. 当前阅读内容的全文复制。
2. Markdown 代码块和 JSON 字段值。
3. 提示词一键复制和最近复制。
4. JSONPath / 图片地址 / AI 卡片候选。
5. 选中片段和组合复制。

原则：复制动作必须比转换和编辑更近，且不能要求登录或网络。

## 3. 统一反馈规则

| 结果 | UI 反馈 | 持续时间 |
|---|---|---:|
| 复制成功 | 按钮文字“已复制”或底部 toast | 1.2-1.5 秒 |
| 批量复制成功 | toast “已复制 N 条” | 1.5 秒 |
| 剪贴板为空 | toast “剪贴板为空” | 1.5 秒 |
| 当前无可复制内容 | 顶部 / 底部错误条 | 用户关闭或下一次动作 |
| JSONPath 复制 | 后续统一 toast，当前允许 Alert | 1.5 秒 |
| 复制失败 | 错误条 “复制失败：...” | 用户下一次动作 |

后续实现应收敛为一个 App 级 toast / action feedback，不再每个组件各写一套提示。

## 4. 数据记录规则

| 数据 | 记录位置 | 用途 |
|---|---|---|
| 文档被复制 | RecentDoc `statuses=['copied']` + `lastCopiedAt` | 最近文档状态和回访 |
| 提示词被复制 | PromptItem `copyCount` + `lastCopiedAt` | 最近复制、排序 |
| 片段复制事件 | CopyEvent（D4.1 设计） | 后续组合复制、统计 |
| JSON 字段复制 | CopyEvent `{type:'jsonValue', path}` | 后续 AI 建议 |
| 代码块复制 | CopyEvent `{type:'codeBlock', lang}` | 高频代码复制统计 |

V1 可以先保持 RecentDoc 和 PromptItem；D4.1 后统一 CopyEvent。

## 5. 选中片段复制设计

V1 补齐目标：

```text
阅读页
  -> 文本 selectable 支持系统选择
  -> 用户复制片段
  -> 打开提示词库
  -> “导入剪贴板片段”
  -> 保存为提示词
```

增强目标：

```text
阅读页显式进入片段模式
  -> 点击段落 / 代码块 / JSON 字段加入选择篮
  -> 底部显示已选 N 段
  -> 复制合并文本 / 保存为提示词 / 分享
```

合并格式：

```text
片段 1

---

片段 2
```

## 6. 多段组合复制设计

| 区块 | 内容 |
|---|---|
| 选择来源 | Markdown 段落、代码块、JSON 字段、提示词 |
| 选择反馈 | 选中描边 / 勾选态，底部显示数量 |
| 排序 | 默认按文档顺序，可后续拖拽排序 |
| 输出 | 合并文本，片段间用 `---` 分隔 |
| 动作 | 复制、保存为提示词、清空选择 |
| 状态 | 组合复制成功后记录 CopyEvent |

组合复制属于 V1.5，不阻塞 V1，但 D1.5 先固定交互模型。

## 7. 复制后动作建议

| 来源 | 建议 |
|---|---|
| 全文 | 分享、保存为提示词、转 PDF / Word |
| 代码块 | 保存为提示词、打开 AI App |
| JSON 字段 | 复制 JSONPath、查看上级对象、保存为提示词 |
| 提示词 | 打开最近 AI App / 保持在提示词库 |
| AI 阅读卡片候选 | 保存到提示词库、转给 AI 处理 |

建议动作不能遮挡阅读；优先用轻 toast + 可点击动作。

## 8. 隐私边界

- 不默认读取剪贴板。
- 只有用户点击“从剪贴板导入”或“导入剪贴板片段”才读取剪贴板。
- 不上传复制内容。
- Android 悬浮快贴不读取其他 App 输入框。
- 复制失败日志不得记录正文。

## 9. 待实现 / 待收敛

| 项目 | 当前状态 | 后续任务 |
|---|---|---|
| App 级 toast | 分散实现 | S1-COPY / D1.13 收敛 |
| JSON 字段复制反馈 | 无明显 toast | S1-COPY-003 后续增强 |
| 选中片段复制 | 依赖系统 selectable + 剪贴板导入 | S1-COPY-004 |
| 多段组合复制 | 未实现 | S1-COPY-005 / S6-PROMPT-003 |
| CopyEvent 模型 | 未统一 | D4.1 |

## 10. D1.5 关闭标准

- 已覆盖全文、选中段落、代码块、JSON 字段、JSONPath。
- 已覆盖多段组合复制。
- 已覆盖复制后动作建议。
- 已定义复制反馈和状态记录规则。
- 已定义剪贴板隐私边界。
