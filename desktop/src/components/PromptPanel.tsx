import React, { useMemo, useState } from 'react';
import {
  Search,
  Pin,
  Settings,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Plus,
  ExternalLink,
  FolderOpen,
  Combine,
  Pencil,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';

interface PromptItem {
  id: string;
  title: string;
  content: string;
  group: string;
  tags: string[];
}

interface PromptPanelProps {
  compact?: boolean;
}

const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: 'prd-breakdown',
    title: 'PRD 需求拆解模板',
    group: '最近复制',
    tags: ['prd', '需求分析'],
    content: '请帮我把这份 PRD 拆解为功能、用户需求、核心流程、边界条件和可执行 to-do。',
  },
  {
    id: 'api-doc',
    title: '接口文档解读',
    group: '最近复制',
    tags: ['api', '文档'],
    content: '请阅读这份接口文档，整理核心接口、参数、返回结构、错误码和调用注意事项。',
  },
  {
    id: 'code-review',
    title: '代码 Review 清单',
    group: '收藏',
    tags: ['code', 'review', 'quality'],
    content: '请对以下代码进行 Review，重点关注可读性、性能、安全性、异常处理，并给出改进建议。',
  },
  {
    id: 'unit-test',
    title: '生成单元测试',
    group: '开发常用',
    tags: ['test'],
    content: '请为这段代码生成单元测试，覆盖正常路径、边界条件和异常路径。',
  },
  {
    id: 'refactor',
    title: '重构建议',
    group: '开发常用',
    tags: ['refactor'],
    content: '请提出这段代码的重构建议，优先提升可读性和可维护性，不改变现有行为。',
  },
];

export default function PromptPanel({ compact = false }: PromptPanelProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PromptItem>(DEFAULT_PROMPTS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [mini, setMini] = useState(compact);

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
            <h2><Sparkles size={18} className="header-icon" />墨览快贴</h2>
            <p className="sync-dot"><span className="sync-dot-icon" />已同步 · 手机与电脑</p>
          </div>
          <div className="prompt-actions">
            {!compact && (
              <button className="btn-icon" onClick={openPromptWindow} title="独立窗">
                <ExternalLink size={16} />
              </button>
            )}
            <button className={`btn-icon ${pinned ? 'active' : ''}`} onClick={togglePinned} title={pinned ? '已置顶' : '置顶'}>
              <Pin size={16} />
            </button>
            <button className="btn-icon" onClick={() => setMini((cur) => !cur)} title={mini ? '展开' : 'Mini'}>
              {mini ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button className="btn-icon" title="设置">
              <Settings size={16} />
            </button>
          </div>
        </div>

        <div className="prompt-search">
          <Search size={16} className="search-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索提示词"
            autoFocus
          />
          <span className="kbd-shortcut">Ctrl K</span>
        </div>

        <div className="prompt-groups">
          {grouped.map(([group, items]) => (
            <div className="prompt-group" key={group}>
              <h3>{group}</h3>
              {items.map((item) => (
                <button
                  className={`prompt-row ${selected.id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  onClick={() => setSelected(item)}
                  onDoubleClick={() => copy(item)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.content}</small>
                  </span>
                  <em onClick={(event) => { event.stopPropagation(); copy(item); }} title="复制">
                    {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                  </em>
                </button>
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
              <span>{copiedId === selected.id ? '已复制' : '复制'}</span>
            </button>
          </div>
          <p>{selected.content}</p>
          <div className="variable-row">
            <span>{'{{文件内容}}'}</span>
            <span>{'{{代码片段}}'}</span>
            <span>{'{{JSON}}'}</span>
          </div>
          <div className="tag-row">
            {selected.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
          <div className="detail-actions">
            <button className="btn-secondary"><Combine size={14} />组合</button>
            <button className="btn-secondary"><Pencil size={14} />编辑</button>
            <button className="btn-secondary"><MoreHorizontal size={14} /></button>
          </div>
        </aside>
      )}

      <div className="prompt-footer">
        <button className="btn-ghost"><Plus size={14} />新建提示词</button>
        <button className="btn-ghost" onClick={openPromptWindow}><ExternalLink size={14} />打开墨览</button>
        <button className="btn-ghost"><FolderOpen size={14} />打开输出文件夹</button>
      </div>
    </div>
  );
}
