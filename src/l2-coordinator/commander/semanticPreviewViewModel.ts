import type {
  SemanticIndexPreviewView,
  SemanticPreviewKind,
  SemanticPreviewRow,
} from "@l4/network";

export type { SemanticPreviewKind };

export type SemanticPreviewStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface SemanticPreviewViewInput {
  status: SemanticPreviewStatus;
  preview: SemanticIndexPreviewView | null;
  error: string | null;
}

export interface SemanticPreviewRowView extends SemanticPreviewRow {
  coordinateLabel: string;
  outlierLabel: string;
}

export interface SemanticPreviewView {
  status: SemanticPreviewStatus;
  kind: SemanticPreviewKind;
  summary: string;
  modelSummary: string;
  groups: SemanticIndexPreviewView["groups"];
  rows: SemanticPreviewRowView[];
  outliers: SemanticPreviewRowView[];
  canPagePrevious: boolean;
  canPageNext: boolean;
  errorCopy: string | null;
}

export function buildSemanticPreviewView(
  input: SemanticPreviewViewInput,
  privacyOn: boolean,
): SemanticPreviewView {
  const preview = input.preview;
  const rows = preview?.rows ?? [];

  return {
    status: input.status,
    kind: preview?.kind ?? "all",
    summary: preview
      ? `${preview.total} vectors · ${rows.length} shown · ${preview.outliers.length} outliers`
      : "语义索引预览未加载",
    modelSummary: preview
      ? `${preview.model || "unknown model"} · ${preview.dim} dims · sample ${preview.sampleDims}`
      : "无模型信息",
    groups: preview?.groups ?? [],
    rows: rows.map((row) => safeRow(row, privacyOn)),
    outliers: (preview?.outliers ?? []).map((row) => safeRow(row, privacyOn)),
    canPagePrevious: Boolean(preview && preview.offset > 0),
    canPageNext: Boolean(preview && preview.offset + preview.limit < preview.total),
    errorCopy: input.error,
  };
}

function safeRow(row: SemanticPreviewRow, privacyOn: boolean): SemanticPreviewRowView {
  return {
    ...row,
    identityLabel: privacyOn ? "已隐藏对象" : row.identityLabel,
    contentPreview: privacyOn ? "已隐藏内容" : row.contentPreview,
    coordinateLabel: `${round(row.coordinates.x)}, ${round(row.coordinates.y)}, ${round(row.coordinates.z)}`,
    outlierLabel: row.isOutlier ? `离群 ${round(row.outlierScore)}` : `正常 ${round(row.outlierScore)}`,
  };
}

function round(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}
