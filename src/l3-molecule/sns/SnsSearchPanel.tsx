import type { FormEvent } from "react";
import { Search, X } from "lucide-react";
import { Button, Input, Spinner, Typography } from "@l4/ui";
import type { SnsModuleLoadStatus } from "./SnsModule";
import { SnsTimeline } from "./SnsTimeline";
import type { AdaptedSnsPost } from "./snsTypes";

interface SnsSearchPanelProps {
  searchQuery: string;
  searchStatus: SnsModuleLoadStatus;
  searchError: string | null;
  results: AdaptedSnsPost[];
  selectedPostId: string | null;
  privacyOn: boolean;
  emptyCopy: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onClearSearch: () => void;
  onSelectPost: (postId: string | null) => void;
}

export function SnsSearchPanel({
  searchQuery,
  searchStatus,
  searchError,
  results,
  selectedPostId,
  privacyOn,
  emptyCopy,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onSelectPost,
}: SnsSearchPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="sns-search-panel">
      <form className="sns-search-panel__form" onSubmit={handleSubmit}>
        <Input
          variant="search"
          controlSize="sm"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          placeholder="搜索朋友圈"
          aria-label="搜索朋友圈关键词"
        />
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

      <SnsTimeline
        posts={results}
        selectedPostId={selectedPostId}
        privacyOn={privacyOn}
        emptyCopy={emptyCopy}
        highlightQuery={searchQuery}
        onSelectPost={onSelectPost}
      />
    </div>
  );
}
