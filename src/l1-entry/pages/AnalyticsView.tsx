import { useAnalyticsWorkspaceCommander } from "@l2/commander/useAnalyticsWorkspaceCommander";
import { BusinessExportDialog, ExportActionButton } from "@l3/export";
import { DashboardOverview } from "@l3/stats/DashboardOverview";
import { MetricExplanation } from "@l3/stats/MetricExplanation";
import { StatsControlBar } from "@l3/stats/StatsControlBar";
import { TopContactCard } from "@l3/stats/TopContactCard";
import { TrendChart } from "@l3/stats/TrendChart";
import { WorkspaceScopeController } from "@l3/workspace/WorkspaceScopeController";
import { WorkspaceScopeStatus, type WorkspaceScopeStatusItem } from "@l3/workspace/WorkspaceScopeStatus";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import type { EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { Button, Typography } from "@l4/ui";

export function AnalyticsView() {
  const analytics = useAnalyticsWorkspaceCommander();
  const { stats } = analytics;
  const handleEmptyAction = (actionId: EmptyStateActionId) => {
    if (actionId === "choose-conversation") analytics.navigateBackToWorkbench();
    if (actionId === "refresh") analytics.refresh();
  };

  return (
    <div className="workspace-page analytics-workspace">
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3">统计</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            查看当前会话的消息量、趋势和活跃对象，理解口径后导出当前统计。
          </Typography>
        </div>
        <div className="workspace-page__header-actions">
          <Button variant="secondary" onClick={analytics.navigateBackToWorkbench}>
            返回会话
          </Button>
        </div>
      </header>

      <WorkspaceScopeStatus
        workspaceRouteScope={analytics.workspaceRouteScope}
        items={[analyticsStatusItem(stats.loading, stats.error, Boolean(stats.stats), analytics.currentChat)]}
      />
      <WorkspaceScopeController
        model={analytics.scopeController}
        onSelectScope={analytics.selectScope}
        onClearChip={analytics.clearScopeChip}
        onReset={analytics.resetScope}
      />

      <StatsControlBar
        model={analytics.statsControl}
        exportAction={<ExportActionButton {...stats.businessExport.action} />}
        onSelectTimePreset={analytics.selectTimePreset}
        onSelectGranularity={analytics.selectGranularity}
        onSelectObjectFilter={analytics.selectObjectFilter}
        onCustomRangeChange={analytics.setCustomRange}
        onRefresh={analytics.refresh}
        onReset={analytics.resetScope}
        onToggleComparison={analytics.toggleComparison}
      />

      {!analytics.currentChat ? (
        <ActionableEmptyState
          className="workspace-page__surface workspace-page__empty"
          model={analytics.emptyStates.statsEmpty}
          onAction={handleEmptyAction}
        />
      ) : (
        <section className="workspace-page__grid analytics-workspace__grid" aria-label="统计工作区">
          <DashboardOverview
            stats={stats.stats}
            loading={stats.loading}
            comparison={stats.comparison}
          />
          <TrendChart
            data={stats.trend}
            inspectorWidth={720}
            granularity={analytics.stats.lastCompletedControlState?.granularity ?? "day"}
            warning={stats.partialWarnings[0] ?? null}
            error={stats.trendStatus === "error" ? stats.trendError : null}
          />
          <TopContactCard topSenders={stats.stats?.topSenders ?? []} privacyOn={analytics.privacyOn} />
          <MetricExplanation
            definitions={analytics.metricDefinitions}
            comparison={stats.comparison}
            warnings={Array.from(new Set([...analytics.statsControl.warnings, ...stats.partialWarnings]))}
          />
          {stats.error && (
            <div className="workspace-page__surface workspace-page__error" role="alert">
              <Typography variant="label" weight={700}>统计加载失败</Typography>
              <Typography variant="body" color="var(--text-secondary)">
                统计概览未能加载。请确认本机聊天服务和数据库可用后重试。
              </Typography>
              <Button variant="secondary" onClick={analytics.refresh}>重试</Button>
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
