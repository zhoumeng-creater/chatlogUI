import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSnsCommander } from "@l2/commander/useSnsCommander";
import { SnsModule } from "@l3/sns/SnsModule";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Typography } from "@l4/ui";

export function SnsView() {
  const [params] = useSearchParams();
  const sns = useSnsCommander();
  const { workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope") ?? "all",
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    privacyOn: sns.privacyOn,
    defaultScope: "all",
  });
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
            浏览动态、通知和搜索结果；外部文章会先确认域名，再交给系统浏览器打开。
          </Typography>
        </div>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[snsStatusItem(sns.status, sns.searchStatus, sns.activeTab)]}
      />
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
          externalOpenPrompt={sns.externalOpenPrompt}
          externalOpenError={sns.externalOpenError}
          onRefresh={sns.refresh}
          onRetry={sns.retry}
          onLoadMore={sns.loadMore}
          onTabChange={sns.selectTab}
          onFiltersChange={sns.updateFilters}
          onSearchQueryChange={sns.setSearchQuery}
          onSearch={sns.runSearch}
          onClearSearch={sns.clearSearch}
          onSelectPost={sns.selectPost}
          onRequestArticleOpen={sns.requestArticleOpen}
          onConfirmExternalOpen={sns.confirmExternalOpen}
          onCancelExternalOpen={sns.cancelExternalOpen}
        />
      </div>
    </div>
  );
}

function snsStatusItem(status: string, searchStatus: string, activeTab: string): WorkspaceScopeStatusItem {
  if (activeTab === "search" && searchStatus === "loading") {
    return { label: "朋友圈", value: "搜索中", tone: "info", busy: true };
  }
  if (activeTab === "search" && searchStatus === "error") {
    return { label: "朋友圈", value: "搜索异常", tone: "danger" };
  }
  if (status === "loading") return { label: "朋友圈", value: "加载中", tone: "info", busy: true };
  if (status === "error") return { label: "朋友圈", value: "异常", tone: "danger" };
  if (status === "ready") return { label: "朋友圈", value: "已加载", tone: "success" };
  if (status === "empty") return { label: "朋友圈", value: "暂无动态", tone: "neutral" };
  return { label: "朋友圈", value: "待刷新", tone: "neutral" };
}
