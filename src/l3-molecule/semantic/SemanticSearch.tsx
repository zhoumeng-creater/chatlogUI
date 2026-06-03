import { useState } from 'react';
import { Typography } from '@l4/ui/Typography';
import { Input } from '@l4/ui/Input';
import { Spinner } from '@l4/ui/Spinner';
import { Button } from '@l4/ui/Button';
import { classNames } from '@/utils/classNames';
import { getSemanticDisplayText } from './semanticDisplay';

interface SemanticSearchResultItemView {
  chat: string;
  chatName?: string;
  sender: string;
  senderId?: string;
  time: string;
  content: string;
  relevanceScore: number;
  localId: number;
}

interface SemanticSearchResultsView {
  count?: number;
  totalCount?: number;
  results: SemanticSearchResultItemView[];
}

interface SemanticSearchProps {
  searchResults: SemanticSearchResultsView | null;
  searchLoading: boolean;
  searchError?: string | null;
  privacyOn: boolean;
  onSearch: (query: string, scope?: "contact" | "all") => void;
  onSelectResult: (chat: string, label: string) => void;
  onRetry?: () => void;
}

export function SemanticSearch({
  searchResults,
  searchLoading,
  searchError,
  privacyOn,
  onSearch,
  onSelectResult,
  onRetry,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'contact' | 'all'>('contact');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onSearch(v, scope);
  };

  const exampleQueries = [
    '上个月和老板讨论了什么',
    '关于预算的会议记录',
    '谁提到了项目上线时间',
  ];

  return (
    <div className="semantic-search">
      <div className="semantic-search__header">
        <Input
          placeholder="用自然语言搜索聊天记录..."
          value={query}
          onChange={handleChange}
        />
        <div className="semantic-search__scope">
          <label className="semantic-search__option">
            <input
              type="radio"
              checked={scope === 'contact'}
              onChange={() => setScope('contact')}
              className="semantic-search__radio"
            />
            当前联系人
          </label>
          <label className="semantic-search__option">
            <input
              type="radio"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
              className="semantic-search__radio"
            />
            全部联系人
          </label>
        </div>
      </div>

      <div className="semantic-search__body">
        {searchLoading && (
          <div className="semantic-search__loading">
            <Spinner size={20} />
          </div>
        )}

        {!query && !searchResults && (
          <div className="semantic-search__examples">
            <Typography variant="caption" color="var(--color-text-tertiary)" className="semantic-search__caption">
              示例查询:
            </Typography>
            {exampleQueries.map((eq, i) => (
              <div
                key={i}
                onClick={() => { setQuery(eq); onSearch(eq, scope); }}
                className="semantic-search__example"
              >
                {eq}
              </div>
            ))}
          </div>
        )}

        {searchError && (
          <div className="semantic-search__error" role="alert">
            <Typography variant="body" color="var(--danger)" className="semantic-search__caption">
              {searchError}
            </Typography>
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                重试
              </Button>
            )}
          </div>
        )}

        {query && !searchLoading && !searchError && searchResults && searchResults.results.length === 0 && (
          <div className="semantic-search__empty">
            <Typography variant="body" color="var(--text-secondary)">
              没有找到语义匹配结果。
            </Typography>
          </div>
        )}

        {searchResults && (
          <div>
            <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__caption">
              找到 {searchResults.count ?? searchResults.totalCount ?? searchResults.results.length} 条结果
            </Typography>
            {searchResults.results.map((r, i) => (
              (() => {
                const sender = getSemanticDisplayText(r.sender, privacyOn, "未知发送者");
                const chatLabel = getSemanticDisplayText(r.chatName || r.chat, privacyOn, "未知会话");
                const content = getSemanticDisplayText(r.content, privacyOn);
                const score = r.relevanceScore <= 1 ? r.relevanceScore * 100 : r.relevanceScore;
                return (
              <div
                key={i}
                onClick={() => {
                  if (r.chat) onSelectResult(r.chat, r.chatName || r.chat);
                }}
                className={classNames(
                  "semantic-search__row",
                  r.chat && "semantic-search__row--clickable",
                )}
              >
                <div className="semantic-search__row-head">
                  <Typography variant="caption" weight={600}>
                    {chatLabel} · {sender}
                  </Typography>
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {r.time}
                  </Typography>
                </div>
                <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__snippet">
                  {content.length > 100 ? content.slice(0, 100) + '...' : content}
                </Typography>
                <div className="semantic-search__score">
                  <progress
                    className="semantic-search__score-meter"
                    value={Math.max(0, Math.min(100, score))}
                    max={100}
                    aria-label={`相关度 ${Math.round(score)}%`}
                  />
                  <Typography variant="caption" color="var(--color-text-quaternary)">
                    {Math.round(score)}%
                  </Typography>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
