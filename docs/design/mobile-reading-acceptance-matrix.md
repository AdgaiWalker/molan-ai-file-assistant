# 移动端阅读行为验收矩阵

版本：v1  
日期：2026-07-16  
对应任务：`TODO.md` A-001

## 1. 使用方式

本矩阵冻结旧 `mobile/` 的可观察行为，作为 Android 与 iOS 原生实现的共同验收基线。结论只使用以下三种：

- **沿用**：用户行为和结果保持一致，原生端重新实现；
- **重做**：旧实现或证据不满足新契约，按 `PRD.md` 重新设计；
- **删除**：不进入原生产品。

旧 React Native 代码只提供行为参考，不作为原生端的实现依赖。未被真机证据覆盖的项目明确标为“未解决”，不能据此关闭 B/C 阶段任务。

## 2. 行为矩阵

| 范围 | 场景与期望 | 当前代码或证据 | 当前事实 | 迁移结论 | 原生验收动作 |
|---|---|---|---|---|---|
| 外部入口 | Android 从微信、QQ、浏览器或文件管理器通过系统“打开方式”进入正文 | `mobile/app.json`；`mobile/verify-evidence/VERIFY.md`；`verify-md-grant.png`；`verify-json-clean.png` | Android 模拟器已证明 Intent 注册和 `content://` 读取；微信/QQ 真机 UI 未验证 | 沿用 | 每个来源各打开 Markdown、JSON、TXT；记录系统版本、耗时和录屏 |
| 外部入口 | iOS 从微信、QQ、Safari、文件 App 打开正文 | `mobile/app.json` 的文档类型声明 | 无 iOS 真机证据，Share Extension 也未形成稳定链路 | 重做 | iPhone 与 iPad 各验证 Document Picker、Open in Place 和分享入口 |
| 文件选择 | 用户在应用内选择文件；取消后留在原页面且不报错 | `mobile/src/platform/filePicker.ts`；`mobile/App.tsx` 的 `openFile` | 原生和 Web 都把取消返回为 `null`；Android 模拟器有正文证据 | 沿用 | 选择成功、取消、权限撤销分别验收 |
| 临时打开 | 打开文件只进入阅读，不代表收集或上传 | `mobile/App.tsx` 的 `applyLoadedDoc`、`remember`；`mobile/src/storage/recentDocs.ts` | 当前会把全文写入“最近文档”AsyncStorage，实际已形成隐式本地副本，不满足新边界 | 重做 | 临时打开只保存最小元数据与阅读位置；用户点击“收集”后才复制原文件并入库 |
| 重复入口 | 同一时刻重复 Intent 不应重复读取或白屏 | `mobile/App.tsx` 的 `loadingRef` | 仅阻止并发读取；进程重建、前后台重复投递未验证 | 重做 | 相同 Intent、相同内容不同 URI、后台再次投递都必须结果可解释 |
| Markdown | 标题、段落、列表、引用、链接、图片、表格、代码块可读 | `mobile/src/markdown/renderer.tsx`；`verify-md-grant.png` | 基础结构已实现；HTML 被忽略；图片失败无明确占位；外链无确认 | 沿用 | 用 A-002 普通、损坏、长文样例；验证图片失败占位、外链确认、横向滚动 |
| Markdown | 目录跳转、全文搜索、代码复制、字号和主题 | `mobile/src/components/Reader.tsx`；`mobile/src/markdown/toc.ts`；`mobile/src/markdown/search.ts` | 功能存在；搜索结果按块；字体只在会话内；行距不可调 | 沿用 | 中文标题、重复标题、无结果、长代码、最大/最小字号和深色模式 |
| JSON | 树形、折叠、搜索、原文美化/压缩、复制值与 JSONPath | `mobile/src/components/JsonView.tsx`；`JsonTree.tsx`；`mobile/src/json/tree.ts` | 基础能力存在；默认 2000 行截断；搜索会先完整扁平化，大文件风险未解决 | 沿用 | 普通、根标量、深层、5MB+、大数组样例；搜索不得造成 ANR/白屏 |
| JSON | Markdown 字段预览 | `mobile/src/json/tree.ts` 的 `looksLikeMarkdown`；`JsonTree.tsx` | 通过启发式识别字符串并打开 Reader | 沿用 | 标题、列表、普通字符串、误判字符串各验证一次 |
| 非法 JSON | 显示解析错误并保留原文，用户可回到源码修复 | `mobile/src/components/JsonView.tsx`；`EditSheet.tsx` | 有错误文本和原文；错误位置依赖平台 `JSON.parse` 文案，指导性不足 | 重做 | 指出行列或附近片段；编辑修复后可回到树形视图 |
| TXT | UTF-8、GBK、BOM 和未知可解码文本进入纯文本阅读器 | `getDocKind` 默认返回 `markdown`；`File.text()` | 没有 TXT 类型、编码探测或二进制拒绝，GBK 会失败或乱码 | 重做 | A-002 的 UTF-8、GBK、无扩展名、伪装二进制全部有确定结果 |
| 空文件 | 明确显示“文件为空”，仍可返回或编辑 | `applyLoadedDoc`；`Reader.tsx` | 空内容进入空白 Reader，没有空态说明 | 重做 | Markdown、JSON、TXT 空文件分别显示可理解结果，不白屏 |
| 搜索 | Markdown、JSON、TXT 搜索有结果数、无结果态和跳转 | `Reader.tsx`；`JsonView.tsx` | Markdown/JSON 有无结果表现；TXT 不存在；JSON 搜索未限制成本 | 重做 | 三类阅读器统一交互语义，大文件使用索引、分块或取消机制 |
| 全文复制 | 一次复制当前原文；空内容与失败有明确反馈 | `mobile/App.tsx` 的 `copyCurrent` | 非空时可复制并记录状态；空内容和异常有错误条 | 沿用 | Markdown、JSON、TXT、空文件、剪贴板失败 |
| 选择复制 | 用户可选择并复制正文局部 | `Text selectable`；JSON 行点击复制值 | Markdown 文本依赖系统选择；JSON 支持值/对象/数组与长按路径；复制失败未处理 | 沿用 | 长按选择、跨段选择、对象/数组/路径、系统拒绝剪贴板 |
| 轻编辑 | 原文/预览切换；非法 JSON 不能保存；取消不改原文 | `mobile/src/components/EditSheet.tsx` | 能编辑并校验 JSON；草稿为单一全局键且组件直连 AsyncStorage；“保存”只改内存/最近记录 | 重做 | 草稿按文档版本隔离并走 storage 层；保存副本不覆盖外部原文件；取消可恢复 |
| 分享 | 生成 `.md/.json` 临时文件并打开系统分享面板 | `mobile/App.tsx` 的 `shareCurrent`；`fileWriter.ts`；`share.ts` | 主链存在；真机微信/QQ 分享未验证；分享取消与成功无法可靠区分 | 沿用 | Android/iOS 真机分享至文件 App、微信或 QQ；取消、无可用目标、空间不足 |
| 阅读位置 | 返回同一文档后恢复位置 | `mobile/src/components/Reader.tsx` | 以“长度+前50字符”作键并直连 AsyncStorage；存在碰撞，JSON/TXT未覆盖 | 重做 | 使用稳定文档/版本 ID；三类阅读器、进程重建、内容换版本分别验证 |
| 权限失效 | 明确提示重新选择或先保存到本地 | `friendlyOpenError`；`readUriText` | 已区分权限与不存在；错误文案仍限定 Markdown/JSON；`content://` 会临时复制到 cache 后清理 | 沿用 | URI grant 过期、一次性流、读取中撤权；错误动作必须可恢复 |
| 来源删除 | 来源文件已移动或删除时不崩溃、不显示旧文件为当前文件 | `friendlyOpenError`；最近文档缓存 | 外部再次读取有明确错误；最近记录因保存全文仍能打开，边界与新模型不一致 | 重做 | 临时记录报“来源不存在”；已收集版本仍可离线打开 |
| 返回与恢复 | 返回先关闭弹层，再回首页；进程重建恢复正确页面和文件 | `mobile/App.tsx` 的 `handleBackPress`；`ErrorBoundary.tsx` | Android 返回层级存在；进程重建只依赖零散存储，没有显式页面状态恢复 | 重做 | Android 返回键、iOS 导航、旋转/内存回收/冷启动均不串文件 |
| 失败兜底 | 解析、渲染或存储异常有错误页与恢复动作 | `mobile/src/components/ErrorBoundary.tsx`；顶部错误条 | 有全局边界和部分错误信息；存储失败多被静默忽略 | 重做 | 读取、解析、保存、分享、存储满、低内存分别有用户可见结果和恢复动作 |
| 旧扩展功能 | 移动端 Office 转换、批量转换、提示词库、AI 洞察 | `ConvertSheet.tsx`、`BatchConvertSheet.tsx`、`PromptSheet.tsx`、`AiInsightSheet.tsx` | 不属于 Gate B/C 的原生阅读主线，且手机端不应承载重型 Office 转换 | 删除 | 原生替代阶段不迁移；后续仅按 P3 真实需求重新立项 |

## 3. 失败路径清单

| 失败路径 | 当前结果 | 未解决问题 | 对应后续任务 |
|---|---|---|---|
| 空文件 | 空白阅读页 | 缺少空态与可恢复动作 | B/C-003、B/C-005 |
| 非法 JSON | 错误文字 + 原文 | 缺少稳定的行列定位；大文件错误成本未验证 | B/C-005、B/C-006 |
| 权限失效 | 提示保存本地或重新选择 | iOS、一次性流、重启后 grant 未验证 | B/C-002、B/C-009 |
| 来源删除 | 外部 URI 报不存在 | 临时记录与已收集版本边界不清 | B/C-002、B/C-007 |
| 重复打开 | 并发时直接忽略第二次 | 相同内容去重、后台重复 Intent、冲突语义未定义 | A-003、A-004、B/C-002 |
| 返回后恢复 | Markdown 保存滚动偏移；最近文档保存全文 | 键碰撞、JSON/TXT、进程重建和版本变化未覆盖 | B/C-003、B/C-008 |

## 4. 已有证据与缺口

已有可复查证据：

- `mobile/verify-evidence/VERIFY.md`：Android 36 模拟器环境、Intent Resolver、冷启动和 APK 体积记录；
- `mobile/verify-evidence/verify-md-grant.png`：`content://` Markdown 正文；
- `mobile/verify-evidence/verify-json-clean.png`：JSON 树形阅读；
- `mobile/verify-evidence/verify-home-safearea.png`：Android 模拟器安全区；
- `mobile/src/__tests__/toc.test.ts`、`jsonTree.test.ts`、`markdownSearch.test.ts`：目录、JSON 行模型和 Markdown 搜索纯逻辑。

仍未解决：

1. 没有 iOS 真机入口与阅读证据；
2. 没有 Android 微信/QQ 真机打开与分享闭环；
3. 没有 TXT、GBK、空文件、5MB+ JSON 和伪装二进制的统一验收；
4. 没有进程重建、低内存、权限重启失效的系统验收；
5. 旧实现把临时打开内容写入最近记录，不符合“打开不等于收集”的新契约。

这些缺口由 `fixtures/mobile-reading/` 的同一批样例进入 B/C 阶段验收，不以旧实现的局部通过替代原生真机验证。
