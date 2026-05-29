import { create } from "zustand";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_DEFAULTS } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_STORAGE_KEY } from "@/utils/constants";

export function migrateSettings(raw: unknown): Partial<SettingsState> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { dataKey, ...rest } = source;
  return rest as Partial<SettingsState>;
}

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
  togglePrivacy: () => void;
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
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const cleaned = migrateSettings(parsed);
        set({
          settings: { ...SETTINGS_DEFAULTS, ...cleaned },
          loaded: true,
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
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(get().settings));
    } catch {
      // storage full or unavailable
    }
  },

  reset: () => set({ settings: { ...SETTINGS_DEFAULTS }, activeCategory: "data", loaded: true }),

  togglePrivacy: () => {
    set((state) => {
      const newSettings = { ...state.settings, privacyOn: !state.settings.privacyOn };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch {
        // storage full or unavailable
      }
      return { settings: newSettings };
    });
  },
}));
