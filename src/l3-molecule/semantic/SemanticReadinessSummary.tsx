import type { SemanticSetupReadinessItem } from "@l2/commander/semanticSetupViewModel";
import { StatusIndicator } from "@l4/ui/StatusIndicator";

interface SemanticReadinessSummaryProps {
  items: SemanticSetupReadinessItem[];
}

export function SemanticReadinessSummary({ items }: SemanticReadinessSummaryProps) {
  return (
    <div className="semantic-setup-summary" aria-label="语义功能准备状态">
      {items.map((item) => (
        <div key={item.id} className="semantic-setup-summary__item">
          <span className="semantic-setup-summary__label">{item.label}</span>
          <StatusIndicator label={item.value} tone={item.tone} />
        </div>
      ))}
    </div>
  );
}
