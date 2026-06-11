import { describe, expect, it } from "vitest";
import {
  getGraphNodeLabel,
  getGraphRelationLabel,
  getGraphTimelineDisplay,
  getGraphTooltipDisplay,
} from "./graphDisplay";

describe("graphDisplay", () => {
  it("masks node, relation, tooltip, and timeline labels when privacy is enabled", () => {
    expect(getGraphNodeLabel("SyntheticUser", true)).toBe("*************");
    expect(getGraphRelationLabel("SyntheticUser owns Project", true)).toBe("************* **** *******");
    expect(
      getGraphTooltipDisplay(
        { title: "SyntheticUser", body: "Project owner" },
        true,
      ),
    ).toEqual({ title: "*************", body: "******* *****" });
    const timeline = getGraphTimelineDisplay(
      { title: "Launch meeting", source: "wxid_synthetic_private", description: "Private content" },
      true,
    );

    expect(timeline).toEqual({
      title: "****** *******",
      source: expect.stringMatching(/^\*+$/),
      description: "******* *******",
    });
    expect(timeline.source).not.toContain("wxid_synthetic_private");
  });

  it("preserves labels when privacy is disabled and falls back for missing values", () => {
    expect(getGraphNodeLabel("SyntheticUser", false)).toBe("SyntheticUser");
    expect(getGraphNodeLabel("", false)).toBe("Unknown node");
    expect(getGraphRelationLabel("", false)).toBe("Unknown relation");
  });
});
