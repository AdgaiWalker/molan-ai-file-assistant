# 跨端移动阅读验收样例

对应任务：`TODO.md` A-002。Android、iOS 和旧 `mobile/` 基线检查必须使用这里的同一批字节，不得各自临时造样例。

## 生成与校验

所有样例均由仓库内 `generate.mjs` 确定性生成，不包含真实凭据、个人隐私或版权材料。

```bash
node fixtures/mobile-reading/generate.mjs
node fixtures/mobile-reading/generate.mjs --check
```

`SHA256SUMS` 是跨设备验收的内容基准。复制到手机后应再次计算 SHA-256；系统分享或云盘若改变字节，必须记录为测试环境问题，不能继续用该副本做解析结论。

## 样例清单

| 相对路径 | 来源 | 预期阅读器 | 预期结果 |
|---|---|---|---|
| `markdown/normal.md` | 生成脚本内自写内容 | Markdown | 成功；标题、段落、列表、引用、链接、表格、代码块和本地图片均可读 |
| `markdown/image.png` | 项目自有图标的固定副本 | Markdown 图片 | `normal.md` 的本地图片可成功加载；移动样例时需保持同目录 |
| `markdown/empty.md` | 0 字节生成文件 | Markdown | 显示“文件为空”；可返回、编辑或收集，不白屏 |
| `markdown/malformed.md` | 人工构造未闭合标记 | Markdown | 尽可能按普通文本显示；不崩溃、不执行内容 |
| `markdown/large-1mb.md` | 确定性重复段落 | Markdown | 文件严格大于 1 MiB；5 秒内显示首屏，可滚动、搜索和恢复位置 |
| `json/normal.json` | 生成脚本内对象 | JSON | 成功；树形、根对象、数组、null 和 Markdown 字段可操作 |
| `json/invalid.json` | 人工构造尾逗号和缺失结尾 | JSON 原文 | 明确解析错误并保留原文，允许进入编辑修复 |
| `json/large-5mb.json` | 确定性重复记录 | JSON | 文件严格大于 5 MiB；5 秒内正文或进度/错误，不白屏、不 ANR |
| `text/utf8.txt` | 自写 UTF-8 文本 | 纯文本 | 成功；中文、emoji、换行和制表符可读 |
| `text/gbk.txt` | 固定 GBK 字节 `GBK: 中文测试` | 纯文本 | 自动识别 GBK 或让用户选择编码；不得静默显示乱码 |
| `names/中文 文件 名.md` | 自写 Markdown | Markdown | 中文与空格文件名完整显示 |
| `names/file with spaces.json` | 自写 JSON | JSON | 空格文件名完整显示 |
| `names/超长文件名…md` | 14 次重复“超长文件名” | Markdown | 能打开；标题可省略显示但稳定 ID 不得截断碰撞 |
| `names/no-extension` | 自写 UTF-8 文本 | 纯文本兜底 | 通过内容探测成功，不因无扩展名拒绝 |
| `binary/disguised-as-text.txt` | 固定控制字节与伪 PNG 头 | 无 | 拒绝为二进制，提示不支持或建议电脑端转换 |
| `binary/unsupported.bin` | 固定伪 ZIP 头与非法文本字节 | 无 | 拒绝为二进制，不能进入纯文本阅读器 |

## 跨端记录模板

每次 B/C 阶段验收记录以下字段：

```text
样例相对路径：
SHA-256：
平台与系统版本：
设备/模拟器型号：
入口应用：
首次可见正文或错误耗时：
实际阅读器/错误码：
结果：通过 / 失败
截图或录屏路径：
备注：
```

大文件、GBK 和外部入口不能只在单元测试中通过；它们必须进入模拟器或真机的端到端验收。
