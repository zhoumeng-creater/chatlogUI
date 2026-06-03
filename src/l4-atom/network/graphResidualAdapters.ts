type RawRecord = Record<string, unknown>;

export interface GraphConfigView {
  workers: number;
  enqueueWorkers: number;
}

export interface GraphConfigDraft {
  workers: number;
  enqueueWorkers: number;
}

export interface GraphConfigPayload {
  workers: number;
  enqueue_workers: number;
}

export type GraphIngestKind = "business" | "event" | "message";

export interface GraphBusinessDraft {
  source?: string;
  type?: string;
  time?: string;
  title?: string;
  content?: string;
  entities?: string;
}

export interface GraphEventDraft {
  eventType?: string;
  time?: string;
  actors?: string;
  targets?: string;
  content?: string;
}

export type GraphIngestDraft = GraphBusinessDraft | GraphEventDraft;

export interface GraphIngestResult {
  kind: GraphIngestKind;
  ok: boolean;
  count: number;
  idCount: number;
  statusLabel: string;
}

export interface GraphQADraft {
  query: string;
  window?: string;
  start?: string;
  end?: string;
}

export interface GraphQAResponseView {
  hasAnswer: boolean;
  answerPreview: string;
  evidenceCount: number;
  evidenceSummary: string;
}

export function adaptGraphConfig(raw: unknown): GraphConfigView {
  const data = asRecord(raw);
  return {
    workers: positiveInt(data.workers, 1),
    enqueueWorkers: positiveInt(data.enqueue_workers, 1),
  };
}

export function buildGraphConfigPayload(draft: GraphConfigDraft): GraphConfigPayload {
  return {
    workers: positiveInt(draft.workers, 1),
    enqueue_workers: positiveInt(draft.enqueueWorkers, 1),
  };
}

export function buildGraphIngestPayload(kind: GraphIngestKind, draft: GraphIngestDraft): RawRecord {
  if (kind === "event") {
    const eventDraft = draft as GraphEventDraft;
    return {
      event_type: stringValue(eventDraft.eventType),
      time: stringValue(eventDraft.time),
      actors: splitCsv(eventDraft.actors),
      targets: splitCsv(eventDraft.targets),
      content: stringValue(eventDraft.content),
      metadata: {},
    };
  }

  const businessDraft = draft as GraphBusinessDraft;
  return {
    source: stringValue(businessDraft.source),
    type: stringValue(businessDraft.type),
    time: stringValue(businessDraft.time),
    title: stringValue(businessDraft.title),
    content: stringValue(businessDraft.content),
    entities: splitCsv(businessDraft.entities),
    metadata: {},
  };
}

export function adaptGraphIngestResponse(kind: GraphIngestKind, raw: unknown): GraphIngestResult {
  const data = asRecord(raw);
  const ids = arrayValue(data.ids);
  return {
    kind,
    ok: boolValue(data.ok),
    count: numberValue(data.count, ids.length),
    idCount: ids.length,
    statusLabel: boolValue(data.ok) ? "accepted" : "failed",
  };
}

export function buildGraphQAPayload(draft: GraphQADraft): RawRecord {
  const payload: RawRecord = { query: draft.query };
  if (draft.window) payload.window = draft.window;
  if (draft.start) payload.start = draft.start;
  if (draft.end) payload.end = draft.end;
  return payload;
}

export function adaptGraphQAResponse(raw: unknown): GraphQAResponseView {
  const data = asRecord(raw);
  const evidenceCount = countEvidence(data.evidence);
  return {
    hasAnswer: stringValue(data.answer).length > 0,
    answerPreview: stringValue(data.answer).length > 0 ? "已隐藏回答" : "",
    evidenceCount,
    evidenceSummary: `${evidenceCount} 条证据已隐藏`,
  };
}

function countEvidence(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  const record = asRecord(value);
  return Object.values(record).reduce<number>(
    (sum, item) => sum + arrayValue(item).length,
    0,
  );
}

function splitCsv(value: unknown): string[] {
  return stringValue(value)
    .replace(/[，;|\n]+/g, ",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveInt(value: unknown, fallback: number): number {
  return Math.max(1, Math.round(numberValue(value, fallback)));
}

function boolValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}
