# 第三方组件许可说明

墨览本体采用 MIT 许可(见 `LICENSE`)。本文件列出随发布分发或运行时调用的第三方组件及其许可,以便用户和分发渠道核实。

## 随包分发的二进制

| 组件 | 用途 | 许可 | 分发方式 |
|---|---|---|---|
| **pandoc** | Office / PDF / PPT / Excel → Markdown 转换(桌面 GUI + CLI) | GPL-2.0-or-later | Windows 安装包内置 `pandoc.exe` |

> pandoc 采用 GPL-2.0-or-later。墨览**调用** pandoc 作为外部进程,不修改其源码,不静态/动态链接。分发渠道如对 GPL 有顾虑,可改为用户自备 pandoc(CLI `molan check` 会探测系统 PATH)。

## 主要依赖(开发期,不分发二进制)

| 组件 | 许可 | 用途 |
|---|---|---|
| React / React Native | MIT | 手机端 UI |
| Expo SDK | MIT | 手机端运行时 |
| Electron | MIT | 桌面 GUI 壳 |
| marked | MIT | Markdown 解析(手机 + 桌面) |
| mammoth | BSD-2-Clause | docx → Markdown(手机离线转换) |
| docx | MIT | Markdown → docx(手机离线转换) |
| Commander | MIT | CLI 命令解析 |
| marked | MIT | Markdown → HTML |

> 完整依赖树以各子项目 `package.json` 与 `package-lock.json` 为准。本表只列对分发有意义的主体。

## 字体与图标

- `lucide-react` / `lucide-react-native`:ISC 许可,图标库。
- 系统默认字体:由操作系统提供,随平台许可。
