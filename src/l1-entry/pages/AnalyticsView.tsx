import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "@l2/commander/workspaceScopeModel";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useStatsCommander } from "@l2/commander/useStatsCommander";
import { DashboardOverview } from "@l3/stats/DashboardOverview";
import { BusinessExportDialog, ExportActionButton } from "@l3/export";
import { TopContactCard } from "@l3/stats/TopContactCard";
import { TrendChart } from "@l3/stats/TrendChart";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Button, Typography } from "@l4/ui";

export function AnalyticsView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { currentChat, workspaceRouteScope, privacyOn } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    defaultScope: "currentChat",
  });
  const stats = useStatsCommander({ scopeSummary: "当前会话" });
  const { loadAll } = stats;
  const scopeController = buildWorkspaceScopeModel({
    moduleId: "analytics",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
      dateRange: { preset: "7d" },
    },
    pending: stats.loading,
  });

  const updateScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const selectScope = useCallback((kind: WorkspaceScopeKind) => {
    if (kind !== "currentConversation" || !currentChat) return;
    updateScopeParams((next) => {
      next.set("scope", "currentChat");
      next.set("chat", currentChat);
    });
  }, [currentChat, updateScopeParams]);

  const clearScopeChip = useCallback((action: WorkspaceScopeClearAction) => {
    if (action.field !== "focusMessage" && action.field !== "sourceRoute") return;
    updateScopeParams((next) => {
      if (action.field === "focusMessage") next.delete("focus");
      if (action.field === "sourceRoute") next.delete("source");
    });
  }, [updateScopeParams]);

  const resetScope = useCallback(() => {
    updateScopeParams((next) => {
      next.delete("focus");
      next.delete("source");
    });
  }, [updateScopeParams]);

  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  return (
    <div className="workspace-page analytics-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">统计</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            查看当前会话的消息量、趋势和活跃对象；全局统计暂未接入本地接口。
          </Typography>
        </div>
        <div className="workspace-page__header-actions">
          <ExportActionButton {...stats.businessExport.action} />
          <Button variant="secondary" onClick={() => navigate(withSmokeQuery("/workbench"))}>
            返回会话
          </Button>
        </div>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[analyticsStatusItem(stats.loading, stats.error, Boolean(stats.stats), currentChat)]}
      />
      <WorkspaceScopeController
        model={scopeController}
        onSelectScope={selectScope}
        onClearChip={clearScopeChip}
        onReset={resetScope}
      />

      {!currentChat ? (
        <section className="workspace-page__surface workspace-page__empty">
          <Typography variant="label" weight={700}>
            {workspaceRouteScope.missingChat ? "来源会话不可用" : "选择会话后查看统计"}
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {workspaceRouteScope.state === "all"
              ? "当前统计模块以会话范围为主；从会话工作台进入可查看对应统计。"
              : "从会话工作台进入，或在搜索结果中打开一个会话后，这里会展示对应范围的统计。"}
          </Typography>
        </section>
      ) : (
        <section className="workspace-page__grid" aria-label="统计工作区">
          <DashboardOverview stats={stats.stats} loading={stats.loading} />
          <TrendChart data={stats.trend} inspectorWidth={720} />
          {stats.stats && <TopContactCard topSenders={stats.stats.topSenders} privacyOn={privacyOn} />}
          {stats.error && (
            <div className="workspace-page__surface workspace-page__error" role="alert">
              <Typography variant="label" weight={700}>统计加载失败</Typography>
              <Typography variant="body" color="var(--text-secondary)">请稍后重试。</Typography>
              <Button variant="secondary" onClick={() => loadAll(currentChat)}>重试</Button>
            </div>
          )}
        </section>
      )}
      {stats.businessExport.isOpen && <BusinessExportDialog {...stats.businessExport.dialog} />}
    </div>
  );
}

function analyticsStatusItem(
  loading: boolean,
  error: string | null,
  hasStats: boolean,
  currentChat: string,
): WorkspaceScopeStatusItem {
  if (loading) return { label: "统计", value: "加载中", tone: "info", busy: true };
  if (error) return { label: "统计", value: "异常", tone: "danger" };
  if (hasStats) return { label: "统计", value: "已加载", tone: "success" };
  if (currentChat) return { label: "统计", value: "等待数据", tone: "neutral" };
  return { label: "统计", value: "等待范围", tone: "warning" };
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}
