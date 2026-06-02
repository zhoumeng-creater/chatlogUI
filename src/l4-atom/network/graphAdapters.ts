type RawRecord = Record<string, unknown>;

export type GraphLoadStatus =
  | "idle"
  | "loading"
  | "empty"
  | "loaded"
  | "error"
  | "malformed"
  | "oversized"
  | "cancelled";

export interface GraphStatusView {
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
}

export interface GraphNodeView {
  id: string;
  name: string;
  label: string;
  kind: string;
  value: number;
  last_seen: number;
}

export interface GraphEdgeView {
  id: string;
  source: string;
  target: string;
  label: string;
  status: string;
  confidence: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphTimelineRow {
  time: number;
  type: string;
  title: string;
  description: string;
  source: string;
}

export interface GraphVisualizeView {
  state: GraphLoadStatus;
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
  timelineRows: GraphTimelineRow[];
  generatedAt: number;
  error: string;
  summary: {
    nodeCount: number;
    edgeCount: number;
    timelineCount: number;
  };
}

export interface GraphQueryView {
  entities: Array<Record<string, unknown> & { label: string }>;
  relations: Array<Record<string, unknown> & { label: string }>;
  events: Array<Record<string, unknown> & { label: string }>;
  facts: Array<Record<string, unknown> & { label: string }>;
}

export interface GraphTimelineView {
  count: number;
  rows: GraphTimelineRow[];
}

export interface GraphActionResult {
  ok: boolean;
  accepted: boolean;
  status: string;
  error: string;
}

export function adaptGraphStatus(raw: unknown): GraphStatusView {
  const data = asRecord(raw);
  const enabled = boolValue(data.enabled);
  const paused = boolValue(data.paused);
  const running = boolValue(data.running);
  const lastError = stringValue(data.last_error);
  return {
    state: deriveGraphStatusState({ enabled, paused, running, lastError }),
    enabled,
    paused,
    running,
    counts: {
      entities: numberValue(data.entity_count),
      relations: numberValue(data.relation_count),
      events: numberValue(data.event_count),
      facts: numberValue(data.fact_count),
      sources: numberValue(data.source_count),
    },
    pending: numberValue(data.pending),
    processing: numberValue(data.processing),
    processed: numberValue(data.processed),
    failed: numberValue(data.failed),
    progressPct: numberValue(data.progress_pct),
    lastError,
  };
}

export function adaptGraphVisualize(
  raw: unknown,
  options: { visualizationCap: number },
): GraphVisualizeView {
  const data = asRecord(raw);
  const rawNodes = arrayValue(data.nodes);
  const rawEdges = arrayValue(data.edges);
  const rawTimeline = arrayValue(data.timeline);

  if (rawNodes.length > options.visualizationCap) {
    return graphVisualizeState("oversized", rawNodes.length, rawEdges.length, rawTimeline.length);
  }

  const nodes = rawNodes.map(adaptNode);
  const edges = rawEdges.map(adaptEdge);
  const malformed =
    nodes.some((node) => !node.id) ||
    edges.some((edge) => !edge.source || !edge.target);

  if (malformed) {
    return graphVisualizeState("malformed", rawNodes.length, rawEdges.length, rawTimeline.length, "Malformed graph payload.");
  }

  if (nodes.length === 0 && edges.length === 0) {
    return graphVisualizeState("empty", 0, 0, rawTimeline.length);
  }

  const timelineRows = rawTimeline.map(adaptTimelineRow);
  return {
    state: "loaded",
    nodes,
    edges,
    timelineRows,
    generatedAt: numberValue(data.generated_at),
    error: "",
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      timelineCount: timelineRows.length,
    },
  };
}

export function adaptGraphQuery(raw: unknown): GraphQueryView {
  const data = asRecord(raw);
  return {
    entities: arrayValue(data.entities).map((item) => {
      const entity = asRecord(item);
      return { ...entity, label: stringValue(entity.name) || stringValue(entity.canonical_name) };
    }),
    relations: arrayValue(data.relations).map((item) => {
      const relation = asRecord(item);
      return {
        ...relation,
        label: [relation.subject, relation.predicate, relation.object].map(stringValue).filter(Boolean).join(" "),
      };
    }),
    events: arrayValue(data.events).map((item) => {
      const event = asRecord(item);
      return { ...event, label: stringValue(event.title) || stringValue(event.event_type) };
    }),
    facts: arrayValue(data.facts).map((item) => {
      const fact = asRecord(item);
      return { ...fact, label: stringValue(fact.statement) || stringValue(fact.canonical_statement) };
    }),
  };
}

export function adaptGraphTimeline(raw: unknown): GraphTimelineView {
  const data = asRecord(raw);
  const rows = arrayValue(data.items).map(adaptTimelineRow);
  return {
    count: numberValue(data.count, rows.length),
    rows,
  };
}

export function adaptGraphActionResult(raw: unknown): GraphActionResult {
  const data = asRecord(raw);
  return {
    ok: boolValue(data.ok),
    accepted: boolValue(data.accepted),
    status: stringValue(data.status),
    error: stringValue(data.error),
  };
}

function graphVisualizeState(
  state: GraphLoadStatus,
  nodeCount: number,
  edgeCount: number,
  timelineCount: number,
  error = "",
): GraphVisualizeView {
  return {
    state,
    nodes: [],
    edges: [],
    timelineRows: [],
    generatedAt: 0,
    error,
    summary: { nodeCount, edgeCount, timelineCount },
  };
}

function adaptNode(value: unknown): GraphNodeView {
  const node = asRecord(value);
  const id = stringValue(node.id);
  const name = stringValue(node.name) || id;
  return {
    id,
    name,
    label: name,
    kind: stringValue(node.kind) || stringValue(node.type) || "unknown",
    value: numberValue(node.value, numberValue(node.mentions, 1)),
    last_seen: numberValue(node.last_seen),
  };
}

function adaptEdge(value: unknown): GraphEdgeView {
  const edge = asRecord(value);
  return {
    id: stringValue(edge.id) || `${stringValue(edge.source)}-${stringValue(edge.target)}-${stringValue(edge.label)}`,
    source: stringValue(edge.source),
    target: stringValue(edge.target),
    label: stringValue(edge.label) || stringValue(edge.predicate),
    status: stringValue(edge.status) || "active",
    confidence: numberValue(edge.confidence),
    last_seen: numberValue(edge.last_seen),
    evidence_count: numberValue(edge.evidence_count),
  };
}

function adaptTimelineRow(value: unknown): GraphTimelineRow {
  const row = asRecord(value);
  return {
    time: numberValue(row.time),
    type: stringValue(row.type),
    title: stringValue(row.title),
    description: stringValue(row.description),
    source: stringValue(row.source) || stringValue(row.source_label),
  };
}

function deriveGraphStatusState(input: {
  enabled: boolean;
  paused: boolean;
  running: boolean;
  lastError: string;
}): GraphStatusView["state"] {
  if (!input.enabled) return "unavailable";
  if (input.lastError) return "error";
  if (input.paused) return "paused";
  if (input.running) return "running";
  return "ready";
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}
