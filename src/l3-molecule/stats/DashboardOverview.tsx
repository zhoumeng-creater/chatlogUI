import { SkeletonLoader, Surface } from "@l4/ui";
import type { AdaptedStats } from "@l2/data-clerk/stores/useStatsStore";
import { MetricRow } from "./MetricRow";
import { buildMetricRows } from "./statsDisplay";

interface DashboardOverviewProps {
  stats: AdaptedStats | null;
  loading: boolean;
}

export function DashboardOverview({ stats, loading }: DashboardOverviewProps) {
  if (loading) {
    return (
      <Surface variant="base" style={{ padding: 12 }}>
        <SkeletonLoader variant="text" width="65%" height={14} count={4} />
      </Surface>
    );
  }

  if (!stats) return null;

  return (
    <Surface variant="base" style={{ padding: 12 }}>
      {buildMetricRows(stats).map((row) => (
        <MetricRow key={row.label} row={row} />
      ))}
    </Surface>
  );
}
