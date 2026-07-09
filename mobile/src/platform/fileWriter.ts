// 平台抽象：把字节/文本写出到可分享/可下载目标。
// 原生：写入缓存目录（file:// URI）；web：转为 blob URL。
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

export interface WriteResult {
  outputPath: string;
}

function safe(name: string): string {
  return (name || '文档').replace(/[\\/:*?"<>|]/g, '_');
}

/** 字节写入缓存 / blob URL。mimeType 原生端由扩展名决定，web 端写入 blob type。 */
export function writeBytes(filename: string, bytes: Uint8Array, mimeType?: string): WriteResult {
  if (Platform.OS === 'web') {
    // 复制到纯 ArrayBuffer，规避 TS 对 Uint8Array<ArrayBufferLike> 与 BlobPart 的严格判定
    const view = new Uint8Array(bytes.byteLength);
    view.set(bytes);
    const blob = new Blob([view.buffer], { type: mimeType || 'application/octet-stream' });
    return { outputPath: URL.createObjectURL(blob) };
  }
  const file = new File(Paths.cache, safe(filename));
  file.write(bytes);
  return { outputPath: file.uri };
}

/** 文本写入缓存 / blob URL。 */
export function writeText(filename: string, text: string, mimeType?: string): WriteResult {
  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: mimeType || 'text/plain' });
    return { outputPath: URL.createObjectURL(blob) };
  }
  const file = new File(Paths.cache, safe(filename));
  file.write(text);
  return { outputPath: file.uri };
}
