import { create } from "zustand";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_DEFAULTS } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_STORAGE_KEY } from "@/utils/constants";
import { sanitizeSettingsForStorage } from "@/l2-coordinator/commander/settingsValidation";

export function migrateSettings(raw: unknown): Partial<SettingsState> {
  if (!raw || typeof raw !== "object") return {};
  return sanitizeSettingsForStorage(raw as Record<string, unknown>);
}

export type SettingsSaveStatus = "idle" | "saving" | "saved" | "error";

interface SettingsStoreData {
  settings: SettingsState;
  activeCategory: SettingsCategory;
  loaded: boolean;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
}

interface SettingsStoreActions {
  setActiveCategory: (category: SettingsCategory) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => boolean;
  setSaveFeedback: (status: SettingsSaveStatus, message?: string | null) => void;
  reset: () => void;
  togglePrivacy: () => void;
}

type SettingsStore = SettingsStoreData & SettingsStoreActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...SETTINGS_DEFAULTS },
  activeCategory: "data",
  loaded: false,
  saveStatus: "idle",
  saveMessage: null,

  setActiveCategory: (category: SettingsCategory) => set({ activeCategory: category }),

  updateSettings: (partial: Partial<SettingsState>) =>
    set((state) => ({
      settings: { ...state.settings, ...sanitizeSettingsForStorage(partial as Record<string, unknown>) },
    })),

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        set({
          settings: normalizeSettingsState(parsed),
          loaded: true,
          activeCategory: "data",
        });
      } else {
        set({ loaded: true, activeCategory: "data" });
      }
    } catch {
      set({ loaded: true, activeCategory: "data" });
    }
  },

  saveToStorage: () => {
    try {
      const settings = normalizeSettingsState(get().settings as unknown as Record<string, unknown>);
      set({ settings });
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      // storage full or unavailable
      return false;
    }
  },

  setSaveFeedback: (status, message = null) => set({ saveStatus: status, saveMessage: message }),

  reset: () => set({
    settings: { ...SETTINGS_DEFAULTS },
    activeCategory: "data",
    loaded: true,
    saveStatus: "idle",
    saveMessage: null,
  }),

  togglePrivacy: () => {
    set((state) => {
      const newSettings = normalizeSettingsState({
        ...(state.settings as unknown as Record<string, unknown>),
        privacyOn: !state.settings.privacyOn,
      });
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // storage full or unavailable
      }
      return { settings: newSettings };
    });
  },
}));

function normalizeSettingsState(input: Record<string, unknown>): SettingsState {
  return {
    ...SETTINGS_DEFAULTS,
    ...sanitizeSettingsForStorage(input),
  };
}
