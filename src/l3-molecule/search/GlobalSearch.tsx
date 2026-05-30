import type { CSSProperties, KeyboardEvent } from "react";
import { Input, Spinner, Typography } from "@l4/ui";
import { useSearchCommander } from "@l2/commander/";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDisplayText } from "@l3/chat/conversationDisplay";
import { SearchScopeMenu } from "./SearchScopeMenu";

interface GlobalSearchProps {
  className?: string;
  style?: CSSProperties;
}

export function GlobalSearch({ className, style }: GlobalSearchProps) {
  const {
    query,
    results,
    loading,
    scope,
    search,
    executeSearch,
    clearSearch,
    changeScope,
  } = useSearchCommander();
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const currentConversation = conversations.find((item) => item.id === selectedConversationId);
  const resultCount = results?.totalCount ?? 0;
  const currentConversationName = currentConversation?.displayName ?? "当前会话";

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      executeSearch(event.currentTarget.value);
    }
    if (event.key === "Escape") {
      clearSearch();
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
            onChange={(event) => search(event.currentTarget.value)}
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
          currentConversationAvailable={Boolean(currentConversation)}
          onChange={changeScope}
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
