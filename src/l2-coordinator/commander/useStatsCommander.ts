import { useCallback } from "react";
import { useStatsStore } from "@/l2-coordinator/data-clerk/stores/useStatsStore";
import { fetchStats, fetchDashboardTrend } from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { createStatsExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";

let statsRequestSequence = 0;

function nextStatsRequestId(prefix: "stats" | "trend"): string {
  statsRequestSequence += 1;
  return `${prefix}-${statsRequestSequence}`;
}

interface StatsCommanderOptions {
  scopeSummary?: string;
}

export function useStatsCommander(options: StatsCommanderOptions = {}) {
  const store = useStatsStore();
  const businessExport = useBusinessExportCommander({
    source: "stats",
    formats: ["csv", "markdown", "json"],
    defaultFormat: "csv",
    disabledReason: store.stats ? null : "统计数据加载完成后可导出。",
    buildArtifact: ({ format, privacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createStatsExportArtifact({
        format,
        privacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: options.scopeSummary ?? "当前会话",
        stats: store.stats,
        trend: store.trend,
      }),
  });

  const loadStats = useCallback(async (chat: string) => {
    const requestId = nextStatsRequestId("stats");
    useStatsStore.getState().startStatsRequest(requestId);
    try {
      const result = await fetchStats(
        { chat },
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      useStatsStore.getState().completeStatsRequest(requestId, result);
    } catch {
      useStatsStore.getState().failStatsRequest(requestId, "加载统计失败");
    }
  }, []);

  const loadTrend = useCallback(async (chat?: string) => {
    const requestId = nextStatsRequestId("trend");
    useStatsStore.getState().startTrendRequest(requestId);
    try {
      const result = await fetchDashboardTrend(
        { chat, window: "7d", summary: false },
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      useStatsStore.getState().completeTrendRequest(requestId, result.daily);
    } catch {
      useStatsStore.getState().failTrendRequest(requestId);
    }
  }, []);

  const loadAll = useCallback(
    (chat: string) => {
      loadStats(chat);
      loadTrend(chat);
    },
    [loadStats, loadTrend],
  );

  return {
    ...store,
    businessExport,
    loadStats,
    loadTrend,
    loadAll,
  };
}
