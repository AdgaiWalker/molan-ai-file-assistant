# 旧 React Native mobile 删除逐项执行清单

日期：2026-07-21

用途：把 G-008 的删除前确认、真实删除和删除后验证拆成逐行执行项。当前表不会执行删除；只有 G-002～G-007 全部关闭且审计阻塞为 0 时，才允许执行真实删除动作。

## 汇总

- readyToDelete：否
- 发布前置未关闭：G-002、G-003、G-004、G-005、G-006、G-007
- 必须移除命中：4 个文件 / 10 行
- 执行行数：11
- 当前被门禁挡住的行数：10

## 分组

| 阶段 | 行数 | 当前被挡住 |
| --- | ---: | ---: |
| 删除前置 | 1 | 1 |
| 删除前审计 | 1 | 1 |
| 删除前记录 | 1 | 0 |
| 真实删除 | 2 | 2 |
| 删除后验证 | 4 | 4 |
| 最终回写 | 2 | 2 |

## 执行表

| ID | 阶段 | 当前门禁 | 动作 | 验收点 | 建议证据 |
| --- | --- | --- | --- | --- | --- |
| g008-01-release-precondition | 删除前置 | 禁止删除 | 确认 G-002～G-007 已全部关闭，发布产物可获取，回滚方案不依赖旧 React Native 应用。 | G-002～G-007 全部为 [x]；否则不得执行真实删除动作。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json` |
| g008-02-audit-must-remove-zero | 删除前审计 | 禁止删除 | 运行 legacy_mobile_retirement_audit，确认“必须移除”分组为 0 个文件 / 0 行。 | 主流程、README、AGENTS、CI、站点和活跃文档不再引用 mobile/、Expo 或 React Native。 | `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md` |
| g008-03-backup-current-state | 删除前记录 | 可预先执行 | 记录删除前 git status、legacy 审计摘要和当前 TODO 状态，方便回滚和复盘。 | 删除前状态可追溯；不需要复制 archive 副本。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt` |
| g008-04-delete-mobile-directory | 真实删除 | 禁止删除 | 删除旧 mobile/ 目录。 | 只有 readyToDelete=true 时才执行；删除后工作区不再存在旧 React Native 工程。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt` |
| g008-05-remove-legacy-only-deps | 真实删除 | 禁止删除 | 删除只为旧 mobile 存在的依赖、脚本、CI、文档和 generated 缓存引用。 | 不删除原生 Android/iOS、desktop、CLI、contracts、site 或历史验收记录需要保留的证据。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt` |
| g008-06-post-delete-search | 删除后验证 | 等待删除后执行 | 全文搜索 mobile/、Expo、React Native、expo start 等旧移动端关键词。 | 必须移除范围无命中；TODO、历史证据和本 run sheet 中的保留引用不计阻塞。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt` |
| g008-07-android-build | 删除后验证 | 等待删除后执行 | 运行原生 Android 构建与测试。 | native Android 构建/测试通过，证明删除旧 mobile 未影响当前 Android 主线。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt` |
| g008-08-ios-build | 删除后验证 | 等待删除后执行 | 运行原生 iOS 构建。 | native iOS 构建通过，证明删除旧 mobile 未影响当前 iOS 主线。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt` |
| g008-09-desktop-site-cli-check | 删除后验证 | 等待删除后执行 | 运行 desktop、desktop/cli、site 和 contracts 的关键检查。 | 桌面、CLI、站点和契约检查通过，证明旧 mobile 删除没有断主闭环。 | `docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt` |
| g008-10-final-audit-refresh | 最终回写 | 等待删除后执行 | 重新运行 prepare_legacy_mobile_wave 与 prepare_remaining_external_work，刷新审计、总控和 TODO 证据入口。 | legacy-mobile-retirement-audit 的 must_remove 仍为 0；G-008 有删除后构建与搜索证据。 | `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md` |
| g008-11-close-todo | 最终回写 | 等待删除后执行 | 在证据齐全后把 TODO.md 中 G-008 从 [~] 改为 [x]，并记录删除结果。 | G-008 完成定义全部满足；不夹带未验证的发布项。 | `TODO.md` |

## 每行填写字段

### g008-01-release-precondition

```text
行项：g008-01-release-precondition
任务：G-008
阶段：删除前置
当前门禁：禁止删除

动作：确认 G-002～G-007 已全部关闭，发布产物可获取，回滚方案不依赖旧 React Native 应用。
验收点：G-002～G-007 全部为 [x]；否则不得执行真实删除动作。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-ready-state.json

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-02-audit-must-remove-zero

```text
行项：g008-02-audit-must-remove-zero
任务：G-008
阶段：删除前审计
当前门禁：禁止删除

动作：运行 legacy_mobile_retirement_audit，确认“必须移除”分组为 0 个文件 / 0 行。
验收点：主流程、README、AGENTS、CI、站点和活跃文档不再引用 mobile/、Expo 或 React Native。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-03-backup-current-state

```text
行项：g008-03-backup-current-state
任务：G-008
阶段：删除前记录
当前门禁：可预先执行

动作：记录删除前 git status、legacy 审计摘要和当前 TODO 状态，方便回滚和复盘。
验收点：删除前状态可追溯；不需要复制 archive 副本。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-blockers.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-04-delete-mobile-directory

```text
行项：g008-04-delete-mobile-directory
任务：G-008
阶段：真实删除
当前门禁：禁止删除

动作：删除旧 mobile/ 目录。
验收点：只有 readyToDelete=true 时才执行；删除后工作区不再存在旧 React Native 工程。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-05-remove-legacy-only-deps

```text
行项：g008-05-remove-legacy-only-deps
任务：G-008
阶段：真实删除
当前门禁：禁止删除

动作：删除只为旧 mobile 存在的依赖、脚本、CI、文档和 generated 缓存引用。
验收点：不删除原生 Android/iOS、desktop、CLI、contracts、site 或历史验收记录需要保留的证据。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-delete-checklist.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-06-post-delete-search

```text
行项：g008-06-post-delete-search
任务：G-008
阶段：删除后验证
当前门禁：等待删除后执行

动作：全文搜索 mobile/、Expo、React Native、expo start 等旧移动端关键词。
验收点：必须移除范围无命中；TODO、历史证据和本 run sheet 中的保留引用不计阻塞。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-07-android-build

```text
行项：g008-07-android-build
任务：G-008
阶段：删除后验证
当前门禁：等待删除后执行

动作：运行原生 Android 构建与测试。
验收点：native Android 构建/测试通过，证明删除旧 mobile 未影响当前 Android 主线。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-08-ios-build

```text
行项：g008-08-ios-build
任务：G-008
阶段：删除后验证
当前门禁：等待删除后执行

动作：运行原生 iOS 构建。
验收点：native iOS 构建通过，证明删除旧 mobile 未影响当前 iOS 主线。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-09-desktop-site-cli-check

```text
行项：g008-09-desktop-site-cli-check
任务：G-008
阶段：删除后验证
当前门禁：等待删除后执行

动作：运行 desktop、desktop/cli、site 和 contracts 的关键检查。
验收点：桌面、CLI、站点和契约检查通过，证明旧 mobile 删除没有断主闭环。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/evidence/legacy-post-delete-verification.txt

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-10-final-audit-refresh

```text
行项：g008-10-final-audit-refresh
任务：G-008
阶段：最终回写
当前门禁：等待删除后执行

动作：重新运行 prepare_legacy_mobile_wave 与 prepare_remaining_external_work，刷新审计、总控和 TODO 证据入口。
验收点：legacy-mobile-retirement-audit 的 must_remove 仍为 0；G-008 有删除后构建与搜索证据。
建议证据：docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```

### g008-11-close-todo

```text
行项：g008-11-close-todo
任务：G-008
阶段：最终回写
当前门禁：等待删除后执行

动作：在证据齐全后把 TODO.md 中 G-008 从 [~] 改为 [x]，并记录删除结果。
验收点：G-008 完成定义全部满足；不夹带未验证的发布项。
建议证据：TODO.md

执行人：
执行日期：
命令或动作：
输出摘要：
证据路径：
是否通过：
问题与下一步：
```


