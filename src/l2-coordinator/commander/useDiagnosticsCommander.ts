import { useCallback, useMemo } from "react";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import { exportDiagnosticsReport } from "@l4/system/exportDiagnostics";
import { buildDiagnosticsReport, serializeDiagnosticsReport } from "./diagnostics";
import { recordLocalDiagnosticEvent } from "./diagnosticEventBridge";
import { summarizeDiagnosticEventsForReport } from "./diagnosticEventViewModel";

export function useDiagnosticsCommander() {
  const profile = useSetupStore((s) => s.profile);
  const mode = useSetupStore((s) => s.mode);
  const portState = useSetupStore((s) => s.portState);
  const httpReady = useSetupStore((s) => s.httpReady);
  const dbReady = useSetupStore((s) => s.dbReady);
  const setupError = useSetupStore((s) => s.error);
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const logs = useDevConsoleStore((s) => s.logs);
  const diagnosticEvents = useDiagnosticEventStore((s) => s.items);

  const report = useMemo(() => {
    const errorLogs = logs.filter((log) => log.level === "stderr" || log.level === "error");
    const lastError = (errorLogs.length > 0 ? errorLogs[errorLogs.length - 1]?.message : setupError) ?? null;

    return buildDiagnosticsReport({
      privacyOn,
      diagnosticEventsSummary: summarizeDiagnosticEventsForReport(diagnosticEvents),
      items: [
        { label: "Mode", value: mode },
        { label: "Config source", value: profile?.source ?? "none" },
        { label: "Config dir", value: profile?.configDir ?? "-" },
        { label: "Data dir", value: profile?.dataDir ?? "-" },
        { label: "Work dir", value: profile?.workDir ?? "-" },
        { label: "HTTP addr", value: profile?.httpAddr ?? "127.0.0.1:5030" },
        { label: "Port state", value: portState },
        { label: "HTTP ready", value: httpReady },
        { label: "DB ready", value: dbReady },
        { label: "Data key", value: profile?.hasDataKey ? "present" : "missing" },
        { label: "Image key", value: profile?.hasImgKey ? "present" : "missing" },
        { label: "Log count", value: logs.length },
        { label: "Error count", value: errorLogs.length },
        { label: "Last error", value: lastError ?? "-" },
      ],
    });
  }, [dbReady, diagnosticEvents, httpReady, logs, mode, portState, privacyOn, profile, setupError]);

  const copyText = useMemo(() => serializeDiagnosticsReport(report), [report]);

  const exportReport = useCallback(async () => {
    try {
      return await exportDiagnosticsReport(report);
    } catch (error) {
      recordLocalDiagnosticEvent({
        source: "tauri",
        level: "error",
        category: "tauri.diagnostics.export.failed",
        summary: `诊断导出失败: ${error instanceof Error ? error.message : String(error)}`,
        recoveryHint: report.redactionOk ? "retry" : "privacy-blocked",
      });
      throw error;
    }
  }, [report]);

  return {
    report,
    copyText,
    exportReport,
  };
}
