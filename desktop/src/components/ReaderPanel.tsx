import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Braces, Check, Copy, Eye, FolderOpen, Pencil, Save } from 'lucide-react';
import { marked } from 'marked';
import { strings } from '../constants/strings';
import type { ReadableFile } from '../shared/ipc';

interface Props {
  content: string;
  title: string;
  path: string;
  initialKind: ReadableFile['kind'];
  onLoad: (content: string) => void;
  setTitle: (title: string) => void;
  setPath: (path: string) => void;
  setKind: (kind: ReadableFile['kind']) => void;
}

type ReaderMode = 'preview' | 'edit';

export default function ReaderPanel({
  content,
  title,
  path,
  initialKind,
  onLoad,
  setTitle,
  setPath,
  setKind: setParentKind,
}: Props) {
  const [kind, setKind] = useState<ReadableFile['kind']>(initialKind);
  const [mode, setMode] = useState<ReaderMode>('preview');
  const [draft, setDraft] = useState(content);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    setKind(initialKind);
    setDraft(content);
    setJsonError(null);
    setStatus('');
    setMode('preview');
  }, [content, initialKind]);

  const html = useMemo(() => {
    const source = draft || content;
    if (!source) return '';
    if (kind === 'json') return renderJson(source);
    return marked.parse(source, { async: false }) as string;
  }, [content, draft, kind]);

  const openFile = async () => {
    const file = await window.api.selectReaderFile();
    if (!file) return;
    setKind(file.kind);
    setParentKind(file.kind);
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
      setStatus(strings.reader.jsonValid);
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
      setStatus(strings.reader.formatted);
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
      setStatus(strings.reader.minified);
    } catch (error) {
      setJsonError((error as Error).message);
      setStatus('');
    }
  };

  const saveCopy = async () => {
    if (kind === 'json' && !validateJson()) return;
    const fallbackName = kind === 'json' ? strings.reader.untitledJson : strings.reader.untitledMarkdown;
    const outputPath = await window.api.saveTextAs({
      defaultName: title || fallbackName,
      content: draft,
      kind,
    });
    if (!outputPath) return;
    onLoad(draft);
    setPath(outputPath);
    setStatus(`${strings.reader.savedCopy}：${outputPath}`);
  };

  const copyAll = async () => {
    await window.api.copyText(draft || content);
    setStatus(strings.reader.copiedAll);
  };

  return (
    <section className="panel-shell reader-panel">
      <header className="panel-hero">
        <div>
          <span className="panel-eyebrow">{strings.reader.eyebrow}</span>
          <h1>{content ? title : strings.reader.emptyTitle}</h1>
          <p>
            {content
              ? (kind === 'json' ? strings.reader.jsonDescription : strings.reader.markdownDescription)
              : strings.reader.emptyDescription}
          </p>
        </div>
        <button className="btn-primary btn-with-icon" onClick={openFile}>
          <FolderOpen size={17} />
          {strings.reader.openFile}
        </button>
      </header>

      {!content ? (
        <div className="empty-state reader-empty">
          <span className="empty-state-icon"><BookOpen size={30} strokeWidth={1.5} /></span>
          <strong>{strings.reader.emptyTitle}</strong>
          <p>{strings.reader.emptyDescription}</p>
          <button className="btn-primary btn-with-icon" onClick={openFile}>
            <FolderOpen size={17} />
            {strings.reader.openFile}
          </button>
        </div>
      ) : (
        <>
          <div className="reader-document-bar">
            <span className="document-kind" aria-hidden="true">
              {kind === 'json' ? <Braces size={18} /> : <BookOpen size={18} />}
            </span>
            <span className="reader-file-title">
              <strong>{title}</strong>
              {path ? <small title={path}>{path}</small> : null}
            </span>
            <span className="format-pill">{kind.toUpperCase()}</span>
          </div>

          <div className="reader-commandbar">
            <div className="segmented-control" aria-label={strings.reader.modeLabel}>
              <button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>
                <Eye size={15} />
                {strings.reader.preview}
              </button>
              <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>
                <Pencil size={15} />
                {strings.reader.edit}
              </button>
            </div>
            <span className="toolbar-spacer" />
            <button className="btn-secondary btn-with-icon" onClick={copyAll}>
              <Copy size={15} />
              {strings.reader.copyAll}
            </button>
            {kind === 'json' && (
              <details className="command-menu">
                <summary>
                  <Braces size={15} />
                  {strings.reader.jsonTools}
                </summary>
                <div className="command-menu-popover">
                  <button onClick={(event) => {
                    formatJson();
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}>{strings.reader.formatJson}</button>
                  <button onClick={(event) => {
                    minifyJson();
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}>{strings.reader.minifyJson}</button>
                  <button onClick={(event) => {
                    validateJson();
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }}>
                    <Check size={14} />
                    {strings.reader.validateJson}
                  </button>
                </div>
              </details>
            )}
            <button className="btn-primary btn-with-icon" onClick={saveCopy}>
              <Save size={15} />
              {strings.reader.saveCopy}
            </button>
          </div>

          {jsonError && (
            <div className="reader-error" role="alert">
              <strong>{strings.reader.jsonParseFailed}</strong>
              <span>{jsonError}</span>
            </div>
          )}
          {status && <div className="reader-status" role="status" aria-live="polite">{status}</div>}

          {mode === 'edit' ? (
            <textarea
              aria-label={strings.reader.edit}
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
        </>
      )}
    </section>
  );
}

function renderJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return `<pre class="json-reader">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
  } catch (error) {
    return `<p class="inline-error">${escapeHtml(strings.reader.jsonParseFailed)}：${escapeHtml((error as Error).message)}</p><pre class="json-reader">${escapeHtml(content)}</pre>`;
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
