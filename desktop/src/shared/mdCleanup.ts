// Office → Markdown 转换后的清理规则 —— 纯逻辑，无副作用。
// pandoc 转 docx/pdf 常见噪声：连续空行、YAML 元数据块、重复标题、行尾空白。
// 这些规则错了，输出 Markdown 可读性下降但不崩；边界值得单测。

/** 清理 Markdown 文本。返回清理后的文本。 */
export function cleanupMarkdown(md: string): string {
  let out = md;

  // 1. 去掉 pandoc 生成的 YAML metadata 块（---\ntitle: ...\n---）
  out = out.replace(/^---\n[\s\S]*?\n---\n*/, '');

  // 2. 行尾空白
  out = out.replace(/[ \t]+\n/g, '\n');

  // 3. 连续 3+ 空行压缩为 2 空行（Markdown 段落只需 1 空行，留 2 不影响阅读）
  out = out.replace(/\n{3,}/g, '\n\n');

  // 4. 连续重复的相同标题行（pandoc 有时把页眉重复成多个 #）
  //    匹配 "行\n同一行" 的连续重复标题
  out = out.replace(/^(#{1,6}\s.+)\n\1(?:\n\1)+/gm, '$1');

  // 5. 去掉纯由空白/制表符组成的空行里残留的分页符（\f）
  out = out.replace(/\f/g, '');

  // 6. 首尾各 trim 空行
  out = out.replace(/^\n+/, '').replace(/\n+$/, '\n');

  return out;
}
