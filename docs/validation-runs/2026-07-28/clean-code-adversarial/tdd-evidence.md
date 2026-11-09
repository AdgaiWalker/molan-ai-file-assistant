# TDD Evidence: 提示词展示逻辑

## Target Behavior

- 提示词搜索覆盖标题、正文、分组和标签，并忽略大小写。
- 空白查询直接返回原始列表。
- 分组保持首次出现的分组顺序与组内顺序。

## RED

先新增 `desktop/src/components/prompt/presentation.test.ts`，引用尚不存在的展示逻辑模块。

执行：

```text
npx vitest run src/components/prompt/presentation.test.ts
```

结果：测试套件因 `Failed to load url ./presentation` 失败，证明失败来自目标实现尚不存在。

## GREEN

新增 `presentation.ts`，只实现测试要求的 `filterPrompts` 与 `groupPrompts`，未引入额外状态或抽象。

结果：3/3 测试通过。

## Refactor

- `PromptPanel` 改为调用纯函数，不再内联搜索和分组规则。
- 默认提示词移动到 `constants/defaultPrompts.ts`，`strings.ts` 仅保留界面文案。
- `1200` 提取为 `COPY_FEEDBACK_DURATION_MS`。

## Final Verification

- 目标测试：3/3 通过。
- 桌面非网络测试：32/32 通过。
- TypeScript 类型检查：通过。
- Electron production build：通过。
