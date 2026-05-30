import { useEffect, useRef, useState } from "react";
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
  privacyOn: boolean;
  onRetry: () => void;
  onShowAi: () => void;
  onOpenGraph: () => void;
}

const DEFAULT_INSPECTOR_WIDTH = 320;

export function StatsInspector({
  currentChat,
  stats,
  trend,
  loading,
  error,
  privacyOn,
  onRetry,
  onShowAi,
  onOpenGraph,
}: StatsInspectorProps) {
  const inspectorRef = useRef<HTMLElement>(null);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);

  useEffect(() => {
    const element = inspectorRef.current;
    if (!element) return undefined;

    const updateWidth = (width: number) => {
      if (!Number.isFinite(width) || width <= 0) return;
      const rounded = Math.round(width);
      setInspectorWidth((current) => (current === rounded ? current : rounded));
    };

    updateWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      updateWidth(entries[0]?.contentRect.width ?? element.getBoundingClientRect().width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <aside ref={inspectorRef} className="stats-inspector" aria-label="统计 inspector">
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
          <TrendChart data={trend} inspectorWidth={inspectorWidth} />
          {stats && <TopContactCard topSenders={stats.topSenders} privacyOn={privacyOn} />}
        </>
      )}
    </aside>
  );
}
