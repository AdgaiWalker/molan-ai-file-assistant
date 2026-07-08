# D2.3 批量转换输出结构设计

## 1. 定位

批量转换输出同时服务三类消费者：

- CLI / AI / Agent：解析 JSON，知道哪些文件成功、失败、下一步该读哪个文件。
- 桌面 GUI：展示队列、进度、失败重试、打开输出目录。
- 发布验收：记录真实 fixture 的输入、输出、hash、错误和可读性。

现有契约保留 `ok`、`total`、`success`、`failed`、`results`，新增字段只能向后扩展。

## 2. 顶层结构

```ts
interface BatchConvertSummary {
  schemaVersion: 1;
  ok: boolean;
  total: number;
  success: number;
  failed: number;
  skipped?: number;
  outputDir: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: BatchConvertResult[];
  warnings: string[];
  aiNextActions?: AiNextAction[];
}
```

兼容说明：

- `schemaVersion/outputDir/startedAt/finishedAt/durationMs/warnings/aiNextActions` 是扩展字段。
- 旧消费者只读 `ok/total/success/failed/results` 仍可工作。
- 当 `failed > 0` 时，顶层 `ok=false`，退出码为 `1`。

## 3. 单项结果

```ts
interface BatchConvertResult {
  inputPath: string;
  fileName: string;
  ok: boolean;
  outputPath?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];

  inputFormat?: string;
  outputFormat?: string;
  inputSize?: number;
  outputSize?: number;
  inputSha256?: string;
  outputSha256?: string;
  durationMs?: number;
  readabilityScore?: ReadabilityScore;
  aiNextActions?: AiNextAction[];
}
```

必须保留：

- `inputPath`
- `fileName`
- `ok`
- `outputPath`
- `errorCode`
- `error`
- `warnings`

扩展字段全部可选。

## 4. 成功/失败列表

GUI 可以从 `results` 派生列表，也可以后续追加顶层分组：

```ts
interface BatchConvertGroupedResult {
  successResults?: BatchConvertResult[];
  failedResults?: BatchConvertResult[];
}
```

规则：

- CLI 输出不必重复分组，避免 JSON 体积过大。
- GUI 可在渲染层按 `ok` 分组。
- 如果未来输出分组字段，不得移除 `results`。

## 5. Hash

hash 用于验收、去重、云端同步和幂等。

| 字段 | 算法 | 生成时机 |
|---|---|---|
| `inputSha256` | SHA-256 | 转换前读取输入文件 |
| `outputSha256` | SHA-256 | 转换成功后读取输出文件 |
| `inputSize` | byte | 转换前 stat |
| `outputSize` | byte | 转换成功后 stat |

失败项：

- 输入存在但转换失败：保留 `inputSha256/inputSize`。
- 输入不存在：不生成 hash。
- 输出失败：可能无 `outputSha256/outputSize`。

## 6. 可读性评分

可读性评分是规则评分，不是 AI 语义评价。V1.5/S7 可实现，D2 先冻结结构。

```ts
interface ReadabilityScore {
  score: number; // 0-100
  level: 'good' | 'fair' | 'poor';
  reasons: string[];
}
```

评分规则建议：

| 信号 | 加/减分 |
|---|---|
| 有标题层级 | 加分 |
| 有段落和列表 | 加分 |
| 表格转为 GFM | 加分 |
| 输出为空或极短 | 大幅减分 |
| 出现大量乱码 | 减分 |
| PDF 页眉页脚重复 | 减分 |
| 图片/表格丢失 warning | 减分 |

评分只影响建议，不影响 `ok`。一个转换可以 `ok=true` 但 `readabilityScore.level='poor'`。

## 7. AI 下一步建议

```ts
interface AiNextAction {
  id: string;
  label: string;
  command?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}
```

建议类型：

| 场景 | 建议 |
|---|---|
| 全部成功 | 读取输出 Markdown，开始摘要/提取/改写 |
| 部分失败 | 先处理成功项，再查看失败项错误 |
| PDF 质量差 | 请求用户提供 Word/Excel 原件，或人工确认 PDF 是否扫描件 |
| Excel 大表 | 让 AI 按 sheet/表格分段读取 |
| 输出含图片 warning | 提醒图片未进入 AI 上下文 |
| 输出为空 | 建议检查输入文件是否加密或扫描件 |

示例：

```json
{
  "id": "read-success-markdown",
  "label": "读取成功的 Markdown",
  "command": "molan read <id> --json",
  "reason": "转换已生成 Markdown，可交给 AI 总结或提取。",
  "priority": "high"
}
```

注意：`command` 不能假设文件已经 push 到收件箱；如果只是本地输出，应推荐读取 `outputPath`。

## 8. 输出示例

```json
{
  "schemaVersion": 1,
  "ok": false,
  "total": 2,
  "success": 1,
  "failed": 1,
  "outputDir": "D:/molan/out",
  "startedAt": "2026-07-04T00:00:00.000Z",
  "finishedAt": "2026-07-04T00:00:03.500Z",
  "durationMs": 3500,
  "warnings": [],
  "results": [
    {
      "inputPath": "D:/docs/a.docx",
      "fileName": "a.docx",
      "ok": true,
      "outputPath": "D:/molan/out/a.md",
      "warnings": [],
      "inputFormat": "docx",
      "outputFormat": "md",
      "inputSize": 12000,
      "outputSize": 4300,
      "inputSha256": "...",
      "outputSha256": "...",
      "durationMs": 1200,
      "readabilityScore": {
        "score": 86,
        "level": "good",
        "reasons": ["保留标题层级", "表格已转为 Markdown"]
      }
    },
    {
      "inputPath": "D:/docs/b.pdf",
      "fileName": "b.pdf",
      "ok": false,
      "outputPath": "D:/molan/out/b.md",
      "errorCode": "E_CONVERT_FAILED",
      "error": "pandoc 退出码 1",
      "warnings": ["可能是扫描件 PDF"]
    }
  ],
  "aiNextActions": [
    {
      "id": "inspect-failed",
      "label": "查看失败项",
      "reason": "存在 1 个文件转换失败，需确认是否为扫描件或加密文件。",
      "priority": "high"
    }
  ]
}
```

## 9. GUI 显示映射

| 数据 | GUI 展示 |
|---|---|
| `total/success/failed` | 队列顶部统计 |
| `results[].ok` | 成功/失败状态徽标 |
| `outputPath` | 打开文件 / 打开所在目录 |
| `errorCode/error` | 错误详情和重试 |
| `warnings` | 警告图标和展开说明 |
| `readabilityScore` | AI 可读性标签 |
| `aiNextActions` | “下一步”建议按钮 |

失败重试：

- 重试只重跑失败项。
- 成功项保持不变。
- 新结果用同一 `inputPath` 覆盖旧失败项。

## 10. 验收口径

- 当前 CLI summary 继续保留 `ok/total/success/failed/results`。
- 批量中单项失败不阻止其他项完成。
- 新增 hash、评分、AI 建议时必须新增契约测试。
- GUI 可仅从 `results` 派生成功/失败列表，不依赖重复分组字段。
