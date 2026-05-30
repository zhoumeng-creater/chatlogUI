import { Button, Typography } from "@l4/ui";
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { DashboardOverview } from "./DashboardOverview";
import { TrendChart } from "./TrendChart";
import { TopContactCard } from "./TopContactCard";

interface StatsInspectorProps {
  currentChat: string;
  stats: AdaptedStats | null;
  trend: TrendDataPoint[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onShowAi: () => void;
  onOpenGraph: () => void;
}

export function StatsInspector({
  currentChat,
  stats,
  trend,
  loading,
  error,
  onRetry,
  onShowAi,
  onOpenGraph,
}: StatsInspectorProps) {
  return (
    <aside className="stats-inspector" aria-label="统计 inspector">
      <div className="stats-inspector__header">
        <Typography variant="label" weight={700}>
          统计数据
        </Typography>
        <div className="stats-inspector__actions">
          <Button variant="ghost" size="sm" onClick={onShowAi}>
            AI
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenGraph}>
            图谱
          </Button>
        </div>
      </div>

      {!currentChat ? (
        <div className="workbench-empty-state">
          <Typography variant="label" weight={700}>
            选择会话
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            打开会话后显示消息总量、趋势和活跃发送者。
          </Typography>
        </div>
      ) : error ? (
        <div className="workbench-error-state" role="alert">
          <Typography variant="label" weight={700}>
            统计加载失败
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {error}
          </Typography>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : (
        <>
          <DashboardOverview stats={stats} loading={loading} />
          <TrendChart data={trend} />
          {stats && <TopContactCard topSenders={stats.topSenders} />}
        </>
      )}
    </aside>
  );
}
