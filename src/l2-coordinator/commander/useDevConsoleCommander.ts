import { useEffect, useCallback } from "react";
import { listenSidecarLogs } from "@l4/system/listenSidecarLogs";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import { exportDiagnosticsReport } from "@l4/system/exportDiagnostics";
import { createDiagnosticEvent } from "@l4/network/diagnosticEvents";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { buildDiagnosticsReport } from "./diagnostics";
import { createDeferredSubscription } from "./deferredSubscription";
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
    try {
      const { logs } = useDevConsoleStore.getState();
      const { items } = useDiagnosticEventStore.getState();
      const errors = logs.filter((log) => log.level === "stderr" || log.level === "error");
      const lastError = errors.length > 0 ? errors[errors.length - 1]?.message : "-";
      const report = buildDiagnosticsReport({
        privacyOn: true,
        diagnosticEventsSummary: summarizeDiagnosticEventsForReport(items),
        items: [
          { label: "Log count", value: logs.length },
          { label: "Error count", value: errors.length },
          { label: "Last error", value: lastError ?? "-" },
        ],
      });
      return exportDiagnosticsReport(report);
    } catch (error) {
      const safeMessage = maskDiagnosticText(
        error instanceof Error ? error.message : String(error),
        { privacyMode: true },
      );
      useDevConsoleStore.getState().addLog(
        "system",
        `诊断导出失败: ${safeMessage}`,
      );
      useDiagnosticEventStore.getState().addEvent(
        createDiagnosticEvent({
          source: "ui",
          level: "error",
          category: "diagnostic.export",
          summary: `诊断导出失败: ${safeMessage}`,
        }),
      );
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
    );
  }, []);
}
