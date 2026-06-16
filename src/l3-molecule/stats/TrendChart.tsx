import { Surface, Typography } from "@l4/ui";
import type { TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { ChartFallbackTable } from "./ChartFallbackTable";
import { groupTrendData, shouldUseTrendTable, summarizeTrendRange } from "./statsDisplay";
import type { StatsGranularity } from "@l2/commander/statsControlModel";

interface TrendChartProps {
  data: TrendDataPoint[];
  inspectorWidth?: number;
  granularity?: StatsGranularity;
  warning?: string | null;
  error?: string | null;
}

export function TrendChart({
  data,
  inspectorWidth = 320,
  granularity = "day",
  warning = null,
  error = null,
}: TrendChartProps) {
  const visibleData = groupTrendData(data ?? [], granularity);

  if (error) {
    return (
      <Surface variant="base" style={{ padding: 12 }}>
        <Typography variant="label" weight={700}>
          消息趋势
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {error}
        </Typography>
      </Surface>
    );
  }

  if (!visibleData || visibleData.length === 0) {
    return (
      <Surface variant="base" style={{ padding: 12 }}>
        <Typography variant="label" weight={700}>
          消息趋势
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          没有趋势数据。
        </Typography>
      </Surface>
    );
  }

  const maxCount = Math.max(...visibleData.map((point) => point.count), 1);
  const rangeLabel = summarizeTrendRange(visibleData);
  const useTable = shouldUseTrendTable(visibleData, inspectorWidth);

  return (
    <Surface variant="base" style={{ padding: 12 }}>
      <Typography variant="label" weight={700}>
        消息趋势
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {rangeLabel} · {granularity === "day" ? "按日" : granularity === "week" ? "按周" : "按月"}
      </Typography>
      {warning && (
        <Typography variant="caption" color="var(--text-secondary)">
          {warning}
        </Typography>
      )}
      {useTable ? (
        <ChartFallbackTable data={visibleData} />
      ) : (
        <div className="trend-chart" role="img" aria-label={`消息趋势，${rangeLabel}`}>
          {visibleData.map((point) => {
            const heightPct = Math.max((point.count / maxCount) * 100, 3);
            return (
              <div
                key={point.date}
                className="trend-chart__bar"
                style={{ height: `${heightPct}%` }}
                title={`${point.date}: ${point.count}`}
              />
            );
          })}
        </div>
      )}
    </Surface>
  );
}
