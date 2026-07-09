// 平台抽象：通过 URI 读取文件文本（用于 file:///content:// 深链打开）。
// - content://（微信/QQ/文件管理器分享）：用 legacy copyAsync 拷到 cache 再读
//   （expo-file-system 文档：copyAsync 可拷贝其他 app 分享的 content）
// - file://：用 new File(uri).text()
// - web：不会收到 file:// 深链，抛错让上层兜底
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { copyAsync, cacheDirectory } from 'expo-file-system/legacy';

export async function readUriText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('web 不支持通过 URI 读取本地文件');
  }
  if (uri.startsWith('content://')) {
    // 微信/QQ 等 FileProvider 发的 URI 可能带 "数字@" 前缀（如 content://0@com.tencent.mm...），
    // 这是 RN Linking 的 user 标识，ContentResolver 不认，去掉。
    const clean = uri.replace(/^content:\/\/\d+@/, 'content://');
    // 拷贝到 cache 再读（content:// 不能直接被 File API 读）
    const tmpPath = `${cacheDirectory}share_${Date.now().toString(36)}.tmp`;
    await copyAsync({ from: clean, to: tmpPath });
    const text = await new File(tmpPath).text();
    // 读完清理临时文件（失败不阻塞）
    try { new File(tmpPath).delete(); } catch { /* 忽略 */ }
    return text;
  }
  return new File(uri).text();
}
