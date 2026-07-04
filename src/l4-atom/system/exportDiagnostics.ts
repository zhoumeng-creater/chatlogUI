import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { formatExportPathSummary } from "@/utils/privacyDisplay";

export interface ExportDiagnosticsLine {
  label: string;
  value: string;
}

export interface ExportDiagnosticsPayload {
  redactionOk: boolean;
  lines: ExportDiagnosticsLine[];
}

export interface ExportDiagnosticsCompleted {
  status: "completed";
  locationSummary: string;
}

export interface ExportDiagnosticsCancelled {
  status: "cancelled";
}

export type ExportDiagnosticsResult = ExportDiagnosticsCompleted | ExportDiagnosticsCancelled;

export async function exportDiagnosticsReport(report: ExportDiagnosticsPayload): Promise<ExportDiagnosticsResult> {
  if (!report.redactionOk) {
    throw new Error("诊断报告仍包含敏感信息，已阻止导出。");
  }

  const path = await save({
    defaultPath: "chatlog-diagnostics.log",
    filters: [{ name: "Log", extensions: ["log"] }],
  });

  if (!path) return { status: "cancelled" };

  const exportedPath = await invoke<string>("export_diagnostics_report_to_path", { path, report });
  return {
    status: "completed",
    locationSummary: formatExportPathSummary(exportedPath),
  };
}
