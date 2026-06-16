import {
  createDiagnosticEvent,
  type DiagnosticEvent,
  type DiagnosticEventFactoryOptions,
} from "@l4/network/diagnosticEvents";
import { recordDiagnosticEvent } from "./diagnosticEventBridge";

export type UxKpiModule =
  | "setup"
  | "search"
  | "export"
  | "error"
  | "semantic"
  | "graph";

export type UxKpiTask =
  | "completed"
  | "executed"
  | "filter_changed"
  | "result_opened"
  | "failed"
  | "cancelled"
  | "recovery_clicked"
  | "qa_completed"
  | "qa_stopped"
  | "qa_failed"
  | "visualization_opened";

export type UxKpiOutcome = "success" | "failed" | "cancelled" | "stopped";
export type UxKpiScopeKind = "current" | "all" | "selected" | "contact" | "unknown";
export type UxKpiAnswerLengthBucket = "empty" | "short" | "medium" | "long";
export type UxKpiRecoveryAction =
  | "retry"
  | "open-settings"
  | "copy-diagnostics"
  | "export-diagnostics"
  | "open-diagnostics"
  | "stop-stream"
  | "clear"
  | "unknown";
export type UxKpiRecoverySourceModule =
  | UxKpiModule
  | "diagnostics"
  | "update"
  | "settings"
  | "workbench"
  | "conversation"
  | "stats"
  | "sns"
  | "media"
  | "ai"
  | "developer"
  | "unknown";

export type UxKpiAttributes = Record<string, string | number | boolean | null | undefined>;

export interface CreateUxKpiEventInput {
  module: UxKpiModule;
  task: UxKpiTask;
  outcome?: UxKpiOutcome;
  attributes?: UxKpiAttributes;
}

export interface UxKpiTimer {
  durationMs: () => number;
}

export function createUxKpiEvent(
  input: CreateUxKpiEventInput,
  options: DiagnosticEventFactoryOptions = {},
): DiagnosticEvent {
  const outcome = input.outcome ?? "success";
  return createDiagnosticEvent(
    {
      source: "ux",
      level: outcome === "success" ? "info" : "warn",
      category: `ux.${input.module}.${input.task}`,
      summary: `UX KPI ${input.module}.${input.task} ${outcome}`,
      recoveryHint: outcome === "failed" ? "retry" : "none",
      attributes: compactAttributes({
        module: input.module,
        task: input.task,
        outcome,
        ...input.attributes,
      }),
    },
    options,
  );
}

export function recordUxKpiEvent(input: CreateUxKpiEventInput): DiagnosticEvent {
  const event = createUxKpiEvent(input);
  recordDiagnosticEvent(event);
  return event;
}

export function createUxKpiTimer(now: () => number = defaultNow): UxKpiTimer {
  const startedAt = now();
  return {
    durationMs: () => Math.max(0, Math.round(now() - startedAt)),
  };
}

export function buildSetupCompletedKpiAttrs(input: {
  mode: "managed" | "external" | "unknown";
  httpReady: boolean;
  dbReady: boolean;
  durationMs: number;
  outcome: UxKpiOutcome;
}): UxKpiAttributes {
  return {
    module: "setup",
    task: "completed",
    outcome: input.outcome,
    mode: input.mode,
    httpReady: input.httpReady,
    dbReady: input.dbReady,
    durationMs: normalizeDuration(input.durationMs),
  };
}

export function recordSetupCompletedKpiEvent(
  input: Parameters<typeof buildSetupCompletedKpiAttrs>[0],
): DiagnosticEvent {
  return recordUxKpiEvent({
    module: "setup",
    task: "completed",
    outcome: input.outcome,
    attributes: buildSetupCompletedKpiAttrs(input),
  });
}

export function buildSearchExecutedKpiAttrs(input: {
  resultCount: number;
  filterCount: number;
  scopeKind: UxKpiScopeKind;
  durationMs: number;
  outcome: UxKpiOutcome;
  errorKind?: string;
}): UxKpiAttributes {
  return {
    module: "search",
    task: "executed",
    outcome: input.outcome,
    resultCount: normalizeCount(input.resultCount),
    filterCount: normalizeCount(input.filterCount),
    scopeKind: input.scopeKind,
    durationMs: normalizeDuration(input.durationMs),
    errorKind: input.errorKind,
  };
}

export function recordSearchExecutedKpiEvent(
  input: Parameters<typeof buildSearchExecutedKpiAttrs>[0],
): DiagnosticEvent {
  return recordUxKpiEvent({
    module: "search",
    task: "executed",
    outcome: input.outcome,
    attributes: buildSearchExecutedKpiAttrs(input),
  });
}

export function buildSearchFilterChangedKpiAttrs(input: {
  filterCount: number;
  scopeKind: UxKpiScopeKind;
  outcome?: UxKpiOutcome;
}): UxKpiAttributes {
  return {
    module: "search",
    task: "filter_changed",
    outcome: input.outcome ?? "success",
    filterCount: normalizeCount(input.filterCount),
    scopeKind: input.scopeKind,
  };
}

export function recordSearchFilterChangedKpiEvent(
  input: Parameters<typeof buildSearchFilterChangedKpiAttrs>[0],
): DiagnosticEvent {
  const attrs = buildSearchFilterChangedKpiAttrs(input);
  return recordUxKpiEvent({
    module: "search",
    task: "filter_changed",
    outcome: (attrs.outcome as UxKpiOutcome) ?? "success",
    attributes: attrs,
  });
}

export function buildSearchResultOpenedKpiAttrs(input: {
  rankBucket: string;
  scopeKind: UxKpiScopeKind;
  hasAnchor: boolean;
  outcome: UxKpiOutcome;
}): UxKpiAttributes {
  return {
    module: "search",
    task: "result_opened",
    outcome: input.outcome,
    rankBucket: input.rankBucket,
    scopeKind: input.scopeKind,
    hasAnchor: input.hasAnchor,
  };
}

export function recordSearchResultOpenedKpiEvent(
  input: Parameters<typeof buildSearchResultOpenedKpiAttrs>[0],
): DiagnosticEvent {
  return recordUxKpiEvent({
    module: "search",
    task: "result_opened",
    outcome: input.outcome,
    attributes: buildSearchResultOpenedKpiAttrs(input),
  });
}

export function buildErrorRecoveryKpiAttrs(input: {
  sourceModule: UxKpiRecoverySourceModule;
  recoveryAction: UxKpiRecoveryAction;
  outcome?: UxKpiOutcome;
}): UxKpiAttributes {
  return {
    module: "error",
    task: "recovery_clicked",
    outcome: input.outcome ?? "success",
    sourceModule: normalizeRecoverySourceModule(input.sourceModule),
    recoveryAction: normalizeRecoveryAction(input.recoveryAction),
  };
}

export function recordErrorRecoveryKpiEvent(
  input: Parameters<typeof buildErrorRecoveryKpiAttrs>[0],
): DiagnosticEvent {
  const attrs = buildErrorRecoveryKpiAttrs(input);
  return recordUxKpiEvent({
    module: "error",
    task: "recovery_clicked",
    outcome: attrs.outcome as UxKpiOutcome,
    attributes: attrs,
  });
}

export function buildExportKpiAttrs(input: {
  sourceModule: string;
  format: string;
  rowCount: number;
  redactionPolicy: string;
  durationMs: number;
  outcome: UxKpiOutcome;
  cancelKind?: string;
  errorKind?: string;
}): UxKpiAttributes {
  return {
    module: "export",
    task: input.outcome === "failed"
      ? "failed"
      : input.outcome === "cancelled"
        ? "cancelled"
        : "completed",
    outcome: input.outcome,
    sourceModule: input.sourceModule,
    format: input.format,
    rowCount: normalizeCount(input.rowCount),
    redactionPolicy: input.redactionPolicy,
    durationMs: normalizeDuration(input.durationMs),
    cancelKind: input.cancelKind,
    errorKind: input.errorKind,
  };
}

export function recordExportKpiEvent(
  input: Parameters<typeof buildExportKpiAttrs>[0],
): DiagnosticEvent {
  const attrs = buildExportKpiAttrs(input);
  return recordUxKpiEvent({
    module: "export",
    task: attrs.task as UxKpiTask,
    outcome: input.outcome,
    attributes: attrs,
  });
}

export function buildQaKpiAttrs(input: {
  evidenceCount: number;
  sourceCount: number;
  durationMs: number;
  scopeKind: UxKpiScopeKind;
  answerLengthBucket: UxKpiAnswerLengthBucket;
  outcome: UxKpiOutcome;
  errorKind?: string;
}): UxKpiAttributes {
  return {
    module: "semantic",
    task: input.outcome === "stopped"
      ? "qa_stopped"
      : input.outcome === "failed"
        ? "qa_failed"
        : "qa_completed",
    outcome: input.outcome,
    evidenceCount: normalizeCount(input.evidenceCount),
    sourceCount: normalizeCount(input.sourceCount),
    durationMs: normalizeDuration(input.durationMs),
    scopeKind: input.scopeKind,
    answerLengthBucket: input.answerLengthBucket,
    errorKind: input.errorKind,
  };
}

export function recordQaKpiEvent(
  input: Parameters<typeof buildQaKpiAttrs>[0],
): DiagnosticEvent {
  const attrs = buildQaKpiAttrs(input);
  return recordUxKpiEvent({
    module: "semantic",
    task: attrs.task as UxKpiTask,
    outcome: input.outcome,
    attributes: attrs,
  });
}

export function buildGraphVisualizationKpiAttrs(input: {
  nodeCount: number;
  edgeCount: number;
  durationMs: number;
  layout: string;
  graphType: string;
  cached: boolean;
  outcome: UxKpiOutcome;
}): UxKpiAttributes {
  return {
    module: "graph",
    task: "visualization_opened",
    outcome: input.outcome,
    nodeCount: normalizeCount(input.nodeCount),
    edgeCount: normalizeCount(input.edgeCount),
    durationMs: normalizeDuration(input.durationMs),
    layout: input.layout,
    graphType: input.graphType,
    cached: input.cached,
  };
}

export function recordGraphVisualizationKpiEvent(
  input: Parameters<typeof buildGraphVisualizationKpiAttrs>[0],
): DiagnosticEvent {
  return recordUxKpiEvent({
    module: "graph",
    task: "visualization_opened",
    outcome: input.outcome,
    attributes: buildGraphVisualizationKpiAttrs(input),
  });
}

export function answerLengthBucket(answer: string): UxKpiAnswerLengthBucket {
  const length = answer.trim().length;
  if (length === 0) return "empty";
  if (length < 280) return "short";
  if (length < 2000) return "medium";
  return "long";
}

function defaultNow(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

const RECOVERY_SOURCE_MODULES = new Set<UxKpiRecoverySourceModule>([
  "setup",
  "search",
  "export",
  "error",
  "semantic",
  "graph",
  "diagnostics",
  "update",
  "settings",
  "workbench",
  "conversation",
  "stats",
  "sns",
  "media",
  "ai",
  "developer",
  "unknown",
]);

const RECOVERY_ACTIONS = new Set<UxKpiRecoveryAction>([
  "retry",
  "open-settings",
  "copy-diagnostics",
  "export-diagnostics",
  "open-diagnostics",
  "stop-stream",
  "clear",
  "unknown",
]);

function normalizeRecoverySourceModule(value: UxKpiRecoverySourceModule): UxKpiRecoverySourceModule {
  return RECOVERY_SOURCE_MODULES.has(value) ? value : "unknown";
}

function normalizeRecoveryAction(value: UxKpiRecoveryAction): UxKpiRecoveryAction {
  return RECOVERY_ACTIONS.has(value) ? value : "unknown";
}

function compactAttributes(attributes: UxKpiAttributes): Record<string, string | number | boolean | null> {
  return Object.entries(attributes).reduce<Record<string, string | number | boolean | null>>(
    (acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    },
    {},
  );
}
