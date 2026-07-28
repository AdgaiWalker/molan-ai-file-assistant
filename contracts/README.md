# 墨览跨端核心契约

`contracts/v1/` 是 Android、iOS、桌面、CLI 和未来后端的唯一机器可读数据来源。平台代码可以从 JSON Schema 生成类型或显式映射，但不能另建同义模型。

## 固定规则

- 当前契约版本：`1.0.0`；不提供旧版本兼容分支，破坏性修改必须新建版本目录；
- ID：`<实体前缀>_<UUIDv7>`，UUID 时间部分使用 UTC Unix 毫秒；
- 时间：UTC、RFC 3339、固定毫秒精度，例如 `2026-07-16T01:02:03.004Z`；
- 哈希：原始文件字节的 SHA-256，格式为 `sha256:<64位小写十六进制>`；
- 大小：原始字节数，单位为 byte，非负安全整数；
- 删除：保留实体和 `deletedAt` 墓碑，不复用 ID；
- 原文件、AI 可读副本、AI 结果分别使用不同 `FileObject`，角色不可变，不能互相覆盖；
- 同一 `Document` 下相同内容哈希的重复导入返回已有版本，不创建新版本；不同 `Document` 可以引用相同内容哈希，但仍保留各自版本关系；
- 新版本的 `parentVersionId` 指向导入时的当前版本；根版本为 `null`。
- 生命周期只使用 `lifecycle-rules.json` 中的单一枚举状态，不用布尔组合表达；失败、取消、冲突和删除都携带恢复信息或 tombstone；
- 同一个 `clientMutationId` 只能对应同一载荷；基版本不一致时保留双方版本，不静默覆盖。
- 格式能力只在 `format-handlers.json` 注册；探测按强签名、扩展名、兼容 MIME、内容、纯文本兜底执行；业务入口不分支判断格式。
- 同步 HTTP 接口只在 `sync-api.openapi.json` 定义；账号、设备、文件上传下载、增量事件、删除恢复和冲突不能另建同义传输模型。

## 对象关系

```text
Document.currentVersionId ──────────────┐
                                       ↓
DocumentVersion ── fileObjectId ── FileObject(role=original)
       │
       ├── DerivedArtifact ─────── FileObject(role=derived_artifact)
       │
       └── AiResult ────────────── FileObject(role=ai_result)
```

`objectStorageRef` 在本地阶段允许为 `null`；只有用户明确收集并启用同步后才设置远端对象引用。`localRef` 与 `objectStorageRef` 至少存在一个。

## AI 结果回流包

`contracts/v1/ai-result-envelope.schema.json` 定义 CLI/MCP 写回时使用的统一结果包，覆盖摘要、报告、结构化 JSON、新文档和修订版本五类结果。固定规则：

- `schemaVersion` 固定为 `1.0.0`；
- `format=json` 时正文必须可被 `JSON.parse`；
- `saveMode=new_version` 时必须同时携带 `sourceDocumentId` 与 `sourceVersionId`；
- `resultType=revision` 只能保存为 `new_version`；
- `resultType=new_document` 不能伪装成 `new_version`。

## 验证

```bash
cd contracts
npm test
npm run check
```

测试无第三方运行时依赖，也可直接执行：

```bash
node --test contracts/test/*.test.mjs
node contracts/src/check.mjs
```

`src/core.mjs` 是契约参考逻辑，不是移动端运行时共享层；A-006 决定使用 KMP 或 Schema 生成类型后，各平台仍须通过同一组契约向量。
