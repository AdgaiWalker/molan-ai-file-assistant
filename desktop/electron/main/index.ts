import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ipcChannels, ConvertTask, ConvertDirection, ReadableFile } from '../../src/shared/ipc';
import { convertFile, type ConvertFormat } from '../../src/shared/converter';

let mainWindow: BrowserWindow | null = null;
let pendingFile: string | null = null;

function createWindow(fileToOpen?: string) {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 480,
    title: '墨览 文档阅读助手',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (fileToOpen) {
    pendingFile = fileToOpen;
  }

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}

// 渲染进程就绪后，把待处理文件发过去
ipcMain.handle(ipcChannels.GET_PENDING_FILE, async (): Promise<ReadableFile | null> => {
  if (!pendingFile || !fs.existsSync(pendingFile)) return null;
  const p = pendingFile;
  pendingFile = null;
  const ext = path.extname(p).toLowerCase();
  const name = path.basename(p);
  const content = fs.readFileSync(p, 'utf-8');
  return { name, path: p, kind: ext === '.json' ? 'json' : 'markdown', content };
});

// ===== IPC 处理 =====

// 选择文件
ipcMain.handle(ipcChannels.SELECT_FILES, async (): Promise<ConvertTask[]> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择待转换文件',
    filters: [
      { name: 'Markdown / Word / PPT / Excel / PDF', extensions: ['md', 'markdown', 'docx', 'pptx', 'xlsx', 'csv', 'pdf'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });
  if (result.canceled) return [];
  return result.filePaths.map((p) => {
    const ext = path.extname(p).toLowerCase();
    const direction: ConvertDirection = ext === '.md' || ext === '.markdown' ? 'md2docx' : 'docx2md';
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inputPath: p,
      fileName: path.basename(p),
      direction,
      status: 'pending' as const,
    };
  });
});

// 阅读页选择 .md / .json 文件
ipcMain.handle(ipcChannels.SELECT_READER_FILE, async (): Promise<ReadableFile | null> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择阅读文件',
    filters: [
      { name: 'Markdown / JSON', extensions: ['md', 'markdown', 'json'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  return {
    name: path.basename(filePath),
    path: filePath,
    kind: ext === '.json' ? 'json' : 'markdown',
    content: fs.readFileSync(filePath, 'utf-8'),
  };
});

// 选择输出目录
ipcMain.handle(ipcChannels.SELECT_OUTPUT_DIR, async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择输出目录',
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 批量转换 — 通过共享引擎
ipcMain.handle(ipcChannels.CONVERT, async (_e, tasks: ConvertTask[], outputDir: string): Promise<ConvertTask[]> => {
  const results: ConvertTask[] = [];
  for (const task of tasks) {
    const t = { ...task, status: 'converting' as const };
    const outputFormat: ConvertFormat = t.direction === 'md2docx' ? 'docx' : 'md';
    const result = await convertFile(t.inputPath, outputFormat, outputDir);
    const done: ConvertTask = {
      ...t,
      status: result.ok ? 'success' : 'failed',
      outputPath: result.outputPath,
      error: result.error,
    };
    results.push(done);
  }
  return results;
});

// 读取 md 文件内容（阅读功能）
ipcMain.handle(ipcChannels.READ_MD, async (_e, filePath: string): Promise<string> => {
  return fs.readFileSync(filePath, 'utf-8');
});

// 在资源管理器中打开路径
ipcMain.handle(ipcChannels.OPEN_PATH, async (_e, p: string): Promise<void> => {
  await shell.openPath(p);
});

// 保存/读取设置
const settingsFile = path.join(app.getPath('userData'), 'settings.json');
ipcMain.handle(ipcChannels.SAVE_SETTINGS, async (_e, settings: unknown): Promise<void> => {
  let current: Record<string, unknown> = {};
  try {
    current = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  } catch {
    current = {};
  }
  fs.writeFileSync(settingsFile, JSON.stringify({ ...current, ...(settings as Record<string, unknown>) }, null, 2), 'utf-8');
});
ipcMain.handle(ipcChannels.LOAD_SETTINGS, async (): Promise<unknown> => {
  try {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  } catch {
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();
});

// Windows: 通过"打开方式"或文件关联启动时，解析文件路径
app.on('open-file', (_event, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.md', '.markdown', '.json'].includes(ext)) return;
  if (mainWindow) {
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('open-file', {
      name: path.basename(filePath),
      path: filePath,
      kind: ext === '.json' ? 'json' : 'markdown',
      content,
    } as ReadableFile);
    mainWindow.focus();
  } else {
    pendingFile = filePath;
    createWindow(filePath);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
