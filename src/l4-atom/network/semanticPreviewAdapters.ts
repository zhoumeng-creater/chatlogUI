type RawRecord = Record<string, unknown>;

export type SemanticPreviewKind = "message" | "entity" | "chunk" | "all" | string;

export interface SemanticPreviewGroup {
  name: string;
  count: number;
}

export interface SemanticPreviewRow {
  id: string;
  kind: SemanticPreviewKind;
  identityLabel: string;
  contentPreview: string;
  vectorNorm: number;
  sampleDimensions: number;
  coordinates: { x: number; y: number; z: number };
  outlierScore: number;
  isOutlier: boolean;
  updatedAt: number;
}

export interface SemanticIndexPreviewView {
  model: string;
  dim: number;
  kind: SemanticPreviewKind;
  limit: number;
  offset: number;
  total: number;
  sampleDims: number;
  groups: SemanticPreviewGroup[];
  rows: SemanticPreviewRow[];
  outliers: SemanticPreviewRow[];
}

export function adaptSemanticIndexPreview(raw: unknown): SemanticIndexPreviewView {
  const data = asRecord(raw);
  return {
    model: stringValue(data.model),
    dim: numberValue(data.dim),
    kind: stringValue(data.kind) || "all",
    limit: numberValue(data.limit),
    offset: numberValue(data.offset),
    total: numberValue(data.total),
    sampleDims: numberValue(data.sample_dims),
    groups: arrayValue(data.groups).map((group) => {
      const row = asRecord(group);
      return {
        name: stringValue(row.name),
        count: numberValue(row.count),
      };
    }),
    rows: arrayValue(data.items).map(adaptSemanticPreviewRow),
    outliers: arrayValue(data.outliers).map(adaptSemanticPreviewRow),
  };
}

function adaptSemanticPreviewRow(raw: unknown): SemanticPreviewRow {
  const data = asRecord(raw);
  return {
    id: stringValue(data.id),
    kind: stringValue(data.kind) || "unknown",
    identityLabel: "已隐藏对象",
    contentPreview: "已隐藏内容",
    vectorNorm: numberValue(data.vector_norm),
    sampleDimensions: arrayValue(data.vector_sample).length,
    coordinates: {
      x: numberValue(data.x),
      y: numberValue(data.y),
      z: numberValue(data.z),
    },
    outlierScore: numberValue(data.outlier_score),
    isOutlier: boolValue(data.is_outlier),
    updatedAt: numberValue(data.updated_at),
  };
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

function boolValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}
