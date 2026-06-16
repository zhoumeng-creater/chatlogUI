import { useCallback, useEffect, useLayoutEffect } from "react";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import type { SettingsCategory, SettingsState } from "@/l2-coordinator/api-docs/settings";
import { sanitizeSettingsForStorage, validateSettingsPatch } from "./settingsValidation";
import { settingsMessagesZhCN } from "./messages.zh-CN";

export function useSettingsCommander() {
  const settings = useSettingsStore((s) => s.settings);
  const activeCategory = useSettingsStore((s) => s.activeCategory);
  const loaded = useSettingsStore((s) => s.loaded);
  const saveStatus = useSettingsStore((s) => s.saveStatus);
  const saveMessage = useSettingsStore((s) => s.saveMessage);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);
  const setStoreActiveCategory = useSettingsStore((s) => s.setActiveCategory);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const saveToStorage = useSettingsStore((s) => s.saveToStorage);
  const setSaveFeedback = useSettingsStore((s) => s.setSaveFeedback);
  const resetStore = useSettingsStore((s) => s.reset);

  useEffect(() => {
    if (!loaded) {
      loadFromStorage();
    }
  }, [loaded, loadFromStorage]);

  const setActiveCategory = useCallback((category: SettingsCategory) => {
    setStoreActiveCategory(category);
  }, [setStoreActiveCategory]);

  const updateAndSave = useCallback((partial: Partial<SettingsState>) => {
    const validation = validateSettingsPatch(partial);
    if (!validation.valid) {
      setSaveFeedback("error", validation.errors.join(" "));
      return;
    }

    setSaveFeedback("saving", settingsMessagesZhCN.settings.save.saving);
    updateSettings(sanitizeSettingsForStorage(partial as Record<string, unknown>));
    const saved = saveToStorage();
    if (saved) {
      setSaveFeedback("saved", settingsMessagesZhCN.settings.save.saved);
      return;
    }
    setSaveFeedback("error", settingsMessagesZhCN.settings.save.storageError);
  }, [saveToStorage, setSaveFeedback, updateSettings]);

  const reset = useCallback(() => {
    resetStore();
    if (!saveToStorage()) {
      setSaveFeedback("error", settingsMessagesZhCN.settings.save.storageError);
    }
  }, [resetStore, saveToStorage, setSaveFeedback]);

  return {
    settings,
    activeCategory,
    loaded,
    saveStatus,
    saveMessage,
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
