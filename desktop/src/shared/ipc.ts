// 主进程与渲染进程共享的 IPC 契约

export type ConvertDirection = 'md2docx' | 'docx2md';

export interface ConvertTask {
  id: string;
  inputPath: string;
  fileName: string;
  direction: ConvertDirection;
  status: 'pending' | 'converting' | 'success' | 'failed';
  outputPath?: string;
  error?: string;
}

export interface ConvertOptions {
  outputDir: string;
}

export interface AiRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface MdFile {
  name: string;
  path: string;
  content: string;
}

export interface ReadableFile {
  name: string;
  path: string;
  kind: 'markdown' | 'json';
  content: string;
}

export const ipcChannels = {
  SELECT_FILES: 'select-files',
  SELECT_READER_FILE: 'select-reader-file',
  SELECT_OUTPUT_DIR: 'select-output-dir',
  CONVERT: 'convert',
  READ_MD: 'read-md',
  OPEN_PATH: 'open-path',
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',
  GET_PENDING_FILE: 'get-pending-file',
} as const;
