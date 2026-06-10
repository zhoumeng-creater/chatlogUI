import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSearchCommander } from "@l2/commander/useSearchCommander";
import { resolveSearchHitNavigation } from "@l2/commander/searchNavigation";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { FilterBar } from "@l3/search/FilterBar";
import { GlobalSearch } from "@l3/search/GlobalSearch";
import { SearchResults } from "@l3/search/SearchResults";
import { Typography } from "@l4/ui";

export function SearchView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scopedChat = params.get("chat");
  const scopedScope = params.get("scope");
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { chat, currentConversation } = useScopedWorkspaceConversation(scopedChat);
  const search = useSearchCommander();
  const { changeScope } = search;

  useEffect(() => {
    if (scopedScope === "currentChat") {
      changeScope("current");
    }
  }, [changeScope, scopedScope]);

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
            onOpenResult={(message) => {
              const target = resolveSearchHitNavigation({
                message,
                conversations: chat.conversations,
                returnRoute: withSmokeQuery("/search"),
                querySnapshot: {
                  query: search.query,
                  filter: search.activeFilter,
                  scope: search.scope,
                  scopeChat: scopedChat,
                },
              });
              if (!target.ok) {
                search.setError(target.message);
                return;
              }
              void chat.selectAndLoadAtAnchor(target)
                .then(() => navigate(withSmokeQuery("/workbench")));
            }}
            onLoadMoreResults={() => void search.loadMoreResults()}
            onExecuteSearch={search.executeSearch}
            onClearSearch={search.clearSearch}
          />
        </div>
      </section>
    </div>
  );
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}
