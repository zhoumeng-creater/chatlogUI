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

export type EdgeStatus = "active" | "ended" | "conflict";

export interface GraphNode {
  id: string;
  name: string;
  kind: EntityKind;
  value: number;
  last_seen: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  status: EdgeStatus;
  confidence: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphTimeline {
  time: number;
  type: "event" | "fact" | "relation";
  title: string;
  description: string;
  source?: string;
}

export interface VisualizeResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timeline: GraphTimeline[];
  generated_at: number;
}

export interface VisualizeParams {
  keyword?: string;
  window?: string;
  limit?: number;
  start?: string;
  end?: string;
}

export interface QueryResult {
  entities: GraphEntity[];
  relations: GraphRelation[];
  events: GraphEvent[];
  facts: GraphFact[];
}

export interface GraphEntity {
  id: number;
  canonical_id: number;
  canonical_name: string;
  canonical_key: string;
  name: string;
  type: string;
  aliases?: string[];
  first_seen: number;
  last_seen: number;
  mentions: number;
}

export interface GraphRelation {
  id: number;
  subject_entity_id: number;
  object_entity_id: number;
  subject: string;
  object: string;
  predicate: string;
  canonical_key: string;
  status: string;
  confidence: number;
  support_score: number;
  verified: string;
  conflict_group?: string;
  valid_from: number;
  valid_to?: number;
  last_seen: number;
  evidence_count: number;
}

export interface GraphEvent {
  id: number;
  event_type: string;
  title: string;
  summary: string;
  actors?: string[];
  targets?: string[];
  event_time: number;
  confidence: number;
  source_record_id: number;
  evidence?: string;
  source_label?: string;
}

export interface GraphFact {
  id: number;
  fact_key: string;
  statement: string;
  canonical_statement: string;
  change_type: string;
  status: string;
  confidence: number;
  support_score: number;
  verified: string;
  conflict_group?: string;
  valid_from: number;
  valid_to?: number;
  source_record_id: number;
  evidence?: string;
}

export interface GraphStatus {
  enabled: boolean;
  paused: boolean;
  running: boolean;
  history_queued: boolean;
  enqueue_running: boolean;
  workers: number;
  enqueue_workers: number;
  store_path: string;
  entity_count: number;
  relation_count: number;
  event_count: number;
  fact_count: number;
  source_count: number;
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  progress_pct: number;
  started_at?: string;
  processing_rate_per_minute?: number;
  estimated_seconds_left?: number;
  last_updated_at?: string;
  last_error?: string;
}
