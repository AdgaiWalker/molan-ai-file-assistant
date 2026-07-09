// 平台抽象：分享。
// 原生：expo-sharing 系统分享面板；web：<a download> 触发下载 / clipboard。
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

export interface ShareOptions {
  filename: string;
  mimeType: string;
  dialogTitle?: string;
}

export interface ShareResult {
  shared: boolean;
}

function triggerDownloadWeb(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** 分享一个已写出的文件（outputPath）。返回是否分享了。 */
export async function shareFile(outputPath: string, opts: ShareOptions): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    triggerDownloadWeb(outputPath, opts.filename);
    return { shared: true };
  }
  if (!(await Sharing.isAvailableAsync())) return { shared: false };
  await Sharing.shareAsync(outputPath, {
    mimeType: opts.mimeType,
    dialogTitle: opts.dialogTitle ?? opts.filename,
  });
  return { shared: true };
}

/** 分享纯文本。web 下复制到剪贴板；原生端由调用方走 RN Share（见 ConvertSheet）。 */
export async function shareText(text: string, _title?: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(text);
      return { shared: true };
    } catch {
      return { shared: false };
    }
  }
  // 原生纯文本分享保留在调用方用 RN Share，这里返回 false 表示未处理。
  return { shared: false };
}
