# D6.2 手机端主流程设计冻结

## 1. 结论

手机端主流程的线框或页面说明已齐备，覆盖：
- 打开
- 阅读
- 复制
- 编辑
- 转换
- 分享
- 提示词
- 收件箱

仍需真实设备补证据的是微信/QQ 打开和 Markdown 阅读页真机截图/录屏，这些已在 D1.1/D1.2 标为 `[v]`，不影响设计冻结结论。

## 2. 主流程索引

| 主流程 | 设计文档 | 状态 |
|---|---|---|
| 打开 | `docs/design/mobile-open-flow.md` | 已设计，待真机证据 |
| Markdown 阅读 | `docs/design/mobile-markdown-reader-page.md` | 已设计，待真机证据 |
| JSON 阅读 | `docs/design/mobile-json-reader-page.md` | 已设计 |
| 复制 | `docs/design/mobile-copy-system.md` | 已设计 |
| 编辑 | `docs/design/mobile-edit-flow.md` | 已设计 |
| 当前文件转换 | `docs/design/mobile-current-file-conversion.md` | 已设计 |
| 分享 | `docs/design/mobile-share-flow.md` | 已设计 |
| 提示词库 | `docs/design/mobile-prompt-library.md` | 已设计 |
| 最近文档/收件箱 | `docs/design/mobile-recent-inbox.md` | 已设计 |
| AI 阅读卡片 | `docs/design/mobile-ai-reading-card.md` | 已设计 |
| 设置 | `docs/design/mobile-settings-page.md` | 已设计 |
| 状态表 | `docs/design/mobile-page-state-table.md` | 已设计 |
| 视觉规范 | `docs/design/mobile-visual-spec.md` | 已设计 |

## 3. 端到端路径

```text
微信/QQ/文件管理器打开
  -> Markdown/JSON 阅读
  -> 复制全文/片段/字段/提示词
  -> 轻编辑或保存副本
  -> 当前文件转换
  -> 系统分享面板
  -> 最近文档/收件箱记录状态
```

辅助路径：

```text
阅读页
  -> AI 阅读卡片
  -> 提示词候选 / 有用资源
  -> 保存到提示词库或云端收件箱
```

## 4. 状态覆盖

`docs/design/mobile-page-state-table.md` 覆盖：
- 空态。
- 加载。
- 错误。
- 无权限。
- 离线。
- 大文件。
- 转换失败。
- 同步冲突。

文件状态由 D4.3 统一：
- 未处理。
- 已阅读。
- 已复制。
- 已编辑。
- 已转换。
- 已分享。
- 已归档。
- 已同步。
- 冲突。

## 5. 视觉与平台覆盖

视觉基线：
- `docs/assets/selected-mobile-ui.png`
- `docs/design/mobile-visual-spec.md`

平台差异：
- Android `content://`、intent filter、悬浮快贴后置。
- iOS document type、Home Indicator、键盘/分享扩展后置。
- safe-area 真机验收由 D5.1 脚本执行。

## 6. 未完成但已承接

| 项 | 承接任务 |
|---|---|
| 微信/QQ 真机截图录屏 | D1.1、D5.1、S1-QA |
| Markdown 真机阅读截图 | D1.2、D5.1、S1-QA |
| 手机批量转换中心 | D1.9、S6-BATCH |
| Android 悬浮快贴 | D1.15、S6-FLOAT |
| iOS 键盘/分享扩展 | D1.15、S6-IOS |
| 云同步设置与上传确认 | D1.12、D3.5、S7 |

## 7. 验收口径

- 手机主流程每一步都有对应设计文档。
- 每个设计文档都有状态、失败或验收说明。
- 真机未验证项保持 `[v]`，不伪装为已完成。
- 后续 S 层开发不得绕过这些设计直接新增并行流程。
