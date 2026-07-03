# D6.3 CLI 命令与 JSON 契约冻结

## 1. 结论

电脑端 CLI 命令和 JSON 输出契约已经有完整设计说明，覆盖：
- `molan convert`
- `molan check`
- `molan pull`
- `molan read`
- `molan push`

详细设计见：
- `docs/design/desktop-cli-command-contract.md`
- `docs/design/desktop-ai-cli-usage.md`
- `docs/design/desktop-batch-conversion-output.md`
- `docs/design/ai-read-entrypoints.md`

## 2. 必须保留字段

所有 AI/Agent 可解析 JSON 输出必须继续保留：

```ts
interface CliJsonContract {
  ok: boolean;
  results: unknown[];
  outputPath?: string;
  errorCode?: string;
  error?: string;
}
```

批量 summary 可扩展：
- `total`
- `success`
- `failed`
- `warnings`

单项结果可扩展：
- `id`
- `title`
- `kind`
- `content`
- `updatedAt`
- `readable`
- `contentHash`
- `nextAction`

不得删除或改名 `ok/results/outputPath/errorCode/error`。

## 3. 命令冻结

```bash
molan check
molan convert <file|glob|dir> --to md --out ./out --json
molan convert <file|glob|dir> --batch --concurrency 4 --json
molan push <file> --title "..." --json
molan pull --json
molan read <id-or-title> --json
```

后续真实云端只能通过向后兼容方式扩展：

```bash
molan pull --source cloud --json
molan read <id> --source cloud --json
molan push <file> --source cloud --json
```

## 4. 错误码

转换错误码：
- `E_PANDOC_MISSING`
- `E_UNSUPPORTED_FORMAT`
- `E_INPUT_NOT_FOUND`
- `E_CONVERT_FAILED`
- `E_OUTPUT_FAILED`

当前云端模拟错误码：
- `E_CLOUD_EMPTY`
- `E_CLOUD_DOCUMENT_NOT_FOUND`
- `E_CLOUD_WRITE_FAILED`

未来真实云端可扩展：
- `E_CLOUD_AUTH_REQUIRED`
- `E_CLOUD_DEVICE_REVOKED`
- `E_CLOUD_DOCUMENT_NOT_READABLE`
- `E_CLOUD_CONFLICT`

## 5. 测试证据

当前已有：
- `desktop/cli/src/cloud.test.ts`：覆盖 `push -> pull -> read` JSON roundtrip。
- `npm run typecheck`：CLI TypeScript 检查。
- `npm run build`：esbuild 产物生成。
- `npm test`：CLI 契约测试。

后续仍需 S2-QA 补充：
- 真实 docx/pdf/pptx/xlsx/csv/md/json fixture。
- 转换 smoke test。
- 并发失败隔离。

## 6. 验收口径

- 五个命令都有参数、输出、错误码说明。
- JSON 必留字段明确。
- 当前本地云收件箱 `push/pull/read` 契约测试通过。
- 真实云端扩展不得破坏当前本地模拟。
- 转换逻辑继续只通过 `desktop/src/shared/converter.ts`。
