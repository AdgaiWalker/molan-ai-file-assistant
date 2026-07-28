# 身份与公开入口人工证据模板

日期：2026-07-21

来源：`config/release-identity-inputs.json`

用途：把 A-007 / G-001 需要人工截图、后台链接、执行结论的部分压成可直接填写的模板。模板本身不是完成证据；只有填入真实主体、真实后台 / 真机截图和结论后，才可作为收口材料。

## 汇总

- 模板数：5
- 身份输入待补字段数：8
- 身份字段预检命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 当前默认下一条命令：`node scripts/apply_release_identity_inputs.mjs --check`

## 模板索引

| 模板 | 关联任务 | 环境 / 后台 | 默认命令 / 动作 |
| --- | --- | --- | --- |
| 官网公开页证据 | G-001、G-006 | 官网本地预览或线上站点 | node scripts/public_surface_sync_check.mjs |
| 应用内隐私 / 支持 / 删除入口证据 | G-001、G-002、G-003、G-006、G-007 | Android 真机、iOS 真机、桌面发布候选版本 | 人工打开应用入口并截图 |
| 商店后台与开发者资料证据 | A-007、G-001、G-002、G-003、G-004、G-005 | Apple Developer / App Store Connect / Google Play Console / Microsoft 发布后台 / 域名后台 | 人工后台回填并截图 |
| 账号 / 数据删除执行证据 | G-001、G-006、G-007 | 测试账号 + 官网删除入口 + 应用内删除入口 | 人工提交删除请求并记录结果 |
| 最终记录同步证据 | A-007、G-001 | 仓库记录与验证产物 | node scripts/prepare_identity_and_accounts.mjs --out default |

## 可填写模板

### 官网公开页证据

```text
证据项：官网公开页证据
关联任务：G-001、G-006
执行人：
执行日期：
环境 / 后台：官网本地预览或线上站点

正式主体名称：[待补正式主体]
支持邮箱：[待补支持邮箱]
正式域名：[待补正式域名]
账号 / 数据删除入口 URL：[待补正式域名]/account/delete（待确认）

证据材料：
- 隐私政策页面 URL / 截图路径：
- 服务条款页面 URL / 截图路径：
- 账号与数据删除页面 URL / 截图路径：
- 支持页面 URL / 截图路径：
- 公开面自检命令输出：

验收结论：
- 结果：未执行 / 通过 / 不通过
- 如不通过，阻塞原因：
- 下一步：
```

### 应用内隐私 / 支持 / 删除入口证据

```text
证据项：应用内隐私 / 支持 / 删除入口证据
关联任务：G-001、G-002、G-003、G-006、G-007
执行人：
执行日期：
环境 / 后台：Android 真机、iOS 真机、桌面发布候选版本

支持邮箱：[待补支持邮箱]
账号 / 数据删除入口 URL：[待补正式域名]/account/delete（待确认）

证据材料：
- Android 隐私入口截图路径：
- Android 支持入口截图路径：
- Android 删除账号入口截图路径：
- iOS 隐私入口截图路径：
- iOS 支持入口截图路径：
- iOS 删除账号入口截图路径：
- 桌面端相关入口截图路径：

验收结论：
- 结果：未执行 / 通过 / 不通过
- 如不通过，阻塞原因：
- 下一步：
```

### 商店后台与开发者资料证据

```text
证据项：商店后台与开发者资料证据
关联任务：A-007、G-001、G-002、G-003、G-004、G-005
执行人：
执行日期：
环境 / 后台：Apple Developer / App Store Connect / Google Play Console / Microsoft 发布后台 / 域名后台

正式主体名称：[待补正式主体]
Apple 开发者账号主体：未填写
Google Play 开发者账号主体：未填写
Windows / Microsoft 发布主体：未填写
域名持有人：未填写
支持邮箱：[待补支持邮箱]

证据材料：
- Apple 开发者主体截图路径：
- App Store Connect 隐私 / 支持 / 删除入口配置截图路径：
- Google Play 开发者主体截图路径：
- Google Play 数据安全 / 联系方式配置截图路径：
- Microsoft 发布主体截图路径：
- 域名持有人或 DNS 后台截图路径：

验收结论：
- 结果：未执行 / 通过 / 不通过
- 如不通过，阻塞原因：
- 下一步：
```

### 账号 / 数据删除执行证据

```text
证据项：账号 / 数据删除执行证据
关联任务：G-001、G-006、G-007
执行人：
执行日期：
环境 / 后台：测试账号 + 官网删除入口 + 应用内删除入口

支持邮箱：[待补支持邮箱]
账号 / 数据删除入口 URL：[待补正式域名]/account/delete（待确认）

证据材料：
- 测试账号标识：
- 删除请求提交前截图路径：
- 删除请求提交后确认截图路径：
- 支持邮箱自动回复或人工确认截图路径：
- 删除完成后的登录 / 数据不可见验证截图路径：

验收结论：
- 结果：未执行 / 通过 / 不通过
- 如不通过，阻塞原因：
- 下一步：
```

### 最终记录同步证据

```text
证据项：最终记录同步证据
关联任务：A-007、G-001
执行人：
执行日期：
环境 / 后台：仓库记录与验证产物

正式主体名称：[待补正式主体]
支持邮箱：[待补支持邮箱]
正式域名：[待补正式域名]
账号 / 数据删除入口 URL：[待补正式域名]/account/delete（待确认）
Apple 开发者账号主体：未填写
Google Play 开发者账号主体：未填写
Windows / Microsoft 发布主体：未填写
域名持有人：未填写

证据材料：
- docs/validation-runs/2026-07-21/identity_and_accounts/identity-input-status.md 最终状态：
- docs/validation-runs/2026-07-21/identity_and_accounts/identity-sync-targets.md 最终状态：
- docs/validation-runs/2026-07-21/identity_and_accounts/identity-readiness-snapshot.md 最终状态：
- TODO.md 对应任务状态：
- 最终截图 / 后台链接索引：

验收结论：
- 结果：未执行 / 通过 / 不通过
- 如不通过，阻塞原因：
- 下一步：
```


## 下一步

- 当前动作：补齐真实身份字段并预检
- 默认命令：`node scripts/apply_release_identity_inputs.mjs --check`
- 后续动作：字段补齐后先运行 node scripts/apply_release_identity_inputs.mjs --check / node scripts/apply_release_identity_inputs.mjs --dry-run，确认无误后再执行 node scripts/apply_release_identity_inputs.mjs。

