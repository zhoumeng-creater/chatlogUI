import { create } from "zustand";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_DEFAULTS } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_STORAGE_KEY } from "@/utils/constants";

interface SettingsStoreData {
  settings: SettingsState;
  activeCategory: SettingsCategory;
  loaded: boolean;
}

interface SettingsStoreActions {
  setActiveCategory: (category: SettingsCategory) => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  reset: () => void;
}

type SettingsStore = SettingsStoreData & SettingsStoreActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...SETTINGS_DEFAULTS },
  activeCategory: "ai",
  loaded: false,

  setActiveCategory: (category: SettingsCategory) => set({ activeCategory: category }),

  updateSettings: (partial: Partial<SettingsState>) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        set({
          settings: { ...SETTINGS_DEFAULTS, ...parsed },
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveToStorage: () => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(get().settings));
    } catch {
      // storage full or unavailable
    }
  },

  reset: () => set({ settings: { ...SETTINGS_DEFAULTS }, activeCategory: "ai", loaded: true }),
}));
