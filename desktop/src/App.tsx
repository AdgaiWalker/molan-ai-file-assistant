import React, { useState, useEffect } from 'react';
import { ReadableFile } from './shared/ipc';
import ConvertPanel from './components/ConvertPanel';
import ReaderPanel from './components/ReaderPanel';

type Tab = 'reader' | 'convert';

interface Settings {
  outputDir: string;
  lastTab: Tab;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('reader');
  const [outputDir, setOutputDir] = useState<string>('');
  const [readerContent, setReaderContent] = useState<string>('');
  const [readerTitle, setReaderTitle] = useState<string>('');

  useEffect(() => {
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
    setTab('reader');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    window.api.saveSettings({ outputDir, lastTab: t });
  };

  return (
    <div className="app">
      <nav className="sidebar-tabs">
        <button className={tab === 'reader' ? 'active' : ''} onClick={() => switchTab('reader')}>
          阅读
        </button>
        <button className={tab === 'convert' ? 'active' : ''} onClick={() => switchTab('convert')}>
          转换
        </button>
      </nav>
      <main className="content">
        {tab === 'reader' && (
          <ReaderPanel content={readerContent} title={readerTitle} onLoad={setReaderContent} setTitle={setReaderTitle} />
        )}
        {tab === 'convert' && (
          <ConvertPanel outputDir={outputDir} setOutputDir={setOutputDir} />
        )}
      </main>
    </div>
  );
}
