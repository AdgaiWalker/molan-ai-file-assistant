# 身份信息逐位置回填清单

日期：2026-07-21

来源：`config/release-identity-inputs.json`

用途：说明填完身份字段后，还需要同步到哪些位置；区分“脚本自动回写”和“必须人工补截图 / 链接 / 商店后台”的目标。

## 汇总

- 目标位置数：8
- 手工填写源：1
- 自动回写目标：3
- 人工验收 / 证据目标：4
- 当前默认下一条命令：`node scripts/apply_release_identity_inputs.mjs --check`

## 目标清单

### 本地身份输入源

- 类型：`manual_edit`
- 位置：
  - `config/release-identity-inputs.json`
- 涉及字段：正式主体名称、支持邮箱、正式域名、账号 / 数据删除入口 URL、Apple 开发者账号主体、Google Play 开发者账号主体、Windows / Microsoft 发布主体、域名持有人
- 如何同步：直接编辑本地输入文件；填写完成后先跑预检。
- 默认命令 / 动作：node scripts/apply_release_identity_inputs.mjs --check
- 建议证据：填写完成后的本地 JSON 文件、预检输出结果

### 统一公开身份配置

- 类型：`auto_generated`
- 位置：
  - `config/product-identity.json`
- 涉及字段：正式主体名称、支持邮箱、正式域名、账号 / 数据删除入口 URL
- 如何同步：执行 node scripts/apply_release_identity_inputs.mjs 后自动回写。
- 默认命令 / 动作：node scripts/apply_release_identity_inputs.mjs
- 建议证据：config/product-identity.json 的更新结果

### 公开文案 Markdown

- 类型：`auto_generated`
- 位置：
  - `docs/public/privacy-policy.md`
  - `docs/public/terms-of-service.md`
  - `docs/public/account-and-data-deletion.md`
  - `docs/public/support.md`
- 涉及字段：正式主体名称、支持邮箱、正式域名、账号 / 数据删除入口 URL
- 如何同步：公开身份配置更新后，由统一准备流自动回写。
- 默认命令 / 动作：node scripts/prepare_identity_and_accounts.mjs --out default
- 建议证据：四份 docs/public 文档不再含待补占位

### 站点公开身份常量

- 类型：`auto_generated`
- 位置：
  - `site/src/lib/publicIdentity.generated.ts`
- 涉及字段：正式主体名称、支持邮箱、正式域名、账号 / 数据删除入口 URL
- 如何同步：公开身份配置更新后，由 render_public_docs 自动回写。
- 默认命令 / 动作：node scripts/render_public_docs.mjs
- 建议证据：site/src/lib/publicIdentity.generated.ts 已同步真实值

### 官网公开入口与路由

- 类型：`manual_verify`
- 位置：
  - `site/src/lib/constants.ts`
  - `site/src/components/PublicDocPage.tsx`
  - `site/src/components/ReleaseStatus.tsx`
  - `site/src/App.tsx`
- 涉及字段：支持邮箱、正式域名、账号 / 数据删除入口 URL
- 如何同步：公开身份配置更新后，打开站点验证 #/privacy #/terms #/deletion #/support 与发布状态区块。
- 默认命令 / 动作：node scripts/public_surface_sync_check.mjs
- 建议证据：官网页面截图、本地站点或线上站点验证记录

### 应用内入口与截图

- 类型：`manual_evidence`
- 位置：
  - `Android / iOS 应用内“隐私 / 支持 / 删除账号”入口`
  - `桌面端相应入口（如发布版本提供）`
- 涉及字段：支持邮箱、账号 / 数据删除入口 URL
- 如何同步：真实发布前在应用内逐项打开并截图。
- 默认命令 / 动作：人工真机 / 桌面取证
- 建议证据：应用内入口截图路径、真机录屏或截图

### 商店后台与开发者资料

- 类型：`manual_evidence`
- 位置：
  - `Apple Developer / App Store Connect`
  - `Google Play Console`
  - `Microsoft / Windows 发布后台`
  - `域名注册商或 DNS 后台`
- 涉及字段：正式主体名称、Apple 开发者账号主体、Google Play 开发者账号主体、Windows / Microsoft 发布主体、域名持有人、支持邮箱
- 如何同步：真实账号资料到位后，在后台完成信息填写并截图。
- 默认命令 / 动作：人工后台回填
- 建议证据：后台截图路径、审核备注 / 资料链接

### 进度记录与证据索引

- 类型：`manual_sync`
- 位置：
  - `TODO.md`
  - `README.md`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/identity-and-accounts-checklist.md`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.md`
  - `docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md`
- 涉及字段：全部 8 个字段的最终状态与证据位置
- 如何同步：真实资料落地后，把最终状态和证据位置同步回这些记录口径。
- 默认命令 / 动作：node scripts/prepare_identity_and_accounts.mjs --out default
- 建议证据：更新后的进度记录与证据路径


