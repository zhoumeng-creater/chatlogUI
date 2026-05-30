import { useSearchCommander } from "@l2/commander/";
import { useChatCommander } from "@l2/commander/";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import { SearchResultsPane } from "./SearchResultsPane";

export function SearchResults() {
  const {
    query,
    results,
    loading,
    error,
    executeSearch,
    clearSearch,
    loadMoreResults,
  } = useSearchCommander();
  const { selectAndLoad } = useChatCommander();
  const activeResultId = useSearchStore((state) => state.activeResultId);
  const setActiveResultId = useSearchStore((state) => state.setActiveResultId);

  return (
    <SearchResultsPane
      query={query}
      results={results}
      loading={loading}
      error={error}
      activeResultId={activeResultId}
      onOpenResult={(message) => {
        const chat = message.username || message.chat;
        if (!chat) return;
        setActiveResultId(message.id);
        void selectAndLoad(chat, chat);
      }}
      onLoadMore={() => void loadMoreResults()}
      onRetry={() => executeSearch(query)}
      onClear={clearSearch}
    />
  );
}
