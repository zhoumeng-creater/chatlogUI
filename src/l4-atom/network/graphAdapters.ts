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
  historyQueued: boolean;
  enqueueRunning: boolean;
  workers: number;
  enqueueWorkers: number;
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
  startedAt: string;
  processingRatePerMinute: number;
  estimatedSecondsLeft: number;
  lastUpdatedAt: string;
  queueLabel: string;
  workerLabel: string;
  rateLabel: string;
  etaLabel: string;
  lastActivityLabel: string;
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

export interface GraphDetailRow {
  label: string;
  value: string;
}

export interface GraphQueryItemView {
  id: string;
  label: string;
  kind: string;
  detailRows: GraphDetailRow[];
}

export interface GraphQueryView {
  entities: GraphQueryItemView[];
  relations: GraphQueryItemView[];
  events: GraphQueryItemView[];
  facts: GraphQueryItemView[];
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
  const historyQueued = boolValue(data.history_queued);
  const enqueueRunning = boolValue(data.enqueue_running);
  const workers = numberValue(data.workers);
  const enqueueWorkers = numberValue(data.enqueue_workers);
  const processingRatePerMinute = numberValue(data.processing_rate_per_minute);
  const estimatedSecondsLeft = numberValue(data.estimated_seconds_left);
  const lastUpdatedAt = stringValue(data.last_updated_at);
  return {
    state: deriveGraphStatusState({ enabled, paused, running, lastError }),
    enabled,
    paused,
    running,
    historyQueued,
    enqueueRunning,
    workers,
    enqueueWorkers,
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
    startedAt: stringValue(data.started_at),
    processingRatePerMinute,
    estimatedSecondsLeft,
    lastUpdatedAt,
    queueLabel: queueLabel({ historyQueued, enqueueRunning }),
    workerLabel: workerLabel({ workers, enqueueWorkers }),
    rateLabel: rateLabel(processingRatePerMinute),
    etaLabel: durationLabel(estimatedSecondsLeft),
    lastActivityLabel: lastUpdatedAt ? `Updated ${lastUpdatedAt}` : "",
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
    entities: arrayValue(data.entities).map(adaptQueryEntity),
    relations: arrayValue(data.relations).map(adaptQueryRelation),
    events: arrayValue(data.events).map(adaptQueryEvent),
    facts: arrayValue(data.facts).map(adaptQueryFact),
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

function adaptQueryEntity(value: unknown): GraphQueryItemView {
  const entity = asRecord(value);
  return {
    id: stringValue(entity.id),
    label: stringValue(entity.name) || stringValue(entity.canonical_name) || stringValue(entity.id),
    kind: stringValue(entity.type) || stringValue(entity.kind) || "entity",
    detailRows: detailRows([
      ["Type", entity.type ?? entity.kind],
      ["Mentions", entity.mentions],
      ["Confidence", entity.confidence],
    ]),
  };
}

function adaptQueryRelation(value: unknown): GraphQueryItemView {
  const relation = asRecord(value);
  return {
    id: stringValue(relation.id),
    label: [relation.subject, relation.predicate, relation.object].map(stringValue).filter(Boolean).join(" "),
    kind: stringValue(relation.predicate) || "relation",
    detailRows: detailRows([
      ["Status", relation.status],
      ["Confidence", relation.confidence],
      ["Support", relation.support_score],
      ["Verified", relation.verified],
      ["Conflict", relation.conflict_group],
      ["Valid from", relation.valid_from],
      ["Valid to", relation.valid_to],
      ["Evidence", evidenceCount(relation)],
    ]),
  };
}

function adaptQueryEvent(value: unknown): GraphQueryItemView {
  const event = asRecord(value);
  return {
    id: stringValue(event.id),
    label: stringValue(event.title) || stringValue(event.event_type) || stringValue(event.id),
    kind: stringValue(event.event_type) || stringValue(event.type) || "event",
    detailRows: detailRows([
      ["Type", event.event_type ?? event.type],
      ["Time", event.event_time ?? event.time],
      ["Confidence", event.confidence],
      ["Evidence", evidenceCount(event)],
    ]),
  };
}

function adaptQueryFact(value: unknown): GraphQueryItemView {
  const fact = asRecord(value);
  return {
    id: stringValue(fact.id),
    label: stringValue(fact.statement) || stringValue(fact.canonical_statement) || stringValue(fact.id),
    kind: stringValue(fact.type) || "fact",
    detailRows: detailRows([
      ["Status", fact.status],
      ["Confidence", fact.confidence],
      ["Support", fact.support_score],
      ["Verified", fact.verified],
      ["Conflict", fact.conflict_group],
      ["Valid from", fact.valid_from],
      ["Valid to", fact.valid_to],
      ["Evidence", evidenceCount(fact)],
    ]),
  };
}

function detailRows(rows: Array<[string, unknown]>): GraphDetailRow[] {
  return rows.flatMap(([label, value]) => {
    const formatted = formatDetailValue(value);
    return formatted ? [{ label, value: formatted }] : [];
  });
}

function evidenceCount(record: RawRecord): number {
  const explicit = numberValue(record.evidence_count, -1);
  if (explicit >= 0) return explicit;
  const evidence = record.evidence;
  if (Array.isArray(evidence)) return evidence.length;
  if (evidence && typeof evidence === "object") return Object.keys(evidence).length || 1;
  return evidence === undefined || evidence === null || evidence === "" ? 0 : 1;
}

function formatDetailValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return "";
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

function queueLabel(input: { historyQueued: boolean; enqueueRunning: boolean }): string {
  return [
    input.historyQueued ? "history queued" : "",
    input.enqueueRunning ? "enqueue running" : "",
  ].filter(Boolean).join(" · ");
}

function workerLabel(input: { workers: number; enqueueWorkers: number }): string {
  return [
    input.workers > 0 ? `${input.workers} graph ${input.workers === 1 ? "worker" : "workers"}` : "",
    input.enqueueWorkers > 0 ? `${input.enqueueWorkers} enqueue ${input.enqueueWorkers === 1 ? "worker" : "workers"}` : "",
  ].filter(Boolean).join(" · ");
}

function rateLabel(value: number): string {
  return value > 0 ? `${value}/min` : "";
}

function durationLabel(seconds: number): string {
  if (seconds <= 0) return "";
  const wholeSeconds = Math.round(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  if (minutes > 0 && remainder > 0) return `${minutes}m ${remainder}s left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${remainder}s left`;
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
