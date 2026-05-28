import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import {
  fetchGraphVisualize,
} from "@l4/network";
import type { VisualizeParams } from "@/l2-coordinator/api-docs/graph";

export function useGraphCommander() {
  const store = useGraphStore();

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    useGraphStore.setState({ loading: true, error: null });
    try {
      const data = await fetchGraphVisualize(params);
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "加载图谱数据失败",
      );
    }
  }, []);

  const searchGraph = useCallback(async (keyword: string) => {
    useGraphStore.setState({ loading: true, keyword });
    try {
      const data = await fetchGraphVisualize({ keyword });
      useGraphStore.getState().setData(data);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "图谱搜索失败",
      );
    }
  }, []);

  const refreshGraph = useCallback(async () => {
    const { keyword, timeWindow } = useGraphStore.getState();
    await loadGraph({ keyword: keyword || undefined, window: timeWindow || undefined });
  }, [loadGraph]);

  const openGraph = useCallback(async () => {
    useGraphStore.setState({ visible: true, minimized: false });
    const { data } = useGraphStore.getState();
    if (!data) {
      await loadGraph();
    }
  }, [loadGraph]);

  const closeGraph = useCallback(() => {
    useGraphStore.getState().setVisible(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    useGraphStore.setState((state) => ({ minimized: !state.minimized }));
  }, []);

  return {
    data: store.data,
    loading: store.loading,
    error: store.error,
    keyword: store.keyword,
    timeWindow: store.timeWindow,
    autoRotate: store.autoRotate,
    visible: store.visible,
    minimized: store.minimized,
    loadGraph,
    searchGraph,
    refreshGraph,
    openGraph,
    closeGraph,
    toggleMinimize,
    setKeyword: store.setKeyword,
    setTimeWindow: store.setTimeWindow,
    toggleAutoRotate: store.toggleAutoRotate,
    reset: store.reset,
  };
}
