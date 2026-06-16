import { describe, expect, it } from "vitest";
import {
  buildCoachMarkCandidates,
  dismissCoachMark,
  sanitizeCoachMarkPreferences,
  selectCoachMark,
} from "./coachMarkModel";

describe("coachMarkModel", () => {
  it("selects one eligible structural coach mark for the current context", () => {
    const selected = selectCoachMark({
      candidates: buildCoachMarkCandidates({
        contextId: "search",
        privacyOn: true,
        viewportWidth: 1366,
        anchors: new Set(["workspace-scope", "privacy-toggle"]),
      }),
      dismissedIds: [],
      blocking: false,
      overlayOpen: false,
      viewportWidth: 1366,
      now: 100,
      pausedUntil: null,
    });

    expect(selected).toMatchObject({
      id: "search-scope",
      anchorId: "workspace-scope",
      title: "这里控制当前范围",
    });
    expect(JSON.stringify(selected)).not.toContain("Synthetic Private Room");
    expect(JSON.stringify(selected)).not.toContain("wxid_");
  });

  it("suppresses dismissed, blocked, hidden, overlay, and snoozed coach marks", () => {
    const candidates = buildCoachMarkCandidates({
      contextId: "graph",
      privacyOn: false,
      viewportWidth: 640,
      anchors: new Set(["graph-evidence", "workspace-scope"]),
    });

    expect(selectCoachMark({
      candidates,
      dismissedIds: ["graph-evidence", "search-scope"],
      blocking: false,
      overlayOpen: false,
      viewportWidth: 640,
      now: 100,
      pausedUntil: null,
    })?.id).not.toBe("graph-evidence");

    expect(selectCoachMark({
      candidates,
      dismissedIds: [],
      blocking: true,
      overlayOpen: false,
      viewportWidth: 640,
      now: 100,
      pausedUntil: null,
    })).toBeNull();

    expect(selectCoachMark({
      candidates,
      dismissedIds: [],
      blocking: false,
      overlayOpen: true,
      viewportWidth: 640,
      now: 100,
      pausedUntil: null,
    })).toBeNull();

    expect(selectCoachMark({
      candidates,
      dismissedIds: [],
      blocking: false,
      overlayOpen: false,
      viewportWidth: 640,
      now: 100,
      pausedUntil: 200,
    })).toBeNull();
  });

  it("sanitizes stored coach mark preferences to structural ids only", () => {
    expect(sanitizeCoachMarkPreferences({
      dismissedCoachMarkIds: ["privacy-mode", "wxid_synthetic_private", "search-scope", "C:/Users/Synthetic/private"],
      coachMarksPausedUntil: 1234,
      query: "Synthetic private query",
    })).toEqual({
      dismissedCoachMarkIds: ["privacy-mode", "search-scope"],
      coachMarksPausedUntil: 1234,
    });

    expect(dismissCoachMark(["privacy-mode"], "privacy-mode")).toEqual(["privacy-mode"]);
    expect(dismissCoachMark(["privacy-mode"], "search-scope")).toEqual(["privacy-mode", "search-scope"]);
  });
});
