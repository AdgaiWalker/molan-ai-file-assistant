// 最近分享方式记录 —— 记住用户上次用什么格式分享，下次提示。
// 安卓系统分享面板不暴露用户选了哪个目标 App，所以"方式"= 分享时的格式/动作。
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ShareUsage {
  format: 'md' | 'docx' | 'pdf' | 'text' | 'original';
  label: string;       // 给用户看的描述，如"导出为 PDF"
  at: number;          // 时间戳
}

const KEY = 'molan.share.last';

export async function getShareUsage(): Promise<ShareUsage | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShareUsage) : null;
  } catch {
    return null;
  }
}

export async function setShareUsage(usage: ShareUsage): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(usage));
  } catch {
    /* 忽略 */
  }
}
