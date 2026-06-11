import { useEffect } from "react";
import { useSnsCommander } from "@l2/commander/useSnsCommander";
import { SnsModule } from "@l3/sns/SnsModule";
import { Typography } from "@l4/ui";

export function SnsView() {
  const sns = useSnsCommander();
  const { loadSnsModule } = sns;

  useEffect(() => {
    void loadSnsModule();
  }, [loadSnsModule]);

  return (
    <div className="workspace-page sns-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">朋友圈</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            浏览 timeline、通知和搜索结果；外部打开与完整详情闭环将在 SNS 后续阶段继续补齐。
          </Typography>
        </div>
      </header>
      <div className="workspace-page__surface workspace-page__module-surface">
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
          privacyOn={sns.privacyOn}
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
