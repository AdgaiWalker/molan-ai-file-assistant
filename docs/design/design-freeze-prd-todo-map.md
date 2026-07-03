# D6.1 PRD/TODO 映射审计

## 1. 审计结论

PRD 中的主要功能均已映射到 D 层设计任务和 S 层开发任务；当前没有发现“PRD 写了、TODO 没有承接”的功能。

剩余未完成不属于映射缺口，而是：
- 真机/真实环境验证：微信、QQ、iOS、商店、发布渠道。
- S 层开发任务：手机 V1、CLI fixture、桌面 GUI、发布、官网、V1.5、V2 云端、V3 团队与运营。
- 外部账号/证书：应用商店、iOS、国内镜像/云服务。

## 2. PRD 核心场景映射

| PRD 功能/场景 | D 层设计 | S 层任务 |
|---|---|---|
| 微信/QQ 打开 `.md` / `.json` | D1.1、D5.1 | S1-OPEN、S1-QA |
| Markdown 阅读 | D1.2、D1.13 | S1-MD、S1-QA |
| JSON 树形阅读、搜索、复制 JSONPath | D1.3、D4.3 | S1-JSON、S1-COPY |
| Markdown/JSON 轻编辑、JSON 校验 | D1.4 | S1-EDIT |
| 复制全文、片段、代码块、字段 | D1.5、D4.3 | S1-COPY |
| 提示词库、收藏、搜索、一键复制 | D1.6、D1.15 | S1-PROMPT、S6-PROMPT |
| 分享原文件、纯文本、PDF/Word | D1.7、D1.16 | S1-SHARE、S1-CONV |
| 当前文件转换后直接分享 | D1.8、D1.16、D4.4 | S1-CONV |
| 最近文档/文件收件箱 | D1.10、D4.1、D4.3 | S1-DATA |
| 批量转换中心 | D1.9、D4.4 | S6-BATCH |
| Office/PDF/PPT/Excel/CSV 转 Markdown | D2.2、D2.3 | S2-CONV、S2-QA |
| CLI JSON 输出给 AI/Agent | D2.1、D2.6、D4.5 | S2-CLI、S7-AI |
| 桌面 GUI 阅读与转换 | D2.4、D2.5 | S3-GUI、S6-OFFICE |
| 电脑端置顶快贴窗 | D2.7 | S3-GUI、S6-PROMPT |
| 云备份、多设备同步 | D3.1-D3.5、D4.2、D4.5 | S7-BACKEND、S7-BACKUP |
| AI 文件资料库与读取入口 | D3.4、D3.6 | S7-AI、S7-BACKUP |
| AI 生产结果回流 | D3.7、D4.5 | S7-AI-013 |
| MCP 本地 Agent 入口 | D3.6、D4.5 | S7-AI-011 |
| 发布包、官网、渠道 | D5.1-D5.5 | S4、S5 |
| V3 团队、商业化、生态 | D0.2、D0.3、D4.2 | S8 |
| 长期运营与维护 | D5.4、D5.5 | S9 |

## 3. PRD 不做清单映射

| PRD 不做 | TODO/D 约束 |
|---|---|
| 不做重型 Markdown 编辑器 | D0.2、D1.4、S1-EDIT |
| 不做专业 JSON IDE | D0.2、D1.3、S1-JSON |
| 不做完整办公套件 | D0.2、D1.16、D2.2 |
| 不做云盘 | D3.1、D3.5、D4.2 |
| 不默认上传文件 | D0.5、D3.5、D4.2、D5.4 |
| 不内置通用 AI 聊天 | D0.2、D3.6、S7-AI |
| 不做提示词社区 | D1.6、S8/V3 后置 |

## 4. 追加 PRD 映射

| PRD 追加内容 | D 层设计 | S 层任务 |
|---|---|---|
| AI 阅读卡片 | D1.11 | S7-AI-001、S7-AI-002 |
| 有用文件筛选 | D1.10、D3.4 | S7-BACKUP、S7-AI |
| 提示词自动提取 | D1.6、D1.11 | S6-PROMPT-005、S7-AI-002 |
| JSON 智能阅读与敏感字段 | D1.3、D3.5 | S7-AI-005 |
| AI 可读转换 | D1.16、D2.2、D2.3 | S2-CONV、S7-AI-012 |
| AI 可读云端工作流 | D3.1-D3.7、D4.5 | S7-AI-008 到 S7-AI-013 |
| App 外快贴 | D1.15 | S6-FLOAT、S6-IOS |
| 电脑置顶快贴窗 | D2.7 | S3-GUI-013、S6-PROMPT |

## 5. 仍需用 S 层关闭的风险

- D1.1/D1.2 仍为 `[v]`，需要微信/QQ 真机截图或录屏。
- S0-REPO-003 仍为 `[!]`，需要持续保护敏感文件不进 Git。
- S2-QA-001/S2-QA-005 需要真实转换 fixture 与 smoke test。
- S4/S5 需要真实发布产物、checksum、下载链接。
- S7 后端必须先完成技术选型设计，再写服务代码。

## 6. 验收口径

- PRD P0/P1/P2/P3 均能定位到 D/S 任务。
- PRD 追加内容均有 D 层设计承接。
- PRD 不做清单均有边界设计或后置任务承接。
- 未完成项以任务状态表达，不再形成文档/TODO 漂移。
