import type { DiagnosticEvent, DiagnosticEventLevel, DiagnosticEventPrivacy, DiagnosticEventSource } from "@l4/network/diagnosticEvents";
import type { DiagnosticEventFilters } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import type { LogEntry, LogLevel } from "@l2/data-clerk/stores/useDevConsoleStore";

export type { DiagnosticEventFilters };

export interface DiagnosticConsoleRow {
  id: string;
  timestamp: string;
  source: DiagnosticEventSource | "sidecar";
  level: DiagnosticEventLevel;
  privacy: DiagnosticEventPrivacy;
  category: string;
  summary: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface DiagnosticConsoleCounts {
  total: number;
  sidecarLogs: number;
  diagnosticEvents: number;
  warningsOrErrors: number;
  redactedOrBlocked: number;
}

export interface DiagnosticEventViewModel {
  rows: DiagnosticConsoleRow[];
  counts: DiagnosticConsoleCounts;
  filters: DiagnosticEventFilters;
  emptyMessage: string;
  activeEmptyMessage: string;
}

export interface DiagnosticReportEventSummary {
  total: number;
  warningsOrErrors: number;
  redactedOrBlocked: number;
  sources: string;
  latestSummary: string;
}

export function buildDiagnosticEventViewModel(input: {
  logs: LogEntry[];
  events: DiagnosticEvent[];
  filters: DiagnosticEventFilters;
}): DiagnosticEventViewModel {
  const logRows = input.logs.map(toSidecarRow);
  const eventRows = input.events.map(toEventRow);
  const rows = [...logRows, ...eventRows].filter((row) =>
    matchesFilters(row, input.filters),
  );

  return {
    rows,
    counts: {
      total: input.logs.length + input.events.length,
      sidecarLogs: input.logs.length,
      diagnosticEvents: input.events.length,
      warningsOrErrors: [...logRows, ...eventRows].filter((row) =>
        row.level === "warn" || row.level === "error"
      ).length,
      redactedOrBlocked: [...logRows, ...eventRows].filter((row) =>
        row.privacy === "redacted" || row.privacy === "blocked"
      ).length,
    },
    filters: input.filters,
    emptyMessage: "暂无诊断事件或 Sidecar 日志。",
    activeEmptyMessage: "当前筛选条件下没有诊断事件。",
  };
}

export function summarizeDiagnosticEventsForReport(
  events: DiagnosticEvent[],
): DiagnosticReportEventSummary {
  const sources = Array.from(new Set(events.map((event) => event.source)));
  const latest = events[events.length - 1];

  return {
    total: events.length,
    warningsOrErrors: events.filter((event) =>
      event.level === "warn" || event.level === "error"
    ).length,
    redactedOrBlocked: events.filter((event) =>
      event.privacy === "redacted" || event.privacy === "blocked"
    ).length,
    sources: sources.length > 0 ? sources.join(", ") : "-",
    latestSummary: latest?.summary ?? "-",
  };
}

function toSidecarRow(log: LogEntry): DiagnosticConsoleRow {
  return {
    id: `log-${log.id}`,
    timestamp: log.time,
    source: "sidecar",
    level: mapLogLevel(log.level),
    privacy: "safe",
    category: `sidecar.${log.level}`,
    summary: log.message,
  };
}

function toEventRow(event: DiagnosticEvent): DiagnosticConsoleRow {
  return {
    id: event.id,
    timestamp: event.timestamp,
    source: event.source,
    level: event.level,
    privacy: event.privacy,
    category: event.category,
    summary: event.summary,
    attributes: event.attributes,
  };
}

function mapLogLevel(level: LogLevel): DiagnosticEventLevel {
  if (level === "stderr" || level === "error") return "error";
  return "info";
}

function matchesFilters(
  row: DiagnosticConsoleRow,
  filters: DiagnosticEventFilters,
): boolean {
  if (filters.source !== "all" && row.source !== filters.source) return false;
  if (filters.level !== "all" && row.level !== filters.level) return false;
  if (filters.privacy !== "all" && row.privacy !== filters.privacy) return false;
  return true;
}
