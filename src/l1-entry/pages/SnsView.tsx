import { useEffect } from "react";
import { usePrivacyCommander, useSnsCommander } from "@l2/commander";
import { SnsModule } from "@l3/sns/SnsModule";
import { Typography } from "@l4/ui";

export function SnsView() {
  const sns = useSnsCommander();
  const privacy = usePrivacyCommander();
  const { loadSnsModule } = sns;

  useEffect(() => {
    void loadSnsModule();
  }, [loadSnsModule]);

  return (
    <div className="workspace-page workspace-page--fill">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h2">朋友圈</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            朋友圈作为独立工作区显示，不再占用聊天会话详情侧栏。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__fill-panel">
        <SnsModule
          view={sns.view}
          status={sns.status}
          searchStatus={sns.searchStatus}
          activeTab={sns.activeTab}
          filters={sns.filters}
          searchQuery={sns.searchQuery}
          error={sns.error}
          searchError={sns.searchError}
          selectedPostId={sns.selectedPostId}
          privacyOn={privacy.privacyOn}
          onRefresh={sns.refresh}
          onRetry={sns.retry}
          onLoadMore={sns.loadMore}
          onTabChange={sns.selectTab}
          onFiltersChange={sns.updateFilters}
          onSearchQueryChange={sns.setSearchQuery}
          onSearch={sns.runSearch}
          onClearSearch={sns.clearSearch}
          onSelectPost={sns.selectPost}
        />
      </div>
    </div>
  );
}
