import { useEffect, useState } from 'react';
import { Send, Square, X } from 'lucide-react';
import { Button } from '@l4/ui/Button';

export interface QAComposerDraft {
  query: string;
  scope: 'contact' | 'selected' | 'all';
  window: string;
  retrievalDepth: string;
  sourceLimit: number;
  topN: number;
  chats?: string[];
  includeHistory?: boolean;
  entityOverride?: string;
}

export interface QAEntityOverride {
  value: string;
  label: string;
}

interface QAInputProps {
  onSend: (draft: QAComposerDraft) => void;
  onStop: () => void;
  disabled: boolean;
  currentContact?: string;
  recentChats?: QARecentChatOption[];
  entityOverride?: QAEntityOverride | null;
  onClearEntityOverride?: () => void;
}

export interface QARecentChatOption {
  chat: string;
  label: string;
}

export function QAInput({
  onSend,
  onStop,
  disabled,
  currentContact,
  recentChats = [],
  entityOverride,
  onClearEntityOverride,
}: QAInputProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'selected' | 'all'>(currentContact ? 'contact' : 'all');
  const [window, setWindow] = useState('7d');
  const [retrievalDepth, setRetrievalDepth] = useState('standard');
  const [sourceLimit, setSourceLimit] = useState(50);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [includeHistory, setIncludeHistory] = useState(false);

  useEffect(() => {
    if (!currentContact && scope === 'contact') setScope('all');
  }, [currentContact, scope]);

  useEffect(() => {
    const available = new Set(recentChats.map((chat) => chat.chat));
    setSelectedChats((items) => {
      const next = items.filter((item) => available.has(item));
      return next.length === items.length && next.every((item, index) => item === items[index])
        ? items
        : next;
    });
  }, [recentChats]);

  const handleSend = () => {
    if (!query.trim() || disabled) return;
    if (scope === 'selected' && selectedChats.length === 0) return;
    onSend({
      query: query.trim(),
      scope,
      window,
      retrievalDepth,
      sourceLimit,
      topN: topNForDepth(retrievalDepth),
      chats: scope === 'selected' ? selectedChats : undefined,
      includeHistory,
      entityOverride: entityOverride?.value,
    });
    setQuery('');
    onClearEntityOverride?.();
  };
  const sendDisabled = !disabled && (!query.trim() || (scope === 'selected' && selectedChats.length === 0));

  return (
    <div className="qa-input">
      <div className="qa-input__sourcebar" aria-label="问答数据源">
        <div className="qa-input__scope" role="radiogroup" aria-label="问答范围">
          <label className="qa-input__option">
            <input
              type="radio"
              checked={scope === 'contact'}
              onChange={() => setScope('contact')}
              className="qa-input__radio"
              disabled={!currentContact}
            />
            当前联系人
          </label>
          <label className="qa-input__option">
            <input
              type="radio"
              checked={scope === 'selected'}
              onChange={() => setScope('selected')}
              className="qa-input__radio"
              disabled={recentChats.length === 0}
            />
            选定会话
          </label>
          <label className="qa-input__option">
            <input
              type="radio"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="qa-input__radio"
            />
            全部会话
          </label>
        </div>
        <label className="qa-input__history">
          <input
            type="checkbox"
            checked={includeHistory}
            onChange={(event) => setIncludeHistory(event.target.checked)}
            className="qa-input__checkbox"
          />
          上下文
        </label>
        <label className="qa-input__select-label">
          时间窗
          <select
            value={window}
            onChange={(event) => setWindow(event.target.value)}
            className="qa-input__select"
          >
            <option value="today">今天</option>
            <option value="yesterday">昨天</option>
            <option value="7d">近七天</option>
            <option value="30d">近一月</option>
            <option value="90d">近三月</option>
            <option value="1y">近一年</option>
            <option value="all">全部</option>
          </select>
        </label>
        <label className="qa-input__select-label">
          深度
          <select
            value={retrievalDepth}
            onChange={(event) => setRetrievalDepth(event.target.value)}
            className="qa-input__select"
          >
            <option value="standard">标准</option>
            <option value="deep">深入</option>
            <option value="wide">广泛</option>
          </select>
        </label>
        <label className="qa-input__select-label qa-input__limit-label">
          会话
          <input
            type="number"
            min={1}
            max={500}
            value={sourceLimit}
            onChange={(event) => setSourceLimit(normalizeSourceLimit(event.target.valueAsNumber))}
            className="qa-input__number"
          />
        </label>
      </div>

      {scope === 'selected' && recentChats.length > 0 && (
        <div className="qa-input__selected-list" aria-label="选定会话列表">
          {recentChats.map((item) => (
            <label key={item.chat} className="qa-input__selected-option">
              <input
                type="checkbox"
                checked={selectedChats.includes(item.chat)}
                onChange={() => {
                  setSelectedChats((items) =>
                    items.includes(item.chat)
                      ? items.filter((chat) => chat !== item.chat)
                      : [...items, item.chat].slice(-4),
                  );
                }}
                className="qa-input__checkbox"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      )}

      {entityOverride && (
        <div className="qa-input__entity">
          <span>实体：{entityOverride.label}</span>
          <button
            type="button"
            className="qa-input__entity-clear"
            onClick={onClearEntityOverride}
            aria-label="清除实体限定"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="qa-input__row">
        <textarea
          className="qa-input__textarea"
          placeholder={
            scope === 'contact'
              ? `基于 ${currentContact || '当前联系人'} 提问...`
              : scope === 'selected'
                ? '基于选定会话提问...'
                : '基于全部会话提问...'
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          rows={3}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={disabled ? onStop : handleSend}
          disabled={sendDisabled}
          className="qa-input__button"
        >
          {disabled ? <><Square size={14} />停止</> : <><Send size={14} />发送</>}
        </Button>
      </div>
    </div>
  );
}

function topNForDepth(depth: string): number {
  if (depth === 'wide') return 30;
  if (depth === 'deep') return 16;
  return 8;
}

function normalizeSourceLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 50;
  return Math.max(1, Math.min(500, Math.round(value)));
}
