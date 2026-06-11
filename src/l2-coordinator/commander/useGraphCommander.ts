import { useCallback } from "react";
import { useGraphStore } from "@/l2-coordinator/data-clerk/stores/useGraphStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import {
  askGraphQA,
  fetchGraphConfig,
  fetchGraphQuery,
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
  GraphQueryView,
  GraphStatusView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";
import {
  deriveGraphModuleView,
  resolveGraphWorkbenchItemIdFromCanvas,
} from "./graphViewModel";
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

let graphLoadSequence = 0;

function nextGraphLoadRequestId(): string {
  graphLoadSequence += 1;
  return `graph-load-${graphLoadSequence}`;
}

export function useGraphCommander() {
  const store = useGraphStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    const requestId = nextGraphLoadRequestId();
    useGraphStore.getState().startGraphLoadRequest(requestId);
    try {
      const data = await fetchGraphVisualize(params, graphDiagnostics());
      useGraphStore.getState().completeGraphVisualizeRequest(requestId, data as unknown as GraphVisualizeView);
    } catch (error) {
      useGraphStore.getState().failGraphLoadRequest(
        requestId,
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
    const requestId = nextGraphLoadRequestId();
    useGraphStore.getState().startGraphLoadRequest(requestId);
    useGraphStore.getState().setVisualizationRequested(false);
    try {
      const requestParams = graphRequestParams(params);
      const [status, query, visualize, timeline] = await Promise.all([
        fetchGraphStatus(graphDiagnostics()),
        fetchGraphQuery(requestParams, undefined, graphDiagnostics()),
        fetchGraphVisualize(requestParams, graphDiagnostics()),
        fetchGraphTimeline(requestParams, graphDiagnostics()),
      ]);
      useGraphStore.getState().completeGraphSummaryRequest(requestId, {
        statusSummary: status as unknown as GraphStatusView | null,
        query: query as unknown as GraphQueryView,
        visualize: visualize as unknown as GraphVisualizeView,
        timeline,
      });
    } catch (error) {
      useGraphStore.getState().failGraphLoadRequest(
        requestId,
        error instanceof Error ? error.message : "加载图谱摘要失败",
      );
    }
  }, []);

  const loadVisualization = useCallback(async () => {
    const graphStore = useGraphStore.getState();
    graphStore.setVisualizationRequested(true);
    if (graphStore.visualize?.state === "loaded") return;
    await loadGraph(graphRequestParams());
  }, [loadGraph]);

  const cancelGraphLoad = useCallback(() => {
    useGraphStore.getState().cancelGraphLoadRequest();
  }, []);

  const retryGraphLoad = useCallback(async () => {
    await loadGraphSummary(graphRequestParams());
  }, [loadGraphSummary]);

  const runGraphAction = useCallback(async (action: "rebuild" | "reset-rebuild" | "pause" | "resume") => {
    try {
      const result = await manageGraph(action, graphDiagnostics("POST"));
      useGraphStore.getState().setActionStatus(result);
      if (action === "reset-rebuild") {
        useGraphStore.getState().cancelAdvancedConfirmation();
      }
      await refreshStatus();
    } catch (error) {
      useGraphStore.getState().setError(
        error instanceof Error ? error.message : `图谱操作 ${action} 失败`,
      );
    }
  }, [refreshStatus]);

  const resetRebuildGraph = useCallback(async () => {
    if (useGraphStore.getState().advancedConfirmationPending !== "reset") {
      useGraphStore.getState().requestAdvancedConfirmation("reset");
      return;
    }
    await runGraphAction("reset-rebuild");
  }, [runGraphAction]);

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
    const nextDraft = usableGraphQADraft(draft) ?? useGraphStore.getState().qaDraft;
    const query = nextDraft.query.trim();
    if (!query) {
      useGraphStore.getState().setQAError("请输入图谱问题");
      return;
    }
    if (useGraphStore.getState().advancedConfirmationPending !== "qa") {
      useGraphStore.getState().requestAdvancedConfirmation("qa");
      return;
    }

    useGraphStore.getState().setQALoading();
    try {
      const result = await askGraphQA({ ...nextDraft, query }, graphDiagnostics("POST"));
      useGraphStore.getState().setQAResult(result);
    } catch (error) {
      useGraphStore.getState().setQAError(
        error instanceof Error ? error.message : "图谱 QA 失败",
      );
    }
  }, []);

  const searchGraph = useCallback(async (keyword: string) => {
    useGraphStore.getState().setGraphFilters({ keyword });
    await loadGraphSummary(graphRequestParams({ keyword }));
  }, [loadGraphSummary]);

  const refreshGraph = useCallback(async () => {
    await loadGraphSummary(graphRequestParams());
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
    const graphStore = useGraphStore.getState();
    graphStore.setSelectedNode(nodeId);
    if (!nodeId) {
      graphStore.setSelectedGraphItem(null);
      return;
    }
    const node = graphStore.data?.nodes.find((item) => item.id === nodeId);
    graphStore.setSelectedGraphItem(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "node",
      id: nodeId,
      label: node?.name,
      query: graphStore.query,
    }));
  }, []);

  const selectEdge = useCallback((edgeId: string) => {
    const graphStore = useGraphStore.getState();
    const edge = graphStore.data?.edges.find((item) => item.id === edgeId);
    const nodesById = new Map((graphStore.data?.nodes ?? []).map((node) => [node.id, node.name]));
    graphStore.setSelectedGraphItem(resolveGraphWorkbenchItemIdFromCanvas({
      kind: "edge",
      id: edgeId,
      label: edge?.label,
      sourceLabel: edge ? nodesById.get(edge.source) : undefined,
      targetLabel: edge ? nodesById.get(edge.target) : undefined,
      query: graphStore.query,
    }));
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

  const setGraphFilter = useCallback((params: {
    keyword?: string;
    window?: string;
    entity?: string;
    relation?: string;
    limit?: number;
    start?: string;
    end?: string;
  }) => {
    useGraphStore.getState().setGraphFilters({
      keyword: params.keyword,
      timeWindow: params.window,
      entityFilter: params.entity,
      relationFilter: params.relation,
      limit: params.limit,
      start: params.start,
      end: params.end,
    });
  }, []);

  const clearGraphFilters = useCallback(() => {
    useGraphStore.getState().clearGraphFilters();
  }, []);

  const selectGraphItem = useCallback((id: string | null) => {
    useGraphStore.getState().setSelectedGraphItem(id);
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
    const graphStore = useGraphStore.getState();
    const { data } = graphStore;
    if (!data) return;
    const entry = data.timeline.find((_t, i) => `${i}` === timelineId);
    if (!entry) return;
    graphStore.setHighlightedTimeline(timelineId);
    if (!entry.source) return;
    const matchedNode = data.nodes.find((n) =>
      n.name.toLowerCase() === entry.source!.toLowerCase()
    );
    if (matchedNode) {
      graphStore.setPulsedNode(matchedNode.id);
      setTimeout(() => useGraphStore.getState().setPulsedNode(null), 4000);
    }
  }, []);

  return {
    data: store.data,
    loadStatus: store.loadStatus,
    statusSummary: store.statusSummary,
    query: store.query,
    visualize: store.visualize,
    timeline: store.timeline,
    actionStatus: store.actionStatus,
    activeLoadRequestId: store.activeLoadRequestId,
    advancedConfigStatus: store.advancedConfigStatus,
    ingestStatus: store.ingestStatus,
    qaStatus: store.qaStatus,
    activeTab: store.activeTab,
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
      query: store.query,
      timeline: store.timeline,
      visualizationRequested: store.visualizationRequested,
      activeTab: store.activeTab,
      selectedItemId: store.selectedGraphItemId,
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
    entityFilter: store.entityFilter,
    relationFilter: store.relationFilter,
    limit: store.limit,
    start: store.start,
    end: store.end,
    autoRotate: store.autoRotate,
    visible: store.visible,
    minimized: store.minimized,
    hoveredNodeId: store.hoveredNodeId,
    selectedGraphItemId: store.selectedGraphItemId,
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
    resetRebuildGraph,
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
    clearGraphFilters,
    selectGraphItem,
    clearGraphError: () => store.setError(null),
    loadGraph,
    searchGraph,
    refreshGraph,
    openGraph,
    closeGraph,
    toggleMinimize,
    hoverNode,
    selectNode,
    selectEdge,
    focusOnChat,
    focusOnGraphFromSearch,
    setKeyword: store.setKeyword,
    setTimeWindow: store.setTimeWindow,
    setActiveTab: store.setActiveTab,
    toggleAutoRotate: store.toggleAutoRotate,
    reset: store.reset,
  };
}

function usableGraphQADraft(draft?: GraphQADraft): GraphQADraft | null {
  return draft && typeof draft.query === "string" ? draft : null;
}

function graphRequestParams(overrides: VisualizeParams = {}) {
  const state = useGraphStore.getState();
  return {
    keyword: overrides.keyword ?? (state.keyword || undefined),
    window: overrides.window ?? (state.timeWindow || undefined),
    start: overrides.start ?? (state.start || undefined),
    end: overrides.end ?? (state.end || undefined),
    limit: overrides.limit ?? state.limit,
    entity: state.entityFilter || undefined,
    relation: state.relationFilter || undefined,
  };
}
