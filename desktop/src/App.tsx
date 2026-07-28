import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowRightLeft, Inbox, Sparkles } from 'lucide-react';
import { ConvertTask, ReadableFile } from './shared/ipc';
import ConvertPanel from './components/ConvertPanel';
import ReaderPanel from './components/ReaderPanel';
import PromptPanel from './components/PromptPanel';
import InboxPanel from './components/InboxPanel';
import { strings } from './constants/strings';

type Tab = 'reader' | 'inbox' | 'convert' | 'prompt';

const navigationItems = [
  {
    id: 'inbox',
    label: strings.navigation.inbox,
    description: strings.navigation.inboxDescription,
    icon: Inbox,
  },
  {
    id: 'reader',
    label: strings.navigation.reader,
    description: strings.navigation.readerDescription,
    icon: BookOpen,
  },
  {
    id: 'convert',
    label: strings.navigation.convert,
    description: strings.navigation.convertDescription,
    icon: ArrowRightLeft,
  },
  {
    id: 'prompt',
    label: strings.navigation.prompt,
    description: strings.navigation.promptDescription,
    icon: Sparkles,
  },
] satisfies Array<{
  id: Tab;
  label: string;
  description: string;
  icon: typeof Inbox;
}>;

interface Settings {
  outputDir: string;
  lastTab: Tab;
}

export default function App() {
  const isPromptWindow = window.location.hash === '#/prompt';
  const [tab, setTab] = useState<Tab>(isPromptWindow ? 'prompt' : 'inbox');
  const [outputDir, setOutputDir] = useState<string>('');
  const [convertSeedTasks, setConvertSeedTasks] = useState<ConvertTask[]>([]);
  const [readerContent, setReaderContent] = useState<string>('');
  const [readerTitle, setReaderTitle] = useState<string>('');
  const [readerPath, setReaderPath] = useState<string>('');
  const [readerKind, setReaderKind] = useState<ReadableFile['kind']>('markdown');

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
    setReaderKind(file.kind);
    setTab('reader');
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    window.api.saveSettings({ outputDir, lastTab: t });
  };

  const queueConvertTasks = (tasks: ConvertTask[]) => {
    setConvertSeedTasks(tasks);
    setTab('convert');
    window.api.saveSettings({ outputDir, lastTab: 'convert' });
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
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">{strings.navigation.productMark}</span>
          <span>
            <strong>{strings.navigation.productName}</strong>
            <small>{strings.navigation.productTagline}</small>
          </span>
        </div>

        <nav className="sidebar-tabs" aria-label={strings.navigation.label}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={tab === item.id ? 'active' : ''}
                aria-current={tab === item.id ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
                onClick={() => switchTab(item.id)}
              >
                <span className="nav-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <span className="nav-copy">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-trust">
          <strong>{strings.navigation.privacyTitle}</strong>
          <p>{strings.navigation.privacyDescription}</p>
        </div>
      </aside>
      <main className="content">
        {tab === 'reader' && (
          <ReaderPanel
            content={readerContent}
            title={readerTitle}
            path={readerPath}
            initialKind={readerKind}
            onLoad={setReaderContent}
            setTitle={setReaderTitle}
            setPath={setReaderPath}
            setKind={setReaderKind}
          />
        )}
        {tab === 'convert' && (
          <ConvertPanel
            outputDir={outputDir}
            setOutputDir={setOutputDir}
            seedTasks={convertSeedTasks}
            onSeedConsumed={() => setConvertSeedTasks([])}
          />
        )}
        {tab === 'inbox' && <InboxPanel onConvertRequested={queueConvertTasks} />}
        {tab === 'prompt' && (
          <PromptPanel />
        )}
      </main>
    </div>
  );
}
