import { Typography } from '@l4/ui/Typography';
import { Input } from '@l4/ui/Input';
import { Select } from '@l4/ui/Select';
import { Spinner } from '@l4/ui/Spinner';
import { Button } from '@l4/ui/Button';
import { classNames } from '@/utils/classNames';
import { getSemanticDisplayText } from './semanticDisplay';
import type {
  SemanticDiscoveryWindow,
  SemanticSearchDepth,
  SemanticSearchResponse,
  SemanticSearchScope,
} from '@l2/api-docs/semantic';
import type { SemanticDiscoveryView } from '@l2/commander/semanticDiscoveryViewModel';

interface SemanticSearchProps {
  query: string;
  scope: SemanticSearchScope;
  selectedChats: string[];
  window: SemanticDiscoveryWindow;
  depth: SemanticSearchDepth;
  sourceLimit: number;
  rerank: boolean;
  discoveryView: SemanticDiscoveryView;
  searchResults: SemanticSearchResponse | null;
  searchLoading: boolean;
  searchError?: string | null;
  navigationNote?: string | null;
  privacyOn: boolean;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  onSubmitSearch: () => void;
  onScopeChange: (scope: SemanticSearchScope) => void;
  onSelectedChatsChange: (chats: string[]) => void;
  onWindowChange: (window: SemanticDiscoveryWindow) => void;
  onDepthChange: (depth: SemanticSearchDepth) => void;
  onSourceLimitChange: (limit: number) => void;
  onRerankChange: (rerank: boolean) => void;
  onSelectResult: (result: SemanticSearchResponse["results"][number]) => void;
  onRetry?: () => void;
}

export function SemanticSearch({
  query,
  scope,
  selectedChats,
  window,
  depth,
  sourceLimit,
  rerank,
  discoveryView,
  searchResults,
  searchLoading,
  searchError,
  navigationNote,
  privacyOn,
  onQueryChange,
  onSearch,
  onSubmitSearch,
  onScopeChange,
  onSelectedChatsChange,
  onWindowChange,
  onDepthChange,
  onSourceLimitChange,
  onRerankChange,
  onSelectResult,
  onRetry,
}: SemanticSearchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onQueryChange(value);
    onSearch(value);
  };

  const exampleQueries = [
    '上个月和老板讨论了什么',
    '关于预算的会议记录',
    '谁提到了项目上线时间',
  ];
  const totalLabel = searchResults
    ? searchResults.count ?? searchResults.totalCount ?? searchResults.results.length
    : 0;
  const rerankCopy = searchResults?.rerank?.enabled
    ? searchResults.rerank.error
      ? `重排失败：${searchResults.rerank.error}`
      : searchResults.rerank.applied
        ? "已重排"
        : "已尝试重排"
    : "未重排";

  const toggleSelectedChat = (chat: string) => {
    const next = selectedChats.includes(chat)
      ? selectedChats.filter((entry) => entry !== chat)
      : [...selectedChats, chat];
    onSelectedChatsChange(next);
  };

  return (
    <div className="semantic-search">
      <div className="semantic-search__header">
        <div className="semantic-search__query-row">
          <Input
            aria-label="语义搜索查询"
            placeholder="用自然语言搜索聊天记录..."
            value={query}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSubmitSearch();
            }}
          />
          <Button type="button" variant="primary" size="sm" loading={searchLoading} onClick={onSubmitSearch}>
            搜索
          </Button>
        </div>
        <div className="semantic-search__filters" aria-label="搜索过滤器">
          <label className="developer-field">
            <span>范围</span>
            <Select
              controlSize="sm"
              value={scope}
              onChange={(event) => onScopeChange(event.currentTarget.value as SemanticSearchScope)}
            >
              <option value="contact">当前会话</option>
              <option value="selected">自选会话</option>
              <option value="all">全部会话</option>
            </Select>
          </label>
          <label className="developer-field">
            <span>时间</span>
            <Select
              controlSize="sm"
              value={window}
              onChange={(event) => onWindowChange(event.currentTarget.value)}
            >
              {discoveryView.windowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="developer-field">
            <span>深度</span>
            <Select
              controlSize="sm"
              value={depth}
              onChange={(event) => onDepthChange(event.currentTarget.value)}
            >
              {discoveryView.depthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="developer-field">
            <span>来源</span>
            <Select
              controlSize="sm"
              value={String(sourceLimit)}
              onChange={(event) => onSourceLimitChange(Number(event.currentTarget.value))}
            >
              {[4, 6, 8, 12, 20].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
          <label className="semantic-search__check">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(event) => onRerankChange(event.currentTarget.checked)}
            />
            重排
          </label>
        </div>
        {scope === "selected" && (
          <div className="semantic-search__selected" aria-label="选择搜索会话">
            {discoveryView.conversationOptions.length === 0 ? (
              <Typography variant="caption" color="var(--text-muted)">
                暂无可选会话。
              </Typography>
            ) : (
              discoveryView.conversationOptions.slice(0, 8).map((option) => (
                <label key={option.value} className="semantic-search__selected-item">
                  <input
                    type="checkbox"
                    checked={selectedChats.includes(option.value)}
                    onChange={() => toggleSelectedChat(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            )}
          </div>
        )}
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
              <button
                type="button"
                key={i}
                onClick={() => { onQueryChange(eq); onSearch(eq); }}
                className="semantic-search__example"
              >
                {eq}
              </button>
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
            <Typography variant="caption" color="var(--text-muted)">
              可以扩大时间窗口、切换到全部会话，或关闭重排后重试。
            </Typography>
          </div>
        )}

        {searchResults && (
          <div>
            <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__caption">
              找到 {totalLabel} 条结果 · 来源 {searchResults.sourceCount ?? 0} · {searchResults.window || window} · {searchResults.depth || depth} · {rerankCopy}
            </Typography>
            {navigationNote && (
              <Typography variant="caption" color="var(--color-text-secondary)" className="semantic-search__note">
                {navigationNote}
              </Typography>
            )}
            {searchResults.results.map((r, i) => (
              (() => {
                const sender = getSemanticDisplayText(r.sender, privacyOn, "未知发送者");
                const chatLabel = getSemanticDisplayText(r.chatName || r.chat, privacyOn, "未知会话");
                const content = getSemanticDisplayText(r.content, privacyOn);
                const score = r.relevanceScore <= 1 ? r.relevanceScore * 100 : r.relevanceScore;
                return (
              <button
                type="button"
                key={i}
                onClick={() => {
                  if (r.chat) onSelectResult(r);
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
              </button>
                );
              })()
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
