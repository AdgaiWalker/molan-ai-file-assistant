// 提示词变量模板 —— 纯逻辑。
// 语法：{{变量名}}。变量名允许中文/字母/数字/下划线，不能含空白与花括号。
// 提取、填充错了用户复制的提示词会带未替换的 {{x}}，但不崩；规则边界值得测。

/** 从文本里提取所有 {{变量}} 名（按出现顺序去重）。 */
export function extractVars(text: string): string[] {
  const re = /\{\{\s*([^\s{}]+?)\s*\}\}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** 按变量名→值映射填充。未提供的变量保留原样（{{x}}）。 */
export function fillVars(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([^\s{}]+?)\s*\}\}/g, (full, name: string) => {
    return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : full;
  });
}

/** 是否含变量。 */
export function hasVars(text: string): boolean {
  return /\{\{\s*[^\s{}]+?\s*\}\}/.test(text);
}
