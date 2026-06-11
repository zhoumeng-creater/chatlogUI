import { Button, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type { SearchResults, SearchStatus } from "@l2/data-clerk/stores/useSearchStore";
import { maskDisplayText } from "@l3/chat/conversationDisplay";

interface SearchResultsPaneProps {
  query: string;
  results: SearchResults | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
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
  results,
  status,
  loading,
  error,
  activeResultId,
  privacyOn,
  onOpenResult,
  onLoadMore,
  onRetry,
  onClear,
}: SearchResultsPaneProps) {
  if (status === "invalid" && query.length > 0) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          请输入搜索关键词
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          搜索不会向后端提交空白查询。
        </Typography>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          搜索已取消
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          输入关键词后可以重新搜索聊天记录。
        </Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workbench-error-state" role="alert">
        <Typography variant="label" weight={700}>
          搜索失败
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {error}
        </Typography>
        <div className="search-result-pane__actions">
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

  if (!results) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          输入关键词开始搜索
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          搜索不会向后端提交空白查询。可以先选择范围和消息类型。
        </Typography>
      </div>
    );
  }

  if (status === "empty" || (results.messages.length === 0 && query.trim())) {
    return (
      <div className="workbench-empty-state">
        <Typography variant="label" weight={700}>
          没有搜索结果
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
      {results.messages.map((message) => {
        const active = message.id === activeResultId;
        const label = message.sender || message.chat || message.username;
        const sender = privacyOn ? maskDisplayText(label) : label;
        const content = privacyOn ? maskDisplayText(message.content) : message.content;

        return (
          <div key={message.id} role="listitem">
            <button
              type="button"
              className={classNames("search-result-row", active && "search-result-row--active")}
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
          </div>
        );
      })}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          loading={loading}
          onClick={onLoadMore}
          className="search-result-pane__load-more"
        >
          加载更多搜索结果
        </Button>
      )}
    </div>
  );
}
