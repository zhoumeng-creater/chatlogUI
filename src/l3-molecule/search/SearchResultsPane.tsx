import { useEffect, useRef } from "react";
import { Button, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import { maskDisplayText } from "@/utils/privacyDisplay";
import type { BusinessExportActionView } from "@l2/commander/useBusinessExportCommander";
import type { SearchResults, SearchStatus } from "@l2/data-clerk/stores/useSearchStore";
import type { SearchActiveFilterChip, SearchAdvancedFilterField } from "@l2/commander/searchAdvancedFilters";
import { ExportActionButton } from "@l3/export";
import { SearchActiveFilterChips } from "./SearchActiveFilterChips";
import { SearchHitNavigator } from "./SearchHitNavigator";
import { SearchStatusAnnouncer } from "./SearchStatusAnnouncer";

export interface SearchResultsPaneSnippetSegment {
  text: string;
  highlight: boolean;
}

export interface SearchResultsPaneViewModel {
  sortLabel: string;
  groupLabel: string;
  navigator: {
    label: string;
    hasPrevious: boolean;
    hasNext: boolean;
  };
  groups: Array<{
    key: string;
    label: string | null;
    items: Array<{
      message: SearchResults["messages"][number];
      senderLabel: string;
      snippetSegments: SearchResultsPaneSnippetSegment[];
      active: boolean;
    }>;
  }>;
}

interface SearchResultsPaneProps {
  query: string;
  results: SearchResults | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  privacyOn: boolean;
  viewModel: SearchResultsPaneViewModel | null;
  activeFilterChips?: SearchActiveFilterChip[];
  exportAction?: BusinessExportActionView;
  onOpenResult: (message: SearchResults["messages"][number]) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onClear: () => void;
  onCancelSearch?: () => void;
  onSetActiveResultId?: (id: string | null) => void;
  onMoveHit?: (direction: "previous" | "next" | "first" | "last") => void;
  onClearAdvancedFilter?: (field: SearchAdvancedFilterField) => void;
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
  viewModel,
  activeFilterChips = [],
  exportAction,
  onOpenResult,
  onLoadMore,
  onRetry,
  onClear,
  onCancelSearch,
  onSetActiveResultId,
  onMoveHit,
  onClearAdvancedFilter,
}: SearchResultsPaneProps) {
  const resultButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!activeResultId) return;
    resultButtonRefs.current.get(activeResultId)?.focus();
  }, [activeResultId]);

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

  if (status === "cancelled" && !results) {
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

  const resolvedViewModel = viewModel ?? createFallbackViewModel(results, privacyOn);
  const hasMore = results.offset + results.count < results.totalCount;

  return (
    <div className="search-result-pane" aria-label="搜索结果">
      <SearchStatusAnnouncer
        status={status}
        loading={loading}
        totalCount={results.totalCount}
        loadedCount={results.messages.length}
        query={privacyOn ? "" : query}
      />
      <div className="search-result-pane__header">
        <div>
          <Typography variant="label" weight={700}>
            {status === "cancelled" ? "搜索已取消" : loading ? "正在搜索" : "搜索结果"}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {status === "cancelled"
              ? `已保留 ${results.messages.length} / 共 ${results.totalCount}`
              : `已加载 ${results.messages.length} / 共 ${results.totalCount}`}
          </Typography>
          <div className="search-result-pane__meta" aria-label="搜索结果整理方式">
            <span>排序：{resolvedViewModel.sortLabel}</span>
            <span>分组：{resolvedViewModel.groupLabel}</span>
          </div>
        </div>
        <div className="search-result-pane__header-actions">
          {loading && (
            <Button variant="secondary" size="sm" onClick={onCancelSearch}>
              取消搜索
            </Button>
          )}
          {exportAction && <ExportActionButton {...exportAction} />}
        </div>
      </div>
      <SearchActiveFilterChips
        chips={activeFilterChips}
        onClear={(field) => onClearAdvancedFilter?.(field)}
      />
      <SearchHitNavigator
        label={resolvedViewModel.navigator.label}
        hasPrevious={resolvedViewModel.navigator.hasPrevious}
        hasNext={resolvedViewModel.navigator.hasNext}
        onPrevious={() => onMoveHit?.("previous")}
        onNext={() => onMoveHit?.("next")}
      />
      <div role="list" aria-label="搜索结果列表">
        {resolvedViewModel.groups.map((group) => (
          <div key={group.key} className="search-result-group">
            {group.label && (
              <Typography
                variant="caption"
                color="var(--text-secondary)"
                className="search-result-group__label"
              >
                {group.label}
              </Typography>
            )}
            {group.items.map((item) => {
              const { message } = item;

              return (
                <div key={message.id} role="listitem">
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) {
                        resultButtonRefs.current.set(message.id, node);
                      } else {
                        resultButtonRefs.current.delete(message.id);
                      }
                    }}
                    className={classNames("search-result-row", item.active && "search-result-row--active")}
                    aria-current={item.active ? "true" : undefined}
                    tabIndex={item.active ? 0 : -1}
                    onFocus={() => onSetActiveResultId?.(message.id)}
                    onClick={() => onOpenResult(message)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        onMoveHit?.("next");
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        onMoveHit?.("previous");
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        onMoveHit?.("first");
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        onMoveHit?.("last");
                      }
                      if (event.key === "Enter") {
                        onOpenResult(message);
                      }
                    }}
                  >
                    <div className="search-result-row__meta">
                      <Typography
                        variant="label"
                        weight={700}
                        className="search-result-row__sender"
                      >
                        {item.senderLabel}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="var(--text-muted)"
                        className="search-result-row__time"
                      >
                        {formatSearchTime(message)}
                      </Typography>
                    </div>
                    <p className="search-result-row__content">
                      {item.snippetSegments.map((segment, segmentIndex) => (
                        segment.highlight
                          ? <mark key={`${message.id}-${segmentIndex}`}>{segment.text}</mark>
                          : <span key={`${message.id}-${segmentIndex}`}>{segment.text}</span>
                      ))}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
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

function createFallbackViewModel(results: SearchResults, privacyOn: boolean): SearchResultsPaneViewModel {
  const firstId = results.messages[0]?.id ?? null;
  return {
    sortLabel: "时间从新到旧",
    groupLabel: "不分组",
    navigator: {
      label: results.messages.length > 0 ? `第 1 / ${results.messages.length} 条` : "没有命中",
      hasPrevious: false,
      hasNext: results.messages.length > 1,
    },
    groups: [{
      key: "flat",
      label: null,
      items: results.messages.map((message) => ({
        message,
        senderLabel: privacyOn
          ? maskDisplayText(message.sender || message.chat || message.username || "未知发送者")
          : (message.sender || message.chat || message.username),
        snippetSegments: [{
          text: privacyOn ? maskDisplayText(message.content || "[空消息]") : (message.content || "[空消息]"),
          highlight: false,
        }],
        active: message.id === firstId,
      })),
    }],
  };
}
