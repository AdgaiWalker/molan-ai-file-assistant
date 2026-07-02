import type { ConvertTask, AiRunResult, ReadableFile } from './shared/ipc';

interface DesktopApi {
  selectFiles: () => Promise<ConvertTask[]>;
  selectReaderFile: () => Promise<ReadableFile | null>;
  selectOutputDir: () => Promise<string | null>;
  convert: (tasks: ConvertTask[], outputDir: string) => Promise<ConvertTask[]>;
  readMd: (filePath: string) => Promise<string>;
  runAi: (command: string, args: string[]) => Promise<AiRunResult>;
  openPath: (p: string) => Promise<void>;
  saveSettings: (settings: unknown) => Promise<void>;
  loadSettings: () => Promise<unknown>;
}

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};
