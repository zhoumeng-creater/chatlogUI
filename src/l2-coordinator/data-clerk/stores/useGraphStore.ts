import { create } from "zustand";
import type { EntityKind, VisualizeResult } from "@/l2-coordinator/api-docs/graph";
import type {
  GraphActionResult,
  GraphQueryView,
  GraphLoadStatus,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";
import type { GraphWorkbenchTabId } from "@/l2-coordinator/commander/graphViewModel";
import type {
  GraphBusinessDraft,
  GraphConfigDraft,
  GraphConfigView,
  GraphEventDraft,
  GraphIngestResult,
  GraphQADraft,
  GraphQAResponseView,
} from "@l4/network";
import type { GraphResidualLoadStatus } from "@/l2-coordinator/commander/graphResidualViewModel";

export type GraphAdvancedConfirmation = "business" | "event" | "qa" | "reset";

interface GraphFilterPatch {
  keyword?: string;
  timeWindow?: string;
  entityFilter?: string;
  relationFilter?: string;
  limit?: number;
  start?: string;
  end?: string;
}

interface GraphState {
  data: VisualizeResult | null;
  loadStatus: GraphLoadStatus;
  statusSummary: GraphStatusView | null;
  query: GraphQueryView | null;
  visualize: GraphVisualizeView | null;
  timeline: GraphTimelineView | null;
  actionStatus: GraphActionResult | null;
  activeLoadRequestId: string | null;
  activeTab: GraphWorkbenchTabId;
  visualizationRequested: boolean;
  loading: boolean;
  error: string | null;
  keyword: string;
  timeWindow: string;
  entityFilter: string;
  relationFilter: string;
  limit: number;
  start: string;
  end: string;
  autoRotate: boolean;
  visible: boolean;
  minimized: boolean;
  selectedGraphItemId: string | null;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  pulsedNodeId: string | null;
  tooltipCoord: { x: number; y: number } | null;
  visibleEntityKinds: EntityKind[];
  layoutMode: "force" | "radial";
  timelineVisible: boolean;
  highlightedTimelineId: string | null;
  advancedConfigStatus: GraphResidualLoadStatus;
  ingestStatus: GraphResidualLoadStatus;
  qaStatus: GraphResidualLoadStatus;
  advancedConfig: GraphConfigView | null;
  graphConfigDraft: GraphConfigDraft;
  businessDraft: GraphBusinessDraft;
  eventDraft: GraphEventDraft;
  qaDraft: GraphQADraft;
  ingestResult: GraphIngestResult | null;
  qaResult: GraphQAResponseView | null;
  advancedConfirmationPending: GraphAdvancedConfirmation | null;
  advancedConfigError: string | null;
  ingestError: string | null;
  qaError: string | null;
}

interface GraphActions {
  setData: (data: VisualizeResult) => void;
  setLoadStatus: (status: GraphLoadStatus) => void;
  setStatusSummary: (status: GraphStatusView | null) => void;
  setQuery: (query: GraphQueryView | null) => void;
  setVisualize: (visualize: GraphVisualizeView | null) => void;
  setTimeline: (timeline: GraphTimelineView | null) => void;
  setActionStatus: (status: GraphActionResult | null) => void;
  startGraphLoadRequest: (requestId: string) => void;
  completeGraphVisualizeRequest: (requestId: string, visualize: GraphVisualizeView) => boolean;
  completeGraphSummaryRequest: (requestId: string, payload: {
    statusSummary: GraphStatusView | null;
    query: GraphQueryView;
    visualize: GraphVisualizeView;
    timeline: GraphTimelineView;
  }) => boolean;
  failGraphLoadRequest: (requestId: string, error: string) => boolean;
  cancelGraphLoadRequest: () => void;
  setActiveTab: (tab: GraphWorkbenchTabId) => void;
  setGraphFilters: (filters: GraphFilterPatch) => void;
  clearGraphFilters: () => void;
  setVisualizationRequested: (requested: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setKeyword: (keyword: string) => void;
  setTimeWindow: (window: string) => void;
  toggleAutoRotate: () => void;
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setSelectedGraphItem: (id: string | null) => void;
  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) => void;
  setSelectedNode: (id: string | null) => void;
  setPulsedNode: (id: string | null) => void;
  setVisibleEntityKinds: (kinds: EntityKind[]) => void;
  setLayoutMode: (mode: "force" | "radial") => void;
  setTimelineVisible: (visible: boolean) => void;
  setHighlightedTimeline: (id: string | null) => void;
  setAdvancedConfigLoading: () => void;
  setAdvancedConfig: (config: GraphConfigView) => void;
  setAdvancedConfigError: (error: string) => void;
  updateGraphConfigDraft: (draft: Partial<GraphConfigDraft>) => void;
  updateBusinessDraft: (draft: Partial<GraphBusinessDraft>) => void;
  updateEventDraft: (draft: Partial<GraphEventDraft>) => void;
  updateQADraft: (draft: Partial<GraphQADraft>) => void;
  setIngestLoading: () => void;
  setIngestResult: (result: GraphIngestResult) => void;
  setIngestError: (error: string) => void;
  setQALoading: () => void;
  setQAResult: (result: GraphQAResponseView) => void;
  setQAError: (error: string) => void;
  requestAdvancedConfirmation: (action: GraphAdvancedConfirmation) => void;
  cancelAdvancedConfirmation: () => void;
  reset: () => void;
}

type GraphStore = GraphState & GraphActions;

const initialState: GraphState = {
  data: null,
  loadStatus: "idle",
  statusSummary: null,
  query: null,
  visualize: null,
  timeline: null,
  actionStatus: null,
  activeLoadRequestId: null,
  activeTab: "overview",
  visualizationRequested: false,
  loading: false,
  error: null,
  keyword: "",
  timeWindow: "",
  entityFilter: "",
  relationFilter: "",
  limit: 80,
  start: "",
  end: "",
  autoRotate: true,
  visible: false,
  minimized: false,
  selectedGraphItemId: null,
  hoveredNodeId: null,
  selectedNodeId: null,
  pulsedNodeId: null,
  tooltipCoord: null,
  visibleEntityKinds: ["person","organization","project","product","group","topic","keyword","event","unknown"],
  layoutMode: "force",
  timelineVisible: false,
  highlightedTimelineId: null,
  advancedConfigStatus: "idle",
  ingestStatus: "idle",
  qaStatus: "idle",
  advancedConfig: null,
  graphConfigDraft: { workers: 1, enqueueWorkers: 1 },
  businessDraft: {
    source: "",
    type: "business",
    time: "",
    title: "",
    content: "",
    entities: "",
  },
  eventDraft: {
    eventType: "event",
    time: "",
    actors: "",
    targets: "",
    content: "",
  },
  qaDraft: {
    query: "",
    window: "",
    start: "",
    end: "",
  },
  ingestResult: null,
  qaResult: null,
  advancedConfirmationPending: null,
  advancedConfigError: null,
  ingestError: null,
  qaError: null,
};

export const useGraphStore = create<GraphStore>((set) => ({
  ...initialState,

  setData: (data: VisualizeResult) => set({ data, loading: false, error: null, loadStatus: "loaded" }),

  setLoadStatus: (loadStatus: GraphLoadStatus) => set({ loadStatus }),

  setStatusSummary: (statusSummary: GraphStatusView | null) => set({ statusSummary }),

  setQuery: (query: GraphQueryView | null) => set({ query }),

  setVisualize: (visualize: GraphVisualizeView | null) => set(graphVisualizePatch(visualize)),

  setTimeline: (timeline: GraphTimelineView | null) => set({ timeline }),

  setActionStatus: (actionStatus: GraphActionResult | null) => set({ actionStatus }),

  startGraphLoadRequest: (activeLoadRequestId) =>
    set({ activeLoadRequestId, loading: true, error: null, loadStatus: "loading" }),

  completeGraphVisualizeRequest: (requestId, visualize) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return {
        ...graphVisualizePatch(visualize),
        loading: false,
        error: null,
        activeLoadRequestId: null,
      };
    });
    return applied;
  },

  completeGraphSummaryRequest: (requestId, payload) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return {
        statusSummary: payload.statusSummary,
        query: payload.query,
        timeline: payload.timeline,
        ...graphVisualizePatch(payload.visualize),
        loading: false,
        error: null,
        activeLoadRequestId: null,
      };
    });
    return applied;
  },

  failGraphLoadRequest: (requestId, error) => {
    let applied = false;
    set((state) => {
      if (state.activeLoadRequestId !== requestId) return state;
      applied = true;
      return { error, loading: false, loadStatus: "error", activeLoadRequestId: null };
    });
    return applied;
  },

  cancelGraphLoadRequest: () =>
    set({ loading: false, loadStatus: "cancelled", activeLoadRequestId: null }),

  setActiveTab: (activeTab: GraphWorkbenchTabId) => set({ activeTab }),

  setGraphFilters: (filters: GraphFilterPatch) =>
    set((state) => ({
      keyword: filters.keyword ?? state.keyword,
      timeWindow: filters.timeWindow ?? state.timeWindow,
      entityFilter: filters.entityFilter ?? state.entityFilter,
      relationFilter: filters.relationFilter ?? state.relationFilter,
      limit: filters.limit ?? state.limit,
      start: filters.start ?? state.start,
      end: filters.end ?? state.end,
    })),

  clearGraphFilters: () =>
    set({
      keyword: "",
      timeWindow: "",
      entityFilter: "",
      relationFilter: "",
      limit: 80,
      start: "",
      end: "",
    }),

  setVisualizationRequested: (visualizationRequested: boolean) => set({ visualizationRequested }),

  setLoading: (loading: boolean) => set({ loading, loadStatus: loading ? "loading" : "idle" }),

  setError: (error: string | null) =>
    set({ error, loading: false, loadStatus: error ? "error" : "idle" }),

  setKeyword: (keyword: string) => set({ keyword }),

  setTimeWindow: (timeWindow: string) => set({ timeWindow }),

  toggleAutoRotate: () =>
    set((state) => ({ autoRotate: !state.autoRotate })),

  setVisible: (visible: boolean) => set({ visible }),

  setMinimized: (minimized: boolean) => set({ minimized }),

  setSelectedGraphItem: (selectedGraphItemId: string | null) => set({ selectedGraphItemId }),

  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) =>
    set({ hoveredNodeId: id, tooltipCoord: id ? (coord ?? null) : null }),

  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),

  setPulsedNode: (id: string | null) => set({ pulsedNodeId: id }),

  setVisibleEntityKinds: (kinds: EntityKind[]) => set({ visibleEntityKinds: kinds }),
  setLayoutMode: (layoutMode: "force" | "radial") => set({ layoutMode }),
  setTimelineVisible: (timelineVisible: boolean) => set({ timelineVisible }),
  setHighlightedTimeline: (highlightedTimelineId: string | null) => set({ highlightedTimelineId }),
  setAdvancedConfigLoading: () => set({ advancedConfigStatus: "loading", advancedConfigError: null }),
  setAdvancedConfig: (advancedConfig) =>
    set({
      advancedConfig,
      advancedConfigStatus: "ready",
      graphConfigDraft: {
        workers: advancedConfig.workers,
        enqueueWorkers: advancedConfig.enqueueWorkers,
      },
      advancedConfigError: null,
    }),
  setAdvancedConfigError: (advancedConfigError) =>
    set({ advancedConfigStatus: "error", advancedConfigError }),
  updateGraphConfigDraft: (draft) =>
    set((state) => ({ graphConfigDraft: { ...state.graphConfigDraft, ...draft } })),
  updateBusinessDraft: (draft) =>
    set((state) => ({ businessDraft: { ...state.businessDraft, ...draft } })),
  updateEventDraft: (draft) =>
    set((state) => ({ eventDraft: { ...state.eventDraft, ...draft } })),
  updateQADraft: (draft) =>
    set((state) => ({ qaDraft: { ...state.qaDraft, ...draft } })),
  setIngestLoading: () =>
    set({ ingestStatus: "loading", ingestError: null, advancedConfirmationPending: null }),
  setIngestResult: (ingestResult) =>
    set({ ingestResult, ingestStatus: "ready", ingestError: null, advancedConfirmationPending: null }),
  setIngestError: (ingestError) =>
    set({ ingestStatus: "error", ingestError, advancedConfirmationPending: null }),
  setQALoading: () => set({ qaStatus: "loading", qaError: null, advancedConfirmationPending: null }),
  setQAResult: (qaResult) => set({ qaResult, qaStatus: "ready", qaError: null, advancedConfirmationPending: null }),
  setQAError: (qaError) => set({ qaStatus: "error", qaError, advancedConfirmationPending: null }),
  requestAdvancedConfirmation: (advancedConfirmationPending) =>
    set({ advancedConfirmationPending, ingestError: null, qaError: null }),
  cancelAdvancedConfirmation: () => set({ advancedConfirmationPending: null }),

  reset: () => set(initialState),
}));

function graphVisualizePatch(visualize: GraphVisualizeView | null): Pick<GraphState, "visualize" | "loadStatus" | "data"> {
  return {
    visualize,
    loadStatus: visualize?.state ?? "idle",
    data:
      visualize?.state === "loaded"
        ? {
            nodes: visualize.nodes as VisualizeResult["nodes"],
            edges: visualize.edges as VisualizeResult["edges"],
            timeline: visualize.timelineRows as VisualizeResult["timeline"],
            generated_at: visualize.generatedAt,
          }
        : null,
  };
}
