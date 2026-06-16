import { create } from "zustand";
import type { StatsControlState } from "@l2/commander/statsControlModel";

export interface AdaptedStats {
  chat: string;
  username: string;
  isGroup: boolean;
  chatType: string;
  total: number;
  sentCount: number;
  receivedCount: number;
  activeSenders: number;
  activeDays: number;
  firstMessageTime: number;
  lastMessageTime: number;
  querySince?: number;
  queryUntil?: number;
  queryRangeLabel: string;
  byType: { type: string; count: number }[];
  topSenders: { sender: string; count: number; display: string }[];
  byHour: { hour: number; count: number }[];
}

export interface TrendDataPoint {
  date: string;
  count: number;
}

export type StatsLoadStatus = "idle" | "loading" | "success" | "empty" | "error" | "partial";

export interface StatsRequestSnapshot {
  chat: string;
  control: StatsControlState;
  scopeSummary: string;
  requestKey: string;
}

export interface StatsComparisonRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  deltaPercent: number | null;
}

export interface StatsComparisonState {
  mode: "off" | "previousPeriod";
  unavailableReason: string | null;
  rows: StatsComparisonRow[];
}

interface StatsState {
  stats: AdaptedStats | null;
  trend: TrendDataPoint[];
  statsStatus: StatsLoadStatus;
  trendStatus: StatsLoadStatus;
  comparisonStatus: StatsLoadStatus;
  trendError: string | null;
  comparisonError: string | null;
  comparison: StatsComparisonState;
  partialWarnings: string[];
  activeControlState: StatsControlState | null;
  lastCompletedControlState: StatsControlState | null;
  activeSnapshot: StatsRequestSnapshot | null;
  lastCompletedSnapshot: StatsRequestSnapshot | null;
  loading: boolean;
  error: string | null;
  activeStatsRequestId: string | null;
  activeTrendRequestId: string | null;
  activeComparisonRequestId: string | null;
  startStatsRequest: (requestId: string, snapshot?: StatsRequestSnapshot) => void;
  completeStatsRequest: (requestId: string, stats: AdaptedStats) => boolean;
  failStatsRequest: (requestId: string, error: string) => boolean;
  startTrendRequest: (requestId: string, snapshot?: StatsRequestSnapshot) => void;
  completeTrendRequest: (requestId: string, trend: TrendDataPoint[]) => boolean;
  failTrendRequest: (requestId: string, error?: string) => boolean;
  startComparisonRequest: (requestId: string, snapshot?: StatsRequestSnapshot) => void;
  completeComparisonRequest: (requestId: string, comparison: StatsComparisonState) => boolean;
  failComparisonRequest: (requestId: string, error: string) => boolean;
  setComparisonUnavailable: (reason: string) => void;
  setPartialWarnings: (warnings: string[]) => void;
  setStats: (stats: AdaptedStats) => void;
  setTrend: (trend: TrendDataPoint[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  trend: [],
  statsStatus: "idle",
  trendStatus: "idle",
  comparisonStatus: "idle",
  trendError: null,
  comparisonError: null,
  comparison: { mode: "off", unavailableReason: null, rows: [] },
  partialWarnings: [],
  activeControlState: null,
  lastCompletedControlState: null,
  activeSnapshot: null,
  lastCompletedSnapshot: null,
  loading: false,
  error: null,
  activeStatsRequestId: null,
  activeTrendRequestId: null,
  activeComparisonRequestId: null,
  startStatsRequest: (activeStatsRequestId, snapshot) =>
    set({
      activeStatsRequestId,
      activeSnapshot: snapshot ?? null,
      activeControlState: snapshot?.control ?? null,
      statsStatus: "loading",
      loading: true,
      error: null,
    }),
  completeStatsRequest: (requestId, stats) => {
    let applied = false;
    set((state) => {
      if (state.activeStatsRequestId !== requestId) return state;
      applied = true;
      const status: StatsLoadStatus = stats.total > 0 ? "success" : "empty";
      return {
        stats,
        statsStatus: status,
        loading: false,
        error: null,
        activeStatsRequestId: null,
        lastCompletedControlState: state.activeControlState,
        lastCompletedSnapshot: state.activeSnapshot,
      };
    });
    return applied;
  },
  failStatsRequest: (requestId, error) => {
    let applied = false;
    set((state) => {
      if (state.activeStatsRequestId !== requestId) return state;
      applied = true;
      return { error, statsStatus: "error", loading: false, activeStatsRequestId: null };
    });
    return applied;
  },
  startTrendRequest: (activeTrendRequestId, snapshot) =>
    set((state) => ({
      activeTrendRequestId,
      activeSnapshot: snapshot ?? state.activeSnapshot,
      activeControlState: snapshot?.control ?? state.activeControlState,
      trendStatus: "loading",
      trendError: null,
    })),
  completeTrendRequest: (requestId, trend) => {
    let applied = false;
    set((state) => {
      if (state.activeTrendRequestId !== requestId) return state;
      applied = true;
      return {
        trend,
        trendStatus: trend.length > 0 ? "success" : "empty",
        trendError: null,
        activeTrendRequestId: null,
      };
    });
    return applied;
  },
  failTrendRequest: (requestId, error = "趋势加载失败") => {
    let applied = false;
    set((state) => {
      if (state.activeTrendRequestId !== requestId) return state;
      applied = true;
      return { trendStatus: "error", trendError: error, activeTrendRequestId: null };
    });
    return applied;
  },
  startComparisonRequest: (activeComparisonRequestId, snapshot) =>
    set((state) => ({
      activeComparisonRequestId,
      activeSnapshot: snapshot ?? state.activeSnapshot,
      activeControlState: snapshot?.control ?? state.activeControlState,
      comparisonStatus: "loading",
      comparisonError: null,
      comparison: { mode: "previousPeriod", unavailableReason: null, rows: [] },
    })),
  completeComparisonRequest: (requestId, comparison) => {
    let applied = false;
    set((state) => {
      if (state.activeComparisonRequestId !== requestId) return state;
      applied = true;
      return {
        comparison,
        comparisonStatus: comparison.unavailableReason ? "partial" : "success",
        comparisonError: null,
        activeComparisonRequestId: null,
      };
    });
    return applied;
  },
  failComparisonRequest: (requestId, error) => {
    let applied = false;
    set((state) => {
      if (state.activeComparisonRequestId !== requestId) return state;
      applied = true;
      return {
        comparisonStatus: "error",
        comparisonError: error,
        comparison: { mode: "previousPeriod", unavailableReason: error, rows: [] },
        activeComparisonRequestId: null,
      };
    });
    return applied;
  },
  setComparisonUnavailable: (reason) =>
    set({
      comparisonStatus: "partial",
      comparisonError: null,
      comparison: { mode: "previousPeriod", unavailableReason: reason, rows: [] },
      activeComparisonRequestId: null,
    }),
  setPartialWarnings: (partialWarnings) => set({ partialWarnings }),
  setStats: (stats) => set({
    stats,
    statsStatus: stats.total > 0 ? "success" : "empty",
    loading: false,
    error: null,
    activeStatsRequestId: null,
  }),
  setTrend: (trend) => set({
    trend,
    trendStatus: trend.length > 0 ? "success" : "empty",
    trendError: null,
    activeTrendRequestId: null,
  }),
  setLoading: (loading) => set({ loading, statsStatus: loading ? "loading" : "idle", activeStatsRequestId: null }),
  setError: (error) => set({ error, statsStatus: error ? "error" : "idle", loading: false, activeStatsRequestId: null }),
  clear: () =>
    set({
      stats: null,
      trend: [],
      statsStatus: "idle",
      trendStatus: "idle",
      comparisonStatus: "idle",
      trendError: null,
      comparisonError: null,
      comparison: { mode: "off", unavailableReason: null, rows: [] },
      partialWarnings: [],
      activeControlState: null,
      lastCompletedControlState: null,
      activeSnapshot: null,
      lastCompletedSnapshot: null,
      loading: false,
      error: null,
      activeStatsRequestId: null,
      activeTrendRequestId: null,
      activeComparisonRequestId: null,
    }),
}));
