# Goal Document: 墨览动效官网重构

## Go / No-Go

- **Judgment**: Go
- **Reason**: 产品定位、现有站点边界、可用动效技术栈与验证命令均已明确，不需要额外产品决策。

## Target Outcome

将现有官网首页重构为一条清晰、可交互的“文件旅程”：访客在首屏就理解墨览如何让手机文件立即可读，并在用户主动授权后进入电脑 AI 工作流；页面在桌面与手机上均可用，动效自然、可中断，并尊重减少动效偏好。

## Goal Definition

- **Type**: product / quality / delivery
- **Boundary**: 重构 `site/` 首页的信息层级、视觉系统、交互动效与响应式体验；保留并继续支持隐私、条款、删除与支持公开页面。
- **Non-goals**:
  - 不改变墨览产品能力、发布状态或数据边界。
  - 不新增登录、支付、后端、邮件收集或虚假下载入口。
  - 不重写公开法律与支持页面内容。
- **Deferred work**:
  - 正式应用商店下载与安装包分发。
  - 正式主体、邮箱和域名信息补齐。
- **Verification rule**: 首页代码通过 TypeScript 与 Vite 生产构建，关键交互具备键盘/触摸入口，页面包含减少动效与减少透明度兜底，公开 hash 路由仍可达。
- **Evidence source**: `npm run build`、代码审查、生产构建产物。
- **Pass criteria**: 构建零错误；首页主线覆盖“打开—阅读—收集—AI 使用”；无用户可见文案散落在 JSX；未宣称尚未发布的平台已经可下载。
- **Confidence note**: 构建与静态审查能证明结构、类型和无障碍兜底；最终审美与真实设备手感仍由人工体验判断。
- **Judgment owner**: 构建命令负责技术完成判断，用户负责最终视觉接受。

## Current State

- 现有站点是 Vite + React 19，已安装 Framer Motion、GSAP 与 OGL。
- 首页由多个独立营销区块组成，信息完整，但首屏缺少一条足够聚焦、可直接操作的产品叙事。
- 公开隐私、条款、删除和支持页面通过 hash 路由提供，必须保留。
- 产品事实源要求本地优先、用户主动收集、同步与 AI 授权分离；当前公开发布以源码与 CLI 为主，移动端和桌面安装包仍在准备中。

## Priority Rationale

- 先锁定首屏叙事和文案事实，再实现核心互动，避免用动效掩盖信息层级问题。
- 先完成一条可运行的首页纵向切片，再补响应式与可访问性兜底，保证每一步都可验证。

## Assumptions and Open Decisions

| Item | Status | Impact | Owner / Next step |
|------|--------|--------|-------------------|
| 视觉方向采用暖白纸张、墨黑文字与系统蓝，强调“文件”而非通用 AI 星云 | assumed | 决定品牌辨识度与页面材质 | 本次实现后由用户体验判断 |
| 主 CTA 指向当前可用的 GitHub 仓库，次 CTA 滚动到产品旅程 | confirmed | 避免虚假下载承诺 | 由现有发布状态数据支持 |
| 首页允许使用指针驱动与弹簧动效，但不使用持续晃动的大背景 | confirmed | 保持流畅并降低眩晕风险 | 遵循 Apple Design 与 reduced-motion |

## Phases

### Phase 1: 叙事与骨架

- **Purpose**: 建立首页唯一主线与真实 CTA。
- **Entry condition**: PRD 产品定位与发布状态已核对。
- **Phase rules**:
  - 用户可见文案集中到常量文件。
  - 保留公开文档 hash 路由。
  - 不新增未发布能力承诺。
- **Todos**:
  - [x] 重写首页区块编排与产品专属文案。
    - **Surface**: React 首页、内容常量
    - **Proof**: 代码审查能逐段映射 PRD 两条主线
    - **Depends on**: none
- **Exit proof**: 首页静态结构完整，所有主要链接指向真实可用目标。
- **Stop condition**: 若实现需要新增产品事实或下载渠道，暂停并回到 PRD 决策。

### Phase 2: 物理感互动与视觉系统

- **Purpose**: 让“文件在手机与电脑之间移动”的概念通过可操作界面被理解。
- **Entry condition**: Phase 1 叙事稳定。
- **Phase rules**:
  - 触摸对象使用可中断弹簧或 1:1 指针响应。
  - 动画只改变 transform、opacity 等合成友好属性。
  - 玻璃层有减少透明度与高对比度兜底。
- **Todos**:
  - [x] 构建首屏交互式文件舞台、旅程切换与即时按压反馈。
    - **Surface**: React 交互组件、CSS
    - **Proof**: 指针、键盘和触摸入口均存在
    - **Depends on**: Phase 1
  - [x] 完成响应式版式、焦点样式与 reduced-motion 体验。
    - **Surface**: CSS、组件语义
    - **Proof**: 静态审查与生产构建
    - **Depends on**: 核心互动
- **Exit proof**: 页面在不同宽度下无结构断裂，交互无需精细指针也可完成。
- **Stop condition**: 若动效阻碍阅读、滚动或键盘操作，删除该动效而不是增加补丁。

### Phase 3: 构建与交付

- **Purpose**: 证明成品可生产构建并准备发布。
- **Entry condition**: 首页实现完成。
- **Phase rules**:
  - 不为通过类型检查使用 `any` 或双重断言。
  - 只修复与本次首页变更直接相关的问题。
- **Todos**:
  - [x] 运行生产构建并修复失败。
    - **Surface**: `site/`
    - **Proof**: `npm run build` 退出码为 0
    - **Depends on**: Phase 2
  - [x] 复核公开路由、外链与发布事实。
    - **Surface**: React 路由、常量
    - **Proof**: 静态审查
    - **Depends on**: 构建成功
- **Exit proof**: 生产构建成功，交付说明列出成品体验与验证结果。
- **Stop condition**: 若发布需要当前环境没有的站点权限，保留本地生产构建并明确说明阻塞。

## Dry-Run Findings

- 现有 Framer Motion 已覆盖所需弹簧与指针响应，不需要新增依赖。
- 公开文档路由与首页可以在 `App.tsx` 入口处分离，重构首页不会要求迁移法律页面。
- 当前没有正式下载入口，主 CTA 必须使用已公开仓库与 CLI，而不是伪造“立即下载”。

## Final Validation

- `site/` 的 `npm run build` 已通过，TypeScript 与 Vite 生产构建零错误。
- 首页 CTA、hash 公开路由、键盘焦点、减少动效和减少透明度媒体查询已完成静态复核。
- Sites 私有生产部署已成功。

## First Execution Step

创建新的首页内容常量与单页组件，用最薄的结构先串起“手机打开—主动收集—电脑交给 AI”的完整路径。
