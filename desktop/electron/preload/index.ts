import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels } from '../../src/shared/ipc';

const api = {
  selectFiles: () => ipcRenderer.invoke(ipcChannels.SELECT_FILES),
  selectReaderFile: () => ipcRenderer.invoke(ipcChannels.SELECT_READER_FILE),
  selectOutputDir: () => ipcRenderer.invoke(ipcChannels.SELECT_OUTPUT_DIR),
  convert: (tasks: any[], outputDir: string) => ipcRenderer.invoke(ipcChannels.CONVERT, tasks, outputDir),
  readMd: (filePath: string) => ipcRenderer.invoke(ipcChannels.READ_MD, filePath),
  runAi: (command: string, args: string[]) => ipcRenderer.invoke(ipcChannels.RUN_AI, command, args),
  openPath: (p: string) => ipcRenderer.invoke(ipcChannels.OPEN_PATH, p),
  saveSettings: (settings: unknown) => ipcRenderer.invoke(ipcChannels.SAVE_SETTINGS, settings),
  loadSettings: () => ipcRenderer.invoke(ipcChannels.LOAD_SETTINGS),
};

contextBridge.exposeInMainWorld('api', api);

export type DesktopApi = typeof api;
