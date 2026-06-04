import type { AiPhase, IndexStatusResponse, SemanticConfig } from "@/l2-coordinator/api-docs/semantic";

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
}

export interface SemanticQaView {
  status: SemanticQaStatus;
  label: string;
  message: string;
  canStop: boolean;
  evidenceReady: boolean;
  evidenceLabel: string;
  reason: string;
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
      message: input.indexStatus?.lastError || input.indexStatus?.error || "Semantic index failed.",
    };
  }

  if (status === "running" || status === "building") {
    return {
      kind: "index_running",
      blocksCoreWorkbench: false,
      searchEnabled: false,
      qaEnabled: false,
      statusLabel: `Indexing ${indexProgress(input.indexStatus)}%`,
      message: [
        "Semantic indexing is running. Core chat, search, and stats remain available.",
        input.indexStatus?.rateLabel,
        input.indexStatus?.etaLabel,
        input.indexStatus?.coverageSummary,
      ].filter(Boolean).join(" "),
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
    };
  }

  return {
    kind: "index_unavailable",
    blocksCoreWorkbench: false,
    searchEnabled: false,
    qaEnabled: false,
    statusLabel: "Index unavailable",
    message: "Build the semantic index to enable semantic search and QA.",
  };
}

export function deriveSemanticQaView(input: {
  status: SemanticQaStatus;
  answer: string;
  error?: string | null;
  evidenceCount?: number;
  reason?: string;
}): SemanticQaView {
  const evidenceCount = input.evidenceCount ?? 0;
  const evidenceReady = input.status === "completed" && evidenceCount > 0;
  const evidenceLabel = evidenceReady
    ? `${evidenceCount} evidence ${evidenceCount === 1 ? "source" : "sources"}`
    : "";
  const base = {
    evidenceReady,
    evidenceLabel,
    reason: input.reason ?? "",
  };
  switch (input.status) {
    case "connecting":
      return { ...base, status: input.status, label: "Connecting", message: "Connecting to semantic QA.", canStop: true };
    case "streaming":
      return { ...base, status: input.status, label: "Streaming", message: input.answer, canStop: true };
    case "completed":
      return { ...base, status: input.status, label: "Completed", message: input.answer, canStop: false };
    case "stopped":
      return { ...base, status: input.status, label: "Stopped", message: input.answer || "The stream was stopped.", canStop: false };
    case "failed":
      return { ...base, status: input.status, label: "Failed", message: input.error || "Semantic QA failed.", canStop: false };
    case "empty":
      return { ...base, status: input.status, label: "No Answer", message: "The stream completed without an answer.", canStop: false };
    case "idle":
    default:
      return { ...base, status: "idle", label: "Idle", message: "", canStop: false };
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
