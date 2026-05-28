import { GlassPanel, Typography, SkeletonLoader } from "@l4/ui";
import type { StatsResponse } from "@l2/api-docs/stats";

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <GlassPanel opacity={0.4} borderRadius={14} style={{ padding: "20px" }}>
      <Typography variant="caption" color="var(--color-text-tertiary)">
        {label}
      </Typography>
      <Typography variant="h2" color="var(--color-text-primary)" weight={700} style={{ marginTop: 6 }}>
        {value}
      </Typography>
    </GlassPanel>
  );
}

interface DashboardOverviewProps {
  stats: StatsResponse | null;
  loading: boolean;
}

export function DashboardOverview({ stats, loading }: DashboardOverviewProps) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassPanel key={i} opacity={0.4} borderRadius={14} style={{ padding: "20px" }}>
            <SkeletonLoader variant="text" width="60%" height={12} />
            <SkeletonLoader variant="text" width="40%" height={28} />
          </GlassPanel>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "消息总数", value: stats.total.toLocaleString() },
    { label: "活跃人数", value: String(stats.activeSenders) },
    { label: "活跃天数", value: String(stats.activeDays) },
    { label: "查询范围", value: stats.queryRangeLabel },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {cards.map((card) => (
        <StatCard key={card.label} label={card.label} value={card.value} />
      ))}
    </div>
  );
}
