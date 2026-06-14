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
import { formatGraphFailureMessage } from "./graphErrorDisplay";
import { createGraphExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import { buildGraphControlModel } from "./graphControlModel";
import {
  buildGraphCommanderContext,
  buildGraphContextSummary,
  type GraphAppliedRequest,
  type GraphCommanderContextInput,
} from "./graphContextSummaryModel";

function graphDiagnostics(method: "GET" | "POST" = "GET") {
  return createDiagnosticHttpOptions({
    endpointFamily: "graph",
    method,
    recoveryHint: "retry",
  });
}

let graphLoadSequence = 0;
let graphChildSequence = 0;

function nextGraphLoadRequestId(): string {
  graphLoadSequence += 1;
  return `graph-load-${graphLoadSequence}`;
}

function nextGraphChildRequestId(prefix: string): string {
  graphChildSequence += 1;
  return `${prefix}-${graphChildSequence}`;
}

export function useGraphCommander(routeContext?: Omit<GraphCommanderContextInput, "privacyOn">) {
  const store = useGraphStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const draftGraphRequest = graphDraftRequest(store);
  const commanderContext = buildGraphCommanderContext({
    routeSource: routeContext?.routeSource,
    sourceLabel: routeContext?.sourceLabel,
    focusLabel: routeContext?.focusLabel,
    scopeLabel: routeContext?.scopeLabel,
    privacyOn,
  });
  const contextSummary = buildGraphContextSummary({
    loadStatus: store.loadStatus,
    statusSummary: store.statusSummary,
    query: store.query,
    visualize: store.visualize,
    timeline: store.timeline,
    appliedRequest: store.appliedGraphRequest,
    draftRequest: draftGraphRequest,
    source: commanderContext.source,
    lastLoadedAt: store.lastLoadedAt,
    lastRefreshedAt: store.lastRefreshedAt,
    privacyOn,
  });
  const exportDisabledReason = getGraphExportDisabledReason(
    store.loadStatus,
    store.query,
    store.timeline,
    store.visualize,
  );
  const businessExport = useBusinessExportCommander({
    source: "graph",
    formats: ["csv", "json", "markdown"],
    defaultFormat: "csv",
    disabledReason: exportDisabledReason,
    buildArtifact: ({ format, privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createGraphExportArtifact({
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: commanderContext.scopeSummary,
        filterSummary: contextSummary.filterChips,
        sourceSummary: contextSummary.sourceLabel,
        graphGeneratedAt: store.lastGeneratedAt ?? "",
        refreshedAt: store.lastRefreshedAt ?? "",
        freshnessState: contextSummary.freshnessState,
        partialWarnings: contextSummary.warnings,
        entities: store.query?.entities.map((entity) => ({
          id: entity.id,
          label: entity.label,
          type: entity.type,
          mentions: entity.mentions,
        })) ?? [],
        relations: store.query?.relations.map((relation) => ({
          id: relation.id,
          subject: relation.subject,
          predicate: relation.predicate,
          object: relation.object,
          status: relation.status,
          evidenceCount: relation.evidenceCount,
        })) ?? [],
        events: store.query?.events.map((event) => ({
          id: event.id,
          label: event.label,
          type: event.type,
          time: event.timeLabel,
          source: event.sourceLabel,
          evidenceCount: numberDetail(event.detailRows, "证据数量"),
        })) ?? [],
        facts: store.query?.facts.map((fact) => ({
          id: fact.id,
          label: fact.label,
          status: fact.status,
          evidenceCount: fact.evidenceCount,
        })) ?? [],
        timelineRows: store.timeline?.rows.map((row, index) => ({
          id: `timeline-${index}`,
          time: formatGraphTimelineTime(row.time),
          type: row.type,
          title: row.title,
          description: row.description,
          source: row.source,
        })) ?? store.visualize?.timelineRows.map((row, index) => ({
          id: `timeline-${index}`,
          time: formatGraphTimelineTime(row.time),
          type: row.type,
          title: row.title,
          description: row.description,
          source: row.source,
        })) ?? [],
        visualNodes: store.visualize?.nodes.map((node) => ({
          id: node.id,
          label: node.label || node.name,
          kind: node.kind,
        })) ?? [],
        visualEdges: store.visualize?.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          evidenceCount: edge.evidence_count,
        })) ?? [],
      }),
  });

  const loadGraph = useCallback(async (params: VisualizeParams = {}) => {
    const requestId = nextGraphLoadRequestId();
    useGraphStore.getState().startGraphLoadRequest(requestId);
    try {
      const data = await fetchGraphVisualize(params, graphDiagnostics());
      useGraphStore.getState().completeGraphVisualizeRequest(requestId, data as unknown as GraphVisualizeView);
    } catch (error) {
      useGraphStore.getState().failGraphLoadRequest(
        requestId,
        formatGraphFailureMessage(error, "加载图谱数据失败"),
      );
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const requestId = nextGraphChildRequestId("graph-status");
    useGraphStore.getState().startGraphStatusRequest(requestId);
    try {
      const status = await fetchGraphStatus(graphDiagnostics());
      useGraphStore.getState().completeGraphStatusRequest(requestId, status as unknown as GraphStatusView | null);
    } catch (error) {
      useGraphStore.getState().failGraphStatusRequest(
        requestId,
        formatGraphFailureMessage(error, "图谱状态查询失败"),
      );
    }
  }, []);

  const loadGraphTimeline = useCallback(async (params: VisualizeParams = {}) => {
    const requestId = nextGraphChildRequestId("graph-timeline");
    useGraphStore.getState().startGraphTimelineRequest(requestId);
    try {
      const timeline = await fetchGraphTimeline(params, graphDiagnostics());
      useGraphStore.getState().completeGraphTimelineRequest(requestId, timeline);
    } catch {
      useGraphStore.getState().failGraphTimelineRequest(requestId);
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
      const refreshedAt = new Date().toISOString();
      useGraphStore.getState().completeGraphSummaryRequest(requestId, {
        statusSummary: status as unknown as GraphStatusView | null,
        query: query as unknown as GraphQueryView,
        visualize: visualize as unknown as GraphVisualizeView,
        timeline,
        appliedRequest: requestParams,
        loadedAt: refreshedAt,
        refreshedAt,
        summaryReason: "manual-refresh",
      });
    } catch (error) {
      useGraphStore.getState().failGraphLoadRequest(
        requestId,
        formatGraphFailureMessage(error, "加载图谱摘要失败"),
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
    const requestId = nextGraphChildRequestId(`graph-action-${action}`);
    useGraphStore.getState().startGraphActionRequest(requestId);
    try {
      const result = await manageGraph(action, graphDiagnostics("POST"));
      const applied = useGraphStore.getState().completeGraphActionRequest(requestId, result);
      if (applied && (action === "reset-rebuild" || action === "rebuild")) {
        useGraphStore.getState().cancelAdvancedConfirmation();
      }
      if (applied) {
        await refreshStatus();
      }
    } catch (error) {
      useGraphStore.getState().failGraphActionRequest(
        requestId,
        formatGraphFailureMessage(error, `图谱操作 ${action} 失败`),
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

  const rebuildGraph = useCallback(async () => {
    if (useGraphStore.getState().advancedConfirmationPending !== "rebuild") {
      useGraphStore.getState().requestAdvancedConfirmation("rebuild");
      return;
    }
    await runGraphAction("rebuild");
  }, [runGraphAction]);

  const loadGraphConfig = useCallback(async () => {
    const requestId = nextGraphChildRequestId("graph-config");
    useGraphStore.getState().startGraphConfigRequest(requestId);
    try {
      const config = await fetchGraphConfig(graphDiagnostics());
      useGraphStore.getState().completeGraphConfigRequest(requestId, config);
    } catch (error) {
      useGraphStore.getState().failGraphConfigRequest(
        requestId,
        formatGraphFailureMessage(error, "加载图谱高级配置失败"),
      );
    }
  }, []);

  const saveGraphAdvancedConfig = useCallback(async (draft?: GraphConfigDraft) => {
    const nextDraft = draft ?? useGraphStore.getState().graphConfigDraft;
    const requestId = nextGraphChildRequestId("graph-config");
    useGraphStore.getState().startGraphConfigRequest(requestId);
    try {
      const config = await saveGraphConfig(nextDraft, graphDiagnostics("POST"));
      const applied = useGraphStore.getState().completeGraphConfigRequest(requestId, config);
      if (applied) {
        await refreshStatus();
      }
    } catch (error) {
      useGraphStore.getState().failGraphConfigRequest(
        requestId,
        formatGraphFailureMessage(error, "保存图谱高级配置失败"),
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

    const requestId = nextGraphChildRequestId("graph-ingest-business");
    useGraphStore.getState().startGraphIngestRequest(requestId);
    try {
      const result = await ingestGraphBusiness(nextDraft, graphDiagnostics("POST"));
      const applied = useGraphStore.getState().completeGraphIngestRequest(requestId, result);
      if (applied) {
        await refreshStatus();
      }
    } catch (error) {
      useGraphStore.getState().failGraphIngestRequest(
        requestId,
        formatGraphFailureMessage(error, "业务记录写入图谱失败"),
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

    const requestId = nextGraphChildRequestId("graph-ingest-event");
    useGraphStore.getState().startGraphIngestRequest(requestId);
    try {
      const result = await ingestGraphEvent(nextDraft, graphDiagnostics("POST"));
      const applied = useGraphStore.getState().completeGraphIngestRequest(requestId, result);
      if (applied) {
        await refreshStatus();
      }
    } catch (error) {
      useGraphStore.getState().failGraphIngestRequest(
        requestId,
        formatGraphFailureMessage(error, "事件记录写入图谱失败"),
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

    const requestId = nextGraphChildRequestId("graph-qa");
    useGraphStore.getState().startGraphQARequest(requestId);
    try {
      const result = await askGraphQA({ ...nextDraft, query }, graphDiagnostics("POST"));
      useGraphStore.getState().completeGraphQARequest(requestId, result);
    } catch (error) {
      useGraphStore.getState().failGraphQARequest(
        requestId,
        formatGraphFailureMessage(error, "图谱 QA 失败"),
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
    businessExport,
    controlModel: buildGraphControlModel({
      keyword: store.keyword,
      timeWindow: store.timeWindow,
      entityFilter: store.entityFilter,
      relationFilter: store.relationFilter,
      limit: store.limit,
      start: store.start,
      end: store.end,
      loading: store.loading,
      canExport: exportDisabledReason === null,
      canVisualize: store.visualize?.state === "loaded",
      canvasMounted: store.visualizationRequested,
      autoRotate: store.autoRotate,
      timelineVisible: store.timelineVisible,
      layoutMode: store.layoutMode,
    }),
    contextSummary,
    appliedGraphRequest: store.appliedGraphRequest,
    lastLoadedAt: store.lastLoadedAt,
    lastRefreshedAt: store.lastRefreshedAt,
    lastGeneratedAt: store.lastGeneratedAt,
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
    rebuildGraph,
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

function getGraphExportDisabledReason(
  loadStatus: string,
  query: GraphQueryView | null,
  timeline: { rows: unknown[] } | null,
  visualize: GraphVisualizeView | null,
): string | null {
  if (loadStatus === "loading") return "图谱加载中，完成后可导出。";
  const hasRows =
    Boolean(query && (query.entities.length || query.relations.length || query.events.length || query.facts.length)) ||
    Boolean(timeline?.rows.length) ||
    Boolean(visualize && (visualize.nodes.length || visualize.edges.length || visualize.timelineRows.length || visualize.state === "empty"));
  if (!hasRows) return "图谱摘要加载完成后可导出。";
  return null;
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
    entity: overrides.entity ?? (state.entityFilter || undefined),
    relation: overrides.relation ?? (state.relationFilter || undefined),
  };
}

function graphDraftRequest(state: {
  keyword: string;
  timeWindow: string;
  entityFilter: string;
  relationFilter: string;
  limit: number;
  start: string;
  end: string;
}): GraphAppliedRequest {
  return {
    keyword: state.keyword || undefined,
    window: state.timeWindow || undefined,
    entity: state.entityFilter || undefined,
    relation: state.relationFilter || undefined,
    limit: state.limit,
    start: state.start || undefined,
    end: state.end || undefined,
  };
}

function formatGraphTimelineTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  return new Date(seconds * 1000).toISOString();
}

function numberDetail(rows: Array<{ label: string; value: string }>, label: string): number {
  const row = rows.find((item) => item.label === label);
  const value = Number(row?.value);
  return Number.isFinite(value) ? value : 0;
}
