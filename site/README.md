# 墨览官网落地页

墨览产品官网，定位：**让 AI 能读取你散落在各处的文件**。

独立于 `mobile/` 和 `desktop/`，纯静态站点，可部署到 Vercel / Netlify / GitHub Pages。

## 开发

```bash
cd site
npm install
npm run dev       # 本地开发（默认 http://localhost:5173）
npm run typecheck  # 类型检查
npm run build      # 生产构建到 dist/
npm run preview    # 预览构建产物
```

## 技术栈

- **Vite 5** + **React 19** + **TypeScript 5.6**（与 `desktop/` 同栈）
- **Tailwind CSS 3** —— 原子化样式，CSS 变量复用桌面端品牌色
- **GSAP 3 + ScrollTrigger** —— 两个重型滚动叙事（文件汇聚、横向 timeline）
- **Framer Motion** —— React 组件微交互（Hero 视差、入场动画）

## 页面结构（8 区块）

| 区块 | 组件 | 核心动效 |
|---|---|---|
| Hero | `Hero.tsx` | 标题逐字解码（`ScrambleText`）+ 手机 mockup 滚动视差 |
| 文件汇聚 ⭐ | `FileConvergence.tsx` | GSAP ScrollTrigger pin：散落文件 → 墨览 → AI |
| 三端并列 | `ThreePlatforms.tsx` | clip-path wipe 视差揭示 + 3D tilt |
| 流转 timeline | `FlowTimeline.tsx` | 竖滚 → 横向 pin 推进 |
| 能力网格 | `FeatureGrid.tsx` | spotlight 光晕跟随 + 3D tilt + 滚动入场 |
| 信任区 | `TrustBadges.tsx` | GSAP 滚动揭示 |
| 下载 | `Download.tsx` | 磁性按钮（`useMagnetic`）+ 滚动入场 |
| Footer/FAQ | `Footer.tsx` | 原生 details 折叠 |

## 动效 hooks（`src/hooks/`）

- `useMagnetic` —— 磁性按钮（元素吸附鼠标）
- `useSpotlight` —— 光晕跟随（注入 `--mx`/`--my` CSS 变量）
- `useTilt` —— 3D 倾斜卡片（perspective rotate）

## 关键决策

- **文案集中**：所有用户可见字符串在 `src/lib/constants.ts`（遵循 AGENTS.md §分离原则 #3）
- **配色复用**：`globals.css` 的 CSS 变量沿用 `desktop/src/styles.css` 品牌色
- **无障碍**：所有动效尊重 `prefers-reduced-motion`；移动端（< 768px）禁用横向 pin，改为垂直流
- **下载链接占位**：`constants.ts` 中 `DOWNLOADS` 的 `href` 先用 `#`，发布时替换真实地址

## 部署

```bash
npm run build
# dist/ 部署到任意静态托管
```

Vercel：导入仓库，Root Directory 设为 `site/`，构建命令 `npm run build`，输出目录 `dist/`。
