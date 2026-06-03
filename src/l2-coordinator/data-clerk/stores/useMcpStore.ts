import { create } from "zustand";
import type { McpInventory } from "@l4/network";

export type McpLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type McpRouteCheckStatus = "available" | "unknown" | "error";

export interface McpSmokeResult {
  route: "/mcp" | "/sse" | "/message";
  status: McpRouteCheckStatus;
  checkedAt: string;
}

export interface McpStoreState {
  status: McpLoadStatus;
  inventory: McpInventory | null;
  smokeStatus: McpLoadStatus;
  smokeResult: McpSmokeResult | null;
  error: string | null;
}

interface McpStoreActions {
  setInventoryLoading: () => void;
  setInventory: (inventory: McpInventory) => void;
  setInventoryError: (error: string) => void;
  setSmokeLoading: () => void;
  setSmokeResult: (result: McpSmokeResult) => void;
  setSmokeError: (error: string) => void;
  reset: () => void;
}

export type McpStoreSnapshot = McpStoreState;
export type McpStore = McpStoreState & McpStoreActions;

const initialState: McpStoreState = {
  status: "idle",
  inventory: null,
  smokeStatus: "idle",
  smokeResult: null,
  error: null,
};

export const useMcpStore = create<McpStore>((set) => ({
  ...initialState,
  setInventoryLoading: () => set({ status: "loading", error: null }),
  setInventory: (inventory) =>
    set({
      inventory,
      status: inventory.routes.length + inventory.tools.length + inventory.prompts.length > 0 ? "ready" : "empty",
      error: null,
    }),
  setInventoryError: (error) => set({ status: "error", error }),
  setSmokeLoading: () => set({ smokeStatus: "loading", error: null }),
  setSmokeResult: (smokeResult) => set({ smokeResult, smokeStatus: "ready", error: null }),
  setSmokeError: (error) => set({ smokeStatus: "error", error }),
  reset: () => set(initialState),
}));
