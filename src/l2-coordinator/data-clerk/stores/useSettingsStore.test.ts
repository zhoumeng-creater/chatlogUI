import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "./useSettingsStore";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports storage failures instead of pretending Settings were saved", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("synthetic storage unavailable");
      }),
    });

    useSettingsStore.getState().updateSettings({ theme: "dark" });

    expect(useSettingsStore.getState().saveToStorage()).toBe(false);
  });

  it("reports successful Settings persistence", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });

    useSettingsStore.getState().updateSettings({ theme: "dark" });

    expect(useSettingsStore.getState().saveToStorage()).toBe(true);
    expect(setItem).toHaveBeenCalledOnce();
  });
});
