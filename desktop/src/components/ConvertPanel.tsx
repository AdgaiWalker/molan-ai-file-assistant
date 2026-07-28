import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowRightLeft, FolderOpen } from 'lucide-react';
import { strings } from '../constants/strings';
import type { ConvertTask, ConvertDirection } from '../shared/ipc';

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

const DIRECTION_LABEL: Record<ConvertDirection, string> = {
  md2docx: strings.convert.directions.md2docx,
  docx2md: strings.convert.directions.docx2md,
  pdf2md: strings.convert.directions.pdf2md,
  pptx2md: strings.convert.directions.pptx2md,
  xlsx2md: strings.convert.directions.xlsx2md,
  csv2md: strings.convert.directions.csv2md,
};

interface Props {
  outputDir: string;
  setOutputDir: (dir: string) => void;
  seedTasks?: ConvertTask[];
  onSeedConsumed?: () => void;
}

export default function ConvertPanel({ outputDir, setOutputDir, seedTasks = [], onSeedConsumed }: Props) {
  const [tasks, setTasks] = useState<ConvertTask[]>([]);
  const [converting, setConverting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seedTasks.length === 0) return;
    setTasks((prev) => mergeTasks(prev, seedTasks));
    onSeedConsumed?.();
  }, [onSeedConsumed, seedTasks]);

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
      .filter((f) => /\.(md|markdown|docx|pdf|pptx|xlsx|csv)$/i.test(f.name))
      .map((f) => {
        const ext = f.name.split('.').pop()!.toLowerCase();
        const direction = inferDirection(ext);
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
    <section className="panel-shell convert-panel" aria-busy={converting}>
      <header className="panel-hero">
        <div>
          <span className="panel-eyebrow">{strings.convert.eyebrow}</span>
          <h1>{strings.convert.title}</h1>
          <p>{strings.convert.description}</p>
        </div>
        {tasks.length > 0 && <span className="panel-count">{strings.convert.taskCount(tasks.length)}</span>}
      </header>

      <div
        ref={dropRef}
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span className="drop-zone-icon"><ArrowRightLeft size={26} strokeWidth={1.6} /></span>
        <h2>{strings.convert.dropTitle}</h2>
        <p>{strings.convert.dropDescription}</p>
        <button className="btn-primary btn-with-icon" onClick={addFiles}>
          <FolderOpen size={17} />
          {strings.convert.chooseFiles}
        </button>
      </div>

      {tasks.length > 0 && (
        <>
          <div className="output-bar surface-card">
            <span className="output-label">{strings.convert.outputTitle}</span>
            <span className="path" title={outputDir}>{outputDir || strings.convert.outputUnset}</span>
            <button className="btn-secondary" onClick={chooseOutputDir}>{strings.convert.chooseOutput}</button>
          </div>

          <div className="task-list">
            {tasks.map((t) => (
              <div key={t.id} className="task-item">
                <span className={statusClass(t.status)}>
                  {DIRECTION_LABEL[t.direction]}
                </span>
                <div className="task-name">
                  <span className="main">{t.fileName}</span>
                  <span className="sub">
                    {t.status === 'success' && t.outputPath ? t.outputPath : ''}
                    {t.status === 'failed' && t.error ? t.error : ''}
                    {t.status === 'pending' ? strings.convert.waiting : ''}
                    {t.status === 'converting' ? strings.convert.converting : ''}
                  </span>
                </div>
                {t.status === 'success' && t.outputPath ? (
                  <button className="btn-secondary" onClick={() => openResult(t.outputPath!)}>
                    {strings.convert.openResult}
                  </button>
                ) : null}
                {t.status === 'pending' || t.status === 'failed' ? (
                  <button className="btn-ghost" onClick={() => removeTask(t.id)} disabled={converting}>
                    {strings.convert.remove}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="action-bar convert-actions">
            <button className="btn-primary" onClick={runConvert} disabled={converting || !outputDir}>
              {converting ? strings.convert.converting : strings.convert.start}
            </button>
            <button className="btn-secondary" onClick={openOutput} disabled={!outputDir}>
              {strings.convert.openOutput}
            </button>
            <button className="btn-ghost" onClick={clearAll} disabled={converting}>{strings.convert.clear}</button>
            {(successCount > 0 || failCount > 0) && !converting && (
              <span className="result-summary" role="status">
                {strings.convert.resultSummary(successCount, failCount)}
              </span>
            )}
          </div>
        </>
      )}
    </section>
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
