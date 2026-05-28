import { create } from "zustand";
import type { StatsResponse, TrendDataPoint } from "@/l2-coordinator/api-docs/stats";

interface StatsState {
  stats: StatsResponse | null;
  trend: TrendDataPoint[];
  loading: boolean;
  error: string | null;
  setStats: (stats: StatsResponse) => void;
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
