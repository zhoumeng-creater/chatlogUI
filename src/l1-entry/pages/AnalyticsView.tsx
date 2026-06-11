import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useScopedWorkspaceConversation } from "@l2/commander/useScopedWorkspaceConversation";
import { useStatsCommander } from "@l2/commander/useStatsCommander";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { DashboardOverview } from "@l3/stats/DashboardOverview";
import { TopContactCard } from "@l3/stats/TopContactCard";
import { TrendChart } from "@l3/stats/TrendChart";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { Button, Typography } from "@l4/ui";

export function AnalyticsView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { currentChat, workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    privacyOn,
    defaultScope: "currentChat",
  });
  const stats = useStatsCommander();
  const { loadAll } = stats;

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
            查看当前会话的消息量、趋势和活跃对象；全局统计将在后续模块闭环中扩展。
          </Typography>
        </div>
        <Button variant="secondary" onClick={() => navigate(withSmokeQuery("/workbench"))}>
          返回会话
        </Button>
      </header>
      <WorkspaceScopeStatus
        workspaceRouteScope={workspaceRouteScope}
        items={[analyticsStatusItem(stats.loading, stats.error, Boolean(stats.stats), currentChat)]}
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
