import { describe, expect, it } from "vitest";
import {
  getGraphNodeLabel,
  getGraphRelationLabel,
  getGraphTimelineDisplay,
  getGraphTooltipDisplay,
} from "./graphDisplay";

describe("graphDisplay", () => {
  it("masks node, relation, tooltip, and timeline labels when privacy is enabled", () => {
    expect(getGraphNodeLabel("Alice", true)).toBe("*****");
    expect(getGraphRelationLabel("Alice owns Project", true)).toBe("***** **** *******");
    expect(
      getGraphTooltipDisplay(
        { title: "Alice", body: "Project owner" },
        true,
      ),
    ).toEqual({ title: "*****", body: "******* *****" });
    expect(
      getGraphTimelineDisplay(
        { title: "Launch meeting", source: "wxid_private", description: "Private content" },
        true,
      ),
    ).toEqual({
      title: "****** *******",
      source: "************",
      description: "******* *******",
    });
  });

  it("preserves labels when privacy is disabled and falls back for missing values", () => {
    expect(getGraphNodeLabel("Alice", false)).toBe("Alice");
    expect(getGraphNodeLabel("", false)).toBe("Unknown node");
    expect(getGraphRelationLabel("", false)).toBe("Unknown relation");
  });
});
