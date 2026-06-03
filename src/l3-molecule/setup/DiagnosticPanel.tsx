import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

interface DiagnosticPanelProps {
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<string>;
}

export function DiagnosticPanel({ report, copyText, onExport }: DiagnosticPanelProps) {
  return <DiagnosticsPanel report={report} copyText={copyText} onExport={onExport} />;
}
