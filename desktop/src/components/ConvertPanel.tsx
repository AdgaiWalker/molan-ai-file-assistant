import React, { useState, useCallback, useRef } from 'react';
import type { ConvertTask } from '../shared/ipc';

interface Props {
  outputDir: string;
  setOutputDir: (dir: string) => void;
}

export default function ConvertPanel({ outputDir, setOutputDir }: Props) {
  const [tasks, setTasks] = useState<ConvertTask[]>([]);
  const [converting, setConverting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback(async () => {
    const files = await window.api.selectFiles();
    if (files.length) {
      setTasks((prev) => mergeTasks(prev, files));
    }
  }, []);

  // 拖拽：从系统文件管理器拖入
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files) as (File & { path: string })[];
    const newTasks: ConvertTask[] = dropped
      .filter((f) => /\.(md|markdown|docx)$/i.test(f.name))
      .map((f) => {
        const ext = f.name.split('.').pop()!.toLowerCase();
        const direction = ext === 'docx' ? 'docx2md' : 'md2docx';
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          inputPath: f.path,
          fileName: f.name,
          direction,
          status: 'pending' as const,
        };
      });
    if (newTasks.length) setTasks((prev) => mergeTasks(prev, newTasks));
  }, []);

  const chooseOutputDir = useCallback(async () => {
    const dir = await window.api.selectOutputDir();
    if (dir) setOutputDir(dir);
  }, [setOutputDir]);

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => setTasks([]);

  const runConvert = useCallback(async () => {
    if (!outputDir || tasks.length === 0) return;
    setConverting(true);
    // 重置状态
    const reset = tasks.map((t) => ({ ...t, status: 'converting' as const, error: undefined, outputPath: undefined }));
    setTasks(reset);
    const results = await window.api.convert(reset, outputDir);
    setTasks(results);
    setConverting(false);
    // 保存输出目录设置
    window.api.saveSettings({ outputDir });
  }, [outputDir, tasks]);

  const openOutput = useCallback(async () => {
    if (outputDir) await window.api.openPath(outputDir);
  }, [outputDir]);

  const openResult = useCallback(async (p: string) => {
    await window.api.openPath(pathDir(p));
  }, []);

  const successCount = tasks.filter((t) => t.status === 'success').length;
  const failCount = tasks.filter((t) => t.status === 'failed').length;

  return (
    <div className="convert-panel">
      <div
        ref={dropRef}
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <h2>拖拽 .md / .docx 到此处</h2>
        <p>或点击下方按钮选择文件</p>
        <div className="action-bar" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn-primary" onClick={addFiles}>选择文件</button>
        </div>
      </div>

      {tasks.length > 0 && (
        <>
          <div className="output-bar">
            <span>输出目录：</span>
            <span className="path">{outputDir || '（未选择）'}</span>
            <button className="btn-secondary" onClick={chooseOutputDir}>选择</button>
          </div>

          <div className="task-list">
            {tasks.map((t) => (
              <div key={t.id} className="task-item">
                <span className={statusClass(t.status)}>
                  {t.direction === 'md2docx' ? '→ Word' : '→ MD'}
                </span>
                <div className="task-name">
                  <span className="main">{t.fileName}</span>
                  <span className="sub">
                    {t.status === 'success' && t.outputPath ? t.outputPath : ''}
                    {t.status === 'failed' && t.error ? t.error : ''}
                    {t.status === 'pending' ? '等待转换' : ''}
                    {t.status === 'converting' ? '转换中…' : ''}
                  </span>
                </div>
                {t.status === 'success' && t.outputPath ? (
                  <button className="btn-secondary" onClick={() => openResult(t.outputPath!)}>打开</button>
                ) : null}
                {t.status === 'pending' || t.status === 'failed' ? (
                  <button className="btn-danger" onClick={() => removeTask(t.id)} disabled={converting}>移除</button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="action-bar">
            <button className="btn-primary" onClick={runConvert} disabled={converting || !outputDir}>
              {converting ? '转换中…' : `开始转换（${tasks.length} 个）`}
            </button>
            <button className="btn-secondary" onClick={clearAll} disabled={converting}>清空</button>
            <button className="btn-secondary" onClick={openOutput} disabled={!outputDir}>打开输出目录</button>
            {(successCount > 0 || failCount > 0) && !converting && (
              <span style={{ alignSelf: 'center', color: '#666' }}>
                成功 {successCount} / 失败 {failCount}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function mergeTasks(prev: ConvertTask[], incoming: ConvertTask[]): ConvertTask[] {
  const existing = new Set(prev.map((t) => t.inputPath));
  return [...prev, ...incoming.filter((t) => !existing.has(t.inputPath))];
}

function statusClass(s: ConvertTask['status']): string {
  return `status-badge status-${s}`;
}

function pathDir(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(0, idx) : p;
}
