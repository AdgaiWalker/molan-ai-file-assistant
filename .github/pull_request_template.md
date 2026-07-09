## 改动说明
<!-- 一句话说清做了什么,为什么 -->

## 归属端
- [ ] 手机 App (`mobile/`)
- [ ] 电脑 CLI (`desktop/cli/`)
- [ ] 电脑 GUI (`desktop/`)
- [ ] 文档 / 仓库

## 关联 TODO 任务
<!-- 例如 S1-MD-004,多个用逗号分隔。若无显式任务可填"无" -->

## 验收证据
<!-- 按 TODO §17 要求补证据 -->
- [ ] 代码改动文件列表:
- [ ] typecheck 结果:<!-- 例 `cd mobile && npm run typecheck` 通过 -->
- [ ] test 结果:<!-- 例 `cd mobile && npm run test` 通过 / N 个测试通过 -->
- [ ] 真机/手动验证(如适用):

## 自检
- [ ] 没有引入新的 `any` / `as unknown as`
- [ ] 没有写"为兼容旧逻辑"的代码
- [ ] 用户可见中文已集中(不硬编码在 JSX)
- [ ] 没有提交 `config.json` 等敏感文件
