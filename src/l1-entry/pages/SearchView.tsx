import { useSearchWorkspaceCommander } from "@l2/commander/useSearchWorkspaceCommander";
import { FilterBar } from "@l3/search/FilterBar";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { Typography } from "@l4/ui";

export function SearchView() {
  const { currentConversation, openResult, privacyOn, search } = useSearchWorkspaceCommander();

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

      <section className="workspace-page__surface search-workspace__surface" aria-label="搜索工作区">
        <GlobalSearch
          query={search.query}
          results={search.results}
          loading={search.loading}
          scope={search.scope}
          currentConversation={currentConversation ?? undefined}
          privacyOn={privacyOn}
          onSearch={search.search}
          onExecuteSearch={search.executeSearch}
          onClearSearch={search.clearSearch}
          onChangeScope={search.changeScope}
        />
        <FilterBar activeFilter={search.activeFilter} onFilterChange={search.changeFilter} />
        <div className="search-workspace__results">
          <SearchResults
            query={search.query}
            results={search.results}
            status={search.status}
            loading={search.loading}
            error={search.error}
            activeResultId={search.activeResultId}
            privacyOn={privacyOn}
            onSetActiveResultId={search.setActiveResultId}
            onOpenResult={(message) => void openResult(message)}
            onLoadMoreResults={() => void search.loadMoreResults()}
            onExecuteSearch={search.executeSearch}
            onClearSearch={search.clearSearch}
          />
        </div>
      </section>
    </div>
  );
}
