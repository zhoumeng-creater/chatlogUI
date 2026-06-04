import type { AiPhase, IndexStatusResponse, QAMessage, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";
import { maskDiagnosticText } from "@/utils/maskSecrets";

export type SemanticQaStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "stopped"
  | "failed"
  | "empty";

export type SemanticModuleKind =
  | "checking_config"
  | "setup_required"
  | "index_unavailable"
  | "index_running"
  | "index_paused"
  | "ready"
  | "failed";

export interface SemanticModuleView {
  kind: SemanticModuleKind;
  blocksCoreWorkbench: boolean;
  searchEnabled: boolean;
  qaEnabled: boolean;
  statusLabel: string;
  message: string;
  indexSummary?: SemanticIndexSummary;
}

export interface SemanticQaView {
  status: SemanticQaStatus;
  label: string;
  message: string;
  canStop: boolean;
  evidenceReady: boolean;
  sourceCount: number;
  metadataSummary: string[];
}

export interface SemanticIndexSummary {
  progressLabel: string;
  etaLabel: string;
  rateLabel: string;
  coverageLabel: string;
  lastActivityLabel: string;
}

export interface CompactSemanticStatus {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger" | "ai";
  busy: boolean;
}

export interface SemanticViewInput {
  phase?: AiPhase;
  config: SemanticConfig | null;
  indexStatus: IndexStatusResponse | null;
  qaStatus: SemanticQaStatus;
}

export function deriveSemanticModuleView(input: SemanticViewInput): SemanticModuleView {
  if (input.phase === "idle" || input.phase === "checking_config" || input.phase === "index_checking") {
    return {
      kind: "checking_config",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: "Checking config",
      message: "Checking semantic provider configuration.",
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  const readiness = input.config?.readiness;

  if (!input.config || !readiness?.readyForSearch || !readiness?.readyForQa) {
    return {
      kind: "setup_required",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: "Setup required",
      message: "Semantic provider configuration is required for this module.",
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  const status = input.indexStatus?.state ?? input.indexStatus?.status ?? "unavailable";
  if (status === "error") {
    return {
      kind: "failed",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: "Index failed",
      message: safeStatusText(input.indexStatus?.lastError || input.indexStatus?.error || "Semantic index failed."),
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  if (status === "running" || status === "building") {
    return {
      kind: "index_running",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: `Indexing ${indexProgress(input.indexStatus)}%`,
      message: "Semantic indexing is running. Core chat, search, and stats remain available.",
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  if (status === "paused") {
    return {
      kind: "index_paused",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: "Index paused",
      message: "Resume or rebuild the semantic index to use semantic search and QA.",
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  if (status === "ready") {
    return {
      kind: "ready",
      blocksCoreWorkbench: false,
      searchEnabled: true,
      qaEnabled: true,
      statusLabel: "Ready",
      message: "Semantic search and QA are ready.",
      indexSummary: semanticIndexSummary(input.indexStatus),
    };
  }

  return {
    kind: "index_unavailable",
    blocksCoreWorkbench: false,
    searchEnabled: false,
    qaEnabled: false,
    statusLabel: "Index unavailable",
    message: "Build the semantic index to enable semantic search and QA.",
    indexSummary: semanticIndexSummary(input.indexStatus),
  };
}

export function deriveSemanticQaView(input: {
  status: SemanticQaStatus;
  answer: string;
  error?: string | null;
  message?: QAMessage;
}): SemanticQaView {
  const extras = qaViewExtras(input.message);
  switch (input.status) {
    case "connecting":
      return { status: input.status, label: "Connecting", message: "Connecting to semantic QA.", canStop: true, ...extras };
    case "streaming":
      return { status: input.status, label: "Streaming", message: input.answer, canStop: true, ...extras };
    case "completed":
      return { status: input.status, label: "Completed", message: input.answer, canStop: false, ...extras };
    case "stopped":
      return { status: input.status, label: "Stopped", message: input.answer || "The stream was stopped.", canStop: false, ...extras };
    case "failed":
      return { status: input.status, label: "Failed", message: safeStatusText(input.error || "Semantic QA failed."), canStop: false, ...extras };
    case "empty":
      return { status: input.status, label: "No Answer", message: "The stream completed without an answer.", canStop: false, ...extras };
    case "idle":
    default:
      return { status: "idle", label: "Idle", message: "", canStop: false, ...extras };
  }
}

export function deriveCompactSemanticStatus(input: SemanticViewInput): CompactSemanticStatus | null {
  if (input.qaStatus === "stopped") {
    return { label: "AI stopped", tone: "warning", busy: false };
  }

  if (input.qaStatus === "streaming" || input.qaStatus === "connecting") {
    return { label: "AI streaming", tone: "ai", busy: true };
  }

  const view = deriveSemanticModuleView(input);
  if (view.kind === "setup_required") {
    return { label: "AI not configured", tone: "warning", busy: false };
  }
  if (view.kind === "checking_config") {
    return { label: "AI checking", tone: "info", busy: true };
  }
  if (view.kind === "index_running") {
    return { label: view.statusLabel, tone: "info", busy: true };
  }
  if (view.kind === "index_paused") {
    return { label: "Index paused", tone: "warning", busy: false };
  }
  if (view.kind === "failed") {
    return { label: "AI failed", tone: "danger", busy: false };
  }
  if (view.kind === "ready") {
    return { label: "AI ready", tone: "ai", busy: false };
  }
  if (view.kind === "index_unavailable") {
    return { label: "AI index unavailable", tone: "neutral", busy: false };
  }
  return null;
}

function indexProgress(indexStatus: IndexStatusResponse | null): number {
  if (!indexStatus) return 0;
  if (typeof indexStatus.progressPct === "number") return Math.round(indexStatus.progressPct);
  if (indexStatus.total > 0) return Math.round((indexStatus.completed / indexStatus.total) * 100);
  if (typeof indexStatus.processed === "number" && typeof indexStatus.pending === "number") {
    const total = indexStatus.processed + indexStatus.pending;
    return total > 0 ? Math.round((indexStatus.processed / total) * 100) : 0;
  }
  return 0;
}

function semanticIndexSummary(indexStatus: IndexStatusResponse | null): SemanticIndexSummary | undefined {
  if (!indexStatus) return undefined;
  return {
    progressLabel: indexStatus.progressLabel || `${indexProgress(indexStatus)}% indexed`,
    etaLabel: indexStatus.etaLabel || "",
    rateLabel: indexStatus.rateLabel || "",
    coverageLabel: indexStatus.coverageLabel || "",
    lastActivityLabel: indexStatus.lastActivityLabel || "",
  };
}

function qaViewExtras(message?: QAMessage): Pick<SemanticQaView, "evidenceReady" | "sourceCount" | "metadataSummary"> {
  const sourceCount = message?.sourceCount ?? message?.evidence?.length ?? 0;
  return {
    evidenceReady: sourceCount > 0 || (message?.evidence?.length ?? 0) > 0,
    sourceCount,
    metadataSummary: semanticMetadataSummary(message?.metadata),
  };
}

function semanticMetadataSummary(metadata?: Record<string, unknown>): string[] {
  if (!metadata) return [];
  const summary: string[] = [];
  const window = stringMetadata(metadata, "window");
  const depth = stringMetadata(metadata, "depth") || stringMetadata(metadata, "retrievalDepth");
  const rerankApplied = booleanMetadata(metadata, "rerankApplied") ?? booleanMetadata(metadata, "rerank_applied");
  const rerankTried = booleanMetadata(metadata, "rerankTried") ?? booleanMetadata(metadata, "rerank_tried");
  const rerankError = stringMetadata(metadata, "rerankError") || stringMetadata(metadata, "rerank_error");

  if (window) summary.push(`Window ${window}`);
  if (depth) summary.push(`Depth ${depth}`);
  if (rerankError) summary.push("Rerank error");
  else if (rerankApplied) summary.push("Rerank applied");
  else if (rerankTried) summary.push("Rerank tried");

  return summary;
}

function safeStatusText(text: string): string {
  return maskDiagnosticText(text);
}

function stringMetadata(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function booleanMetadata(metadata: Record<string, unknown>, key: string): boolean | null {
  const value = metadata[key];
  return typeof value === "boolean" ? value : null;
}
