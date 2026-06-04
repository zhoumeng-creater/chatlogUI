import type { SemanticIndexMetric } from "@l2/commander/semanticSetupViewModel";

interface SemanticIndexStatusPanelProps {
  metrics: SemanticIndexMetric[];
}

export function SemanticIndexStatusPanel({ metrics }: SemanticIndexStatusPanelProps) {
  if (metrics.length === 0) return null;

  return (
    <dl className="semantic-index-metrics" aria-label="语义索引指标">
      {metrics.map((metric) => (
        <div key={metric.id} className="semantic-index-metric">
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
        </div>
      ))}
    </dl>
  );
}
