import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import {
  fetchGraphVisualize,
} from "@l4/network";
import type { EntityKind, VisualizeParams } from "@/l2-coordinator/api-docs/graph";

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

  const hoverNode = useCallback((nodeId: string | null, coord?: { x: number; y: number }) => {
    useGraphStore.getState().setHoveredNode(nodeId, coord);
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    useGraphStore.getState().setSelectedNode(nodeId);
  }, []);

  const focusOnChat = useCallback((contactName: string) => {
    const { data, visible } = useGraphStore.getState();
    if (!visible || !data) return;
    const matched = data.nodes.find((n) =>
      n.name.toLowerCase() === contactName.toLowerCase()
    );
    if (matched) {
      useGraphStore.getState().setPulsedNode(matched.id);
      setTimeout(() => useGraphStore.getState().setPulsedNode(null), 4000);
    }
  }, []);

  const focusOnGraphFromSearch = useCallback(async (keyword: string) => {
    const { visible } = useGraphStore.getState();
    if (!visible) return;
    await searchGraph(keyword);
  }, [searchGraph]);

  const setVisibleKinds = useCallback((kinds: EntityKind[]) => {
    useGraphStore.getState().setVisibleEntityKinds(kinds);
  }, []);

  const setLayoutMode = useCallback((mode: "force" | "radial") => {
    useGraphStore.getState().setLayoutMode(mode);
  }, []);

  const setTimelineVisible = useCallback((visible: boolean) => {
    useGraphStore.getState().setTimelineVisible(visible);
  }, []);

  const highlightTimelineEntry = useCallback((timelineId: string) => {
    const { data } = useGraphStore.getState();
    if (!data) return;
    const entry = data.timeline.find((_t, i) => `${i}` === timelineId);
    if (!entry || !entry.source) return;
    const matchedNode = data.nodes.find((n) =>
      n.name.toLowerCase() === entry.source!.toLowerCase()
    );
    if (matchedNode) {
      useGraphStore.getState().setPulsedNode(matchedNode.id);
      setTimeout(() => useGraphStore.getState().setPulsedNode(null), 4000);
    }
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
    hoveredNodeId: store.hoveredNodeId,
    selectedNodeId: store.selectedNodeId,
    pulsedNodeId: store.pulsedNodeId,
    tooltipCoord: store.tooltipCoord,
    visibleEntityKinds: store.visibleEntityKinds,
    layoutMode: store.layoutMode,
    timelineVisible: store.timelineVisible,
    highlightedTimelineId: store.highlightedTimelineId,
    setVisibleKinds,
    setLayoutMode,
    setTimelineVisible,
    highlightTimelineEntry,
    loadGraph,
    searchGraph,
    refreshGraph,
    openGraph,
    closeGraph,
    toggleMinimize,
    hoverNode,
    selectNode,
    focusOnChat,
    focusOnGraphFromSearch,
    setKeyword: store.setKeyword,
    setTimeWindow: store.setTimeWindow,
    toggleAutoRotate: store.toggleAutoRotate,
    reset: store.reset,
  };
}
