import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ipcChannels, ConvertTask, ConvertDirection, AiRunResult, ReadableFile } from '../../src/shared/ipc';

let mainWindow: BrowserWindow | null = null;

// pandoc 可执行文件路径：开发态用 resources/，打包后用 process.resourcesPath
function pandocPath(): string {
  const devPath = path.join(__dirname, '../../resources/pandoc.exe');
  if (fs.existsSync(devPath)) return devPath;
  const packagedPath = path.join(process.resourcesPath, 'pandoc.exe');
  if (fs.existsSync(packagedPath)) return packagedPath;
  return 'pandoc';
}

// 输出路径：同名换扩展名，已存在则加 _1 _2
function makeOutputPath(inputPath: string, direction: ConvertDirection, outputDir: string): string {
  const base = path.basename(inputPath).replace(/\.(md|docx)$/i, '');
  const ext = direction === 'md2docx' ? '.docx' : '.md';
  let out = path.join(outputDir, base + ext);
  if (!fs.existsSync(out)) return out;
  let i = 1;
  while (fs.existsSync(path.join(outputDir, `${base}_${i}${ext}`))) i++;
  return path.join(outputDir, `${base}_${i}${ext}`);
}

// 调用 pandoc 转换单个文件
function convertWithPandoc(task: ConvertTask, outputDir: string): Promise<ConvertTask> {
  return new Promise((resolve) => {
    const outPath = makeOutputPath(task.inputPath, task.direction, outputDir);
    const fmtIn = task.direction === 'md2docx' ? 'markdown' : 'docx';
    const fmtOut = task.direction === 'md2docx' ? 'docx' : 'gfm';
    const args = [task.inputPath, '-o', outPath, '-f', fmtIn, '-t', fmtOut];
    const proc = spawn(pandocPath(), args, { windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      task.status = 'failed';
      task.error = `无法启动 pandoc：${err.message}`;
      resolve(task);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        task.status = 'success';
        task.outputPath = outPath;
      } else {
        task.status = 'failed';
        task.error = stderr || `pandoc 退出码 ${code}`;
      }
      resolve(task);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 480,
    title: 'md 阅读 + 转换器',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// ===== IPC 处理 =====

// 选择文件
ipcMain.handle(ipcChannels.SELECT_FILES, async (): Promise<ConvertTask[]> => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择待转换文件',
    filters: [
      { name: 'Markdown / Word', extensions: ['md', 'markdown', 'docx'] },
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

// 批量转换
ipcMain.handle(ipcChannels.CONVERT, async (_e, tasks: ConvertTask[], outputDir: string): Promise<ConvertTask[]> => {
  const results: ConvertTask[] = [];
  for (const task of tasks) {
    const t = { ...task, status: 'converting' as const };
    const done = await convertWithPandoc(t, outputDir);
    results.push(done);
  }
  return results;
});

// 读取 md 文件内容（阅读功能）
ipcMain.handle(ipcChannels.READ_MD, async (_e, filePath: string): Promise<string> => {
  return fs.readFileSync(filePath, 'utf-8');
});

// AI 命令行调用
ipcMain.handle(ipcChannels.RUN_AI, async (_e, command: string, args: string[]): Promise<AiRunResult> => {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { windowsHide: true, shell: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      resolve({ ok: false, stdout, stderr: stderr + err.message, exitCode: null });
    });
    proc.on('close', (code) => {
      resolve({ ok: code === 0, stdout, stderr, exitCode: code });
    });
  });
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
