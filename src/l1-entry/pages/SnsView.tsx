import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
} from "@l2/commander/workspaceScopeModel";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useSnsCommander } from "@l2/commander/useSnsCommander";
import { BusinessExportDialog } from "@l3/export";
import { SnsModule } from "@l3/sns/SnsModule";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Typography } from "@l4/ui";

export function SnsView() {
  const [params, setParams] = useSearchParams();
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
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "sns",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
      selectedContacts: sns.filters.user
        ? [{ id: sns.filters.user, label: sns.filters.user }]
        : [],
      dateRange: sns.filters.since || sns.filters.until
        ? { start: sns.filters.since || undefined, end: sns.filters.until || undefined }
        : null,
      snsContentType: sns.filters.contentType,
      snsMediaOnly: sns.filters.mediaOnly,
      snsIncludeRead: sns.filters.includeRead,
    },
    pending: sns.status === "loading" || sns.searchStatus === "loading",
  });

  const updateScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const clearScopeChip = useCallback((action: WorkspaceScopeClearAction) => {
    if (action.field === "focusMessage" || action.field === "sourceRoute") {
      updateScopeParams((next) => {
        if (action.field === "focusMessage") next.delete("focus");
        if (action.field === "sourceRoute") next.delete("source");
      });
      return;
    }
    sns.clearWorkspaceScopeFilter(action);
  }, [sns, updateScopeParams]);

  const resetScope = useCallback(() => {
    sns.resetFilters();
    updateScopeParams((next) => {
      next.delete("focus");
      next.delete("source");
    });
  }, [sns, updateScopeParams]);

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
      <WorkspaceScopeController
        model={scopeController}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />
      <div className="workspace-page__surface workspace-page__module-surface">
        <SnsModule
          view={sns.view}
          status={sns.status}
          searchStatus={sns.searchStatus}
          activeTab={sns.activeTab}
          filters={sns.filters}
          draftFilters={sns.draftFilters}
          filterChips={sns.view.filterView.chips}
          filtersDirty={sns.filtersDirty}
          filterDrawerOpen={sns.filterDrawerOpen}
          filterError={sns.filterError}
          density={sns.density}
          searchQuery={sns.searchQuery}
          error={sns.error}
          searchError={sns.searchError}
          selectedPostId={sns.selectedPostId}
          privacyOn={sns.privacyOn}
          externalOpenPrompt={sns.externalOpenPrompt}
          externalOpenError={sns.externalOpenError}
          emptyStates={sns.emptyStates}
          exportAction={sns.businessExport.action}
          onRefresh={sns.refresh}
          onRetry={sns.retry}
          onLoadMore={sns.loadMore}
          onTabChange={sns.selectTab}
          onDraftFiltersChange={sns.updateDraftFilters}
          onApplyFilters={sns.applyFilters}
          onResetFilters={sns.resetFilters}
          onClearFilter={sns.clearAppliedFilter}
          onFilterDrawerOpenChange={sns.setFilterDrawerOpen}
          onDensityChange={sns.setDensity}
          onSearchQueryChange={sns.setSearchQuery}
          onSearch={sns.runSearch}
          onClearSearch={sns.clearSearch}
          onSelectPost={sns.selectPost}
          onRequestArticleOpen={sns.requestArticleOpen}
          onConfirmExternalOpen={sns.confirmExternalOpen}
          onCancelExternalOpen={sns.cancelExternalOpen}
        />
      </div>
      {sns.businessExport.isOpen && <BusinessExportDialog {...sns.businessExport.dialog} />}
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
  if (status === "partial") return { label: "朋友圈", value: "部分可用", tone: "warning" };
  if (status === "error") return { label: "朋友圈", value: "异常", tone: "danger" };
  if (status === "ready") return { label: "朋友圈", value: "已加载", tone: "success" };
  if (status === "empty") return { label: "朋友圈", value: "暂无动态", tone: "neutral" };
  return { label: "朋友圈", value: "待刷新", tone: "neutral" };
}
