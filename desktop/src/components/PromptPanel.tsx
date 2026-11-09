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
import { userFacingError } from '../shared/userFacingError';
import { DEFAULT_PROMPTS } from './prompt/defaultPrompts';
import {
  filterPrompts,
  groupPrompts,
  resolveSelectedPrompt,
  type PromptItem,
} from './prompt/presentation';

interface PromptPanelProps {
  mode?: 'embedded' | 'floating';
}

const COPY_FEEDBACK_DURATION_MS = 1_200;

export default function PromptPanel({ mode = 'embedded' }: PromptPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DEFAULT_PROMPTS[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [pinPending, setPinPending] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const copyFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFloating = mode === 'floating';
  const panelCollapsed = isFloating || detailsCollapsed;
  const searchShortcut = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K';

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

  useEffect(() => {
    window.api.getAlwaysOnTop()
      .then(setPinned)
      .catch((error: unknown) => setFailure(userFacingError(error, strings.prompt.pinFailed)));
  }, []);

  useEffect(() => () => {
    if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
  }, []);

  const prompts = useMemo(() => filterPrompts(DEFAULT_PROMPTS, query), [query]);
  const grouped = useMemo(() => groupPrompts(prompts), [prompts]);
  const selected = useMemo(() => resolveSelectedPrompt(prompts, selectedId), [prompts, selectedId]);

  const copy = async (item: PromptItem) => {
    setFailure(null);
    try {
      await window.api.copyText(item.content);
      setCopiedId(item.id);
      setSelectedId(item.id);
      if (copyFeedbackTimer.current) clearTimeout(copyFeedbackTimer.current);
      copyFeedbackTimer.current = setTimeout(
        () => setCopiedId((currentId) => (currentId === item.id ? null : currentId)),
        COPY_FEEDBACK_DURATION_MS,
      );
    } catch (error) {
      setFailure(userFacingError(error, strings.prompt.copyFailed));
    }
  };

  const togglePinned = async () => {
    setPinPending(true);
    setFailure(null);
    try {
      const actualPinned = await window.api.setAlwaysOnTop(!pinned);
      setPinned(actualPinned);
    } catch (error) {
      setFailure(userFacingError(error, strings.prompt.pinFailed));
    } finally {
      setPinPending(false);
    }
  };

  const openPromptWindow = async () => {
    setFailure(null);
    try {
      await window.api.openPromptWindow();
    } catch (error) {
      setFailure(userFacingError(error, strings.prompt.openWindowFailed));
    }
  };

  return (
    <div className={`prompt-panel ${panelCollapsed ? 'mini' : ''} ${isFloating ? 'floating' : ''}`}>
      <section className="prompt-main">
        <div className="prompt-header">
          <div>
            <span className="panel-eyebrow">{strings.navigation.prompt}</span>
            <h1><Sparkles size={20} className="header-icon" />{strings.prompt.title}</h1>
            <p>{strings.prompt.description}</p>
            <p className="prompt-privacy">{strings.prompt.synced}</p>
          </div>
          <div className="prompt-actions">
            {!isFloating && (
              <button
                className="btn-icon"
                onClick={() => void openPromptWindow()}
                title={strings.prompt.openWindow}
                aria-label={strings.prompt.openWindow}
              >
                <ExternalLink size={16} />
              </button>
            )}
            <button
              className={`btn-icon ${pinned ? 'active' : ''}`}
              onClick={() => void togglePinned()}
              title={pinned ? strings.prompt.pinned : strings.prompt.pin}
              aria-label={pinned ? strings.prompt.pinned : strings.prompt.pin}
              aria-pressed={pinned}
              disabled={pinPending}
            >
              <Pin size={16} />
            </button>
            {!isFloating && (
              <button
                className="btn-icon"
                onClick={() => setDetailsCollapsed((collapsed) => !collapsed)}
                title={detailsCollapsed ? strings.prompt.expand : strings.prompt.collapse}
                aria-label={detailsCollapsed ? strings.prompt.expand : strings.prompt.collapse}
                aria-expanded={!detailsCollapsed}
              >
                {detailsCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
            )}
          </div>
        </div>

        {failure && <div className="reader-error" role="alert">{failure}</div>}

        <div className="prompt-search">
          <Search size={16} className="search-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.prompt.search}
            autoFocus
          />
          <span className="kbd-shortcut">{searchShortcut}</span>
        </div>

        <div className="prompt-groups">
          {grouped.length === 0 && <div className="prompt-empty">{strings.prompt.noMatch}</div>}
          {grouped.map(([group, items]) => (
            <div className="prompt-group" key={group}>
              <h3>{group}</h3>
              {items.map((item) => (
                <div className={`prompt-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id}>
                  <button className="prompt-row-select" onClick={() => setSelectedId(item.id)}>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.content}</small>
                    </span>
                  </button>
                  <button
                    className="prompt-row-copy"
                    onClick={() => void copy(item)}
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

      {!panelCollapsed && selected && (
        <aside className="prompt-detail">
          <div className="detail-title">
            <h3>{selected.title}</h3>
            <button className="btn-primary" onClick={() => void copy(selected)}>
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
