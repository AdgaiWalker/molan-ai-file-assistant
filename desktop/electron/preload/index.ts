import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, ReadableFile } from '../../src/shared/ipc';

const api = {
  selectFiles: () => ipcRenderer.invoke(ipcChannels.SELECT_FILES),
  selectReaderFile: () => ipcRenderer.invoke(ipcChannels.SELECT_READER_FILE),
  selectOutputDir: () => ipcRenderer.invoke(ipcChannels.SELECT_OUTPUT_DIR),
  convert: (tasks: any[], outputDir: string) => ipcRenderer.invoke(ipcChannels.CONVERT, tasks, outputDir),
  readMd: (filePath: string) => ipcRenderer.invoke(ipcChannels.READ_MD, filePath),
  openPath: (p: string) => ipcRenderer.invoke(ipcChannels.OPEN_PATH, p),
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
