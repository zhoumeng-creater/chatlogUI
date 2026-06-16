import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WORKSPACE_PREFERENCES } from "@l2/commander/workspacePreferenceModel";
import { useWorkspacePreferenceStore, WORKSPACE_PREFERENCES_STORAGE_KEY } from "./useWorkspacePreferenceStore";

describe("useWorkspacePreferenceStore", () => {
  beforeEach(() => {
    useWorkspacePreferenceStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads safe structural preferences from storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        railMode: "collapsed",
        panelWidths: { conversationList: 360, inspector: 340 },
        lastPrimaryRoute: "analytics",
        inspectorOpen: true,
        query: "Synthetic private query",
      })),
      setItem: vi.fn(),
    });

    useWorkspacePreferenceStore.getState().loadFromStorage();

    expect(useWorkspacePreferenceStore.getState().preferences).toEqual({
      railMode: "collapsed",
      panelWidths: { conversationList: 360, inspector: 340 },
      lastPrimaryRoute: "analytics",
      inspectorOpen: true,
      selectedTab: null,
      dismissedCoachMarkIds: [],
      coachMarksPausedUntil: null,
    });
  });

  it("persists sanitized preferences and reports storage failures", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });

    useWorkspacePreferenceStore.getState().setRailMode("collapsed");
    expect(useWorkspacePreferenceStore.getState().saveToStorage()).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      WORKSPACE_PREFERENCES_STORAGE_KEY,
      expect.stringContaining('"railMode":"collapsed"'),
    );

    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("synthetic storage unavailable");
      }),
    });
    expect(useWorkspacePreferenceStore.getState().saveToStorage()).toBe(false);
  });

  it("persists dismissed coach marks without storing private context", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });

    useWorkspacePreferenceStore.getState().dismissCoachMark("privacy-mode");
    useWorkspacePreferenceStore.getState().dismissCoachMark("privacy-mode");
    useWorkspacePreferenceStore.getState().pauseCoachMarksUntil(1234);

    expect(useWorkspacePreferenceStore.getState().preferences.dismissedCoachMarkIds).toEqual(["privacy-mode"]);
    expect(useWorkspacePreferenceStore.getState().preferences.coachMarksPausedUntil).toBe(1234);
    expect(JSON.stringify(useWorkspacePreferenceStore.getState().preferences)).not.toContain("Synthetic Private");
    expect(setItem).toHaveBeenCalledWith(
      WORKSPACE_PREFERENCES_STORAGE_KEY,
      expect.stringContaining('"dismissedCoachMarkIds":["privacy-mode"]'),
    );
  });

  it("falls back to defaults when storage cannot be parsed", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "{not-json"),
      setItem: vi.fn(),
    });

    useWorkspacePreferenceStore.getState().setRailMode("collapsed");
    useWorkspacePreferenceStore.getState().loadFromStorage();

    expect(useWorkspacePreferenceStore.getState().preferences).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
    expect(useWorkspacePreferenceStore.getState().loaded).toBe(true);
  });
});
