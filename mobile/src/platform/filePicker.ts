// 平台抽象：文件选择。
// 原生走 expo-document-picker；web 走 <input type="file">。
// 静态导入：Metro 按平台 tree-shake，类型由 tsc 保证。
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export interface PickedFile {
  name: string;
  mimeType: string | null;
  uri: string;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface PickedFileWithText {
  name: string;
  mimeType: string | null;
  text: string;
}

// 注意：DOM File 与 expo-file-system 的 File 同名，这里显式用 DOM File（浏览器输入）。
type DomFile = globalThis.File;

function openInputWeb(accept: string): Promise<DomFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files && input.files[0];
      resolve(f ? (f as DomFile) : null);
    };
    input.click();
  });
}

/** 选一个文本文件并读取内容。用户取消返回 null。 */
export async function pickFile(mimeTypes: string[]): Promise<PickedFileWithText | null> {
  if (Platform.OS === 'web') {
    const file = await openInputWeb(mimeTypes.join(','));
    if (!file) return null;
    const text = await file.text();
    return { name: file.name, mimeType: file.type || null, text };
  }
  const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = result.assets[0];
  const text = await new File(file.uri).text();
  return { name: file.name, mimeType: file.mimeType ?? null, text };
}

/** 选一个二进制文件，返回读取句柄。用户取消返回 null。 */
export async function pickBinaryFile(mimeTypes: string[]): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    const file = await openInputWeb(mimeTypes.join(','));
    if (!file) return null;
    return {
      name: file.name,
      mimeType: file.type || null,
      uri: URL.createObjectURL(file),
      text: () => file.text(),
      arrayBuffer: () => file.arrayBuffer(),
    };
  }
  const result = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const file = result.assets[0];
  return {
    name: file.name,
    mimeType: file.mimeType ?? null,
    uri: file.uri,
    text: () => new File(file.uri).text(),
    arrayBuffer: () => new File(file.uri).arrayBuffer(),
  };
}
