import { create } from "zustand";
import type { AppState, AppActions, AppPhase, SidecarStatus, DbStatus } from "../types/app";
import { SIDECAR_PORT } from "@/utils/constants";

const initialState: AppState = {
  appPhase: "idle",
  errorMessage: null,
  sidecarStatus: "stopped",
  portNumber: SIDECAR_PORT,
  engineVersion: null,
  dbStatus: "disconnected",
  wxDataPath: null,
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,
  setPhase: (phase: AppPhase) => set({ appPhase: phase }),
  setError: (message: string) =>
    set({ appPhase: "error", errorMessage: message, sidecarStatus: "error" }),
  clearError: () => set({ errorMessage: null }),
  setSidecarStatus: (status: SidecarStatus) => set({ sidecarStatus: status }),
  setEngineVersion: (version: string) => set({ engineVersion: version }),
  setDbStatus: (status: DbStatus) => set({ dbStatus: status }),
  setWxDataPath: (path: string | null) => set({ wxDataPath: path }),
  reset: () =>
    set((state) => ({
      ...initialState,
      sidecarStatus: state.sidecarStatus,
    })),
}));
