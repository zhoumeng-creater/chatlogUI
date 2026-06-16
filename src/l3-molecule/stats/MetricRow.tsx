import { Typography } from "@l4/ui";
import type { MetricRowData } from "./statsDisplay";

interface MetricRowProps {
  row: MetricRowData;
}

export function MetricRow({ row }: MetricRowProps) {
  return (
    <div className="metric-row">
      <div>
        <Typography variant="label" weight={700} className="metric-row__label">
          {row.label}
        </Typography>
        <Typography
          variant="caption"
          color="var(--text-secondary)"
          className="metric-row__description"
        >
          {row.description}
        </Typography>
      </div>
      <span className="metric-row__value">
        {row.value}
        {row.comparison && (
          <span className="metric-row__comparison" data-tone={row.comparisonTone ?? "neutral"}>
            {row.comparison}
          </span>
        )}
      </span>
    </div>
  );
}
