# 贡献说明

感谢参与墨览。本文件说明如何本地运行三端项目、提交前要过哪些检查,以及任务流转规则。

## 项目结构

三个子项目在同一仓库下,互无工作空间共享:

- `mobile/` — React Native (Expo SDK 57) 手机阅读器
- `desktop/` — Electron + Vite + React 桌面阅读与转换 GUI
- `desktop/cli/` — Node CLI (`molan convert`)
- 根目录 — 产品文档(`PRD.md`、`TODO.md`)与早期 Python 原型(`mdconvert.py`,已废弃)

## 本地运行

### 手机端

```bash
cd mobile
npm install
npm run start          # expo start,扫码或按 w 开 web 调试
npm run typecheck      # TS 检查(主要正确性门槛)
npm run test           # vitest 单测
```

> 写 Expo 代码前,先读 `mobile/AGENTS.md` 和对应版本的 Expo 文档(SDK 57)。版本 API 差异多,别凭记忆写。

### 桌面端

```bash
cd desktop
npm install
npm run dev            # electron-vite dev
npm run typecheck      # node + web 两份 tsconfig
npm run build          # 构建验证
npm run build:dist     # 出 NSIS 安装包(会内置 pandoc.exe)
```

### CLI

```bash
cd desktop/cli
npm install
npm run typecheck
npm run build          # esbuild 打包到 dist/index.js
npm run test           # 含 cloud push/pull/read 契约测试
node dist/index.js check                      # 验证 pandoc 可用
node dist/index.js convert <文件> --json      # 单文件转换
```

## 提交前必过

| 端 | 命令 |
|---|---|
| mobile | `npm run typecheck && npm run test` |
| desktop | `npm run typecheck && npm run build` |
| desktop/cli | `npm run typecheck && npm run build && npm run test` |

CI(`.github/workflows/ci.yml`)在每次 push / PR 会自动跑这三组。

## 任务流转规则

任务源是 `TODO.md`。每个任务有 5 种状态:

| 标记 | 含义 |
|---|---|
| `[x]` | 已完成且有代码或文档证据 |
| `[~]` | 已有基础,但还缺验收、边界或体验补齐 |
| `[v]` | 需要真机或真实环境验证 |
| `[ ]` | 待做 |
| `[!]` | 风险项,必须在进入下一阶段前处理 |

**开发时遵守:**

1. **领任务**:从 `TODO.md` 挑 `[ ]` 或 `[~]`,按 §2.2 的优先级顺序。
2. **做之前先核实状态**:代码可能已经实现了但没标。先 grep / 读代码,确认是真"没做"再动手,避免重复劳动。
3. **做完立刻改状态**:把 `[ ]` / `[~]` 改成 `[x]`,并在该行补证据(文件路径 + typecheck/test 结果)。证据要求见 TODO §17。
4. **遇到 `[v]`**:纯代码改动不需要真机;只有"真机/真机交互"相关项才保留 `[v]`,等真机验收再改 `[x]`。
5. **新增功能要对应任务**:如果做了 TODO 里没有的功能,先回 PRD / TODO 确认它该不该做(多数情况是"不该做",见 TODO §16 不做清单),再决定是否新增任务条目。

## 禁止事项

- 不要提交 `config.json`(含明文凭证,见 `.gitignore`)。
- 不要把 `desktop/resources/pandoc.exe` 提交进 git(体积大,通过脚本下载)。
- 不要为不存在的"历史包袱"写兼容代码(AGENTS.md §0.5)。
- 不要复用 `desktop/src/shared/` 的代码到 mobile(mobile 走纯 JS 离线转换)。
