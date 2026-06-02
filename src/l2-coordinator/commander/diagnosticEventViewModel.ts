import type {
  DiagnosticEvent,
  DiagnosticEventLevel,
  DiagnosticEventPrivacy,
  DiagnosticEventSource,
  DiagnosticRecoveryHint,
} from "@l4/network/diagnosticEvents";
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
  endpointFamily: string;
  statusLabel: string;
  durationLabel: string;
  recoveryLabel: string;
  isFailed: boolean;
  detailRows: DiagnosticConsoleDetailRow[];
  attributes?: Record<string, string | number | boolean | null>;
}

export interface DiagnosticConsoleDetailRow {
  label: string;
  value: string;
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
  endpointOptions: DiagnosticFilterOption[];
  timeRangeOptions: DiagnosticFilterOption[];
  hasActiveFilters: boolean;
  emptyMessage: string;
  activeEmptyMessage: string;
}

export interface DiagnosticFilterOption {
  value: string;
  label: string;
}

export interface DiagnosticReportEventSummary {
  total: number;
  warningsOrErrors: number;
  redactedOrBlocked: number;
  sources: string;
  levels: string;
  privacyStates: string;
  endpointFamilies: string;
  latestSummary: string;
}

export function buildDiagnosticEventViewModel(input: {
  logs: LogEntry[];
  events: DiagnosticEvent[];
  filters: DiagnosticEventFilters;
  now?: Date;
}): DiagnosticEventViewModel {
  const logRows = input.logs.map(toSidecarRow);
  const eventRows = input.events.map(toEventRow);
  const allRows = [...logRows, ...eventRows];
  const now = input.now ?? new Date();
  const rows = allRows.filter((row) => matchesFilters(row, input.filters, now));

  return {
    rows,
    counts: {
      total: input.logs.length + input.events.length,
      sidecarLogs: input.logs.length,
      diagnosticEvents: input.events.length,
      warningsOrErrors: allRows.filter((row) =>
        row.level === "warn" || row.level === "error"
      ).length,
      redactedOrBlocked: allRows.filter((row) =>
        row.privacy === "redacted" || row.privacy === "blocked"
      ).length,
    },
    filters: input.filters,
    endpointOptions: buildEndpointOptions(allRows),
    timeRangeOptions: [
      { value: "all", label: "全部时间" },
      { value: "last15m", label: "最近 15 分钟" },
      { value: "last1h", label: "最近 1 小时" },
      { value: "session", label: "当前会话" },
    ],
    hasActiveFilters: hasActiveFilters(input.filters),
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
    levels: summarizeCounts(events.map((event) => event.level)),
    privacyStates: summarizeCounts(events.map((event) => event.privacy)),
    endpointFamilies: summarizeCounts(events.map((event) =>
      readStringAttribute(event, "endpointFamily") ?? event.source
    )),
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
    endpointFamily: "sidecar",
    statusLabel: "-",
    durationLabel: "-",
    recoveryLabel: "无",
    isFailed: log.level === "stderr" || log.level === "error",
    detailRows: [
      { label: "Source", value: "sidecar" },
      { label: "Level", value: mapLogLevel(log.level) },
      { label: "Category", value: `sidecar.${log.level}` },
    ],
  };
}

function toEventRow(event: DiagnosticEvent): DiagnosticConsoleRow {
  const endpointFamily = readStringAttribute(event, "endpointFamily") ?? event.source;
  const status = readNumberAttribute(event, "status");
  const durationMs = readNumberAttribute(event, "durationMs");
  const isFailed =
    event.level === "warn" ||
    event.level === "error" ||
    (typeof status === "number" && status >= 400);

  return {
    id: event.id,
    timestamp: event.timestamp,
    source: event.source,
    level: event.level,
    privacy: event.privacy,
    category: event.category,
    summary: event.summary,
    endpointFamily,
    statusLabel: typeof status === "number" ? String(status) : "-",
    durationLabel: typeof durationMs === "number" ? `${durationMs} ms` : "-",
    recoveryLabel: getRecoveryLabel(event.recoveryHint),
    isFailed,
    detailRows: buildDetailRows(event, endpointFamily),
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
  now: Date,
): boolean {
  if (filters.source !== "all" && row.source !== filters.source) return false;
  if (filters.level !== "all" && row.level !== filters.level) return false;
  if (filters.privacy !== "all" && row.privacy !== filters.privacy) return false;
  if (filters.endpointFamily !== "all" && row.endpointFamily !== filters.endpointFamily) {
    return false;
  }
  if (filters.failedOnly && !row.isFailed) return false;
  if (!matchesTimeRange(row.timestamp, filters.timeRange, now)) return false;
  return true;
}

function buildEndpointOptions(rows: DiagnosticConsoleRow[]): DiagnosticFilterOption[] {
  const endpointFamilies = Array.from(new Set(rows.map((row) => row.endpointFamily)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return [
    { value: "all", label: "全部端点" },
    ...endpointFamilies.map((endpointFamily) => ({
      value: endpointFamily,
      label: endpointFamily,
    })),
  ];
}

function hasActiveFilters(filters: DiagnosticEventFilters): boolean {
  return (
    filters.source !== "all" ||
    filters.level !== "all" ||
    filters.privacy !== "all" ||
    filters.endpointFamily !== "all" ||
    filters.failedOnly ||
    filters.timeRange !== "all"
  );
}

function matchesTimeRange(
  timestamp: string,
  timeRange: DiagnosticEventFilters["timeRange"],
  now: Date,
): boolean {
  if (timeRange === "all" || timeRange === "session") return true;

  const timestampMs = Date.parse(timestamp);
  if (Number.isNaN(timestampMs)) return false;

  const windowMs = timeRange === "last15m" ? 15 * 60 * 1000 : 60 * 60 * 1000;
  return timestampMs >= now.getTime() - windowMs && timestampMs <= now.getTime();
}

function buildDetailRows(
  event: DiagnosticEvent,
  endpointFamily: string,
): DiagnosticConsoleDetailRow[] {
  const rows: DiagnosticConsoleDetailRow[] = [
    { label: "Source", value: event.source },
    { label: "Level", value: event.level },
    { label: "Privacy", value: event.privacy },
    { label: "Category", value: event.category },
    { label: "Endpoint", value: endpointFamily },
  ];

  const status = readNumberAttribute(event, "status");
  const durationMs = readNumberAttribute(event, "durationMs");
  if (typeof status === "number") rows.push({ label: "Status", value: String(status) });
  if (typeof durationMs === "number") {
    rows.push({ label: "Duration", value: `${durationMs} ms` });
  }
  if (event.recoveryHint) {
    rows.push({ label: "Recovery", value: getRecoveryLabel(event.recoveryHint) });
  }
  if (event.correlationId) {
    rows.push({ label: "Correlation", value: event.correlationId });
  }

  for (const [key, value] of Object.entries(event.attributes ?? {})) {
    if (key === "endpointFamily" || key === "status" || key === "durationMs") {
      continue;
    }
    rows.push({ label: formatAttributeLabel(key), value: String(value) });
  }

  return rows;
}

function readStringAttribute(
  event: DiagnosticEvent,
  key: string,
): string | undefined {
  const value = event.attributes?.[key];
  return typeof value === "string" ? value : undefined;
}

function readNumberAttribute(
  event: DiagnosticEvent,
  key: string,
): number | undefined {
  const value = event.attributes?.[key];
  return typeof value === "number" ? value : undefined;
}

function getRecoveryLabel(hint: DiagnosticRecoveryHint | undefined): string {
  if (hint === "retry") return "重试";
  if (hint === "check-service") return "检查服务状态";
  if (hint === "open-settings") return "打开设置";
  if (hint === "privacy-blocked") return "隐私阻止";
  return "无";
}

function formatAttributeLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function summarizeCounts(values: string[]): string {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 0
    ? entries.map(([value, count]) => `${value}: ${count}`).join(", ")
    : "-";
}
