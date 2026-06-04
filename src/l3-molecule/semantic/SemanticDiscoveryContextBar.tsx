import { Database, Search, Sparkles } from "lucide-react";
import { Typography } from "@l4/ui/Typography";
import type { SemanticDiscoveryView } from "@l2/commander/semanticDiscoveryViewModel";

interface SemanticDiscoveryContextBarProps {
  view: SemanticDiscoveryView;
}

export function SemanticDiscoveryContextBar({ view }: SemanticDiscoveryContextBarProps) {
  return (
    <div className="semantic-discovery-context" aria-label="语义发现上下文">
      <div className="semantic-discovery-context__primary">
        <Search size={14} aria-hidden="true" />
        <Typography variant="caption" weight={700}>
          {view.context.currentLabel}
        </Typography>
      </div>
      <div className="semantic-discovery-context__chips">
        <span>{view.context.scopeLabel}</span>
        <span>{view.context.windowLabel}</span>
        <span>{view.context.depthLabel}</span>
        <span>{view.context.sourceLimitLabel}</span>
        <span>
          <Sparkles size={12} aria-hidden="true" />
          {view.context.rerankLabel}
        </span>
        <span>
          <Database size={12} aria-hidden="true" />
          索引视图
        </span>
      </div>
    </div>
  );
}
