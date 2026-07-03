import React, { useState, useEffect } from 'react';
import { ReadableFile } from './shared/ipc';
import ConvertPanel from './components/ConvertPanel';
import ReaderPanel from './components/ReaderPanel';
import PromptPanel from './components/PromptPanel';

type Tab = 'reader' | 'convert' | 'prompt';

interface Settings {
  outputDir: string;
  lastTab: Tab;
}

export default function App() {
  const isPromptWindow = window.location.hash === '#/prompt';
  const [tab, setTab] = useState<Tab>(isPromptWindow ? 'prompt' : 'reader');
  const [outputDir, setOutputDir] = useState<string>('');
  const [readerContent, setReaderContent] = useState<string>('');
  const [readerTitle, setReaderTitle] = useState<string>('');
  const [readerPath, setReaderPath] = useState<string>('');

  useEffect(() => {
    if (isPromptWindow) return undefined;

    window.api.loadSettings().then((s) => {
      if (s) {
        const settings = s as Settings;
        if (settings.outputDir) setOutputDir(settings.outputDir);
        if (settings.lastTab) setTab(settings.lastTab);
      }
    });

    window.api.getPendingFile().then((file) => {
      if (file) openFileInReader(file);
    });

    const unsub = window.api.onOpenFile((file) => {
      openFileInReader(file);
    });

    return unsub;
  }, []);

  const openFileInReader = (file: ReadableFile) => {
    setReaderContent(file.content);
    setReaderTitle(file.name);
    setReaderPath(file.path);
    setTab('reader');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    window.api.saveSettings({ outputDir, lastTab: t });
  };

  if (isPromptWindow) {
    return (
      <div className="app prompt-window-app">
        <main className="content prompt-window-content">
          <PromptPanel compact />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar-tabs">
        <button className={tab === 'reader' ? 'active' : ''} onClick={() => switchTab('reader')}>
          阅读
        </button>
        <button className={tab === 'convert' ? 'active' : ''} onClick={() => switchTab('convert')}>
          转换
        </button>
        <button className={tab === 'prompt' ? 'active' : ''} onClick={() => switchTab('prompt')}>
          快贴
        </button>
      </nav>
      <main className="content">
        {tab === 'reader' && (
          <ReaderPanel
            content={readerContent}
            title={readerTitle}
            path={readerPath}
            onLoad={setReaderContent}
            setTitle={setReaderTitle}
            setPath={setReaderPath}
          />
        )}
        {tab === 'convert' && (
          <ConvertPanel outputDir={outputDir} setOutputDir={setOutputDir} />
        )}
        {tab === 'prompt' && (
          <PromptPanel />
        )}
      </main>
    </div>
  );
}
