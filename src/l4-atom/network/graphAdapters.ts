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
  historyQueued: boolean;
  enqueueRunning: boolean;
  workers: number;
  enqueueWorkers: number;
  startedAt: string;
  processingRatePerMinute: number;
  estimatedSecondsLeft: number;
  lastUpdatedAt: string;
  queueLabel: string;
  workerLabel: string;
  etaLabel: string;
  rateLabel: string;
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

export interface GraphQueryEntityRow {
  id: string;
  label: string;
  type: string;
  mentions: number;
  detailRows: GraphDetailRow[];
}

export interface GraphQueryRelationRow {
  id: string;
  label: string;
  subject: string;
  predicate: string;
  object: string;
  status: string;
  confidence: number;
  supportScore: number;
  verified: string;
  verifiedLabel: string;
  conflictGroup: string;
  validFrom: number;
  validTo: number;
  validFromLabel: string;
  validToLabel: string;
  evidenceCount: number;
  detailRows: GraphDetailRow[];
}

export interface GraphQueryEventRow {
  id: string;
  label: string;
  type: string;
  time: number;
  timeLabel: string;
  sourceLabel: string;
  actors: string[];
  targets: string[];
  detailRows: GraphDetailRow[];
}

export interface GraphQueryFactRow {
  id: string;
  label: string;
  changeType: string;
  status: string;
  supportScore: number;
  verified: string;
  verifiedLabel: string;
  conflictGroup: string;
  validFrom: number;
  validTo: number;
  validFromLabel: string;
  validToLabel: string;
  evidenceCount: number;
  detailRows: GraphDetailRow[];
}

export interface GraphQueryView {
  entities: GraphQueryEntityRow[];
  relations: GraphQueryRelationRow[];
  events: GraphQueryEventRow[];
  facts: GraphQueryFactRow[];
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
  const processing = numberValue(data.processing);
  const workers = numberValue(data.workers);
  const enqueueWorkers = numberValue(data.enqueue_workers);
  const processingRatePerMinute = numberValue(data.processing_rate_per_minute);
  const estimatedSecondsLeft = numberValue(data.estimated_seconds_left);
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
    processing,
    processed: numberValue(data.processed),
    failed: numberValue(data.failed),
    progressPct: numberValue(data.progress_pct),
    lastError,
    historyQueued,
    enqueueRunning: boolValue(data.enqueue_running),
    workers,
    enqueueWorkers,
    startedAt: stringValue(data.started_at),
    processingRatePerMinute,
    estimatedSecondsLeft,
    lastUpdatedAt: stringValue(data.last_updated_at),
    queueLabel: queueLabel(historyQueued, processing),
    workerLabel: workerLabel(workers, enqueueWorkers),
    etaLabel: etaLabel(estimatedSecondsLeft),
    rateLabel: rateLabel(processingRatePerMinute),
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

function adaptQueryEntity(value: unknown): GraphQueryEntityRow {
  const entity = asRecord(value);
  const id = idValue(entity.id) || idValue(entity.entity_id);
  const label = stringValue(entity.name) || stringValue(entity.canonical_name) || id;
  const type = stringValue(entity.type) || stringValue(entity.kind);
  const mentions = numberValue(entity.mentions);
  return {
    id: id || stableId(label, type),
    label,
    type,
    mentions,
    detailRows: compactDetailRows([
      detail("名称", label),
      detail("类型", type),
      detail("提及次数", mentions),
    ]),
  };
}

function adaptQueryRelation(value: unknown): GraphQueryRelationRow {
  const relation = asRecord(value);
  const subject = stringValue(relation.subject) || stringValue(relation.source);
  const predicate = stringValue(relation.predicate) || stringValue(relation.relation);
  const object = stringValue(relation.object) || stringValue(relation.target);
  const status = stringValue(relation.status);
  const confidence = numberValue(relation.confidence);
  const supportScore = numberValue(relation.support_score);
  const verified = stringValue(relation.verified);
  const verifiedDisplay = verifiedLabel(verified);
  const conflictGroup = stringValue(relation.conflict_group);
  const validFrom = numberValue(relation.valid_from);
  const validTo = numberValue(relation.valid_to);
  const validFromLabel = formatUnixSeconds(validFrom);
  const validToLabel = formatUnixSeconds(validTo);
  const evidenceCount = numberValue(relation.evidence_count);
  const label = [subject, predicate, object].filter(Boolean).join(" ");

  return {
    id: idValue(relation.id) || stableId(subject, predicate, object),
    label,
    subject,
    predicate,
    object,
    status,
    confidence,
    supportScore,
    verified,
    verifiedLabel: verifiedDisplay,
    conflictGroup,
    validFrom,
    validTo,
    validFromLabel,
    validToLabel,
    evidenceCount,
    detailRows: compactDetailRows([
      detail("主体", subject),
      detail("关系", predicate),
      detail("客体", object),
      detail("状态", status),
      detail("置信度", confidence),
      detail("支持度", supportScore),
      detail("验证", verifiedDisplay),
      detail("冲突组", conflictGroup),
      detail("有效开始", validFromLabel),
      detail("有效结束", validToLabel),
      detail("证据数量", evidenceCount),
    ]),
  };
}

function adaptQueryEvent(value: unknown): GraphQueryEventRow {
  const event = asRecord(value);
  const label = stringValue(event.title) || stringValue(event.event_type);
  const type = stringValue(event.event_type) || stringValue(event.type);
  const time = numberValue(event.time, numberValue(event.event_time));
  const timeLabel = formatUnixSeconds(time);
  const actors = stringArrayValue(event.actors);
  const targets = stringArrayValue(event.targets);
  const sourceLabel = stringValue(event.source_label) || stringValue(event.source);
  return {
    id: idValue(event.id) || stableId(label, type, time),
    label,
    type,
    time,
    timeLabel,
    sourceLabel,
    actors,
    targets,
    detailRows: compactDetailRows([
      detail("标题", label),
      detail("类型", type),
      detail("时间", timeLabel),
      detail("参与方", actors.join(", ")),
      detail("目标", targets.join(", ")),
      detail("来源", sourceLabel),
      detail("证据数量", numberValue(event.evidence_count)),
    ]),
  };
}

function adaptQueryFact(value: unknown): GraphQueryFactRow {
  const fact = asRecord(value);
  const label = stringValue(fact.statement) || stringValue(fact.canonical_statement);
  const changeType = stringValue(fact.change_type);
  const status = stringValue(fact.status);
  const supportScore = numberValue(fact.support_score);
  const verified = stringValue(fact.verified);
  const verifiedDisplay = verifiedLabel(verified);
  const conflictGroup = stringValue(fact.conflict_group);
  const evidenceCount = numberValue(fact.evidence_count);
  const validFrom = numberValue(fact.valid_from);
  const validTo = numberValue(fact.valid_to);
  const validFromLabel = formatUnixSeconds(validFrom);
  const validToLabel = formatUnixSeconds(validTo);
  return {
    id: idValue(fact.id) || stableId(label, status, validFrom),
    label,
    changeType,
    status,
    supportScore,
    verified,
    verifiedLabel: verifiedDisplay,
    conflictGroup,
    validFrom,
    validTo,
    validFromLabel,
    validToLabel,
    evidenceCount,
    detailRows: compactDetailRows([
      detail("事实", label),
      detail("变化", changeType),
      detail("状态", status),
      detail("支持度", supportScore),
      detail("验证", verifiedDisplay),
      detail("冲突组", conflictGroup),
      detail("有效开始", validFromLabel),
      detail("有效结束", validToLabel),
      detail("证据数量", evidenceCount),
    ]),
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

function idValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function stableId(...parts: Array<string | number>): string {
  const id = parts
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join("|");
  return id || "unknown";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function detail(label: string, value: string | number): GraphDetailRow {
  return { label, value: String(value) };
}

function compactDetailRows(rows: GraphDetailRow[]): GraphDetailRow[] {
  return rows.filter((row) => row.value !== "" && row.value !== "0");
}

function queueLabel(historyQueued: boolean, processing: number): string {
  const history = historyQueued ? "历史已入队" : "历史未入队";
  return `${history} / ${processing} 处理中`;
}

function workerLabel(workers: number, enqueueWorkers: number): string {
  return `${workers} 图谱线程 / ${enqueueWorkers} 入队线程`;
}

function etaLabel(seconds: number): string {
  if (seconds <= 0) return "";
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "约 1 分钟" : `约 ${minutes} 分钟`;
}

function rateLabel(rate: number): string {
  return rate > 0 ? `${Math.round(rate)}/min` : "";
}

function stringArrayValue(value: unknown): string[] {
  return arrayValue(value)
    .map((item) => stringValue(item))
    .filter(Boolean);
}

function verifiedLabel(value: string): string {
  switch (value) {
    case "supported":
      return "已支持";
    case "partial":
      return "部分支持";
    case "unsupported":
      return "不支持";
    case "unverified":
      return "未验证";
    default:
      return value;
  }
}

function formatUnixSeconds(seconds: number): string {
  if (seconds <= 0) return "";
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
