import type { ConvertTask, ReadableFile } from './shared/ipc';

interface DesktopApi {
  selectFiles: () => Promise<ConvertTask[]>;
  selectReaderFile: () => Promise<ReadableFile | null>;
  selectOutputDir: () => Promise<string | null>;
  convert: (tasks: ConvertTask[], outputDir: string) => Promise<ConvertTask[]>;
  readMd: (filePath: string) => Promise<string>;
  openPath: (p: string) => Promise<void>;
  saveSettings: (settings: unknown) => Promise<void>;
  loadSettings: () => Promise<unknown>;
  getPendingFile: () => Promise<ReadableFile | null>;
  onOpenFile: (cb: (file: ReadableFile) => void) => () => void;
}

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};
