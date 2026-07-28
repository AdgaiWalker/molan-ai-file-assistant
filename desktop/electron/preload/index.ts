import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, ReadableFile, SaveTextRequest } from '../../src/shared/ipc';
import type { ConflictResolution, DeleteScope, DesktopDocumentFamilySnapshot, DesktopSyncLoginRequest } from '../../src/shared/sync';

const api = {
  selectFiles: () => ipcRenderer.invoke(ipcChannels.SELECT_FILES),
  selectReaderFile: () => ipcRenderer.invoke(ipcChannels.SELECT_READER_FILE),
  selectOutputDir: () => ipcRenderer.invoke(ipcChannels.SELECT_OUTPUT_DIR),
  convert: (tasks: any[], outputDir: string) => ipcRenderer.invoke(ipcChannels.CONVERT, tasks, outputDir),
  readMd: (filePath: string) => ipcRenderer.invoke(ipcChannels.READ_MD, filePath),
  openPath: (p: string) => ipcRenderer.invoke(ipcChannels.OPEN_PATH, p),
  copyText: (text: string) => ipcRenderer.invoke(ipcChannels.COPY_TEXT, text),
  setAlwaysOnTop: (enabled: boolean) => ipcRenderer.invoke(ipcChannels.SET_ALWAYS_ON_TOP, enabled),
  openPromptWindow: () => ipcRenderer.invoke(ipcChannels.OPEN_PROMPT_WINDOW),
  saveTextAs: (request: SaveTextRequest) => ipcRenderer.invoke(ipcChannels.SAVE_TEXT_AS, request),
  saveSettings: (settings: unknown) => ipcRenderer.invoke(ipcChannels.SAVE_SETTINGS, settings),
  loadSettings: () => ipcRenderer.invoke(ipcChannels.LOAD_SETTINGS),
  getPendingFile: () => ipcRenderer.invoke(ipcChannels.GET_PENDING_FILE),
  syncSnapshot: () => ipcRenderer.invoke(ipcChannels.SYNC_SNAPSHOT),
  syncLogin: (request: DesktopSyncLoginRequest) => ipcRenderer.invoke(ipcChannels.SYNC_LOGIN, request),
  syncLogout: () => ipcRenderer.invoke(ipcChannels.SYNC_LOGOUT),
  syncRun: () => ipcRenderer.invoke(ipcChannels.SYNC_RUN),
  syncOpenDocument: (documentId: string) => ipcRenderer.invoke(ipcChannels.SYNC_OPEN_DOCUMENT, documentId),
  syncOpenReadableDocument: (documentId: string) => ipcRenderer.invoke(ipcChannels.SYNC_OPEN_READABLE_DOCUMENT, documentId),
  syncDocumentFamily: (documentId: string): Promise<DesktopDocumentFamilySnapshot | null> =>
    ipcRenderer.invoke(ipcChannels.SYNC_DOCUMENT_FAMILY, documentId),
  syncSetAiAccess: (scope: 'document' | 'collection', key: string, allowed: boolean) =>
    ipcRenderer.invoke(ipcChannels.SYNC_SET_AI_ACCESS, scope, key, allowed),
  syncArchiveDocument: (documentId: string) => ipcRenderer.invoke(ipcChannels.SYNC_ARCHIVE_DOCUMENT, documentId),
  syncDeleteDocument: (documentId: string, scope: DeleteScope) =>
    ipcRenderer.invoke(ipcChannels.SYNC_DELETE_DOCUMENT, documentId, scope),
  syncRestoreDocument: (documentId: string, scope: 'current_device' | 'cloud') =>
    ipcRenderer.invoke(ipcChannels.SYNC_RESTORE_DOCUMENT, documentId, scope),
  syncResolveConflict: (conflictId: string, resolution: ConflictResolution) =>
    ipcRenderer.invoke(ipcChannels.SYNC_RESOLVE_CONFLICT, conflictId, resolution),
  syncExportConflictVersion: (versionId: string) =>
    ipcRenderer.invoke(ipcChannels.SYNC_EXPORT_CONFLICT_VERSION, versionId),
  onOpenFile: (cb: (file: ReadableFile) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, file: ReadableFile) => cb(file);
    ipcRenderer.on('open-file', handler);
    return () => ipcRenderer.removeListener('open-file', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopApi = typeof api;
