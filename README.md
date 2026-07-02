# 墨览 文档阅读助手

AI 产物阅读器项目，面向收到 `.md` / `.json` 后无法顺畅阅读、编辑和转发的场景。产品源头见 [PRD.md](PRD.md)。

## 项目结构

- `mobile/`：主线产品，Expo + React Native。负责手机端 `.md` / `.json` 阅读、轻量编辑、分享与离线转换。
- `desktop/`：辅助产品，Electron + Vite + React。负责高质量 `md <-> word` 转换、桌面阅读和 AI CLI 调用。
- `mdconvert.py`：早期 Python 原型，验证 pandoc 转换与拖拽命令行流程。保留为 legacy prototype，不再作为主产品承载新功能。

## 产品与发布文档

- [PRD.md](PRD.md)：产品需求文档。
- [TODO.md](TODO.md)：按优先级拆解的任务清单。
- [MARKET_RESEARCH.md](MARKET_RESEARCH.md)：国内 AI 使用与产品机会调研。
- [DISTRIBUTION.md](DISTRIBUTION.md)：GitHub、官网、国内镜像与安装包发布策略。

## 常用命令

### mobile

```powershell
cd mobile
npm run start
npm run android
npm run ios
npm run web
```

### desktop

```powershell
cd desktop
npm run dev
npm run typecheck
npm run build
```

### root prototype

```powershell
python mdconvert.py <file...>
pyinstaller mdconvert.spec
```

根原型依赖 `pypandoc` 和系统 PATH 中可用的 pandoc。桌面正式版使用 `desktop/resources/pandoc.exe` 或打包资源中的 pandoc。

## 边界

- 不读取或提交 `config.json`，其中含个人凭据。
- 不把 `school_sdk (1).exe`、`analyze_exe.py`、`hello_tool.py` 当作本项目功能。
- `build/`、`dist/`、`logs/`、`.expo/`、`out/`、`release/` 是生成产物，不手工编辑。
