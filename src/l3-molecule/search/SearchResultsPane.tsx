import { Button, Typography } from "@l4/ui";
import type { SearchResults, SearchStatus } from "@l2/data-clerk/stores/useSearchStore";
import { maskDisplayText } from "@l3/chat/conversationDisplay";

interface SearchResultsPaneProps {
  query: string;
  status: SearchStatus;
  results: SearchResults | null;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  navigationNotice: string | null;
  privacyOn: boolean;
  onOpenResult: (message: SearchResults["messages"][number]) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onClear: () => void;
}

function formatSearchTime(message: SearchResults["messages"][number]): string {
  const rawTime = message.time
    ? new Date(message.time)
    : new Date(message.timestamp > 1_000_000_000_000 ? message.timestamp : message.timestamp * 1000);

  if (Number.isNaN(rawTime.getTime())) return "";
  return rawTime.toLocaleString("zh-CN");
}

export function SearchResultsPane({
  query,
  status,
  results,
  loading,
  error,
  activeResultId,
  navigationNotice,
  privacyOn,
  onOpenResult,
  onLoadMore,
  onRetry,
  onClear,
}: SearchResultsPaneProps) {
  if (status === "idle") return null;

  if (status === "invalid") {
    return (
      <div className="workbench-empty-state" role="status">
        <Typography variant="label" weight={700}>
          输入关键词后搜索。
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          输入至少一个非空字符后按 Enter，或等待自动搜索。
        </Typography>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="workbench-empty-state" role="status">
        <Typography variant="label" weight={700}>
          搜索已取消。
        </Typography>
      </div>
    );
  }

  if (error || status === "error") {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>
          搜索失败
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {error}
        </Typography>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            清除
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !results) {
    return (
      <div className="workbench-empty-state" role="status" aria-live="polite">
        <Typography variant="label" weight={700}>
          正在搜索...
        </Typography>
      </div>
    );
  }

  if (!results) return null;

  if (status === "empty" || (results.messages.length === 0 && query.trim())) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          没有找到匹配消息。
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          换一个关键词或放宽搜索范围。
        </Typography>
      </div>
    );
  }

  const hasMore = results.offset + results.count < results.totalCount;

  return (
    <div className="search-result-pane" role="list" aria-label="搜索结果">
      {navigationNotice && (
        <div className="workbench-empty-state" role="status" aria-live="polite">
          <Typography variant="body" color="var(--text-secondary)">
            {navigationNotice}
          </Typography>
        </div>
      )}
      {results.messages.map((message) => {
        const active = message.id === activeResultId;
        const label = message.sender || message.chat || message.username;
        const sender = privacyOn ? maskDisplayText(label) : label;
        const content = privacyOn ? maskDisplayText(message.content) : message.content;

        return (
          <button
            key={message.id}
            type="button"
            role="listitem"
            className={`search-result-row${active ? " search-result-row--active" : ""}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onOpenResult(message)}
          >
            <div className="search-result-row__meta">
              <Typography
                variant="label"
                weight={700}
                className="search-result-row__sender"
              >
                {sender}
              </Typography>
              <Typography
                variant="caption"
                color="var(--text-muted)"
                className="search-result-row__time"
              >
                {formatSearchTime(message)}
              </Typography>
            </div>
            <Typography
              variant="body"
              color="var(--text-secondary)"
              className="search-result-row__content"
            >
              {content || "[空消息]"}
            </Typography>
          </button>
        );
      })}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          loading={loading}
          onClick={onLoadMore}
          style={{ width: "100%", borderRadius: 0 }}
        >
          加载更多搜索结果
        </Button>
      )}
    </div>
  );
}
