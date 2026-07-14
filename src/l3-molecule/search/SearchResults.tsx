import type {
  SearchResults as SearchResultsData,
  SearchStatus,
} from "@l2/data-clerk/stores/useSearchStore";
import type { BusinessExportActionView } from "@l2/commander/useBusinessExportCommander";
import type {
  SearchActiveFilterChip,
  SearchAdvancedFilterField,
} from "@l2/commander/searchAdvancedFilters";
import type { ActionableEmptyStateView } from "@l2/commander/actionableEmptyStateModel";
import { SearchResultsPane, type SearchResultsPaneViewModel } from "./SearchResultsPane";

interface SearchResultsProps {
  query: string;
  results: SearchResultsData | null;
  status: SearchStatus;
  loading: boolean;
  error: string | null;
  activeResultId: string | null;
  privacyOn: boolean;
  viewModel: SearchResultsPaneViewModel | null;
  emptyStates: {
    notStarted: ActionableEmptyStateView;
    noResults: ActionableEmptyStateView;
    filteredNoResults: ActionableEmptyStateView;
  };
  activeFilterChips: SearchActiveFilterChip[];
  exportAction?: BusinessExportActionView;
  onSetActiveResultId: (id: string | null) => void;
  onMoveHit: (direction: "previous" | "next" | "first" | "last") => void;
  onClearAdvancedFilter: (field: SearchAdvancedFilterField) => void;
  onOpenResult: (message: SearchResultsData["messages"][number]) => void;
  onRetryResult: (message: SearchResultsData["messages"][number]) => void;
  onOpenNearbyResult: (message: SearchResultsData["messages"][number]) => void;
  onLoadMoreResults: () => void;
  onExecuteSearch: (query: string) => void;
  onClearSearch: () => void;
  onCancelSearch: () => void;
}

export function SearchResults({
  query,
  results,
  status,
  loading,
  error,
  activeResultId,
  privacyOn,
  viewModel,
  emptyStates,
  activeFilterChips,
  exportAction,
  onSetActiveResultId,
  onMoveHit,
  onClearAdvancedFilter,
  onOpenResult,
  onRetryResult,
  onOpenNearbyResult,
  onLoadMoreResults,
  onExecuteSearch,
  onClearSearch,
  onCancelSearch,
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
      viewModel={viewModel}
      emptyStates={emptyStates}
      activeFilterChips={activeFilterChips}
      exportAction={exportAction}
      onSetActiveResultId={onSetActiveResultId}
      onMoveHit={onMoveHit}
      onClearAdvancedFilter={onClearAdvancedFilter}
      onOpenResult={(message) => {
        onSetActiveResultId(message.id);
        onOpenResult(message);
      }}
      onRetryResult={onRetryResult}
      onOpenNearbyResult={onOpenNearbyResult}
      onLoadMore={onLoadMoreResults}
      onRetry={() => onExecuteSearch(query)}
      onClear={onClearSearch}
      onCancelSearch={onCancelSearch}
    />
  );
}
