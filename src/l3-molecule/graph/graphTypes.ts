export type EntityKind =
  | "person"
  | "organization"
  | "project"
  | "product"
  | "customer"
  | "group"
  | "topic"
  | "keyword"
  | "event"
  | "unknown";

export type GraphLayoutMode = "force" | "radial";

export type GraphLoadStatusView =
  | "idle"
  | "loading"
  | "empty"
  | "loaded"
  | "error"
  | "malformed"
  | "oversized"
  | "cancelled";

export interface GraphStatusSummaryView {
  state: "ready" | "running" | "paused" | "unavailable" | "error";
  enabled: boolean;
  paused: boolean;
  running: boolean;
  counts: {
    entities: number;
    relations: number;
    events: number;
    facts: number;
    sources: number;
  };
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  progressPct: number;
  lastError: string;
  historyQueued?: boolean;
  enqueueRunning?: boolean;
  workers?: number;
  enqueueWorkers?: number;
  startedAt?: string;
  processingRatePerMinute?: number;
  estimatedSecondsLeft?: number;
  lastUpdatedAt?: string;
  queueLabel?: string;
  workerLabel?: string;
  rateLabel?: string;
  etaLabel?: string;
  lastActivityLabel?: string;
}

export interface GraphNodeView {
  id: string;
  name: string;
  label?: string;
  kind: EntityKind | (string & {});
  value: number;
  last_seen: number;
}

export interface GraphEdgeView {
  id: string;
  source: string;
  target: string;
  label: string;
  status: "active" | "ended" | "conflict" | (string & {});
  confidence: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphTimelineEntryView {
  time: number;
  type: "event" | "fact" | "relation" | (string & {});
  title: string;
  description: string;
  source?: string;
}

export interface GraphDataView {
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  timeline: GraphTimelineEntryView[];
  generated_at: number;
}

export interface GraphVisualizeViewState {
  state: GraphLoadStatusView;
  nodes: Array<GraphNodeView & { label: string }>;
  edges: GraphEdgeView[];
  timelineRows: Array<GraphTimelineEntryView & { source: string }>;
  generatedAt: number;
  error: string;
  summary: {
    nodeCount: number;
    edgeCount: number;
    timelineCount: number;
  };
}

export interface GraphActionResultView {
  ok: boolean;
  accepted: boolean;
  status: string;
  error: string;
}

export interface GraphModuleTableRowView {
  id: string;
  type: "node" | "edge" | "timeline";
  label: string;
  detail: string;
}

export interface GraphModuleViewState {
  kind: GraphLoadStatusView | "unavailable" | "failed";
  blocksCoreWorkbench: boolean;
  canVisualize: boolean;
  shouldMountCanvas: boolean;
  message: string;
  statusDetails: string[];
  tableRows: GraphModuleTableRowView[];
}
