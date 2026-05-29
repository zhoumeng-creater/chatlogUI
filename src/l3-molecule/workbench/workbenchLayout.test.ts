import { describe, expect, it } from "vitest";
import { getWorkbenchLayout } from "./workbenchLayout";

describe("getWorkbenchLayout", () => {
  it("uses an expanded four-zone layout on wide desktop screens", () => {
    const layout = getWorkbenchLayout(1440);

    expect(layout.mode).toBe("wide");
    expect(layout.sidebarLabels).toBe(true);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("inline");
    expect(layout.gridTemplateColumns).toBe(
      "var(--sidebar-expanded) var(--conversation-list-width) minmax(0, 1fr) var(--inspector-width)",
    );
  });

  it("keeps the inspector inline on standard desktop without compressing into the old three-column grid", () => {
    const layout = getWorkbenchLayout(1180);

    expect(layout.mode).toBe("standard");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("inline");
    expect(layout.gridTemplateColumns).not.toContain("23vw");
    expect(layout.gridTemplateColumns).toBe(
      "var(--sidebar-collapsed) minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr) minmax(260px, var(--inspector-width-compact))",
    );
  });

  it("uses a drawer inspector on compact tablet widths", () => {
    const layout = getWorkbenchLayout(900);

    expect(layout.mode).toBe("compact");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("drawer");
    expect(layout.gridTemplateColumns).toBe(
      "var(--sidebar-collapsed) minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr)",
    );
  });

  it("uses a single focused column on phone widths", () => {
    const layout = getWorkbenchLayout(390);

    expect(layout.mode).toBe("single");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(false);
    expect(layout.inspectorMode).toBe("hidden");
    expect(layout.gridTemplateColumns).toBe("minmax(0, 1fr)");
  });

  it("falls back to the standard desktop rules for invalid measurements", () => {
    expect(getWorkbenchLayout(Number.NaN)).toEqual(getWorkbenchLayout(1180));
  });
});
