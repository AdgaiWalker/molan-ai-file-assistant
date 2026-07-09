import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, ReadableFile, SaveTextRequest } from '../../src/shared/ipc';

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
  onOpenFile: (cb: (file: ReadableFile) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, file: ReadableFile) => cb(file);
    ipcRenderer.on('open-file', handler);
    return () => ipcRenderer.removeListener('open-file', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopApi = typeof api;
