# 手机端批量转换中心设计

版本：v1  
日期：2026-07-04  
对应任务：D1.9  
阶段：V1.5 / S6  
依据：`docs/design/mobile-current-file-conversion.md`、`TODO.md §0.7`

## 1. 定位

批量转换中心是独立页面，不放进阅读页主流程。

```text
首页 / 转换中心
  -> 添加多个文件
  -> 选择输出格式或转换配方
  -> 队列执行
  -> 成功 / 失败列表
  -> 批量分享 / 保存
```

V1 只做当前文件转换后直接分享。V1.5 才做批量队列。

## 2. 页面结构

```text
转换中心
  顶栏
    标题
    清空队列
  格式配方
    给 AI 读：Markdown
    给别人看：PDF
    给别人改：Word
    给开发 / Agent：JSON 或 Markdown
  添加文件区
    添加文件
    最近文档导入
  队列
    待转换
    转换中
    成功
    失败
  结果区
    全部结果
    仅失败
    批量分享
    保存到本地
```

## 3. 任务模型

```ts
type BatchConvertStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'shared'
  | 'saved';

interface BatchConvertItem {
  id: string;
  title: string;
  inputUri: string;
  inputKind: 'markdown' | 'json';
  outputFormat: 'markdown' | 'pdf' | 'word' | 'json';
  status: BatchConvertStatus;
  outputPath?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}
```

D4.4 会把它统一进全局转换任务状态机。

## 4. 添加文件

| 来源 | 行为 | 限制 |
|---|---|---|
| 系统文件选择器 | 多选 `.md` / `.markdown` / `.json` | 若 DocumentPicker 不支持多选则逐个添加 |
| 最近文档 | 从 RecentDoc 选择 | 只加入本地已有 content 的文档 |
| 当前文件 | 从阅读页“加入转换队列” | V1.5 后补 |
| 云端收件箱 | 选择已同步文件 | V2 |

文件加入队列后不立即转换，用户先确认输出格式。

## 5. 输出格式规则

| 输入 | 可选输出 | 默认 |
|---|---|---|
| Markdown | PDF、Word、Markdown | PDF |
| JSON | Markdown、PDF、Word、JSON 原文件 | Markdown |

JSON -> PDF / Word 先走 JSON -> Markdown 规则化，再输出办公格式。

## 6. 队列执行

V1.5 初版：

- 并发数固定 1，避免手机端内存和权限问题。
- 单项失败不停止后续任务。
- 每项状态独立显示。
- 用户可以重试失败项。
- 用户可以清空已完成项。

后续可做：

- 并发数设置。
- 后台转换。
- 取消正在运行任务。

## 7. 结果分享 / 保存

| 动作 | 行为 |
|---|---|
| 分享单个结果 | 调起系统分享面板 |
| 批量分享 | 若系统支持多文件分享则传多 URI；否则提示逐个分享 |
| 保存到本地 | 通过系统分享面板“保存到文件”；后续可加导出目录 |
| 打开结果 | Markdown 可载入阅读页；PDF / Word 调系统预览 |
| 重试失败 | 使用同一输入和输出格式重新执行 |

## 8. 状态与空态

| 状态 | UI |
|---|---|
| 空队列 | 引导添加 Markdown / JSON 文件 |
| 待转换 | 显示文件名、类型、目标格式 |
| 转换中 | 进度指示，禁用删除当前项 |
| 成功 | 显示输出格式、分享 / 打开 |
| 失败 | 显示错误、重试、移除 |
| 全部成功 | 显示批量分享 / 清空队列 |
| 部分失败 | 显示成功数量、失败数量、重试失败 |

## 9. 性能与隐私

- 不启动时扫描文件。
- 不自动导入聊天目录。
- 只转换用户选择的文件。
- 大文件转换前提示耗时和失败风险。
- 临时输出文件可在设置中清理。
- 文件内容不默认上传云端。

## 10. 验收脚本

| 编号 | 输入 | 动作 | 通过标准 |
|---|---|---|---|
| B1 | 3 个 Markdown | 批量转 PDF | 成功列表 3 项 |
| B2 | 2 个 Markdown | 批量转 Word | 输出 2 个 docx |
| B3 | 2 个 JSON | 批量转 Markdown | 输出可读 Markdown |
| B4 | 1 个非法 JSON + 1 个合法 JSON | 批量转 Markdown | 单项失败隔离 |
| B5 | 失败项 | 点击重试 | 状态重新进入 running |
| B6 | 成功结果 | 批量分享 | 系统面板出现或提示逐个分享 |
| B7 | 大文件 | 转换前提示 | 用户可取消 |

## 11. D1.9 关闭标准

- 已设计添加多文件。
- 已设计输出格式选择。
- 已设计队列状态。
- 已设计失败重试。
- 已设计结果分享 / 保存。
- 已明确批量转换归 V1.5，不塞进阅读页主流程。
