import { useCallback } from "react";
import { useStatsStore } from "@/l2-coordinator/data-clerk/stores/useStatsStore";
import { fetchStats, fetchDashboardTrend } from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

export function useStatsCommander() {
  const store = useStatsStore();

  const loadStats = useCallback(async (chat: string) => {
    useStatsStore.getState().setLoading(true);
    try {
      const result = await fetchStats(
        { chat },
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          correlationId: "stats-refresh",
          recoveryHint: "retry",
        }),
      );
      useStatsStore.getState().setStats(result);
    } catch {
      useStatsStore.getState().setError("加载统计失败");
    }
  }, []);

  const loadTrend = useCallback(async (chat?: string) => {
    try {
      const result = await fetchDashboardTrend(
        { chat, window: "7d", summary: false },
        createDiagnosticHttpOptions({
          endpointFamily: "dashboard-trend",
          correlationId: "trend-refresh",
          recoveryHint: "retry",
        }),
      );
      useStatsStore.getState().setTrend(result.daily);
    } catch {
      // 趋势数据非关键，静默失败
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
    loadStats,
    loadTrend,
    loadAll,
  };
}
