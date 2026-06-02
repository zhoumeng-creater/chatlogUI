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

export interface DiagnosticConsoleDetailRow {
  label: string;
  value: string;
}

export interface DiagnosticConsoleOption {
  value: string;
  label: string;
}

export interface DiagnosticConsoleRow {
  id: string;
  timestamp: string;
  source: DiagnosticEventSource | "sidecar";
  level: DiagnosticEventLevel;
  privacy: DiagnosticEventPrivacy;
  category: string;
  summary: string;
  endpointFamily?: string;
  statusLabel?: string;
  durationLabel?: string;
  recoveryLabel: string;
  isFailed: boolean;
  detailRows: DiagnosticConsoleDetailRow[];
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
  endpointOptions: DiagnosticConsoleOption[];
  timeRangeOptions: DiagnosticConsoleOption[];
  hasActiveFilters: boolean;
  emptyMessage: string;
  activeEmptyMessage: string;
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
  const rows = allRows.filter((row) => matchesFilters(row, input.filters, input.now));

  return {
    rows,
    counts: {
      total: allRows.length,
      sidecarLogs: input.logs.length,
      diagnosticEvents: input.events.length,
      warningsOrErrors: allRows.filter((row) => isWarningOrError(row)).length,
      redactedOrBlocked: allRows.filter((row) =>
        row.privacy === "redacted" || row.privacy === "blocked"
      ).length,
    },
    filters: input.filters,
    endpointOptions: buildEndpointOptions(eventRows),
    timeRangeOptions: [
      { value: "all", label: "全部时间" },
      { value: "last15m", label: "最近 15 分钟" },
      { value: "last1h", label: "最近 1 小时" },
      { value: "session", label: "本次会话" },
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
      getEndpointFamily(event) ?? event.source
    )),
    latestSummary: latest?.summary ?? "-",
  };
}

function toSidecarRow(log: LogEntry): DiagnosticConsoleRow {
  const level = mapLogLevel(log.level);
  return {
    id: `log-${log.id}`,
    timestamp: log.time,
    source: "sidecar",
    level,
    privacy: "safe",
    category: `sidecar.${log.level}`,
    summary: log.message,
    recoveryLabel: getRecoveryLabel("check-service"),
    isFailed: level === "error",
    detailRows: [
      { label: "Source", value: "sidecar" },
      { label: "Level", value: level },
      { label: "Privacy", value: "safe" },
    ],
  };
}

function toEventRow(event: DiagnosticEvent): DiagnosticConsoleRow {
  const endpointFamily = getEndpointFamily(event);
  const status = getNumericAttribute(event, "status");
  const durationMs = getNumericAttribute(event, "durationMs");
  const recoveryLabel = getRecoveryLabel(event.recoveryHint);
  const detailRows = buildDetailRows(event, {
    endpointFamily,
    status,
    durationMs,
    recoveryLabel,
  });

  return {
    id: event.id,
    timestamp: event.timestamp,
    source: event.source,
    level: event.level,
    privacy: event.privacy,
    category: event.category,
    summary: event.summary,
    endpointFamily,
    statusLabel: status === undefined ? undefined : String(status),
    durationLabel: durationMs === undefined ? undefined : `${durationMs}ms`,
    recoveryLabel,
    isFailed: isEventFailed(event, status),
    detailRows,
    attributes: event.attributes,
  };
}

function buildDetailRows(
  event: DiagnosticEvent,
  metadata: {
    endpointFamily?: string;
    status?: number;
    durationMs?: number;
    recoveryLabel: string;
  },
): DiagnosticConsoleDetailRow[] {
  const rows: DiagnosticConsoleDetailRow[] = [
    { label: "Source", value: event.source },
    { label: "Level", value: event.level },
    { label: "Privacy", value: event.privacy },
    { label: "Category", value: event.category },
  ];

  if (metadata.endpointFamily) {
    rows.push({ label: "Endpoint", value: metadata.endpointFamily });
  }
  if (metadata.status !== undefined) {
    rows.push({ label: "Status", value: String(metadata.status) });
  }
  if (metadata.durationMs !== undefined) {
    rows.push({ label: "Duration", value: `${metadata.durationMs}ms` });
  }
  rows.push({ label: "Recovery", value: metadata.recoveryLabel });
  if (event.correlationId) {
    rows.push({ label: "Correlation", value: event.correlationId });
  }

  return rows;
}

function mapLogLevel(level: LogLevel): DiagnosticEventLevel {
  if (level === "stderr" || level === "error") return "error";
  return "info";
}

function matchesFilters(
  row: DiagnosticConsoleRow,
  filters: DiagnosticEventFilters,
  now: Date = new Date(),
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

function matchesTimeRange(
  timestamp: string,
  timeRange: DiagnosticEventFilters["timeRange"],
  now: Date,
): boolean {
  if (timeRange === "all" || timeRange === "session") return true;

  const eventTime = new Date(timestamp).getTime();
  if (Number.isNaN(eventTime)) return false;

  const windowMs = timeRange === "last15m" ? 15 * 60_000 : 60 * 60_000;
  const ageMs = now.getTime() - eventTime;
  return ageMs >= 0 && ageMs <= windowMs;
}

function buildEndpointOptions(rows: DiagnosticConsoleRow[]): DiagnosticConsoleOption[] {
  const endpointFamilies = Array.from(
    new Set(rows.map((row) => row.endpointFamily).filter(Boolean) as string[]),
  ).sort();

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

function isWarningOrError(row: DiagnosticConsoleRow): boolean {
  return row.level === "warn" || row.level === "error";
}

function isEventFailed(event: DiagnosticEvent, status: number | undefined): boolean {
  return event.level === "warn" || event.level === "error" || (status ?? 0) >= 400;
}

function getEndpointFamily(event: DiagnosticEvent): string | undefined {
  const value = event.attributes?.endpointFamily;
  return typeof value === "string" && value ? value : undefined;
}

function getNumericAttribute(event: DiagnosticEvent, key: string): number | undefined {
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

function summarizeCounts(values: string[]): string {
  if (values.length === 0) return "-";
  const counts = values.reduce<Record<string, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => `${value}: ${count}`)
    .join(", ");
}
