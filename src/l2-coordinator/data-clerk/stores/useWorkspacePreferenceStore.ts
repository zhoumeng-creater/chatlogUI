import { create } from "zustand";
import type {
  PrimaryWorkspaceId,
} from "@/l2-coordinator/commander/primaryWorkspaceNavigation";
import {
  cloneDefaultWorkspacePreferences,
  sanitizeWorkspacePreferences,
  toggleWorkspaceRailMode,
  type WorkspacePanelWidths,
  type WorkspacePreferences,
  type WorkspaceRailMode,
} from "@/l2-coordinator/commander/workspacePreferenceModel";

export const WORKSPACE_PREFERENCES_STORAGE_KEY = "chatlog_alpha_workspace_preferences";

interface WorkspacePreferenceStoreData {
  preferences: WorkspacePreferences;
  loaded: boolean;
}

interface WorkspacePreferenceStoreActions {
  loadFromStorage: () => void;
  saveToStorage: () => boolean;
  setRailMode: (railMode: WorkspaceRailMode) => void;
  toggleRailMode: () => void;
  setPanelWidths: (panelWidths: Partial<WorkspacePanelWidths>) => void;
  resetPanelWidths: () => void;
  setLastPrimaryRoute: (route: PrimaryWorkspaceId) => void;
  setInspectorOpen: (open: boolean) => void;
  setSelectedTab: (tab: string | null) => void;
  reset: () => void;
}

type WorkspacePreferenceStore = WorkspacePreferenceStoreData & WorkspacePreferenceStoreActions;

export const useWorkspacePreferenceStore = create<WorkspacePreferenceStore>((set, get) => ({
  preferences: cloneDefaultWorkspacePreferences(),
  loaded: false,

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(WORKSPACE_PREFERENCES_STORAGE_KEY);
      set({
        preferences: raw
          ? sanitizeWorkspacePreferences(JSON.parse(raw) as unknown)
          : cloneDefaultWorkspacePreferences(),
        loaded: true,
      });
    } catch {
      set({
        preferences: cloneDefaultWorkspacePreferences(),
        loaded: true,
      });
    }
  },

  saveToStorage: () => {
    try {
      const preferences = sanitizeWorkspacePreferences(get().preferences);
      set({ preferences });
      localStorage.setItem(WORKSPACE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  },

  setRailMode: (railMode) => {
    set((state) => ({
      preferences: sanitizeWorkspacePreferences({
        ...state.preferences,
        railMode,
      }),
    }));
    get().saveToStorage();
  },

  toggleRailMode: () => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        railMode: toggleWorkspaceRailMode(state.preferences.railMode),
      },
    }));
    get().saveToStorage();
  },

  setPanelWidths: (panelWidths) => {
    set((state) => ({
      preferences: sanitizeWorkspacePreferences({
        ...state.preferences,
        panelWidths: {
          ...state.preferences.panelWidths,
          ...panelWidths,
        },
      }),
    }));
    get().saveToStorage();
  },

  resetPanelWidths: () => {
    set((state) => ({
      preferences: sanitizeWorkspacePreferences({
        ...state.preferences,
        panelWidths: cloneDefaultWorkspacePreferences().panelWidths,
      }),
    }));
    get().saveToStorage();
  },

  setLastPrimaryRoute: (route) => {
    set((state) => ({
      preferences: sanitizeWorkspacePreferences({
        ...state.preferences,
        lastPrimaryRoute: route,
      }),
    }));
    get().saveToStorage();
  },

  setInspectorOpen: (open) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        inspectorOpen: open,
      },
    }));
    get().saveToStorage();
  },

  setSelectedTab: (tab) => {
    set((state) => ({
      preferences: sanitizeWorkspacePreferences({
        ...state.preferences,
        selectedTab: tab,
      }),
    }));
    get().saveToStorage();
  },

  reset: () => set({
    preferences: cloneDefaultWorkspacePreferences(),
    loaded: false,
  }),
}));
