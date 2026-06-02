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

function shouldRedactDiagnosticValue(label: string): boolean {
  return /data[_-]?key|img[_-]?key|api[_-]?key|token|secret|credential|password|authorization|private message|message body|chat content/i
    .test(label);
}
