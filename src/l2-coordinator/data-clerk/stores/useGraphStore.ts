import { create } from "zustand";
import type { EntityKind, VisualizeResult } from "@/l2-coordinator/api-docs/graph";
import type {
  GraphActionResult,
  GraphLoadStatus,
  GraphStatusView,
  GraphTimelineView,
  GraphVisualizeView,
} from "@/l4-atom/network/graphAdapters";

interface GraphState {
  data: VisualizeResult | null;
  loadStatus: GraphLoadStatus;
  statusSummary: GraphStatusView | null;
  visualize: GraphVisualizeView | null;
  timeline: GraphTimelineView | null;
  actionStatus: GraphActionResult | null;
  visualizationRequested: boolean;
  loading: boolean;
  error: string | null;
  keyword: string;
  timeWindow: string;
  autoRotate: boolean;
  visible: boolean;
  minimized: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  pulsedNodeId: string | null;
  tooltipCoord: { x: number; y: number } | null;
  visibleEntityKinds: EntityKind[];
  layoutMode: "force" | "radial";
  timelineVisible: boolean;
  highlightedTimelineId: string | null;
}

interface GraphActions {
  setData: (data: VisualizeResult) => void;
  setLoadStatus: (status: GraphLoadStatus) => void;
  setStatusSummary: (status: GraphStatusView | null) => void;
  setVisualize: (visualize: GraphVisualizeView | null) => void;
  setTimeline: (timeline: GraphTimelineView | null) => void;
  setActionStatus: (status: GraphActionResult | null) => void;
  setVisualizationRequested: (requested: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setKeyword: (keyword: string) => void;
  setTimeWindow: (window: string) => void;
  toggleAutoRotate: () => void;
  setVisible: (visible: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) => void;
  setSelectedNode: (id: string | null) => void;
  setPulsedNode: (id: string | null) => void;
  setVisibleEntityKinds: (kinds: EntityKind[]) => void;
  setLayoutMode: (mode: "force" | "radial") => void;
  setTimelineVisible: (visible: boolean) => void;
  setHighlightedTimeline: (id: string | null) => void;
  reset: () => void;
}

type GraphStore = GraphState & GraphActions;

const initialState: GraphState = {
  data: null,
  loadStatus: "idle",
  statusSummary: null,
  visualize: null,
  timeline: null,
  actionStatus: null,
  visualizationRequested: false,
  loading: false,
  error: null,
  keyword: "",
  timeWindow: "",
  autoRotate: true,
  visible: false,
  minimized: false,
  hoveredNodeId: null,
  selectedNodeId: null,
  pulsedNodeId: null,
  tooltipCoord: null,
  visibleEntityKinds: ["person","organization","project","product","group","topic","keyword","event","unknown"],
  layoutMode: "force",
  timelineVisible: false,
  highlightedTimelineId: null,
};

export const useGraphStore = create<GraphStore>((set) => ({
  ...initialState,

  setData: (data: VisualizeResult) => set({ data, loading: false, error: null, loadStatus: "loaded" }),

  setLoadStatus: (loadStatus: GraphLoadStatus) => set({ loadStatus }),

  setStatusSummary: (statusSummary: GraphStatusView | null) => set({ statusSummary }),

  setVisualize: (visualize: GraphVisualizeView | null) =>
    set({
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
    }),

  setTimeline: (timeline: GraphTimelineView | null) => set({ timeline }),

  setActionStatus: (actionStatus: GraphActionResult | null) => set({ actionStatus }),

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

  setHoveredNode: (id: string | null, coord?: { x: number; y: number }) =>
    set({ hoveredNodeId: id, tooltipCoord: id ? (coord ?? null) : null }),

  setSelectedNode: (id: string | null) => set({ selectedNodeId: id }),

  setPulsedNode: (id: string | null) => set({ pulsedNodeId: id }),

  setVisibleEntityKinds: (kinds: EntityKind[]) => set({ visibleEntityKinds: kinds }),
  setLayoutMode: (layoutMode: "force" | "radial") => set({ layoutMode }),
  setTimelineVisible: (timelineVisible: boolean) => set({ timelineVisible }),
  setHighlightedTimeline: (highlightedTimelineId: string | null) => set({ highlightedTimelineId }),

  reset: () => set(initialState),
}));
