import { useEffect } from "react";
import { useChatCommander, usePrivacyCommander, useSearchCommander } from "@l2/commander";
import { FilterBar } from "@l3/search/FilterBar";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { Surface, Typography } from "@l4/ui";

export function SearchView() {
  const search = useSearchCommander();
  const chat = useChatCommander();
  const privacy = usePrivacyCommander();
  const {
    conversations,
    conversationsStatus,
    loadConversations,
    selectAndLoad,
    selectedConversationId,
  } = chat;
  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  useEffect(() => {
    if (conversations.length === 0 && conversationsStatus === "idle") {
      void loadConversations();
    }
  }, [conversations.length, conversationsStatus, loadConversations]);

  return (
    <div className="workspace-page workspace-page--search">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">搜索</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            在稳定页面中查看结果，后续搜索步骤会补齐精确消息定位。
          </Typography>
        </div>
      </header>

      <Surface variant="raised" className="workspace-page__panel search-workspace">
        <GlobalSearch
          query={search.query}
          results={search.results}
          loading={search.loading}
          scope={search.scope}
          currentConversation={currentConversation}
          privacyOn={privacy.privacyOn}
          onSearch={search.search}
          onExecuteSearch={search.executeSearch}
          onClearSearch={search.clearSearch}
          onChangeScope={search.changeScope}
        />
        <FilterBar
          activeFilter={search.activeFilter}
          onFilterChange={search.changeFilter}
        />
        <SearchResults
          query={search.query}
          results={search.results}
          status={search.status}
          loading={search.loading}
          error={search.error}
          activeResultId={search.activeResultId}
          privacyOn={privacy.privacyOn}
          onSetActiveResultId={search.setActiveResultId}
          onSelectAndLoad={(conversationId, chatId) => {
            void selectAndLoad(conversationId, chatId);
          }}
          onLoadMoreResults={() => void search.loadMoreResults()}
          onExecuteSearch={search.executeSearch}
          onClearSearch={search.clearSearch}
        />
      </Surface>
    </div>
  );
}
