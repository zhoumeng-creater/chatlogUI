import type {
  GraphLoadStatus,
  GraphStatusView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";

export interface GraphModuleViewInput {
  statusSummary: GraphStatusView | null;
  visualize: GraphVisualizeView | null;
  visualizationRequested: boolean;
}

export interface GraphModuleTableRow {
  id: string;
  type: "node" | "edge" | "timeline";
  label: string;
  detail: string;
}

export interface GraphModuleView {
  kind: GraphLoadStatus | "unavailable" | "failed";
  blocksCoreWorkbench: boolean;
  canVisualize: boolean;
  shouldMountCanvas: boolean;
  message: string;
  statusDetails: string[];
  tableRows: GraphModuleTableRow[];
}

export function deriveGraphModuleView(input: GraphModuleViewInput): GraphModuleView {
  if (input.statusSummary?.state === "unavailable") {
    return baseView("unavailable", "Graph service is unavailable.", input.statusSummary);
  }

  if (input.statusSummary?.state === "error") {
    return baseView("failed", input.statusSummary.lastError || "Graph service failed.", input.statusSummary);
  }

  if (!input.visualize) {
    return {
      ...baseView(
        input.statusSummary?.state === "running" ? "loading" : "idle",
        "Load graph summary to inspect relationships.",
        input.statusSummary,
      ),
      canVisualize: false,
    };
  }

  if (input.visualize.state !== "loaded") {
    return {
      ...baseView(
        input.visualize.state,
        input.visualize.error || graphStateMessage(input.visualize.state),
        input.statusSummary,
      ),
      tableRows: graphTableRows(input.visualize),
    };
  }

  return {
    kind: "loaded",
    blocksCoreWorkbench: false,
    canVisualize: true,
    shouldMountCanvas: input.visualizationRequested,
    message: "Graph summary is loaded.",
    statusDetails: graphStatusDetails(input.statusSummary),
    tableRows: graphTableRows(input.visualize),
  };
}

function baseView(
  kind: GraphModuleView["kind"],
  message: string,
  statusSummary: GraphStatusView | null = null,
): GraphModuleView {
  return {
    kind,
    blocksCoreWorkbench: false,
    canVisualize: false,
    shouldMountCanvas: false,
    message,
    statusDetails: graphStatusDetails(statusSummary),
    tableRows: [],
  };
}

function graphTableRows(visualize: GraphVisualizeView): GraphModuleTableRow[] {
  return [
    ...visualize.nodes.map((node) => ({
      id: `node-${node.id}`,
      type: "node" as const,
      label: node.label,
      detail: node.kind,
    })),
    ...visualize.edges.map((edge) => ({
      id: `edge-${edge.id}`,
      type: "edge" as const,
      label: edge.label,
      detail: `${edge.source} -> ${edge.target}`,
    })),
    ...visualize.timelineRows.map((row, index) => ({
      id: `timeline-${index}`,
      type: "timeline" as const,
      label: row.title,
      detail: row.source || row.description,
    })),
  ];
}

function graphStateMessage(state: GraphLoadStatus): string {
  if (state === "empty") return "No graph data is available for the current filters.";
  if (state === "malformed") return "Graph data is malformed and cannot be visualized.";
  if (state === "oversized") return "Graph data is too large to visualize. Narrow the filters first.";
  if (state === "cancelled") return "Graph loading was cancelled.";
  if (state === "error") return "Graph loading failed.";
  return "Graph is not loaded.";
}

function graphStatusDetails(statusSummary: GraphStatusView | null): string[] {
  if (!statusSummary) return [];
  return [
    statusSummary.queueLabel,
    statusSummary.workerLabel,
    statusSummary.rateLabel,
    statusSummary.etaLabel,
    statusSummary.lastActivityLabel,
  ].filter(Boolean);
}
