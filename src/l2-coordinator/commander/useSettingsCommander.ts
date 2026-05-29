import { useCallback, useEffect, useLayoutEffect } from "react";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";

export function useSettingsCommander() {
  const store = useSettingsStore();

  useEffect(() => {
    if (!store.loaded) {
      store.loadFromStorage();
    }
  }, [store.loaded, store]);

  const setActiveCategory = useCallback((category: SettingsCategory) => {
    store.setActiveCategory(category);
  }, [store]);

  const updateAndSave = useCallback((partial: Partial<SettingsState>) => {
    store.updateSettings(partial);
    store.saveToStorage();
  }, [store]);

  const reset = useCallback(() => {
    store.reset();
    store.saveToStorage();
  }, [store]);

  return {
    settings: store.settings,
    activeCategory: store.activeCategory,
    loaded: store.loaded,
    setActiveCategory,
    updateAndSave,
    reset,
  };
}

export function useSettingsBootstrap() {
  const loaded = useSettingsStore((s) => s.loaded);

  useLayoutEffect(() => {
    if (!useSettingsStore.getState().loaded) {
      useSettingsStore.getState().loadFromStorage();
    }
  }, [loaded]);
}
