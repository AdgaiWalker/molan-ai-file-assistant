# Gate E 外部批次（E-007） 验收记录

> 批次ID：gate_e_ai_read
> 状态：已执行

日期：2026-07-21

任务：

- E-007

## 固定样例

| 文件 | 大小 | SHA256 |
|---|---:|---|
| `desktop/cli/test-fixtures/sample.docx` | 36796 B | `032df5f6f1c5e33f945c3824d68ea1c1f30259fd0da280d95d69267d31e61570` |
| `desktop/cli/test-fixtures/sample.pdf` | 1722 B | `84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9` |

## 本地证据目录

- `desktop/verify-evidence`（5 entries）

## 默认落盘位置

- 报告：`docs/validation-runs/2026-07-21/gate_e_ai_read/gate-e-ai-read-report.md`
- 证据目录：`docs/validation-runs/2026-07-21/gate_e_ai_read/evidence`

## 建议证据文件名

- `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-authorize-before.png`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/desktop-authorize-after.png`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-success.mp4`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/ai-client-read-revoked.mp4`
- `docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/cli-or-mcp-log.txt`

## 建议执行步骤

1. 手机收集 docx / pdf 原件并同步到桌面真实收件箱。
2. 桌面生成 Markdown 派生副本，记录来源版本与派生对象 hash。
3. 先验证未授权读取失败，再授权 AI 读取，通过真实 AI 客户端走 CLI 或 MCP 读取正文。
4. 撤回授权后立即再次读取，确认被拒绝并保留日志或录屏。

## 必留证据

- 原件 hash 与派生 Markdown hash
- 授权前拒绝 / 授权后可读 / 撤回后拒绝
- 真实 AI 客户端名称与入口（CLI 或 MCP）
- 日志或完整录屏路径



## 填写模板

```text
任务ID：E-007
真实 AI 客户端：Codex CLI 0.144.6
CLI / MCP 入口：molan MCP stdio（read_document / get_document_versions）
来源文件 / hash：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/real-client-trial/sample.pdf / 84462926bf2d64b85061466c28e4b73ba52278747bbc36040b54e44e251675d9
派生 Markdown / hash：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/real-client-trial/sample.ai.md / aff5e6e676ae72b77905b9b2d6088f7ddaa560512a9c00899aa420e5ec4f1a20
授权前拒绝证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/codex-mcp-auth-read-revoke.txt
授权后读取证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/codex-mcp-auth-read-revoke.txt
撤回后拒绝证据：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/codex-mcp-auth-read-revoke.txt
日志或录屏路径：docs/validation-runs/2026-07-21/gate_e_ai_read/evidence/codex-mcp-auth-read-revoke.txt
是否通过：通过
```
