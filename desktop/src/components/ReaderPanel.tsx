import React, { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import type { ReadableFile } from '../shared/ipc';

interface Props {
  content: string;
  title: string;
  path: string;
  onLoad: (content: string) => void;
  setTitle: (title: string) => void;
  setPath: (path: string) => void;
}

type ReaderMode = 'preview' | 'edit';

export default function ReaderPanel({ content, title, path, onLoad, setTitle, setPath }: Props) {
  const [kind, setKind] = useState<ReadableFile['kind']>('markdown');
  const [mode, setMode] = useState<ReaderMode>('preview');
  const [draft, setDraft] = useState(content);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setDraft(content);
    setJsonError(null);
    setStatus('');
    setMode('preview');
  }, [content]);

  const html = useMemo(() => {
    const source = draft || content;
    if (!source) return '<p style="color:#999">点击"打开文件"选择 .md 或 .json 阅读。</p>';
    if (kind === 'json') return renderJson(source);
    return marked.parse(source, { async: false }) as string;
  }, [content, draft, kind]);

  const openFile = async () => {
    const file = await window.api.selectReaderFile();
    if (!file) return;
    setKind(file.kind);
    onLoad(file.content);
    setTitle(file.name);
    setPath(file.path);
  };

  const validateJson = (value = draft): boolean => {
    if (kind !== 'json') {
      setJsonError(null);
      return true;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
      setStatus('JSON 校验通过');
      return true;
    } catch (error) {
      setJsonError((error as Error).message);
      setStatus('');
      return false;
    }
  };

  const formatJson = () => {
    try {
      const next = JSON.stringify(JSON.parse(draft), null, 2);
      setDraft(next);
      setJsonError(null);
      setStatus('已格式化');
    } catch (error) {
      setJsonError((error as Error).message);
      setStatus('');
    }
  };

  const minifyJson = () => {
    try {
      const next = JSON.stringify(JSON.parse(draft));
      setDraft(next);
      setJsonError(null);
      setStatus('已压缩');
    } catch (error) {
      setJsonError((error as Error).message);
      setStatus('');
    }
  };

  const saveCopy = async () => {
    if (kind === 'json' && !validateJson()) return;
    const fallbackName = kind === 'json' ? 'untitled.json' : 'untitled.md';
    const outputPath = await window.api.saveTextAs({
      defaultName: title || fallbackName,
      content: draft,
      kind,
    });
    if (!outputPath) return;
    onLoad(draft);
    setPath(outputPath);
    setStatus(`已保存副本：${outputPath}`);
  };

  const copyAll = async () => {
    await window.api.copyText(draft || content);
    setStatus('已复制全文');
  };

  return (
    <div className="reader-panel">
      <div className="reader-toolbar">
        <button className="btn-primary" onClick={openFile}>打开文件</button>
        {content && (
          <>
            <button className="btn-secondary" onClick={() => setMode((cur) => (cur === 'edit' ? 'preview' : 'edit'))}>
              {mode === 'edit' ? '预览' : '编辑'}
            </button>
            <button className="btn-secondary" onClick={copyAll}>复制全文</button>
            {kind === 'json' && (
              <>
                <button className="btn-secondary" onClick={formatJson}>格式化</button>
                <button className="btn-secondary" onClick={minifyJson}>压缩</button>
                <button className="btn-secondary" onClick={() => validateJson()}>校验</button>
              </>
            )}
            <button className="btn-primary" onClick={saveCopy}>保存副本</button>
          </>
        )}
        <span className="reader-file-title">
          {title || ''}
          {path ? <small>{path}</small> : null}
        </span>
      </div>

      {jsonError && <div className="reader-error">JSON 解析失败：{jsonError}</div>}
      {status && <div className="reader-status">{status}</div>}

      {mode === 'edit' ? (
        <textarea
          className="reader-editor"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (jsonError) setJsonError(null);
            if (status) setStatus('');
          }}
          spellCheck={false}
        />
      ) : (
        <div className="reader-content" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  );
}

function renderJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return `<pre class="json-reader">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
  } catch (error) {
    return `<p style="color:#d93025">JSON 解析失败：${escapeHtml((error as Error).message)}</p><pre class="json-reader">${escapeHtml(content)}</pre>`;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
