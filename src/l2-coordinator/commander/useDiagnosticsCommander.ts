import { useCallback, useMemo } from "react";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useUpdateStore } from "@l2/data-clerk/stores/useUpdateStore";
import { exportDiagnosticsReport } from "@l4/system/exportDiagnostics";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { buildDiagnosticsReport, serializeDiagnosticsReport } from "./diagnostics";
import { buildRuntimeDiagnosticsManifest } from "./diagnosticsManifest";
import { summarizeDiagnosticEventsForReport } from "./diagnosticEventViewModel";
import { recordLocalDiagnosticEvent } from "./diagnosticEventBridge";
import { recordErrorRecoveryKpiEvent } from "./uxKpiEvents";

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
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const updateStatus = useUpdateStore((s) => s.status);

  const report = useMemo(() => {
    const errorLogs = logs.filter((log) => log.level === "stderr" || log.level === "error");
    const lastError = (errorLogs.length > 0 ? errorLogs[errorLogs.length - 1]?.message : setupError) ?? null;

    return buildDiagnosticsReport({
      privacyOn,
      manifest: buildRuntimeDiagnosticsManifest({
        profile,
        mode,
        portState,
        httpReady,
        dbReady,
        sidecarStatus,
        updateStatus,
        privacyOn,
      }),
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
  }, [
    dbReady,
    diagnosticEvents,
    httpReady,
    logs,
    mode,
    portState,
    privacyOn,
    profile,
    setupError,
    sidecarStatus,
    updateStatus,
  ]);

  const copyText = useMemo(() => serializeDiagnosticsReport(report), [report]);

  const exportReport = useCallback(async () => {
    recordErrorRecoveryKpiEvent({
      sourceModule: "diagnostics",
      recoveryAction: "copy-diagnostics",
      outcome: "success",
    });
    try {
      const path = await exportDiagnosticsReport(report);
      recordLocalDiagnosticEvent({
        source: "ui",
        level: "info",
        category: "diagnostic.export",
        summary: "Setup diagnostics export completed",
        recoveryHint: "none",
        attributes: {
          target: "setup",
        },
      });
      return path;
    } catch (error) {
      const safeMessage = maskDiagnosticText(
        error instanceof Error ? error.message : String(error),
        { privacyMode: true },
      );
      recordLocalDiagnosticEvent({
        source: "ui",
        level: report.redactionOk ? "error" : "warn",
        category: report.redactionOk ? "diagnostic.export" : "diagnostic.export.blocked",
        summary: report.redactionOk
          ? `Setup diagnostics export failed: ${safeMessage}`
          : "Setup diagnostics export blocked by privacy redaction gate",
        recoveryHint: report.redactionOk ? "retry" : "privacy-blocked",
        attributes: {
          target: "setup",
        },
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
