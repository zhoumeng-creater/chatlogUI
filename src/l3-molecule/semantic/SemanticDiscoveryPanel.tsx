import type { ReactNode } from "react";
import type { SemanticDiscoveryView } from "@/l2-coordinator/commander/semanticDiscoveryViewModel";
import { SemanticDiscoveryContextBar } from "./SemanticDiscoveryContextBar";

interface SemanticDiscoveryPanelProps {
  view: SemanticDiscoveryView;
  onRefresh: () => void;
  children: ReactNode;
}

export function SemanticDiscoveryPanel({ view, onRefresh, children }: SemanticDiscoveryPanelProps) {
  return (
    <section className="semantic-discovery-panel" aria-label="语义发现">
      <SemanticDiscoveryContextBar view={view.context} onRefresh={onRefresh} />
      {children}
    </section>
  );
}
