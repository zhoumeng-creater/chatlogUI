import { useCallback } from "react";
import {
  useStatsStore,
  type AdaptedStats,
  type StatsComparisonRow,
  type StatsComparisonState,
  type StatsRequestSnapshot,
} from "@/l2-coordinator/data-clerk/stores/useStatsStore";
import { fetchStats, fetchDashboardTrend } from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { createStatsExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import {
  buildStatsControlViewModel,
  createDefaultStatsControlState,
  getStatsMetricDefinitions,
  resolvePreviousPeriodRequest,
  resolveStatsRequest,
  resolveTrendRequest,
  type StatsControlState,
} from "./statsControlModel";

let statsRequestSequence = 0;

function nextStatsRequestId(prefix: "stats" | "trend" | "comparison"): string {
  statsRequestSequence += 1;
  return `${prefix}-${statsRequestSequence}`;
}

interface StatsCommanderOptions {
  scopeSummary?: string;
  controlState?: StatsControlState;
}

export function useStatsCommander(options: StatsCommanderOptions = {}) {
  const store = useStatsStore();
  const currentControl = options.controlState ?? store.lastCompletedControlState ?? createDefaultStatsControlState();
  const controlView = buildStatsControlViewModel({
    control: currentControl,
    hasTrendData: store.trend.length > 0,
    pending: store.loading || store.trendStatus === "loading" || store.comparisonStatus === "loading",
  });
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
        visibleRangeLabel: store.stats?.queryRangeLabel ?? controlView.activeLabels[0] ?? "当前范围",
        controlSummary: controlView.exportScopeSummary,
        metricDefinitions: getStatsMetricDefinitions(),
        comparison: store.comparison,
        warnings: Array.from(new Set([...controlView.warnings, ...store.partialWarnings])),
        stats: store.stats,
        trend: store.trend,
      }),
  });

  const loadStats = useCallback(async (snapshot: StatsRequestSnapshot) => {
    const requestId = nextStatsRequestId("stats");
    useStatsStore.getState().startStatsRequest(requestId, snapshot);
    try {
      const result = await fetchStats(
        resolveStatsRequest({ chat: snapshot.chat, control: snapshot.control }),
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      useStatsStore.getState().completeStatsRequest(requestId, result);
      return result;
    } catch {
      useStatsStore.getState().failStatsRequest(requestId, "加载统计失败");
      return null;
    }
  }, []);

  const loadTrend = useCallback(async (snapshot: StatsRequestSnapshot) => {
    const trendRequest = resolveTrendRequest({ chat: snapshot.chat, control: snapshot.control });
    if (!trendRequest.supported || !trendRequest.params) {
      useStatsStore.getState().setTrend([]);
      useStatsStore.getState().setPartialWarnings(
        Array.from(new Set([
          ...useStatsStore.getState().partialWarnings,
          trendRequest.warning ?? trendRequest.reason ?? "趋势暂不可用。",
        ])),
      );
      return;
    }
    const requestId = nextStatsRequestId("trend");
    useStatsStore.getState().startTrendRequest(requestId, snapshot);
    try {
      const result = await fetchDashboardTrend(
        trendRequest.params,
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      const warning = trendRequest.warning;
      useStatsStore.getState().setPartialWarnings(warning ? [warning] : []);
      useStatsStore.getState().completeTrendRequest(requestId, result.daily);
    } catch {
      useStatsStore.getState().failTrendRequest(requestId, "趋势加载失败");
    }
  }, []);

  const loadComparison = useCallback(async (snapshot: StatsRequestSnapshot, currentStats: AdaptedStats | null = null) => {
    const comparisonRequest = resolvePreviousPeriodRequest({
      chat: snapshot.chat,
      control: snapshot.control,
    });
    if (!comparisonRequest.supported || !comparisonRequest.params) {
      if (snapshot.control.comparisonMode === "previousPeriod") {
        useStatsStore.getState().setComparisonUnavailable(comparisonRequest.reason ?? "上一周期比较暂不可用。");
      } else {
        useStatsStore.setState({
          comparison: { mode: "off", unavailableReason: null, rows: [] },
          comparisonStatus: "idle",
          comparisonError: null,
          activeComparisonRequestId: null,
        });
      }
      return;
    }
    const requestId = nextStatsRequestId("comparison");
    useStatsStore.getState().startComparisonRequest(requestId, snapshot);
    try {
      const previous = await fetchStats(
        comparisonRequest.params,
        createDiagnosticHttpOptions({
          endpointFamily: "stats",
          method: "GET",
          recoveryHint: "retry",
        }),
      );
      const current = currentStats ?? useStatsStore.getState().stats;
      useStatsStore.getState().completeComparisonRequest(
        requestId,
        buildComparisonState(current, previous),
      );
    } catch {
      useStatsStore.getState().failComparisonRequest(requestId, "上一周期比较加载失败");
    }
  }, []);

  const loadAll = useCallback(
    (input: string | { chat: string; control?: StatsControlState; scopeSummary?: string }) => {
      const snapshot = createStatsSnapshot(input, options.scopeSummary);
      useStatsStore.getState().setPartialWarnings([]);
      void loadStats(snapshot).then((current) => {
        void loadComparison(snapshot, current);
      });
      loadTrend(snapshot);
    },
    [loadComparison, loadStats, loadTrend, options.scopeSummary],
  );

  return {
    ...store,
    controlView,
    businessExport,
    loadStats,
    loadTrend,
    loadComparison,
    loadAll,
  };
}

function createStatsSnapshot(
  input: string | { chat: string; control?: StatsControlState; scopeSummary?: string },
  fallbackScopeSummary?: string,
): StatsRequestSnapshot {
  if (typeof input === "string") {
    const control = createDefaultStatsControlState();
    return {
      chat: input,
      control,
      scopeSummary: fallbackScopeSummary ?? "当前会话",
      requestKey: `${input}:${JSON.stringify(control)}`,
    };
  }
  const control = input.control ?? createDefaultStatsControlState();
  return {
    chat: input.chat,
    control,
    scopeSummary: input.scopeSummary ?? fallbackScopeSummary ?? "当前会话",
    requestKey: `${input.chat}:${JSON.stringify(control)}`,
  };
}

function buildComparisonState(current: AdaptedStats | null, previous: AdaptedStats): StatsComparisonState {
  if (!current) {
    return { mode: "previousPeriod", unavailableReason: "当前统计尚未加载，无法比较。", rows: [] };
  }
  const rows: StatsComparisonRow[] = [
    buildComparisonRow("total", "消息总数", current.total, previous.total),
    buildComparisonRow("sent", "发送", current.sentCount, previous.sentCount),
    buildComparisonRow("received", "接收", current.receivedCount, previous.receivedCount),
    buildComparisonRow("activeSenders", "活跃人数", current.activeSenders, previous.activeSenders),
    buildComparisonRow("activeDays", "活跃天数", current.activeDays, previous.activeDays),
  ];
  return { mode: "previousPeriod", unavailableReason: null, rows };
}

function buildComparisonRow(
  key: string,
  label: string,
  current: number,
  previous: number,
): StatsComparisonRow {
  return {
    key,
    label,
    current,
    previous,
    deltaPercent: previous === 0 ? null : ((current - previous) / previous) * 100,
  };
}
