import { useDiagnosticsCommander } from "@l2/commander/useDiagnosticsCommander";
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

export function DiagnosticPanel() {
  const { report, copyText, exportReport } = useDiagnosticsCommander();

  return <DiagnosticsPanel report={report} copyText={copyText} onExport={exportReport} />;
}
