# 墨览 文档阅读助手

AI 产物阅读器项目，面向收到 `.md` / `.json` 后无法顺畅阅读、编辑和转发的场景。产品源头见 [PRD.md](PRD.md)。

## 项目结构

- `mobile/`：主线产品，Expo + React Native。负责手机端 `.md` / `.json` 阅读、轻量编辑、分享与离线转换。
- `desktop/`：桌面 GUI，Electron + Vite + React。两个 tab：阅读 + 转换。Office↔Markdown 转换使用共享引擎。
- `desktop/cli/`：命令行工具（`molan convert`）。Office/PDF/PPT/Excel → Markdown，供 AI / agent 调用。
- root — 构建脚本与项目配置。

## 产品与发布文档

- [PRD.md](PRD.md)：产品需求文档。
- [TODO.md](TODO.md)：按优先级拆解的任务清单。
- [docs/full-plan.md](docs/full-plan.md)：基于 PRD 的产品、架构、技术栈、实施与验收全量方案。
- [docs/market-research.md](docs/market-research.md)：国内 AI 使用与产品机会调研。
- [docs/distribution.md](docs/distribution.md)：GitHub、官网、国内镜像与安装包发布策略。

## 常用命令

### mobile

```powershell
cd mobile
npm run start
npm run android
npm run ios
npm run web
npm run typecheck
npm run test
```

### desktop GUI

```powershell
cd desktop
npm run dev
npm run typecheck
npm run build
```

### desktop CLI

```powershell
cd desktop/cli
npm run typecheck
npm run build
node dist/index.js check                  # 检查 pandoc 是否可用
node dist/index.js convert <文件> --json  # Office → Markdown
node dist/index.js pull --json            # 查看本地 AI 文件收件箱
node dist/index.js read <id或标题> --json # 读取收件箱文件，供 AI 使用
node dist/index.js push <文件> --json     # 把文件保存到本地 AI 收件箱
node dist/index.js convert --help         # 查看所有选项
```

桌面版使用 `desktop/resources/pandoc.exe` 或打包资源中的 pandoc。下载 pandoc 请运行 `python scripts/download_pandoc.py`。

## CI 验收

GitHub Actions 会运行：

- `mobile`: `npm run typecheck`、`npm run test`
- `desktop`: `npm run typecheck`、`npm run build`
- `desktop/cli`: `npm run typecheck`、`npm run build`、`npm run test`

## 边界

- 不读取或提交 `config.json`，其中含个人凭据。
- 不把 `school_sdk (1).exe`、`analyze_exe.py`、`hello_tool.py` 当作本项目功能。
- `build/`、`dist/`、`logs/`、`.expo/`、`out/`、`release/` 是生成产物，不手工编辑。
