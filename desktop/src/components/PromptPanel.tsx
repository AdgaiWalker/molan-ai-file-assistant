import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Pin,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { strings } from '../constants/strings';

interface PromptItem {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly group: string;
  readonly tags: readonly string[];
}

interface PromptPanelProps {
  compact?: boolean;
}

const DEFAULT_PROMPTS: readonly PromptItem[] = strings.prompt.defaults;

export default function PromptPanel({ compact = false }: PromptPanelProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PromptItem>(DEFAULT_PROMPTS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [mini, setMini] = useState(compact);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const prompts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEFAULT_PROMPTS;
    return DEFAULT_PROMPTS.filter((item) =>
      [item.title, item.content, item.group, item.tags.join(' ')].join(' ').toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PromptItem[]>();
    for (const item of prompts) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [prompts]);

  const copy = async (item: PromptItem) => {
    await window.api.copyText(item.content);
    setCopiedId(item.id);
    setSelected(item);
    setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1200);
  };

  const togglePinned = async () => {
    const next = !pinned;
    setPinned(next);
    await window.api.setAlwaysOnTop(next);
  };

  const openPromptWindow = async () => {
    await window.api.openPromptWindow();
  };

  return (
    <div className={`prompt-panel ${mini ? 'mini' : ''} ${compact ? 'compact' : ''}`}>
      <section className="prompt-main">
        <div className="prompt-header">
          <div>
            <span className="panel-eyebrow">{strings.navigation.prompt}</span>
            <h1><Sparkles size={20} className="header-icon" />{strings.prompt.title}</h1>
            <p>{strings.prompt.description}</p>
            <p className="prompt-privacy">{strings.prompt.synced}</p>
          </div>
          <div className="prompt-actions">
            {!compact && (
              <button className="btn-icon" onClick={openPromptWindow} title={strings.prompt.openWindow}>
                <ExternalLink size={16} />
              </button>
            )}
            <button
              className={`btn-icon ${pinned ? 'active' : ''}`}
              onClick={togglePinned}
              title={pinned ? strings.prompt.pinned : strings.prompt.pin}
              aria-pressed={pinned}
            >
              <Pin size={16} />
            </button>
            <button
              className="btn-icon"
              onClick={() => setMini((cur) => !cur)}
              title={mini ? strings.prompt.expand : strings.prompt.collapse}
            >
              {mini ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>
        </div>

        <div className="prompt-search">
          <Search size={16} className="search-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.prompt.search}
            autoFocus
          />
          <span className="kbd-shortcut">⌘K</span>
        </div>

        <div className="prompt-groups">
          {grouped.length === 0 && <div className="prompt-empty">{strings.prompt.noMatch}</div>}
          {grouped.map(([group, items]) => (
            <div className="prompt-group" key={group}>
              <h3>{group}</h3>
              {items.map((item) => (
                <div className={`prompt-row ${selected.id === item.id ? 'selected' : ''}`} key={item.id}>
                  <button className="prompt-row-select" onClick={() => setSelected(item)}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.content}</small>
                    </span>
                  </button>
                  <button
                    className="prompt-row-copy"
                    onClick={() => copy(item)}
                    title={strings.prompt.copy}
                    aria-label={`${strings.prompt.copy}：${item.title}`}
                  >
                    {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {!mini && (
        <aside className="prompt-detail">
          <div className="detail-title">
            <h3>{selected.title}</h3>
            <button className="btn-primary" onClick={() => copy(selected)}>
              {copiedId === selected.id ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedId === selected.id ? strings.prompt.copied : strings.prompt.copy}</span>
            </button>
          </div>
          <p>{selected.content}</p>
          <span className="detail-section-label">{strings.prompt.tags}</span>
          <div className="tag-row">
            {selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        </aside>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {copiedId ? strings.prompt.copied : ''}
      </span>
    </div>
  );
}
