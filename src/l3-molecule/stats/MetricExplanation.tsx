import type { StatsComparisonState } from "@l2/data-clerk/stores/useStatsStore";
import { Surface, Typography } from "@l4/ui";

interface MetricDefinition {
  key: string;
  label: string;
  description: string;
}

interface MetricExplanationProps {
  definitions: MetricDefinition[];
  comparison: StatsComparisonState;
  warnings: string[];
}

export function MetricExplanation({ definitions, comparison, warnings }: MetricExplanationProps) {
  return (
    <Surface variant="base" className="metric-explanation">
      <div>
        <Typography variant="label" weight={700}>指标说明</Typography>
        <Typography variant="body" color="var(--text-secondary)">
          统计值来自当前范围；导出会保留口径、时间范围和比较说明。
        </Typography>
      </div>

      <dl className="metric-explanation__definitions">
        {definitions.map((definition) => (
          <div key={definition.key} className="metric-explanation__definition">
            <dt>{definition.label}</dt>
            <dd>{definition.description}</dd>
          </div>
        ))}
      </dl>

      {comparison.mode === "previousPeriod" && (
        <div className="metric-explanation__comparison">
          <Typography variant="caption" color="var(--text-secondary)" weight={700}>
            上一周期比较
          </Typography>
          {comparison.unavailableReason ? (
            <Typography variant="body" color="var(--text-secondary)">
              {comparison.unavailableReason}
            </Typography>
          ) : (
            <ul>
              {comparison.rows.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <strong>{formatDelta(row.deltaPercent)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="metric-explanation__warnings" role="status">
          {warnings.map((warning) => (
            <Typography key={warning} variant="caption" color="var(--text-secondary)">
              {warning}
            </Typography>
          ))}
        </div>
      )}
    </Surface>
  );
}

function formatDelta(deltaPercent: number | null): string {
  if (deltaPercent === null || !Number.isFinite(deltaPercent)) return "较上一周期无法计算";
  const sign = deltaPercent > 0 ? "+" : "";
  return `较上一周期 ${sign}${Math.round(deltaPercent)}%`;
}
