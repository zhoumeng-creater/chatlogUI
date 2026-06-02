import { create } from "zustand";
import type {
  DiagnosticEvent,
  DiagnosticEventLevel,
  DiagnosticEventPrivacy,
  DiagnosticEventSource,
} from "@l4/network/diagnosticEvents";
import { limitDiagnosticEvents } from "@l4/network/diagnosticEvents";

const MAX_DIAGNOSTIC_EVENTS = 1000;

export type DiagnosticSourceFilter = "all" | DiagnosticEventSource | "sidecar";
export type DiagnosticLevelFilter = "all" | DiagnosticEventLevel;
export type DiagnosticPrivacyFilter = "all" | DiagnosticEventPrivacy;
export type DiagnosticEndpointFamilyFilter = "all" | string;
export type DiagnosticTimeRangeFilter = "all" | "last15m" | "last1h" | "session";

export interface DiagnosticEventFilters {
  source: DiagnosticSourceFilter;
  level: DiagnosticLevelFilter;
  privacy: DiagnosticPrivacyFilter;
  endpointFamily: DiagnosticEndpointFamilyFilter;
  failedOnly: boolean;
  timeRange: DiagnosticTimeRangeFilter;
}

export interface DiagnosticEventState {
  items: DiagnosticEvent[];
  filters: DiagnosticEventFilters;
}

export interface DiagnosticEventActions {
  addEvent: (event: DiagnosticEvent) => void;
  addEvents: (events: DiagnosticEvent[]) => void;
  clear: () => void;
  setFilters: (filters: Partial<DiagnosticEventFilters>) => void;
}

type DiagnosticEventStore = DiagnosticEventState & DiagnosticEventActions;

export const useDiagnosticEventStore = create<DiagnosticEventStore>((set) => ({
  items: [],
  filters: {
    source: "all",
    level: "all",
    privacy: "all",
    endpointFamily: "all",
    failedOnly: false,
    timeRange: "all",
  },

  addEvent: (event) =>
    set((state) => ({
      items: limitDiagnosticEvents([...state.items, event], MAX_DIAGNOSTIC_EVENTS),
    })),

  addEvents: (events) =>
    set((state) => ({
      items: limitDiagnosticEvents(
        [...state.items, ...events],
        MAX_DIAGNOSTIC_EVENTS,
      ),
    })),

  clear: () => set({ items: [] }),

  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
}));
