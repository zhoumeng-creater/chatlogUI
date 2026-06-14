import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  getEffectiveRailMode,
  getWorkspaceRailWidth,
  sanitizeWorkspacePreferences,
  toggleWorkspaceRailMode,
} from "./workspacePreferenceModel";

describe("workspacePreferenceModel", () => {
  it("keeps only structural workspace preferences and removes private fields", () => {
    const preferences = sanitizeWorkspacePreferences({
      railMode: "collapsed",
      panelWidths: { conversationList: 420, inspector: 360 },
      lastPrimaryRoute: "graph",
      inspectorOpen: true,
      selectedTab: "summary",
      query: "Synthetic private query",
      prompt: "Synthetic prompt",
      wxid: "wxid_synthetic_private",
      messageBody: "private message",
      localPath: "E:/private/path",
      token: "secret",
    });

    expect(preferences).toEqual({
      railMode: "collapsed",
      panelWidths: { conversationList: 420, inspector: 360 },
      lastPrimaryRoute: "graph",
      inspectorOpen: true,
      selectedTab: "summary",
    });
    expect(preferences).not.toHaveProperty("query");
    expect(preferences).not.toHaveProperty("prompt");
    expect(preferences).not.toHaveProperty("wxid");
    expect(preferences).not.toHaveProperty("messageBody");
    expect(preferences).not.toHaveProperty("localPath");
    expect(preferences).not.toHaveProperty("token");
  });

  it("falls back to defaults for unknown routes, modes, and unsafe dimensions", () => {
    expect(sanitizeWorkspacePreferences({
      railMode: "giant",
      panelWidths: { conversationList: -1, inspector: Number.NaN },
      lastPrimaryRoute: "/tmp/private",
      selectedTab: "",
    })).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
  });

  it("forces compact rail behavior below wide desktop without changing the stored preference", () => {
    expect(getEffectiveRailMode("expanded", 1440)).toBe("expanded");
    expect(getEffectiveRailMode("expanded", 1180)).toBe("collapsed");
    expect(getEffectiveRailMode("peek", 1440)).toBe("peek");
    expect(getEffectiveRailMode("collapsed", 390)).toBe("collapsed");
  });

  it("toggles user-facing rail state between expanded and collapsed", () => {
    expect(toggleWorkspaceRailMode("expanded")).toBe("collapsed");
    expect(toggleWorkspaceRailMode("collapsed")).toBe("expanded");
    expect(toggleWorkspaceRailMode("peek")).toBe("expanded");
  });

  it("exposes rail widths used by responsive workbench layout calculations", () => {
    expect(getWorkspaceRailWidth("expanded")).toBe(192);
    expect(getWorkspaceRailWidth("peek")).toBe(88);
    expect(getWorkspaceRailWidth("collapsed")).toBe(64);
  });
});
