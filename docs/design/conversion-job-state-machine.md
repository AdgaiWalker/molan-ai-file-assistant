# D4.4 转换任务状态机设计

## 1. 统一枚举

跨手机、桌面 GUI、CLI、云端的转换任务状态固定为：

```ts
type ConversionJobStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'shared'
  | 'saved';
```

说明：

| 状态 | 含义 |
|---|---|
| `pending` | 已进入队列，尚未开始 |
| `running` | 正在转换 |
| `success` | 已生成输出文件或输出内容 |
| `failed` | 转换失败，有错误码或错误消息 |
| `cancelled` | 用户取消或队列停止 |
| `shared` | 转换结果已分享 |
| `saved` | 转换结果已保存为文档/资料库条目 |

桌面现有 `ConvertTask.status='converting'` 后续迁移时映射到 `running`。

## 2. 状态转移

```text
pending -> running -> success -> shared
                         \-> saved
running -> failed
running -> cancelled
pending -> cancelled
failed -> pending
success -> saved -> shared
success -> shared -> saved
```

规则：
- `failed -> pending` 表示重试，必须生成新的尝试次数或重试时间。
- `shared` 和 `saved` 是成功后的追加状态，不表示文件内容改变。
- 批量转换中单个任务失败不影响其他任务继续。
- 用户取消正在运行任务时，如果底层转换不可中断，也要停止后续状态更新。

## 3. 任务模型

```ts
interface ConversionJob {
  id: string;
  inputDocumentId?: string;
  inputPath?: string;
  inputName: string;
  inputKind: 'markdown' | 'json' | 'office_source' | 'converted';
  outputFormat: 'md' | 'json' | 'pdf' | 'docx';
  status: ConversionJobStatus;
  attempt: number;
  outputPath?: string;
  outputDocumentId?: string;
  errorCode?: string;
  error?: string;
  warnings: string[];
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  sharedAt?: number;
  savedAt?: number;
}
```

## 4. 跨端映射

| 端 | 当前/目标 | 映射 |
|---|---|---|
| 手机当前文件转换 | 目标 `ConversionJob` | `running/success/failed/shared/saved` |
| 手机批量转换中心 | 目标 `ConversionJob[]` | 每个文件独立状态 |
| 桌面 GUI | 现有 `ConvertTask` | `converting -> running`，其余保留 |
| CLI | `ConvertResult` | `ok=true -> success`，`ok=false -> failed` |
| 云端 | `conversion_jobs` | 直接使用统一状态 |

CLI JSON 契约不因本地任务状态扩展而改变，仍保留 `ok/results/outputPath/errorCode/error`。

## 5. 错误码

转换错误码沿用共享转换引擎：
- `E_PANDOC_MISSING`
- `E_UNSUPPORTED_FORMAT`
- `E_INPUT_NOT_FOUND`
- `E_CONVERT_FAILED`
- `E_OUTPUT_FAILED`

移动端轻转换可新增移动端错误码，但必须在 `errorCode` 字段表达，不把错误只放进用户文案。

## 6. 批量转换

批量规则：
- 批量队列是多个独立 `ConversionJob`。
- 每个任务独立成功/失败。
- 批次 summary 聚合 `total/success/failed/cancelled`。
- 失败任务可单独重试。
- 批量分享只分享 `success` 且存在输出的任务。

## 7. 测试判定

转换任务状态机属于 TODO §20.2 状态机范围。实现代码落地时需要测试：
- `pending -> running -> success`。
- `running -> failed` 且保留错误码。
- `failed -> pending` 重试。
- 批量失败隔离。
- `success -> shared/saved` 不清空输出路径。

本设计任务只冻结状态机；当前未改实现代码，因此不新增测试。

## 8. 验收口径

- 所有端统一使用 `pending/running/success/failed/cancelled/shared/saved`。
- 桌面现有 `converting` 有明确迁移映射，不作为公共状态继续扩散。
- 批量转换失败隔离，单个失败不拖垮整批。
- 转换结果分享、保存可被追踪。
- CLI JSON 对外契约保持稳定。
