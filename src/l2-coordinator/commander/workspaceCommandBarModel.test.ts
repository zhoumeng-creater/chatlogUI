import { describe, expect, it } from "vitest";
import { buildWorkspaceCommandBar } from "./workspaceCommandBarModel";

describe("workspaceCommandBarModel", () => {
  it("separates current conversation actions into primary, secondary, and overflow groups", () => {
    const model = buildWorkspaceCommandBar({
      hasConversation: true,
      inspectorMode: "drawer",
    });

    expect(model.primary.map((action) => action.id)).toEqual(["search-current"]);
    expect(model.secondary.map((action) => action.id)).toEqual(["details"]);
    expect(model.overflow.map((action) => action.id)).toEqual(["export-current", "jump-date"]);
    expect(model.overflow.find((action) => action.id === "jump-date")).toMatchObject({
      disabled: false,
      disabledReason: null,
    });
    expect(model.primary[0]?.minTargetPx).toBeGreaterThanOrEqual(40);
    expect(model.overflow.every((action) => action.minTargetPx >= 32)).toBe(true);
  });

  it("omits details when the inspector is already inline", () => {
    const model = buildWorkspaceCommandBar({
      hasConversation: true,
      inspectorMode: "inline",
    });

    expect(model.secondary.map((action) => action.id)).not.toContain("details");
  });

  it("keeps disabled reasons explicit only when the conversation is missing", () => {
    const model = buildWorkspaceCommandBar({
      hasConversation: false,
      inspectorMode: "drawer",
    });
    const actions = [...model.primary, ...model.secondary, ...model.overflow];

    expect(actions.every((action) => action.disabled)).toBe(true);
    expect(actions.map((action) => action.disabledReason)).toContain("先选择一个会话。");
    expect(actions.find((action) => action.id === "export-current")?.disabledReason).toBe("先选择一个会话。");
    expect(actions.find((action) => action.id === "jump-date")?.disabledReason).toBe("先选择一个会话。");
  });
});
