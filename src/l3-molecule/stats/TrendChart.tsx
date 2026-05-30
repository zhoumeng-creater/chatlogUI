import { Surface, Typography } from "@l4/ui";
import type { TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import { ChartFallbackTable } from "./ChartFallbackTable";
import { shouldUseTrendTable, summarizeTrendRange } from "./statsDisplay";

interface TrendChartProps {
  data: TrendDataPoint[];
  inspectorWidth?: number;
}

export function TrendChart({ data, inspectorWidth = 320 }: TrendChartProps) {
  if (!data || data.length === 0) {
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

  const maxCount = Math.max(...data.map((point) => point.count), 1);
  const rangeLabel = summarizeTrendRange(data);
  const useTable = shouldUseTrendTable(data, inspectorWidth);

  return (
    <Surface variant="base" style={{ padding: 12 }}>
      <Typography variant="label" weight={700}>
        消息趋势
      </Typography>
      <Typography variant="caption" color="var(--text-secondary)">
        {rangeLabel}
      </Typography>
      {useTable ? (
        <ChartFallbackTable data={data} />
      ) : (
        <div className="trend-chart" role="img" aria-label={`消息趋势，${rangeLabel}`}>
          {data.map((point) => {
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
