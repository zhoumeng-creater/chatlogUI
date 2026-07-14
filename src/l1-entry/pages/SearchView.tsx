import { useSearchWorkspaceCommander } from "@l2/commander/useSearchWorkspaceCommander";
import { BusinessExportDialog } from "@l3/export";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchAdvancedFilters } from "@l3/search/SearchAdvancedFilters";
import { SearchResults } from "@l3/search/SearchResults";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { Typography } from "@l4/ui";

export function SearchView() {
  const {
    clearScopeChip,
    currentConversation,
    openResult,
    retryResult,
    openResultNearTime,
    privacyOn,
    resetScope,
    scopeController,
    search,
    selectMessageType,
    selectScope,
    recentQueries,
    activeFilterChips,
    changeAdvancedFilters,
    clearAdvancedFilter,
    executeSearch,
    useRecentQuery,
    deleteRecentQuery,
    clearRecentQueries,
    moveHit,
    searchResultsView,
    searchEmptyStates,
    businessExport,
  } = useSearchWorkspaceCommander();

  return (
    <div className="workspace-page search-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">搜索</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            在稳定的搜索页面中检索聊天记录，结果可返回会话上下文。
          </Typography>
        </div>
      </header>

      <section
        className="workspace-page__surface search-workspace__surface"
        aria-label="搜索工作区"
      >
        <WorkspaceScopeController
          model={scopeController}
          onSelectScope={selectScope}
          onSelectMessageType={selectMessageType}
          onClearChip={clearScopeChip}
          onReset={resetScope}
        />
        <GlobalSearch
          query={search.query}
          results={search.results}
          loading={search.loading}
          scope={search.scope}
          currentConversation={currentConversation ?? undefined}
          privacyOn={privacyOn}
          onSearch={search.search}
          onExecuteSearch={executeSearch}
          onClearSearch={search.clearSearch}
          onChangeScope={search.changeScope}
          recentQueries={recentQueries}
          onUseRecentQuery={useRecentQuery}
          onDeleteRecentQuery={deleteRecentQuery}
          onClearRecentQueries={clearRecentQueries}
          showScopeMenu={false}
        />
        <SearchAdvancedFilters filters={search.advancedFilters} onChange={changeAdvancedFilters} />
        <div className="search-workspace__results">
          <SearchResults
            query={search.query}
            results={search.results}
            status={search.status}
            loading={search.loading}
            error={search.error}
            activeResultId={search.activeResultId}
            privacyOn={privacyOn}
            viewModel={searchResultsView}
            emptyStates={searchEmptyStates}
            activeFilterChips={activeFilterChips}
            exportAction={businessExport.action}
            onSetActiveResultId={search.setActiveResultId}
            onMoveHit={moveHit}
            onClearAdvancedFilter={clearAdvancedFilter}
            onOpenResult={(message) => void openResult(message)}
            onRetryResult={(message) => void retryResult(message)}
            onOpenNearbyResult={(message) => void openResultNearTime(message)}
            onLoadMoreResults={() => void search.loadMoreResults()}
            onExecuteSearch={executeSearch}
            onClearSearch={search.clearSearch}
            onCancelSearch={search.cancelSearch}
          />
        </div>
        {businessExport.isOpen && <BusinessExportDialog {...businessExport.dialog} />}
      </section>
    </div>
  );
}
