# 旧 mobile 基线删除前审计

日期：2026-07-21

对应任务：

- G-008

用途：在真正删除 `mobile/` 之前，先盘点 README、AGENTS、CI、脚本、官网与发布流程里还残留多少旧 Expo / React Native 基线引用。

## 审计范围

- `README.md`
- `AGENTS.md`
- `TODO.md`
- `.github`
- `docs/design`
- `docs/CLAUDE.md`
- `docs/validation-runs/README.md`
- `scripts`
- `site`

## 通过条件

- “必须移除”分组中的命中全部清零；“可保留历史证据”分组不阻塞 G-008；
- 删除 `mobile/` 后，原生 Android / iOS、桌面和 CLI 构建命令仍然通过；
- G-002 ～ G-007 已全部关闭后，再执行真实删除动作。

## 判定规则

- **必须移除**：README、AGENTS、CI、站点和活跃操作文档里的旧 `mobile/` / Expo / React Native 引用；
- **可保留历史证据**：TODO、迁移验收基线、收口脚本中为了保留迁移轨迹而存在的引用。

## 当前命中统计

- 命中文件数：11
- 命中总行数：58
- 必须移除：4 个文件 / 10 行
- 可保留历史证据：7 个文件 / 48 行

当前仍不能关闭 G-008，因为“必须移除”分组还有 10 行命中需要处理。

## 必须移除

- 说明：主流程、活跃文档、CI 和站点中的旧 mobile 基线引用，关闭 G-008 前必须清零。
- 命中文件数：4
- 命中总行数：10

### docs/validation-runs/README.md

- 判定原因：这是当前仍在使用的主流程文档、CI 或站点说明，旧 mobile 基线引用应在删除前清零。
- 第 81 行 [React Native]：`- `node scripts/legacy_mobile_run_sheet.mjs --out default` 会把旧 React Native mobile 删除拆成删除前置、真实删除、删除后验证和最终回写的逐行执行表；`

### scripts/legacy_mobile_run_sheet.mjs

- 判定原因：未命中白名单的引用默认按阻塞项处理，避免遗漏仍在主流程生效的旧依赖说明。
- 第 65 行 [React Native]：`action: '确认 G-002～G-007 已全部关闭，发布产物可获取，回滚方案不依赖旧 React Native 应用。',`
- 第 75 行 [mobile/ / React Native / Expo]：`passRule: '主流程、README、AGENTS、CI、站点和活跃文档不再引用 mobile/、Expo 或 React Native。',`
- 第 92 行 [mobile/]：`action: '删除旧 mobile/ 目录。',`
- 第 93 行 [React Native]：`passRule: '只有 readyToDelete=true 时才执行；删除后工作区不再存在旧 React Native 工程。',`
- 第 110 行 [mobile/ / React Native / Expo / expo start]：`action: '全文搜索 mobile/、Expo、React Native、expo start 等旧移动端关键词。',`
- 第 211 行 [React Native]：`const markdown = `# 旧 React Native mobile 删除逐项执行清单`

### scripts/minimal_external_inputs.mjs

- 判定原因：未命中白名单的引用默认按阻塞项处理，避免遗漏仍在主流程生效的旧依赖说明。
- 第 120 行 [React Native]：`title: '旧 React Native mobile 最终清理窗口',`

### scripts/next_remaining_action.mjs

- 判定原因：未命中白名单的引用默认按阻塞项处理，避免遗漏仍在主流程生效的旧依赖说明。
- 第 211 行 [React Native]：`title: '第 5 波：删除旧 React Native 端',`
- 第 216 行 [mobile/]：`executeCommand: '确认 G-002～G-007 全部改成 [x] 后，再按 legacy-delete-checklist.txt 删除 mobile/ 并重跑构建',`

## 可保留历史证据

- 说明：为了保留迁移轨迹、验收基线或清理计划而保留的历史引用，不计入当前阻塞。
- 命中文件数：7
- 命中总行数：48

### TODO.md

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 144 行 [mobile/]：`- 旧 `mobile/` 不得在Android和iOS均达到替代标准前删除；`
- 第 175 行 [React Native]：`| 19 | G-008 | `[~]` | 最后删除旧 React Native 工程和断链引用 | 原生端已发布且仓库全量构建通过 |`
- 第 183 行 [mobile/ / React Native / Expo]：`| `mobile/` | Expo/React Native，已有Markdown、JSON、编辑、转换、提示词和批量能力 | 只作为行为与验收参考，不继续扩展主功能 |`
- 第 194 行 [mobile/]：`- **前置**：无；只读检查现有 `mobile/` 和真机证据。`
- 第 767 行 [React Native]：`### [~] G-008 `[P1]` 删除旧React Native移动端`
- 第 770 行 [mobile/]：`- **审计**：确认CI、README、AGENTS、脚本、官网和发布流程不再引用`mobile/`。`
- 第 773 行 [React Native]：`- **关闭Gate G**：发布产物可获取，回滚方案不依赖旧React Native应用。`
- 第 774 行 [mobile/ / React Native / Expo]：`- **当前记录（2026-07-21）**：已新增 `scripts/legacy_mobile_retirement_audit.mjs`，并生成 `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-retirement-audit.md/json`。当前审计会自动把旧 `mobile/` / Expo / React Native 引用区分为“必须移除”和“可保留历史证据”两类，便于在真实删除前先清主流程阻塞项；最新一次审计结果已确认“必须移除”分组为 `0 个文件 / 0 行`，说明 README、AGENTS、CI、站点和活跃文档中的旧引用已经清零。该任务现提升为 `[~]`，剩余缺口只在真实删除动作本身，而这一步仍必须等 G-002～G-007 全部关闭后再执行。`
- 第 775 行 [mobile/]：`- **补充记录（2026-07-21）**：已新增 `scripts/prepare_legacy_mobile_wave.mjs`，把 G-008 在真实删除前需要的“旧 mobile 删除前审计 → G-002～G-007 前置状态检查 → 删除后验证提示”压成单一入口，并生成 `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-prep-summary.md/json`。后续真正进入删除阶段时，默认起手命令已经进一步收敛为 `node scripts/prepare_legacy_mobile_wave.mjs --out default`，不再需要手工判断前置任务是否都已关闭。`
- 第 776 行 [React Native]：`- **补充记录（2026-07-21）**：`scripts/legacy_mobile_retirement_audit.mjs` 现已把 `prepare_legacy_mobile_wave.mjs`、`remaining_dependency_matrix.mjs`、`remaining_execution_dashboard.mjs` 等收口脚本中的旧 mobile / React Native 提示归入“可保留历史证据”，不再误记为 must_remove 阻塞项；因此最新一次审计已再次确认 `must_remove = 0 个文件 / 0 行`，而历史引用主要保留在 TODO、验收基线和收口脚本本身。`
- 第 777 行 [mobile/]：`- **补充记录（2026-07-21）**：`scripts/prepare_legacy_mobile_wave.mjs` 现在还会把当前 G-008 删除前状态进一步落成 `docs/validation-runs/2026-07-21/legacy_mobile/evidence/` 下的一批文本种子：`legacy-delete-ready-state.json`、`legacy-delete-blockers.txt`、`legacy-delete-audit-buckets.txt`、`legacy-delete-checklist.txt` 和 `legacy-post-delete-verification.txt`。这样真正进入删除阶段时，不只可以看摘要，还可以直接在这些文件上补删除时间、执行命令、构建结果和全文搜索结果，不必临时再组织删除前后检查项。`
- 第 778 行 [mobile/]：`- **补充记录（2026-07-21）**：已新增 `scripts/legacy_mobile_run_sheet.mjs`，并接入 `scripts/prepare_legacy_mobile_wave.mjs`。G-008 现在会额外生成 `docs/validation-runs/2026-07-21/legacy_mobile/legacy-mobile-run-sheet.md/json`，把发布前置确认、旧 mobile 审计、删除前状态记录、真实删除、只为旧端存在的依赖清理、删除后全文搜索、Android/iOS/desktop/CLI 构建验证和最终 TODO 回写拆成逐行执行项；当前 `readyToDelete=false`，因此真实删除动作仍被 G-002～G-007 前置挡住。`

### docs/design/conversion-recipes.md

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 41 行 [mobile/]：`| Markdown -> PDF | `mobile/src/converter/fileConvert.ts` `exportPdfFile` |`

### docs/design/mobile-reading-acceptance-matrix.md

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 9 行 [mobile/]：`本矩阵冻结旧 `mobile/` 的可观察行为，作为 Android 与 iOS 原生实现的共同验收基线。结论只使用以下三种：`
- 第 15 行 [React Native]：`旧 React Native 代码只提供行为参考，不作为原生端的实现依赖。未被真机证据覆盖的项目明确标为“未解决”，不能据此关闭 B/C 阶段任务。`
- 第 21 行 [mobile/]：`| 外部入口 | Android 从微信、QQ、浏览器或文件管理器通过系统“打开方式”进入正文 | `mobile/app.json`；`mobile/verify-evidence/VERIFY.md`；`verify-md-grant.png`；`verify-json-clean.png` | Android 模拟器已证明 Intent 注册和 `content://` 读取；微信/QQ 真机 UI 未验证 | 沿用 | 每个来源各打开 Markdown、JSON、TXT；记录系统版本、耗时和录屏 |`
- 第 22 行 [mobile/]：`| 外部入口 | iOS 从微信、QQ、Safari、文件 App 打开正文 | `mobile/app.json` 的文档类型声明 | 无 iOS 真机证据，Share Extension 也未形成稳定链路 | 重做 | iPhone 与 iPad 各验证 Document Picker、Open in Place 和分享入口 |`
- 第 23 行 [mobile/]：`| 文件选择 | 用户在应用内选择文件；取消后留在原页面且不报错 | `mobile/src/platform/filePicker.ts`；`mobile/App.tsx` 的 `openFile` | 原生和 Web 都把取消返回为 `null`；Android 模拟器有正文证据 | 沿用 | 选择成功、取消、权限撤销分别验收 |`
- 第 24 行 [mobile/]：`| 临时打开 | 打开文件只进入阅读，不代表收集或上传 | `mobile/App.tsx` 的 `applyLoadedDoc`、`remember`；`mobile/src/storage/recentDocs.ts` | 当前会把全文写入“最近文档”AsyncStorage，实际已形成隐式本地副本，不满足新边界 | 重做 | 临时打开只保存最小元数据与阅读位置；用户点击“收集”后才复制原文件并入库 |`
- 第 25 行 [mobile/]：`| 重复入口 | 同一时刻重复 Intent 不应重复读取或白屏 | `mobile/App.tsx` 的 `loadingRef` | 仅阻止并发读取；进程重建、前后台重复投递未验证 | 重做 | 相同 Intent、相同内容不同 URI、后台再次投递都必须结果可解释 |`
- 第 26 行 [mobile/]：`| Markdown | 标题、段落、列表、引用、链接、图片、表格、代码块可读 | `mobile/src/markdown/renderer.tsx`；`verify-md-grant.png` | 基础结构已实现；HTML 被忽略；图片失败无明确占位；外链无确认 | 沿用 | 用 A-002 普通、损坏、长文样例；验证图片失败占位、外链确认、横向滚动 |`
- 第 27 行 [mobile/]：`| Markdown | 目录跳转、全文搜索、代码复制、字号和主题 | `mobile/src/components/Reader.tsx`；`mobile/src/markdown/toc.ts`；`mobile/src/markdown/search.ts` | 功能存在；搜索结果按块；字体只在会话内；行距不可调 | 沿用 | 中文标题、重复标题、无结果、长代码、最大/最小字号和深色模式 |`
- 第 28 行 [mobile/]：`| JSON | 树形、折叠、搜索、原文美化/压缩、复制值与 JSONPath | `mobile/src/components/JsonView.tsx`；`JsonTree.tsx`；`mobile/src/json/tree.ts` | 基础能力存在；默认 2000 行截断；搜索会先完整扁平化，大文件风险未解决 | 沿用 | 普通、根标量、深层、5MB+、大数组样例；搜索不得造成 ANR/白屏 |`
- 第 29 行 [mobile/]：`| JSON | Markdown 字段预览 | `mobile/src/json/tree.ts` 的 `looksLikeMarkdown`；`JsonTree.tsx` | 通过启发式识别字符串并打开 Reader | 沿用 | 标题、列表、普通字符串、误判字符串各验证一次 |`
- 第 30 行 [mobile/]：`| 非法 JSON | 显示解析错误并保留原文，用户可回到源码修复 | `mobile/src/components/JsonView.tsx`；`EditSheet.tsx` | 有错误文本和原文；错误位置依赖平台 `JSON.parse` 文案，指导性不足 | 重做 | 指出行列或附近片段；编辑修复后可回到树形视图 |`
- 第 34 行 [mobile/]：`| 全文复制 | 一次复制当前原文；空内容与失败有明确反馈 | `mobile/App.tsx` 的 `copyCurrent` | 非空时可复制并记录状态；空内容和异常有错误条 | 沿用 | Markdown、JSON、TXT、空文件、剪贴板失败 |`
- 第 36 行 [mobile/]：`| 轻编辑 | 原文/预览切换；非法 JSON 不能保存；取消不改原文 | `mobile/src/components/EditSheet.tsx` | 能编辑并校验 JSON；草稿为单一全局键且组件直连 AsyncStorage；“保存”只改内存/最近记录 | 重做 | 草稿按文档版本隔离并走 storage 层；保存副本不覆盖外部原文件；取消可恢复 |`
- 第 37 行 [mobile/]：`| 分享 | 生成 `.md/.json` 临时文件并打开系统分享面板 | `mobile/App.tsx` 的 `shareCurrent`；`fileWriter.ts`；`share.ts` | 主链存在；真机微信/QQ 分享未验证；分享取消与成功无法可靠区分 | 沿用 | Android/iOS 真机分享至文件 App、微信或 QQ；取消、无可用目标、空间不足 |`
- 第 38 行 [mobile/]：`| 阅读位置 | 返回同一文档后恢复位置 | `mobile/src/components/Reader.tsx` | 以“长度+前50字符”作键并直连 AsyncStorage；存在碰撞，JSON/TXT未覆盖 | 重做 | 使用稳定文档/版本 ID；三类阅读器、进程重建、内容换版本分别验证 |`
- 第 41 行 [mobile/]：`| 返回与恢复 | 返回先关闭弹层，再回首页；进程重建恢复正确页面和文件 | `mobile/App.tsx` 的 `handleBackPress`；`ErrorBoundary.tsx` | Android 返回层级存在；进程重建只依赖零散存储，没有显式页面状态恢复 | 重做 | Android 返回键、iOS 导航、旋转/内存回收/冷启动均不串文件 |`
- 第 42 行 [mobile/]：`| 失败兜底 | 解析、渲染或存储异常有错误页与恢复动作 | `mobile/src/components/ErrorBoundary.tsx`；顶部错误条 | 有全局边界和部分错误信息；存储失败多被静默忽略 | 重做 | 读取、解析、保存、分享、存储满、低内存分别有用户可见结果和恢复动作 |`
- 第 60 行 [mobile/]：`- `mobile/verify-evidence/VERIFY.md`：Android 36 模拟器环境、Intent Resolver、冷启动和 APK 体积记录；`
- 第 61 行 [mobile/]：`- `mobile/verify-evidence/verify-md-grant.png`：`content://` Markdown 正文；`
- 第 62 行 [mobile/]：`- `mobile/verify-evidence/verify-json-clean.png`：JSON 树形阅读；`
- 第 63 行 [mobile/]：`- `mobile/verify-evidence/verify-home-safearea.png`：Android 模拟器安全区；`
- 第 64 行 [mobile/]：`- `mobile/src/__tests__/toc.test.ts`、`jsonTree.test.ts`、`markdownSearch.test.ts`：目录、JSON 行模型和 Markdown 搜索纯逻辑。`

### scripts/prepare_legacy_mobile_wave.mjs

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 121 行 [mobile/]：`'- 删除 mobile/ 目录',`
- 第 125 行 [mobile/ / React Native / Expo]：`'- 运行全文搜索，确认主流程不再引用 mobile/ / Expo / React Native',`
- 第 142 行 [mobile/ / React Native / expo start]：`'- rg -n "mobile/|React Native|\\bExpo\\b|expo start" README.md AGENTS.md .github docs/CLAUDE.md docs/validation-runs/README.md site scripts',`
- 第 193 行 [React Native]：`title: '旧 React Native mobile 删除逐项执行清单',`
- 第 230 行 [mobile/]：`'删除 mobile/ 及只为其存在的依赖、脚本、CI 和文档引用',`

### scripts/remaining_dependency_matrix.mjs

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 131 行 [React Native]：`'仓库主流程不再依赖旧 React Native 基线',`

### scripts/remaining_execution_dashboard.mjs

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 149 行 [React Native]：`title: '第 5 波：删除旧 React Native 端',`

### scripts/remaining_todo_fast_path.mjs

- 判定原因：这是迁移期的历史记录、验收基线或收口工具，可作为审计证据暂时保留。
- 第 223 行 [React Native]：`title: '第 5 波：删除旧 React Native 端',`
- 第 227 行 [mobile/]：`'删除 mobile/ 及其专属依赖、文档、CI 引用',`
- 第 234 行 [mobile/]：`'仓库全文搜索无对 mobile/ 的残留主流程引用',`
- 第 240 行 [mobile/]：`'删除 mobile/ 及只为其存在的依赖、脚本、CI 和文档引用',`
- 第 244 行 [React Native]：`'全文搜索不再有旧 React Native 主流程残留引用',`


