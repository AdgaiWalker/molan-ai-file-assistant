import React, { useState, useEffect } from 'react';
import ConvertPanel from './components/ConvertPanel';
import ReaderPanel from './components/ReaderPanel';
import AiPanel from './components/AiPanel';

type Tab = 'convert' | 'reader' | 'ai';

interface Settings {
  outputDir: string;
  lastTab: Tab;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('convert');
  const [outputDir, setOutputDir] = useState<string>('');
  const [readerContent, setReaderContent] = useState<string>('');
  const [readerTitle, setReaderTitle] = useState<string>('');

  // 启动时加载设置
  useEffect(() => {
    window.api.loadSettings().then((s) => {
      if (s) {
        const settings = s as Settings;
        if (settings.outputDir) setOutputDir(settings.outputDir);
        if (settings.lastTab) setTab(settings.lastTab);
      }
    });
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    window.api.saveSettings({ outputDir, lastTab: t });
  };

  return (
    <div className="app">
      <nav className="sidebar-tabs">
        <button className={tab === 'convert' ? 'active' : ''} onClick={() => switchTab('convert')}>
          转换
        </button>
        <button className={tab === 'reader' ? 'active' : ''} onClick={() => switchTab('reader')}>
          阅读
        </button>
        <button className={tab === 'ai' ? 'active' : ''} onClick={() => switchTab('ai')}>
          AI
        </button>
      </nav>
      <main className="content">
        {tab === 'convert' && (
          <ConvertPanel outputDir={outputDir} setOutputDir={setOutputDir} />
        )}
        {tab === 'reader' && (
          <ReaderPanel content={readerContent} title={readerTitle} onLoad={setReaderContent} setTitle={setReaderTitle} />
        )}
        {tab === 'ai' && <AiPanel />}
      </main>
    </div>
  );
}
