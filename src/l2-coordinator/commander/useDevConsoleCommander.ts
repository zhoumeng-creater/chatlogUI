import { useEffect, useCallback } from "react";
import { listenSidecarLogs } from "@l4/system/listenSidecarLogs";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useUpdateStore } from "@l2/data-clerk/stores/useUpdateStore";
import { exportDiagnosticsReport } from "@l4/system/exportDiagnostics";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { buildDiagnosticsReport } from "./diagnostics";
import { buildRuntimeDiagnosticsManifest } from "./diagnosticsManifest";
import { createDeferredSubscription } from "./deferredSubscription";
import { recordLocalDiagnosticEvent } from "./diagnosticEventBridge";
import { recordErrorRecoveryKpiEvent } from "./uxKpiEvents";
import {
  buildDiagnosticEventViewModel,
  summarizeDiagnosticEventsForReport,
  type DiagnosticEventFilters,
} from "./diagnosticEventViewModel";

export function useDevConsoleCommander() {
  const store = useDevConsoleStore();
  const diagnosticEvents = useDiagnosticEventStore((state) => state.items);
  const filters = useDiagnosticEventStore((state) => state.filters);
  const setFilters = useDiagnosticEventStore((state) => state.setFilters);

  const view = buildDiagnosticEventViewModel({
    logs: store.logs,
    events: diagnosticEvents,
    filters,
  });

  const exportLogs = useCallback(async (): Promise<string | null> => {
    recordErrorRecoveryKpiEvent({
      sourceModule: "diagnostics",
      recoveryAction: "copy-diagnostics",
      outcome: "success",
    });
    try {
      const { logs } = useDevConsoleStore.getState();
      const { items } = useDiagnosticEventStore.getState();
      const setup = useSetupStore.getState();
      const { sidecarStatus } = useAppStore.getState();
      const { status: updateStatus } = useUpdateStore.getState();
      const { privacyOn } = useSettingsStore.getState().settings;
      const errors = logs.filter((log) => log.level === "stderr" || log.level === "error");
      const lastError = errors.length > 0 ? errors[errors.length - 1]?.message : "-";
      const report = buildDiagnosticsReport({
        privacyOn: true,
        manifest: buildRuntimeDiagnosticsManifest({
          profile: setup.profile,
          mode: setup.mode,
          portState: setup.portState,
          httpReady: setup.httpReady,
          dbReady: setup.dbReady,
          sidecarStatus,
          updateStatus,
          privacyOn,
        }),
        diagnosticEventsSummary: summarizeDiagnosticEventsForReport(items),
        items: [
          { label: "Log count", value: logs.length },
          { label: "Error count", value: errors.length },
          { label: "Last error", value: lastError ?? "-" },
        ],
      });
      const path = await exportDiagnosticsReport(report);
      recordLocalDiagnosticEvent({
        source: "ui",
        level: "info",
        category: "diagnostic.export",
        summary: "Dev console diagnostics export completed",
        recoveryHint: "none",
        attributes: {
          target: "dev-console",
        },
      });
      return path;
    } catch (error) {
      const safeMessage = maskDiagnosticText(
        error instanceof Error ? error.message : String(error),
        { privacyMode: true },
      );
      useDevConsoleStore.getState().addLog(
        "system",
        `诊断导出失败: ${safeMessage}`,
      );
      recordLocalDiagnosticEvent({
        source: "ui",
        level: "error",
        category: "diagnostic.export",
        summary: `诊断导出失败: ${safeMessage}`,
        recoveryHint: "retry",
        attributes: {
          target: "dev-console",
        },
      });
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    useDevConsoleStore.getState().clear();
    useDiagnosticEventStore.getState().clear();
  }, []);

  const updateFilter = useCallback((filter: Partial<DiagnosticEventFilters>) => {
    setFilters(filter);
  }, [setFilters]);

  return {
    view: {
      ...view,
      visible: store.visible,
      autoScroll: store.autoScroll,
    },
    actions: {
      toggle: store.toggle,
      clear,
      exportLogs,
      setSourceFilter: (source: DiagnosticEventFilters["source"]) =>
        updateFilter({ source }),
      setLevelFilter: (level: DiagnosticEventFilters["level"]) =>
        updateFilter({ level }),
      setPrivacyFilter: (privacy: DiagnosticEventFilters["privacy"]) =>
        updateFilter({ privacy }),
      setEndpointFamilyFilter: (endpointFamily: DiagnosticEventFilters["endpointFamily"]) =>
        updateFilter({ endpointFamily }),
      setFailedOnlyFilter: (failedOnly: DiagnosticEventFilters["failedOnly"]) =>
        updateFilter({ failedOnly }),
      setTimeRangeFilter: (timeRange: DiagnosticEventFilters["timeRange"]) =>
        updateFilter({ timeRange }),
    },
  };
}

export function useDevConsoleLifecycle() {
  useEffect(() => {
    return createDeferredSubscription(() =>
      listenSidecarLogs((payload) => {
        useDevConsoleStore.getState().addLog(
          payload.level,
          maskDiagnosticText(payload.message, { privacyMode: true }),
        );
      }),
      (error) => {
        const safeMessage = maskDiagnosticText(
          error instanceof Error ? error.message : String(error),
          { privacyMode: true },
        );
        useDevConsoleStore.getState().addLog(
          "system",
          `订阅初始化失败: ${safeMessage}`,
        );
        recordLocalDiagnosticEvent({
          source: "tauri",
          level: "error",
          category: "sidecar.logs.subscription",
          summary: `Sidecar log subscription failed: ${safeMessage}`,
          recoveryHint: "retry",
          attributes: {
            target: "dev-console",
          },
        });
      },
    );
  }, []);
}
