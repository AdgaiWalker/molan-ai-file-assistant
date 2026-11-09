# Hai TDD: 提示词过滤后的选中项

## Target Behavior

提示词列表被搜索过滤后：当前选中项仍可见时保持选择；不可见时选择第一条可见项；无结果时不展示详情。

## RED

- **Test added**: `desktop/src/components/prompt/presentation.test.ts` 中的 `resolveSelectedPrompt` 规格测试
- **Behavior asserted**: 保留可见选中项、隐藏时回退第一项、空列表返回 `null`
- **Command**: `npx vitest run src/components/prompt/presentation.test.ts`
- **Observed failure**: 4 个测试中 1 个失败，错误为 `resolveSelectedPrompt is not a function`
- **Failure is correct because**: 目标选择解析函数尚未实现，其余搜索与分组测试仍通过

## GREEN

- **Minimal implementation**: 新增 `resolveSelectedPrompt`；组件只保存 `selectedId`，从当前过滤结果解析详情项
- **Command**: `npx vitest run src/components/prompt/presentation.test.ts`
- **Observed pass**: 4/4 通过

## REFACTOR

- **Refactor done**: yes
- **Change**: 使用 `mode: 'embedded' | 'floating'` 替代含义混杂的 `compact`；提示词模型与默认数据归入功能目录；复制计时器增加清理；平台快捷键按系统显示
- **Command after refactor**: `npm test && npm run typecheck && npm run build`
- **Observed result**: 7 个测试文件、41/41 测试通过；TypeScript 类型检查通过；Electron production build 通过

## Next Behavior

done

## Electron Acceptance

- 主窗口先选择“代码 Review 清单”再搜索 `prd`，详情自动切换为“PRD 需求拆解模板”。
- 独立快贴窗启动后置顶状态显示为开启。
- 点击独立快贴窗的置顶按钮后状态变为关闭，IPC 控制当前调用窗口。
- 独立快贴窗不再显示无法生效的展开按钮。
