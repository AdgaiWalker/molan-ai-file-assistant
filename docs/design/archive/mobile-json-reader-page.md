# 手机端 JSON 阅读页设计

版本：v1  
日期：2026-07-04  
对应任务：D1.3  
依据：`mobile/src/components/JsonView.tsx`、`mobile/src/components/JsonTree.tsx`、`mobile/src/json/tree.ts`、`mobile/src/json/format.ts`

## 1. 设计范围

实现参考：`mobile/src/components/JsonView.tsx`、`JsonTree.tsx` 及 `mobile/src/json/` 下的纯逻辑模块。

## 2. 页面结构

```text
JSON 阅读页
  顶栏
    标题
    复制美化
    复制压缩
  模式栏
    树形
    美化
    压缩
  树形模式
    搜索 key / 值
    JSON 树 FlatList
    节点点击：展开 / 复制值
    节点长按：复制 JSONPath
    Markdown 字段：查看MD
  原文模式
    美化 JSON 文本
    压缩 JSON 文本
  Markdown 预览弹层
    Reader 渲染片段
```

## 3. 状态表

| 状态 | 触发 | 页面表现 | 用户动作 | 验收 |
|---|---|---|---|---|
| JSON 有效 | `JSON.parse` 成功 | 默认树形，根节点展开 | 浏览、搜索、复制 | 不白屏 |
| JSON 无效 | parse 失败 | 显示错误和原文 | 复制原文、返回编辑 | 不覆盖原内容 |
| 空对象 | `{}` | 根节点显示 0 keys | 切换美化 / 压缩 | 不崩溃 |
| 空数组 | `[]` | 根节点显示 0 items | 切换模式 | 不崩溃 |
| 深层对象 | 多层嵌套 | 默认只展开根，按需展开 | 点击容器节点 | 不一次性展开全部 |
| 大数组 | 数千项数组 | FlatList 渲染可滚动 | 搜索或按需展开 | 不明显卡死 |
| 搜索命中 key | 输入 key | 展平展示匹配节点 | 点击 / 长按复制 | 跨折叠结构可搜 |
| 搜索命中 value | 输入 value | 展平展示匹配节点 | 复制值或路径 | preview 可匹配 |
| 搜索无结果 | 输入无匹配词 | 后续补无结果文案 | 修改搜索词 | 不报错 |
| 复制字段值 | 点击叶子节点 | 写入剪贴板 | 粘贴验证 | string 不额外加引号 |
| 复制 JSONPath | 长按节点 | Alert 显示已复制 | 粘贴验证 | quoted key / array index 正确 |
| Markdown 字段 | 字符串像 Markdown | 显示“查看MD” | 打开预览 | Reader 可渲染 |
| 美化模式 | 点击美化 | 显示缩进 JSON | 选择复制美化 | 文本可选择 |
| 压缩模式 | 点击压缩 | 显示单行 JSON | 选择复制压缩 | 文本可选择 |

## 4. JSONPath 规则

| key 类型 | 示例 | JSONPath |
|---|---|---|
| 普通 key | `user` | `$.user` |
| 数组 | `items[0]` | `$.items[0]` |
| 含空格 / 标点 key | `api key` | `$["api key"]` |
| 中文 key | `接口` | `$.接口` |

规则由 `escapeJsonPathKey` 统一生成，禁止 UI 侧手拼路径。

## 5. 大 JSON 策略

V1 当前策略：

- 默认只展开根节点。
- 树形列表使用 FlatList。
- 搜索时才 flatten 全结构。
- 展示 preview，不渲染完整深层对象。

V1.5 / V2 可增强：

- 大 JSON 搜索结果分页。
- 大数组默认折叠为区间。
- 超大文件进入“分块解析 / 仅原文预览”状态。
- 对 prompt/config/api 字段给出 AI 阅读卡片建议。

## 6. 操作设计

| 操作 | 手势 | 反馈 |
|---|---|---|
| 展开 / 折叠容器 | 点击容器节点 | 三角符号切换 |
| 复制字段值 | 点击叶子节点 | 写入剪贴板；后续可补 toast |
| 复制 JSONPath | 长按任意节点 | Alert 显示 path |
| 预览 Markdown | 点击“查看MD” | 打开 Reader modal |
| 复制美化 JSON | 顶栏按钮 | 写入剪贴板 |
| 复制压缩 JSON | 顶栏按钮 | 写入剪贴板 |
| 切换树形 / 美化 / 压缩 | 模式按钮 | 当前模式蓝色高亮 |

## 7. 待实现 / 待验收差距

| 项目 | 当前状态 | 后续任务 |
|---|---|---|
| 搜索无结果空态 | 目前空列表 | D1.13 / S1-JSON 可补文案 |
| 大 JSON 分块 | 目前基础 FlatList | S1-JSON-008 |
| 复制反馈 | 字段值复制无 toast | S1-COPY / D1.5 统一 |
| 敏感字段提醒 | JSON 阅读页未提示 | D1.11 / S7-AI |
| JSON 结构解释 | 未做 | S7-AI-005 |

## 8. D1.3 关闭标准

- 已设计树形、搜索、折叠、复制字段、复制 JSONPath。
- 已设计 pretty/minify 切换。
- 已设计 Markdown 字段预览。
- 已设计大 JSON 状态和后续增强边界。
- 已明确 JSONPath 生成规则和 UI 操作反馈。
