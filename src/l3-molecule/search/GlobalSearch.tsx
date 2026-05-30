import type { CSSProperties, KeyboardEvent } from "react";
import { Input, Spinner, Typography } from "@l4/ui";
import type { SearchResults, SearchScope } from "@l2/data-clerk/stores/useSearchStore";
import { maskDisplayText } from "@l3/chat/conversationDisplay";
import { SearchScopeMenu } from "./SearchScopeMenu";

interface GlobalSearchProps {
  className?: string;
  style?: CSSProperties;
  query: string;
  results: SearchResults | null;
  loading: boolean;
  scope: SearchScope;
  privacyOn: boolean;
  currentConversationName: string;
  currentConversationAvailable: boolean;
  onSearch: (keyword: string) => void;
  onExecuteSearch: (keyword: string) => void;
  onClearSearch: () => void;
  onScopeChange: (scope: SearchScope) => void;
}

export function GlobalSearch({
  className,
  style,
  query,
  results,
  loading,
  scope,
  privacyOn,
  currentConversationName,
  currentConversationAvailable,
  onSearch,
  onExecuteSearch,
  onClearSearch,
  onScopeChange,
}: GlobalSearchProps) {
  const resultCount = results?.totalCount ?? 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onExecuteSearch(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      onClearSearch();
    }
  };

  return (
    <div className={className} style={style}>
      <div className="search-panel__controls">
        <div style={{ position: "relative", minWidth: 0 }}>
          <Input
            variant="search"
            aria-label="搜索聊天记录"
            placeholder="搜索聊天记录"
            value={query}
            onChange={(event) => onSearch(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <Spinner size={16} color="var(--text-tertiary)" />
            </div>
          )}
        </div>
        <SearchScopeMenu
          scope={scope}
          currentConversationName={privacyOn
            ? maskDisplayText(currentConversationName)
            : currentConversationName}
          currentConversationAvailable={currentConversationAvailable}
          onChange={onScopeChange}
        />
      </div>
      {resultCount > 0 && (
        <Typography variant="caption" color="var(--text-secondary)">
          找到 {resultCount.toLocaleString()} 条匹配记录
        </Typography>
      )}
    </div>
  );
}
