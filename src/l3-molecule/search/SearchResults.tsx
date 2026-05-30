import type {
  SearchResults as SearchResultsData,
  SearchStatus,
} from "@l2/data-clerk/stores/useSearchStore";
import { SearchResultsPane } from "./SearchResultsPane";

interface SearchResultsProps {
  query: string;
  status: SearchStatus;
  results: SearchResultsData | null;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  navigationNotice: string | null;
  privacyOn: boolean;
  onOpenResult: (message: SearchResultsData["messages"][number]) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onClear: () => void;
}

export function SearchResults({
  query,
  status,
  results,
  loading,
  error,
  activeResultId,
  navigationNotice,
  privacyOn,
  onOpenResult,
  onLoadMore,
  onRetry,
  onClear,
}: SearchResultsProps) {
  return (
    <SearchResultsPane
      query={query}
      status={status}
      results={results}
      loading={loading}
      error={error}
      activeResultId={activeResultId}
      navigationNotice={navigationNotice}
      privacyOn={privacyOn}
      onOpenResult={onOpenResult}
      onLoadMore={onLoadMore}
      onRetry={onRetry}
      onClear={onClear}
    />
  );
}
