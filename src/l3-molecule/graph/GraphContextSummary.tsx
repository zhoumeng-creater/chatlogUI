import { Typography } from "@l4/ui";
import type { GraphContextSummaryView } from "@l2/commander/graphContextSummaryModel";
import { classNames } from "@/utils/classNames";

interface GraphContextSummaryProps {
  summary: GraphContextSummaryView;
}

export function GraphContextSummary({ summary }: GraphContextSummaryProps) {
  return (
    <section className="graph-context-summary" aria-label={summary.title}>
      <div className="graph-context-summary__head">
        <Typography variant="label" weight={700}>
          {summary.title}
        </Typography>
        <span className={classNames("graph-context-summary__state", `graph-context-summary__state--${summary.freshnessState}`)}>
          {summary.statusLabel}
        </span>
      </div>

      <div className="graph-context-summary__metrics" aria-label="图谱指标">
        {summary.metrics.map((metric) => (
          <div className="graph-context-summary__metric" key={metric.label}>
            <Typography variant="caption" color="var(--text-secondary)">
              {metric.label}
            </Typography>
            <Typography variant="body" weight={700}>
              {metric.value.toLocaleString("zh-CN")}
            </Typography>
          </div>
        ))}
      </div>

      <div className="graph-context-summary__chips" aria-label="当前筛选">
        {summary.filterChips.map((chip) => (
          <span className="graph-chip" key={chip}>{chip}</span>
        ))}
      </div>

      <div className="graph-context-summary__meta">
        <Typography variant="caption" color="var(--text-secondary)">
          {summary.sourceLabel}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {summary.generatedLabel}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {summary.refreshedLabel}
        </Typography>
      </div>

      {summary.warnings.length > 0 && (
        <ul className="graph-context-summary__warnings">
          {summary.warnings.map((warning) => (
            <li key={warning}>
              <Typography variant="caption" color="var(--warning)">
                {warning}
              </Typography>
            </li>
          ))}
        </ul>
      )}

      {summary.recoveryActions.length > 0 && (
        <div className="graph-context-summary__actions" aria-label="下一步">
          {summary.recoveryActions.map((action) => (
            <span className="graph-chip graph-chip--muted" key={action}>{action}</span>
          ))}
        </div>
      )}

      {summary.technicalDetails.length > 0 && (
        <details className="graph-context-summary__details">
          <summary>技术细节</summary>
          <ul>
            {summary.technicalDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
