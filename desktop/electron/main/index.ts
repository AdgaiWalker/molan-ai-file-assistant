import { app, BrowserWindow, ipcMain, dialog, shell, clipboard, globalShortcut, safeStorage, type Rectangle } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ipcChannels, ConvertTask, ConvertDirection, ReadableFile, SaveTextRequest } from '../../src/shared/ipc';
import { convertFile, type ConvertFormat } from '../../src/shared/converter';
import type { ConflictResolution, DeleteScope, DesktopSyncLoginRequest } from '../../src/shared/sync';
import { DesktopSyncClient } from './desktopSyncClient';

let mainWindow: BrowserWindow | null = null;
let promptWindow: BrowserWindow | null = null;
let pendingFile: string | null = null;
let desktopSync: Promise<DesktopSyncClient> | null = null;
const promptBoundsFile = path.join(app.getPath('userData'), 'prompt-window.json');

// 按扩展名推断转换方向（默认 office→md）
function inferDirection(ext: string): ConvertDirection {
  switch (ext) {
    case 'md': case 'markdown': return 'md2docx';
    case 'docx': return 'docx2md';
    case 'pdf': return 'pdf2md';
    case 'pptx': return 'pptx2md';
    case 'xlsx': return 'xlsx2md';
    case 'csv': return 'csv2md';
    default: return 'docx2md';
  }
}

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

function readPromptBounds(): Rectangle | undefined {
  try {
    const bounds = JSON.parse(fs.readFileSync(promptBoundsFile, 'utf-8')) as Partial<Rectangle>;
    if (
      typeof bounds.x !== 'number' ||
      typeof bounds.y !== 'number' ||
      typeof bounds.width !== 'number' ||
      typeof bounds.height !== 'number'
    ) {
      return undefined;
    }
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  } catch {
    return undefined;
  }
}

function savePromptBounds(win: BrowserWindow) {
  fs.writeFileSync(promptBoundsFile, JSON.stringify(win.getBounds(), null, 2), 'utf-8');
}

function loadPromptRenderer(win: BrowserWindow) {
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/prompt`);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/prompt' });
  }
}

function createPromptWindow() {
  if (promptWindow) {
    promptWindow.show();
    promptWindow.focus();
    return promptWindow;
  }

  const bounds = readPromptBounds();
  const win = new BrowserWindow({
    width: 360,
    height: 620,
    minWidth: 320,
    minHeight: 420,
    ...(bounds || {}),
    title: '墨览快贴',
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  promptWindow = win;
  win.setAlwaysOnTop(true, 'floating');
  loadPromptRenderer(win);
  win.on('close', () => savePromptBounds(win));
  win.on('closed', () => {
    if (promptWindow === win) promptWindow = null;
  });
  return win;
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
    const ext = path.extname(p).toLowerCase().replace('.', '');
    const direction = inferDirection(ext);
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
    const startedAt = Date.now();
    const result = await convertFile(t.inputPath, outputFormat, outputDir, { preserveImages: true });
    let artifactError: string | null = null;
    if (result.ok && result.outputPath) {
      try {
        await (await requireDesktopSync()).recordConversionArtifact({
          inputPath: t.inputPath,
          outputPath: result.outputPath,
          outputFormat,
          generatorName: 'molan-desktop-converter',
          generatorVersion: app.getVersion(),
          warnings: result.warnings,
          durationMs: Date.now() - startedAt,
          mediaDirectory: outputFormat === 'md'
            ? mediaDirectoryFor(result.outputPath)
            : null,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        artifactError = error instanceof Error ? error.message : String(error);
      }
    }
    const done: ConvertTask = artifactError
      ? {
          ...t,
          status: 'failed',
          outputPath: result.outputPath,
          error: `转换文件已生成，但派生记录写入失败：${artifactError}`,
        }
      : {
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

// 复制文本到系统剪贴板
ipcMain.handle(ipcChannels.COPY_TEXT, async (_e, text: string): Promise<void> => {
  clipboard.writeText(text);
});

// 置顶主窗口，作为电脑端快贴窗的第一阶段能力
ipcMain.handle(ipcChannels.SET_ALWAYS_ON_TOP, async (_e, enabled: boolean): Promise<void> => {
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(enabled, 'floating');
});

// 打开独立置顶快贴窗，面向桌面端 AI/IDE 旁侧复制粘贴场景
ipcMain.handle(ipcChannels.OPEN_PROMPT_WINDOW, async (): Promise<void> => {
  createPromptWindow();
});

// 阅读器/编辑器保存副本，避免直接覆盖用户原文件
ipcMain.handle(ipcChannels.SAVE_TEXT_AS, async (_e, request: SaveTextRequest): Promise<string | null> => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: '保存副本',
    defaultPath: request.defaultName,
    filters: [
      request.kind === 'json'
        ? { name: 'JSON', extensions: ['json'] }
        : { name: 'Markdown', extensions: ['md', 'markdown'] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, request.content, 'utf-8');
  return result.filePath;
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

ipcMain.handle(ipcChannels.SYNC_SNAPSHOT, async () => (await requireDesktopSync()).snapshot());
ipcMain.handle(ipcChannels.SYNC_LOGIN, async (_event, request: DesktopSyncLoginRequest) =>
  (await requireDesktopSync()).login(request));
ipcMain.handle(ipcChannels.SYNC_LOGOUT, async () => (await requireDesktopSync()).logout());
ipcMain.handle(ipcChannels.SYNC_RUN, async () => (await requireDesktopSync()).sync());
ipcMain.handle(ipcChannels.SYNC_OPEN_DOCUMENT, async (_event, documentId: string): Promise<void> => {
  const filePath = (await requireDesktopSync()).readablePath(documentId);
  if (!filePath) throw new Error('同步文件内容不存在');
  const error = await shell.openPath(filePath);
  if (error) throw new Error(error);
});
ipcMain.handle(ipcChannels.SYNC_OPEN_READABLE_DOCUMENT, async (_event, documentId: string): Promise<void> => {
  const filePath = (await requireDesktopSync()).preferredReadablePath(documentId);
  if (!filePath) throw new Error('当前没有可供 AI 读取的正文副本，请先完成转换。');
  const error = await shell.openPath(filePath);
  if (error) throw new Error(error);
});
ipcMain.handle(ipcChannels.SYNC_DOCUMENT_FAMILY, async (_event, documentId: string) =>
  (await requireDesktopSync()).documentFamily(documentId));
ipcMain.handle(ipcChannels.SYNC_SET_AI_ACCESS, async (_event, scope: 'document' | 'collection', key: string, allowed: boolean) =>
  (await requireDesktopSync()).setAiReadAccess(scope, key, allowed));
ipcMain.handle(ipcChannels.SYNC_ARCHIVE_DOCUMENT, async (_event, documentId: string) =>
  (await requireDesktopSync()).archiveDocument(documentId));
ipcMain.handle(ipcChannels.SYNC_DELETE_DOCUMENT, async (_event, documentId: string, scope: DeleteScope) =>
  (await requireDesktopSync()).deleteDocument(documentId, scope));
ipcMain.handle(ipcChannels.SYNC_RESTORE_DOCUMENT, async (_event, documentId: string, scope: 'current_device' | 'cloud') =>
  (await requireDesktopSync()).restoreDocument(documentId, scope));
ipcMain.handle(ipcChannels.SYNC_RESOLVE_CONFLICT, async (_event, conflictId: string, resolution: ConflictResolution) =>
  (await requireDesktopSync()).resolveConflict(conflictId, resolution));
ipcMain.handle(ipcChannels.SYNC_EXPORT_CONFLICT_VERSION, async (_event, versionId: string): Promise<boolean> => {
  const item = (await requireDesktopSync()).conflictVersionFile(versionId);
  if (!item || !fs.existsSync(item.localPath)) throw new Error('冲突版本文件不存在');
  const extension = syncFormatExtension(item.format);
  const stem = path.basename(item.title, path.extname(item.title)) || 'molan';
  const options = { defaultPath: `${stem}-${versionId.slice(-8)}.${extension}` };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return false;
  await fs.promises.copyFile(item.localPath, result.filePath);
  return true;
});

app.whenReady().then(() => {
  desktopSync = createDesktopSync();
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    createPromptWindow();
  });
});

async function createDesktopSync(): Promise<DesktopSyncClient> {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('系统安全存储不可用');
  return DesktopSyncClient.open(app.getPath('userData'), {
    seal: (value) => safeStorage.encryptString(value),
    open: (value) => safeStorage.decryptString(value),
  });
}

function requireDesktopSync(): Promise<DesktopSyncClient> {
  if (!desktopSync) throw new Error('电脑同步尚未初始化');
  return desktopSync;
}

function syncFormatExtension(format: string): string {
  if (format === 'markdown') return 'md';
  if (format === 'text') return 'txt';
  return format;
}

function mediaDirectoryFor(outputPath: string): string | null {
  const directory = path.join(path.dirname(outputPath), 'media');
  return fs.existsSync(directory) ? directory : null;
}

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
