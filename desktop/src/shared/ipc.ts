// 主进程与渲染进程共享的 IPC 契约

// 转换方向：office→md 统一为 toMd，md→docx 单列
export type ConvertDirection = 'md2docx' | 'docx2md' | 'pdf2md' | 'pptx2md' | 'xlsx2md' | 'csv2md';

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

export interface SaveTextRequest {
  defaultName: string;
  content: string;
  kind: 'markdown' | 'json';
}

export type {
  DesktopDocumentFamilySnapshot,
  DesktopInboxDocument,
  DesktopSyncLoginRequest,
  DesktopSyncSnapshot,
  DesktopSyncStatus,
} from './sync';

export const ipcChannels = {
  SELECT_FILES: 'select-files',
  SELECT_READER_FILE: 'select-reader-file',
  SELECT_OUTPUT_DIR: 'select-output-dir',
  CONVERT: 'convert',
  READ_MD: 'read-md',
  OPEN_PATH: 'open-path',
  COPY_TEXT: 'copy-text',
  SET_ALWAYS_ON_TOP: 'set-always-on-top',
  OPEN_PROMPT_WINDOW: 'open-prompt-window',
  SAVE_TEXT_AS: 'save-text-as',
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',
  GET_PENDING_FILE: 'get-pending-file',
  SYNC_SNAPSHOT: 'sync-snapshot',
  SYNC_LOGIN: 'sync-login',
  SYNC_LOGOUT: 'sync-logout',
  SYNC_RUN: 'sync-run',
  SYNC_OPEN_DOCUMENT: 'sync-open-document',
  SYNC_OPEN_READABLE_DOCUMENT: 'sync-open-readable-document',
  SYNC_DOCUMENT_FAMILY: 'sync-document-family',
  SYNC_SET_AI_ACCESS: 'sync-set-ai-access',
  SYNC_ARCHIVE_DOCUMENT: 'sync-archive-document',
  SYNC_DELETE_DOCUMENT: 'sync-delete-document',
  SYNC_RESTORE_DOCUMENT: 'sync-restore-document',
  SYNC_RESOLVE_CONFLICT: 'sync-resolve-conflict',
  SYNC_EXPORT_CONFLICT_VERSION: 'sync-export-conflict-version',
} as const;
