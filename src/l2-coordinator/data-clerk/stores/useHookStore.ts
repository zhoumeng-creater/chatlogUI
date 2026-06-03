import { create } from "zustand";
import type {
  HermesStatusView,
  HookClearResult,
  HookConfigView,
  HookEventSummary,
  HookStatusView,
} from "@l4/network";

export type HookSubtab = "config" | "events" | "bridges";
export type HookLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type HookStreamStatus = "idle" | "connecting" | "streaming" | "stopped" | "error";

export interface HookStoreState {
  activeSubtab: HookSubtab;
  configStatus: HookLoadStatus;
  statusStatus: HookLoadStatus;
  eventsStatus: HookLoadStatus;
  streamStatus: HookStreamStatus;
  clearStatus: HookLoadStatus;
  config: HookConfigView | null;
  statusSummary: HookStatusView | null;
  events: HookEventSummary[];
  clearResult: HookClearResult | null;
  clearConfirmationPending: boolean;
  configError: string | null;
  statusError: string | null;
  eventsError: string | null;
  streamError: string | null;
  clearError: string | null;
}

interface HookStoreActions {
  setActiveSubtab: (tab: HookSubtab) => void;
  setConfigLoading: () => void;
  setConfig: (config: HookConfigView) => void;
  setConfigError: (error: string) => void;
  setStatusLoading: () => void;
  setStatusSummary: (status: HookStatusView) => void;
  setHermesStatus: (channel: HermesStatusView["channel"], status: HermesStatusView) => void;
  setStatusError: (error: string) => void;
  setEventsLoading: () => void;
  setEvents: (events: HookEventSummary[]) => void;
  prependStreamEvent: (event: HookEventSummary) => void;
  setEventsError: (error: string) => void;
  setStreamConnecting: () => void;
  markStreamStreaming: () => void;
  setStreamError: (error: string) => void;
  stopStream: () => void;
  requestClearConfirmation: () => void;
  cancelClearConfirmation: () => void;
  setClearLoading: () => void;
  setClearResult: (result: HookClearResult) => void;
  setClearError: (error: string) => void;
  reset: () => void;
}

export type HookStoreSnapshot = Omit<HookStoreState, "clearResult"> & {
  clearResult?: HookClearResult | null;
};
export type HookStore = HookStoreState & HookStoreActions;

const MAX_EVENTS = 100;

const initialState: HookStoreState = {
  activeSubtab: "events",
  configStatus: "idle",
  statusStatus: "idle",
  eventsStatus: "idle",
  streamStatus: "idle",
  clearStatus: "idle",
  config: null,
  statusSummary: null,
  events: [],
  clearResult: null,
  clearConfirmationPending: false,
  configError: null,
  statusError: null,
  eventsError: null,
  streamError: null,
  clearError: null,
};

export const useHookStore = create<HookStore>((set) => ({
  ...initialState,
  setActiveSubtab: (activeSubtab) => set({ activeSubtab }),
  setConfigLoading: () => set({ configStatus: "loading", configError: null }),
  setConfig: (config) => set({ config, configStatus: "ready", configError: null }),
  setConfigError: (configError) => set({ configStatus: "error", configError }),
  setStatusLoading: () => set({ statusStatus: "loading", statusError: null }),
  setStatusSummary: (statusSummary) => set({ statusSummary, statusStatus: "ready", statusError: null }),
  setHermesStatus: (channel, status) =>
    set((state) => ({
      statusSummary: state.statusSummary
        ? { ...state.statusSummary, [channel]: status }
        : state.statusSummary,
    })),
  setStatusError: (statusError) => set({ statusStatus: "error", statusError }),
  setEventsLoading: () => set({ eventsStatus: "loading", eventsError: null }),
  setEvents: (events) =>
    set({
      events: events.slice(0, MAX_EVENTS),
      eventsStatus: events.length > 0 ? "ready" : "empty",
      eventsError: null,
    }),
  prependStreamEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events.filter((item) => item.id !== event.id)].slice(0, MAX_EVENTS),
      eventsStatus: "ready",
      streamStatus: "streaming",
      streamError: null,
    })),
  setEventsError: (eventsError) => set({ eventsStatus: "error", eventsError }),
  setStreamConnecting: () => set({ streamStatus: "connecting", streamError: null }),
  markStreamStreaming: () => set({ streamStatus: "streaming", streamError: null }),
  setStreamError: (streamError) => set({ streamStatus: "error", streamError }),
  stopStream: () => set({ streamStatus: "stopped" }),
  requestClearConfirmation: () => set({ clearConfirmationPending: true, clearError: null }),
  cancelClearConfirmation: () => set({ clearConfirmationPending: false }),
  setClearLoading: () =>
    set({
      clearStatus: "loading",
      clearConfirmationPending: false,
      clearError: null,
    }),
  setClearResult: (clearResult) =>
    set({
      clearResult,
      clearStatus: "ready",
      events: [],
      eventsStatus: "empty",
      clearError: null,
      clearConfirmationPending: false,
    }),
  setClearError: (clearError) =>
    set({
      clearStatus: "error",
      clearError,
      clearConfirmationPending: false,
    }),
  reset: () => set(initialState),
}));
