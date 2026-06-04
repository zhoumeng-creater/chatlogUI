import { RefreshCw } from "lucide-react";
import { Button, Typography } from "@l4/ui";
import type { SemanticDiscoveryView } from "@/l2-coordinator/commander/semanticDiscoveryViewModel";

interface SemanticDiscoveryContextBarProps {
  view: SemanticDiscoveryView["context"];
  onRefresh: () => void;
}

export function SemanticDiscoveryContextBar({ view, onRefresh }: SemanticDiscoveryContextBarProps) {
  return (
    <div className="semantic-discovery-context" aria-label="语义发现上下文">
      <div className="semantic-discovery-context__chips">
        <span>{view.scopeLabel}</span>
        <span>{view.windowLabel}</span>
        <span>{view.readinessLabel}</span>
        <span>{view.privacyLabel}</span>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
        <RefreshCw size={14} />
        刷新
      </Button>
      <Typography variant="caption" color="var(--text-muted)" className="semantic-discovery-context__hint">
        搜索、话题、画像和索引预览共享当前语义范围。
      </Typography>
    </div>
  );
}
