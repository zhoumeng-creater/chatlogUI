import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { IconButton, Input, Spinner, Typography } from "@l4/ui";
import type { Conversation } from "@l2/data-clerk/stores/useChatStore";
import type { SearchResults, SearchScope } from "@l2/data-clerk/stores/useSearchStore";
import { maskDisplayText } from "@/utils/privacyDisplay";
import { SearchScopeMenu } from "./SearchScopeMenu";

interface GlobalSearchProps {
  query: string;
  results: SearchResults | null;
  loading: boolean;
  scope: SearchScope;
  currentConversation: Conversation | undefined;
  privacyOn: boolean;
  recentQueries?: string[];
  onSearch: (keyword: string) => void;
  onExecuteSearch: (keyword: string) => void;
  onClearSearch: () => void;
  onChangeScope: (scope: SearchScope) => void;
  onUseRecentQuery?: (query: string) => void;
  onDeleteRecentQuery?: (query: string) => void;
  onClearRecentQueries?: () => void;
  showScopeMenu?: boolean;
  className?: string;
}

export function GlobalSearch({
  query,
  results,
  loading,
  scope,
  currentConversation,
  privacyOn,
  recentQueries = [],
  onSearch,
  onExecuteSearch,
  onClearSearch,
  onChangeScope,
  onUseRecentQuery,
  onDeleteRecentQuery,
  onClearRecentQueries,
  showScopeMenu = true,
  className,
}: GlobalSearchProps) {
  const resultCount = results?.totalCount ?? 0;
  const currentConversationName = currentConversation?.displayName ?? "当前会话";
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showHistory = !privacyOn && recentQueries.length > 0;

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== "f") return;
      if (isTextEditingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (shouldSubmitSearchKey(event)) {
      onExecuteSearch(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      onClearSearch();
    }
  };

  return (
    <div className={className}>
      <div className="search-panel__controls">
        <div className="search-panel__field">
          <label className="search-panel__label" htmlFor={inputId}>
            搜索内容
          </label>
          <div className="search-panel__input-shell">
            <Input
              ref={inputRef}
              id={inputId}
              variant="search"
              aria-label="搜索聊天记录"
              placeholder="搜索聊天记录，例如：发票、聚餐、项目名称"
              value={query}
              onChange={(event) => onSearch(event.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <IconButton
                icon={<X size={14} />}
                label="清除搜索内容"
                tooltip="清除搜索内容"
                size="sm"
                className="search-panel__clear"
                onClick={onClearSearch}
              />
            )}
            {loading && (
              <div className="search-panel__spinner">
                <Spinner size={16} color="var(--text-tertiary)" />
              </div>
            )}
          </div>
          {showHistory && (
            <div className="search-panel__history" aria-label="最近搜索">
              <Typography variant="caption" color="var(--text-secondary)">
                最近搜索
              </Typography>
              <div className="search-panel__history-list">
                {recentQueries.map((term) => (
                  <span key={term} className="search-panel__history-item">
                    <button
                      type="button"
                      className="search-panel__history-term"
                      onClick={() => {
                        onUseRecentQuery?.(term);
                        onSearch(term);
                      }}
                    >
                      {term}
                    </button>
                    <IconButton
                      icon={<X size={12} />}
                      label={`删除搜索记录：${term}`}
                      tooltip={`删除搜索记录：${term}`}
                      size="sm"
                      onClick={() => onDeleteRecentQuery?.(term)}
                    />
                  </span>
                ))}
                <button
                  type="button"
                  className="search-panel__history-clear"
                  onClick={onClearRecentQueries}
                >
                  清空搜索历史
                </button>
              </div>
            </div>
          )}
        </div>
        {showScopeMenu && (
          <SearchScopeMenu
            scope={scope}
            currentConversationName={
              privacyOn ? maskDisplayText(currentConversationName) : currentConversationName
            }
            currentConversationAvailable={Boolean(currentConversation)}
            onChange={onChangeScope}
          />
        )}
      </div>
      {resultCount > 0 && (
        <Typography variant="caption" color="var(--text-secondary)">
          找到 {resultCount.toLocaleString()} 条匹配记录
        </Typography>
      )}
    </div>
  );
}

export function shouldSubmitSearchKey(event: {
  key: string;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean };
}): boolean {
  return event.key === "Enter" && event.keyCode !== 229 && !event.nativeEvent?.isComposing;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}
