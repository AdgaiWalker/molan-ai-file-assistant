import type { ConvertTask, ReadableFile, SaveTextRequest } from './shared/ipc';
import type {
  ConflictResolution,
  DeleteScope,
  DesktopDocumentFamilySnapshot,
  DesktopSyncLoginRequest,
  DesktopSyncSnapshot,
} from './shared/sync';

interface DesktopApi {
  selectFiles: () => Promise<ConvertTask[]>;
  selectReaderFile: () => Promise<ReadableFile | null>;
  selectOutputDir: () => Promise<string | null>;
  convert: (tasks: ConvertTask[], outputDir: string) => Promise<ConvertTask[]>;
  readMd: (filePath: string) => Promise<string>;
  openPath: (p: string) => Promise<void>;
  copyText: (text: string) => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  openPromptWindow: () => Promise<void>;
  saveTextAs: (request: SaveTextRequest) => Promise<string | null>;
  saveSettings: (settings: unknown) => Promise<void>;
  loadSettings: () => Promise<unknown>;
  getPendingFile: () => Promise<ReadableFile | null>;
  syncSnapshot: () => Promise<DesktopSyncSnapshot>;
  syncLogin: (request: DesktopSyncLoginRequest) => Promise<DesktopSyncSnapshot>;
  syncLogout: () => Promise<DesktopSyncSnapshot>;
  syncRun: () => Promise<DesktopSyncSnapshot>;
  syncOpenDocument: (documentId: string) => Promise<void>;
  syncOpenReadableDocument: (documentId: string) => Promise<void>;
  syncDocumentFamily: (documentId: string) => Promise<DesktopDocumentFamilySnapshot | null>;
  syncSetAiAccess: (scope: 'document' | 'collection', key: string, allowed: boolean) => Promise<DesktopSyncSnapshot>;
  syncArchiveDocument: (documentId: string) => Promise<DesktopSyncSnapshot>;
  syncDeleteDocument: (documentId: string, scope: DeleteScope) => Promise<DesktopSyncSnapshot>;
  syncRestoreDocument: (documentId: string, scope: 'current_device' | 'cloud') => Promise<DesktopSyncSnapshot>;
  syncResolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<DesktopSyncSnapshot>;
  syncExportConflictVersion: (versionId: string) => Promise<boolean>;
  onOpenFile: (cb: (file: ReadableFile) => void) => () => void;
}

declare global {
  interface Window {
    api: DesktopApi;
  }
}

export {};
