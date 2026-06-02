import {
  containsSensitiveDiagnosticText,
  maskDiagnosticText,
} from "@/utils/maskSecrets";

export interface DiagnosticItemInput {
  label: string;
  value: unknown;
}

export interface DiagnosticLine {
  label: string;
  value: string;
}

export interface DiagnosticsReportInput {
  privacyOn: boolean;
  items: DiagnosticItemInput[];
  diagnosticEventsSummary?: {
    total: number;
    warningsOrErrors: number;
    redactedOrBlocked: number;
    sources: string;
    levels?: string;
    privacyStates?: string;
    endpointFamilies?: string;
    latestSummary: string;
  };
}

export interface DiagnosticsReport {
  redactionOk: boolean;
  lines: DiagnosticLine[];
  blockedReason?: string;
}

function formatDiagnosticValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return String(value);
  return String(value);
}

export function buildDiagnosticsReport(input: DiagnosticsReportInput): DiagnosticsReport {
  const eventSummaryItems: DiagnosticItemInput[] = input.diagnosticEventsSummary
    ? [
        { label: "Diagnostic events", value: input.diagnosticEventsSummary.total },
        {
          label: "Diagnostic warnings/errors",
          value: input.diagnosticEventsSummary.warningsOrErrors,
        },
        {
          label: "Diagnostic redacted/blocked",
          value: input.diagnosticEventsSummary.redactedOrBlocked,
        },
        { label: "Diagnostic sources", value: input.diagnosticEventsSummary.sources },
        { label: "Diagnostic levels", value: input.diagnosticEventsSummary.levels ?? "-" },
        {
          label: "Diagnostic privacy states",
          value: input.diagnosticEventsSummary.privacyStates ?? "-",
        },
        {
          label: "Diagnostic endpoint families",
          value: input.diagnosticEventsSummary.endpointFamilies ?? "-",
        },
        {
          label: "Latest diagnostic event",
          value: input.diagnosticEventsSummary.latestSummary,
        },
      ]
    : [];

  const lines = [...input.items, ...eventSummaryItems].map((item) => ({
    label: item.label,
    value: shouldRedactDiagnosticValue(item.label)
      ? "******"
      : maskDiagnosticText(formatDiagnosticValue(item.value), {
          privacyMode: input.privacyOn,
        }),
  }));

  const unsafeLine = lines.find((line) =>
    containsSensitiveDiagnosticText(`${line.label}: ${line.value}`),
  );

  return {
    lines,
    redactionOk: !unsafeLine,
    blockedReason: unsafeLine ? `诊断字段 ${unsafeLine.label} 仍包含敏感信息` : undefined,
  };
}

export function serializeDiagnosticsReport(report: DiagnosticsReport): string {
  return report.lines.map((line) => `${line.label}: ${line.value}`).join("\n");
}

export function formatDiagnosticsExportError(error: unknown): string {
  const safeMessage = maskDiagnosticText(
    error instanceof Error ? error.message : String(error),
    { privacyMode: true },
  );

  if (/敏感信息|阻止导出|redaction|sensitive/i.test(safeMessage)) {
    return `诊断导出被隐私保护阻止：${safeMessage}`;
  }

  if (/write|file|filesystem|permission|denied|保存|写入|文件|目录|磁盘/i.test(safeMessage)) {
    return `诊断导出写入失败：${safeMessage}`;
  }

  if (/sidecar|service|health|5030|服务/i.test(safeMessage)) {
    return `诊断导出受服务状态影响：${safeMessage}`;
  }

  return `诊断导出失败：${safeMessage}`;
}

function shouldRedactDiagnosticValue(label: string): boolean {
  return /data[_-]?key|img[_-]?key|api[_-]?key|token|secret|credential|password|authorization|private message|message body|chat content/i
    .test(label);
}
