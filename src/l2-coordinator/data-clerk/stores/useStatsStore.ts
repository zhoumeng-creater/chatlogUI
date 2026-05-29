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
  setStats: (stats) => set({ stats, loading: false, error: null }),
  setTrend: (trend) => set({ trend }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  clear: () => set({ stats: null, trend: [], loading: false, error: null }),
}));
