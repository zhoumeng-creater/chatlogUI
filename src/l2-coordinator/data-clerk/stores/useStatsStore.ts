import { create } from "zustand";

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

interface StatsState {
  stats: AdaptedStats | null;
  trend: TrendDataPoint[];
  loading: boolean;
  error: string | null;
  activeStatsRequestId: string | null;
  activeTrendRequestId: string | null;
  startStatsRequest: (requestId: string) => void;
  completeStatsRequest: (requestId: string, stats: AdaptedStats) => boolean;
  failStatsRequest: (requestId: string, error: string) => boolean;
  startTrendRequest: (requestId: string) => void;
  completeTrendRequest: (requestId: string, trend: TrendDataPoint[]) => boolean;
  failTrendRequest: (requestId: string) => boolean;
  setStats: (stats: AdaptedStats) => void;
  setTrend: (trend: TrendDataPoint[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  trend: [],
  loading: false,
  error: null,
  activeStatsRequestId: null,
  activeTrendRequestId: null,
  startStatsRequest: (activeStatsRequestId) =>
    set({ activeStatsRequestId, loading: true, error: null }),
  completeStatsRequest: (requestId, stats) => {
    let applied = false;
    set((state) => {
      if (state.activeStatsRequestId !== requestId) return state;
      applied = true;
      return { stats, loading: false, error: null, activeStatsRequestId: null };
    });
    return applied;
  },
  failStatsRequest: (requestId, error) => {
    let applied = false;
    set((state) => {
      if (state.activeStatsRequestId !== requestId) return state;
      applied = true;
      return { error, loading: false, activeStatsRequestId: null };
    });
    return applied;
  },
  startTrendRequest: (activeTrendRequestId) => set({ activeTrendRequestId }),
  completeTrendRequest: (requestId, trend) => {
    let applied = false;
    set((state) => {
      if (state.activeTrendRequestId !== requestId) return state;
      applied = true;
      return { trend, activeTrendRequestId: null };
    });
    return applied;
  },
  failTrendRequest: (requestId) => {
    let applied = false;
    set((state) => {
      if (state.activeTrendRequestId !== requestId) return state;
      applied = true;
      return { activeTrendRequestId: null };
    });
    return applied;
  },
  setStats: (stats) => set({ stats, loading: false, error: null, activeStatsRequestId: null }),
  setTrend: (trend) => set({ trend, activeTrendRequestId: null }),
  setLoading: (loading) => set({ loading, activeStatsRequestId: null }),
  setError: (error) => set({ error, loading: false, activeStatsRequestId: null }),
  clear: () =>
    set({
      stats: null,
      trend: [],
      loading: false,
      error: null,
      activeStatsRequestId: null,
      activeTrendRequestId: null,
    }),
}));
