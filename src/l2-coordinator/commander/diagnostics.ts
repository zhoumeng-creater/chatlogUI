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
  manifest?: DiagnosticsManifestInput;
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

export interface DiagnosticsManifestInput {
  manifestVersion?: string;
  appVersion: string;
  buildChannel: string;
  updaterEnabled: boolean;
  platform?: string | null;
  architecture?: string | null;
  packageReadiness?: string | null;
  backendBaseUrl: string;
  sidecarState: string;
  portState: string;
  httpReady: boolean;
  dbReady: boolean;
  setupMode: string;
  configSource: string;
  updateStatus: string;
  releaseSmoke?: string | null;
  redactionState?: string | null;
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
  const manifestItems = input.manifest ? buildManifestItems(input.manifest) : [];
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
          label: "Diagnostic levels",
          value: input.diagnosticEventsSummary.levels ?? "-",
        },
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

  const lines = [...manifestItems, ...input.items, ...eventSummaryItems].map((item) => ({
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

function buildManifestItems(manifest: DiagnosticsManifestInput): DiagnosticItemInput[] {
  return [
    { label: "Export manifest version", value: manifest.manifestVersion ?? "2.0" },
    { label: "App version", value: manifest.appVersion },
    { label: "Build channel", value: manifest.buildChannel },
    { label: "Updater enabled", value: manifest.updaterEnabled },
    { label: "Platform", value: manifest.platform ?? "-" },
    { label: "Architecture", value: manifest.architecture ?? "-" },
    { label: "Package readiness", value: manifest.packageReadiness ?? "not checked" },
    { label: "Backend base URL", value: manifest.backendBaseUrl },
    { label: "Sidecar state", value: manifest.sidecarState },
    { label: "Port state", value: manifest.portState },
    { label: "HTTP ready", value: manifest.httpReady },
    { label: "DB ready", value: manifest.dbReady },
    { label: "Setup mode", value: manifest.setupMode },
    { label: "Config source", value: manifest.configSource },
    { label: "Update status", value: manifest.updateStatus },
    { label: "Release smoke", value: manifest.releaseSmoke ?? "not run" },
    { label: "Redaction result", value: manifest.redactionState ?? "pending" },
  ];
}

function shouldRedactDiagnosticValue(label: string): boolean {
  return /data[_-]?key|img[_-]?key|api[_-]?key|token|secret|credential|password|authorization|private message|message body|chat content|request query|query|sql|raw response|request body|response body|sns proxy|media key|image key|video key|file key|voice key/i
    .test(label);
}
