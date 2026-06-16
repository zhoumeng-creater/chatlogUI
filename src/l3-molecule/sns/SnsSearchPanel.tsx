import type { FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Button, Input, Spinner, Typography } from "@l4/ui";
import type { ActionableEmptyStateView, EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import type { SnsModuleDensity, SnsModuleLoadStatus } from "./SnsModule";
import { SnsTimeline } from "./SnsTimeline";
import type { AdaptedSnsPost } from "./snsTypes";

interface SnsSearchPanelProps {
  searchQuery: string;
  searchStatus: SnsModuleLoadStatus;
  searchError: string | null;
  results: AdaptedSnsPost[];
  selectedPostId: string | null;
  privacyOn: boolean;
  emptyState: ActionableEmptyStateView;
  density: SnsModuleDensity;
  emptyCopy: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onClearSearch: () => void;
  onEmptyAction?: (actionId: EmptyStateActionId) => void;
  onSelectPost: (postId: string | null) => void;
}

export function SnsSearchPanel({
  searchQuery,
  searchStatus,
  searchError,
  results,
  selectedPostId,
  privacyOn,
  emptyState,
  density,
  emptyCopy,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onEmptyAction,
  onSelectPost,
}: SnsSearchPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="sns-search-panel">
      <form className="sns-search-panel__form" onSubmit={handleSubmit}>
        <label className="sns-search-panel__field">
          <span className="sns-search-panel__label">搜索朋友圈</span>
          <Input
            variant="search"
            controlSize="sm"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            placeholder="输入关键词"
            aria-label="搜索朋友圈关键词"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={searchStatus === "loading"}
        >
          <Search size={14} />
          搜索
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSearch} aria-label="清空朋友圈搜索">
          <X size={14} />
        </Button>
      </form>

      {searchError && (
        <div className="sns-module__inline-error" role="alert">
          <Typography variant="caption" color="var(--danger)">
            {searchError}
          </Typography>
        </div>
      )}

      {searchStatus === "loading" && (
        <div className="sns-module__loading">
          <Spinner size={18} label="搜索朋友圈..." color="var(--text-muted)" />
        </div>
      )}

      {searchStatus !== "loading" && results.length === 0 ? (
        <ActionableEmptyState
          className="sns-module__empty"
          model={emptyState}
          onAction={(actionId) => {
            if (actionId === "clear-search" || actionId === "clear-filters") {
              onClearSearch();
              onEmptyAction?.(actionId);
              return;
            }
            if (actionId === "refresh" || actionId === "retry") {
              onSearch(searchQuery);
              onEmptyAction?.(actionId);
            }
          }}
        />
      ) : (
        <SnsTimeline
          posts={results}
          selectedPostId={selectedPostId}
          privacyOn={privacyOn}
          density={density}
          emptyCopy={emptyCopy}
          highlightQuery={searchQuery}
          onSelectPost={onSelectPost}
        />
      )}
    </div>
  );
}
