import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import {
  askGraphQA,
  fetchGraphConfig,
  fetchGraphStatus,
  fetchGraphTimeline,
  fetchGraphVisualize,
  ingestGraphBusiness,
  ingestGraphEvent,
  manageGraph,
  saveGraphConfig,
  type GraphBusinessDraft,
  type GraphConfigDraft,
  type GraphEventDraft,
  type GraphQADraft,
} from "@l4/network";
import type { EntityKind, VisualizeParams } from "@/l2-coordinator/api-docs/graph";
import type {
  GraphStatusView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";
import { deriveGraphModuleView } from "./graphViewModel";
import {
  buildGraphResidualView,
  hasMeaningfulGraphBusinessDraft,
  hasMeaningfulGraphEventDraft,
} from "./graphResidualViewModel";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

function graphDiagnostics(method: "GET" | "POST" = "GET") {
  return createDiagnosticHttpOptions({
    endpointFamily: "graph",
    method,
    recoveryHint: "retry",
  });
}

export function useGraphCommander() {
  const store = useGraphStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    useGraphStore.setState({ loading: true, error: null });
    try {
      const data = await fetchGraphVisualize(params, graphDiagnostics());
      useGraphStore.getState().setVisualize(data as unknown as GraphVisualizeView);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "加载图谱数据失败",
      );
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await fetchGraphStatus(graphDiagnostics());
      useGraphStore.getState().setStatusSummary(status as unknown as GraphStatusView | null);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "图谱状态查询失败",
      );
    }
  }, []);

  const loadGraphTimeline = useCallback(async (params: VisualizeParams = {}) => {
    try {
      const timeline = await fetchGraphTimeline(params, graphDiagnostics());
      useGraphStore.getState().setTimeline(timeline);
    } catch {
      useGraphStore.getState().setTimeline(null);
    }
  }, []);

  const loadGraphSummary = useCallback(async (params: VisualizeParams = {}) => {
    useGraphStore.setState({ loading: true, error: null, visualizationRequested: false });
    try {
      const [status, visualize] = await Promise.all([
        fetchGraphStatus(graphDiagnostics()),
        fetchGraphVisualize(params, graphDiagnostics()),
      ]);
      const graphStore = useGraphStore.getState();
      graphStore.setStatusSummary(status as unknown as GraphStatusView | null);
      graphStore.setVisualize(visualize as unknown as GraphVisualizeView);
      graphStore.setLoading(false);
      void loadGraphTimeline(params);
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : "加载图谱摘要失败",
      );
    }
  }, [loadGraphTimeline]);

  const loadVisualization = useCallback(async () => {
    const graphStore = useGraphStore.getState();
    graphStore.setVisualizationRequested(true);
    if (graphStore.visualize?.state === "loaded") return;
    await loadGraph({
      keyword: graphStore.keyword || undefined,
      window: graphStore.timeWindow || undefined,
    });
  }, [loadGraph]);

  const cancelGraphLoad = useCallback(() => {
    useGraphStore.setState({ loading: false, loadStatus: "cancelled" });
  }, []);

  const retryGraphLoad = useCallback(async () => {
    const { keyword, timeWindow } = useGraphStore.getState();
    await loadGraphSummary({ keyword: keyword || undefined, window: timeWindow || undefined });
  }, [loadGraphSummary]);

  const runGraphAction = useCallback(async (action: "rebuild" | "pause" | "resume") => {
    try {
      const result = await manageGraph(action, graphDiagnostics("POST"));
      useGraphStore.getState().setActionStatus(result);
      await refreshStatus();
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : `图谱操作 ${action} 失败`,
      );
    }
  }, [refreshStatus]);

  const loadGraphConfig = useCallback(async () => {
    useGraphStore.getState().setAdvancedConfigLoading();
    try {
      const config = await fetchGraphConfig(graphDiagnostics());
      useGraphStore.getState().setAdvancedConfig(config);
    } catch (error) {
      useGraphStore.getState().setAdvancedConfigError(
        error instanceof Error ? error.message : "加载图谱高级配置失败",
      );
    }
  }, []);

  const saveGraphAdvancedConfig = useCallback(async (draft?: GraphConfigDraft) => {
    const nextDraft = draft ?? useGraphStore.getState().graphConfigDraft;
    useGraphStore.getState().setAdvancedConfigLoading();
    try {
      const config = await saveGraphConfig(nextDraft, graphDiagnostics("POST"));
      useGraphStore.getState().setAdvancedConfig(config);
      await refreshStatus();
    } catch (error) {
      useGraphStore.getState().setAdvancedConfigError(
        error instanceof Error ? error.message : "保存图谱高级配置失败",
      );
    }
  }, [refreshStatus]);

  const runBusinessIngest = useCallback(async (draft?: GraphBusinessDraft) => {
    const nextDraft = draft ?? useGraphStore.getState().businessDraft;
    if (!hasMeaningfulGraphBusinessDraft(nextDraft)) {
      useGraphStore.getState().setIngestError("请输入业务记录后再写入图谱");
      return;
    }
    if (useGraphStore.getState().advancedConfirmationPending !== "business") {
      useGraphStore.getState().requestAdvancedConfirmation("business");
      return;
    }

    useGraphStore.getState().setIngestLoading();
    try {
      const result = await ingestGraphBusiness(nextDraft, graphDiagnostics("POST"));
      useGraphStore.getState().setIngestResult(result);
      await refreshStatus();
    } catch (error) {
      useGraphStore.getState().setIngestError(
        error instanceof Error ? error.message : "业务记录写入图谱失败",
      );
    }
  }, [refreshStatus]);

  const runEventIngest = useCallback(async (draft?: GraphEventDraft) => {
    const nextDraft = draft ?? useGraphStore.getState().eventDraft;
    if (!hasMeaningfulGraphEventDraft(nextDraft)) {
      useGraphStore.getState().setIngestError("请输入事件记录后再写入图谱");
      return;
    }
    if (useGraphStore.getState().advancedConfirmationPending !== "event") {
      useGraphStore.getState().requestAdvancedConfirmation("event");
      return;
    }

    useGraphStore.getState().setIngestLoading();
    try {
      const result = await ingestGraphEvent(nextDraft, graphDiagnostics("POST"));
      useGraphStore.getState().setIngestResult(result);
      await refreshStatus();
    } catch (error) {
      useGraphStore.getState().setIngestError(
        error instanceof Error ? error.message : "事件记录写入图谱失败",
      );
    }
  }, [refreshStatus]);

  const runGraphQA = useCallback(async (draft?: GraphQADraft) => {
    const nextDraft = draft ?? useGraphStore.getState().qaDraft;
    if (!nextDraft.query.trim()) {
      useGraphStore.getState().setQAError("请输入图谱问题");
      return;
    }
    if (useGraphStore.getState().advancedConfirmationPending !== "qa") {
      useGraphStore.getState().requestAdvancedConfirmation("qa");
      return;
    }

    useGraphStore.getState().setQALoading();
    try {
      const result = await askGraphQA(nextDraft, graphDiagnostics("POST"));
      useGraphStore.getState().setQAResult(result);
    } catch (error) {
      useGraphStore.getState().setQAError(
        error instanceof Error ? error.message : "图谱 QA 失败",
      );
    }
  }, []);

  const searchGraph = useCallback(async (keyword: string) => {
    useGraphStore.setState({ keyword });
    await loadGraphSummary({ keyword });
  }, [loadGraphSummary]);

  const refreshGraph = useCallback(async () => {
    const { keyword, timeWindow } = useGraphStore.getState();
    await loadGraphSummary({ keyword: keyword || undefined, window: timeWindow || undefined });
  }, [loadGraphSummary]);

  const openGraph = useCallback(async () => {
    useGraphStore.setState({ visible: true, minimized: false });
    const { visualize } = useGraphStore.getState();
    if (!visualize) {
      await loadGraphSummary();
    }
  }, [loadGraphSummary]);

  const openGraphModule = useCallback(async () => {
    await openGraph();
  }, [openGraph]);

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

  const setGraphFilter = useCallback((params: { keyword?: string; window?: string }) => {
    if (params.keyword !== undefined) useGraphStore.getState().setKeyword(params.keyword);
    if (params.window !== undefined) useGraphStore.getState().setTimeWindow(params.window);
  }, []);

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
    loadStatus: store.loadStatus,
    statusSummary: store.statusSummary,
    visualize: store.visualize,
    timeline: store.timeline,
    actionStatus: store.actionStatus,
    advancedConfigStatus: store.advancedConfigStatus,
    ingestStatus: store.ingestStatus,
    qaStatus: store.qaStatus,
    advancedConfig: store.advancedConfig,
    graphConfigDraft: store.graphConfigDraft,
    businessDraft: store.businessDraft,
    eventDraft: store.eventDraft,
    qaDraft: store.qaDraft,
    ingestResult: store.ingestResult,
    qaResult: store.qaResult,
    advancedConfirmationPending: store.advancedConfirmationPending,
    advancedConfigError: store.advancedConfigError,
    ingestError: store.ingestError,
    qaError: store.qaError,
    visualizationRequested: store.visualizationRequested,
    moduleView: deriveGraphModuleView({
      statusSummary: store.statusSummary,
      visualize: store.visualize,
      visualizationRequested: store.visualizationRequested,
    }),
    advancedView: buildGraphResidualView({
      configStatus: store.advancedConfigStatus,
      ingestStatus: store.ingestStatus,
      qaStatus: store.qaStatus,
      config: store.advancedConfig,
      ingestResult: store.ingestResult,
      qaResult: store.qaResult,
      confirmationPending: store.advancedConfirmationPending,
      configError: store.advancedConfigError,
      ingestError: store.ingestError,
      qaError: store.qaError,
    }, privacyOn),
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
    openGraphModule,
    refreshStatus,
    loadGraphSummary,
    loadGraphTimeline,
    loadVisualization,
    cancelGraphLoad,
    retryGraphLoad,
    rebuildGraph: () => runGraphAction("rebuild"),
    pauseGraph: () => runGraphAction("pause"),
    resumeGraph: () => runGraphAction("resume"),
    loadGraphConfig,
    saveGraphAdvancedConfig,
    runBusinessIngest,
    runEventIngest,
    runGraphQA,
    cancelAdvancedConfirmation: store.cancelAdvancedConfirmation,
    updateGraphConfigDraft: store.updateGraphConfigDraft,
    updateBusinessDraft: store.updateBusinessDraft,
    updateEventDraft: store.updateEventDraft,
    updateQADraft: store.updateQADraft,
    setGraphFilter,
    clearGraphError: () => store.setError(null),
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
