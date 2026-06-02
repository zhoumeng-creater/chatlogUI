import { invoke } from "@tauri-apps/api/core";

export interface ExportDiagnosticsLine {
  label: string;
  value: string;
}

export interface ExportDiagnosticsPayload {
  redactionOk: boolean;
  lines: ExportDiagnosticsLine[];
}

export async function exportDiagnosticsReport(report: ExportDiagnosticsPayload): Promise<string> {
  if (!report.redactionOk) {
    throw new Error("诊断报告仍包含敏感信息，已阻止导出。");
  }

  return invoke<string>("export_diagnostics_report", { report });
}
