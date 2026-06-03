import type { SearchResults as SearchResultsData, SearchStatus } from "@l2/data-clerk/stores/useSearchStore";
import { SearchResultsPane } from "./SearchResultsPane";

interface SearchResultsProps {
  query: string;
  results: SearchResultsData | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  privacyOn: boolean;
  onSetActiveResultId: (id: string | null) => void;
  onSelectAndLoad: (conversationId: string, chat: string) => void;
  onLoadMoreResults: () => void;
  onExecuteSearch: (query: string) => void;
  onClearSearch: () => void;
}

export function SearchResults({
  query,
  results,
  status,
  loading,
  error,
  activeResultId,
  privacyOn,
  onSetActiveResultId,
  onSelectAndLoad,
  onLoadMoreResults,
  onExecuteSearch,
  onClearSearch,
}: SearchResultsProps) {
  return (
    <SearchResultsPane
      query={query}
      results={results}
      status={status}
      loading={loading}
      error={error}
      activeResultId={activeResultId}
      privacyOn={privacyOn}
      onOpenResult={(message) => {
        const chat = message.username || message.chat;
        if (!chat) return;
        onSetActiveResultId(message.id);
        onSelectAndLoad(chat, chat);
      }}
      onLoadMore={onLoadMoreResults}
      onRetry={() => onExecuteSearch(query)}
      onClear={onClearSearch}
    />
  );
}
