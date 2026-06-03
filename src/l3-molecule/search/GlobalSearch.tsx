import type { KeyboardEvent } from "react";
import { Input, Spinner, Typography } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import type { SearchResults, SearchScope } from "@l2/data-clerk/stores/useSearchStore";
import { maskDisplayText } from "@l3/chat/conversationDisplay";
import { SearchScopeMenu } from "./SearchScopeMenu";

interface GlobalSearchProps {
  query: string;
  results: SearchResults | null;
  loading: boolean;
  scope: SearchScope;
  currentConversation: Conversation | undefined;
  privacyOn: boolean;
  onSearch: (keyword: string) => void;
  onExecuteSearch: (keyword: string) => void;
  onClearSearch: () => void;
  onChangeScope: (scope: SearchScope) => void;
  className?: string;
}

export function GlobalSearch({
  query,
  results,
  loading,
  scope,
  currentConversation,
  privacyOn,
  onSearch,
  onExecuteSearch,
  onClearSearch,
  onChangeScope,
  className,
}: GlobalSearchProps) {
  const resultCount = results?.totalCount ?? 0;
  const currentConversationName = currentConversation?.displayName ?? "当前会话";

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onExecuteSearch(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      onClearSearch();
    }
  };

  return (
    <div className={className}>
      <div className="search-panel__controls">
        <div className="search-panel__input-shell">
          <Input
            variant="search"
            aria-label="搜索聊天记录"
            placeholder="搜索聊天记录"
            value={query}
            onChange={(event) => onSearch(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="search-panel__spinner">
              <Spinner size={16} color="var(--text-tertiary)" />
            </div>
          )}
        </div>
        <SearchScopeMenu
          scope={scope}
          currentConversationName={privacyOn
            ? maskDisplayText(currentConversationName)
            : currentConversationName}
          currentConversationAvailable={Boolean(currentConversation)}
          onChange={onChangeScope}
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
