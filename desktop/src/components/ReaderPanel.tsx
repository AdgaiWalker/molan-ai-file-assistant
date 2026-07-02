import React, { useMemo } from 'react';
import { marked } from 'marked';
import type { ReadableFile } from '../shared/ipc';

interface Props {
  content: string;
  title: string;
  onLoad: (md: string) => void;
  setTitle: (t: string) => void;
}

export default function ReaderPanel({ content, title, onLoad, setTitle }: Props) {
  const [kind, setKind] = React.useState<ReadableFile['kind']>('markdown');
  const html = useMemo(() => {
    if (!content) return '<p style="color:#999">点击"打开文件"选择 .md 或 .json 阅读。</p>';
    if (kind === 'json') return renderJson(content);
    return marked.parse(content, { async: false }) as string;
  }, [content, kind]);

  const openFile = async () => {
    const file = await window.api.selectReaderFile();
    if (!file) return;
    setKind(file.kind);
    onLoad(file.content);
    setTitle(file.name);
  };

  return (
    <div className="reader-panel">
      <div className="reader-toolbar">
        <button className="btn-primary" onClick={openFile}>打开文件</button>
        <span style={{ alignSelf: 'center', color: '#666', fontSize: 13 }}>
          {title || ''}
        </span>
      </div>
      <div className="reader-content" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function renderJson(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return `<pre class="json-reader">${escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
  } catch (e) {
    return `<p style="color:#d93025">JSON 解析失败：${escapeHtml((e as Error).message)}</p><pre class="json-reader">${escapeHtml(content)}</pre>`;
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
