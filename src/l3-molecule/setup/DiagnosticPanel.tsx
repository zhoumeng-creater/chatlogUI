import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import type { ExportDiagnosticsResult } from "@l4/system";
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

interface DiagnosticPanelProps {
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<ExportDiagnosticsResult>;
}

export function DiagnosticPanel({ report, copyText, onExport }: DiagnosticPanelProps) {
  return <DiagnosticsPanel report={report} copyText={copyText} onExport={onExport} />;
}
