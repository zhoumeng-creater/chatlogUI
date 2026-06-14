import { describe, expect, it } from "vitest";
import { getWorkbenchLayout } from "./workbenchLayout";

describe("getWorkbenchLayout", () => {
  it("uses a focused three-zone conversation layout on wide desktop screens", () => {
    const layout = getWorkbenchLayout(1440);

    expect(layout.mode).toBe("wide");
    expect(layout.sidebarLabels).toBe(true);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("inline");
    expect(layout.gridTemplateColumns).toBe(
      "320px var(--workbench-splitter-width) minmax(var(--workbench-main-min-width), 1fr) var(--workbench-splitter-width) 320px",
    );
    expect(layout.panelWidths).toEqual({ conversationList: 320, inspector: 320 });
    expect(layout.splitters.map((splitter) => splitter.panel)).toEqual([
      "conversationList",
      "inspector",
    ]);
  });

  it("keeps wide desktop panel defaults when the primary rail reduces available content width", () => {
    const layout = getWorkbenchLayout(1440, {
      availableWidth: 1248,
    });

    expect(layout.mode).toBe("wide");
    expect(layout.panelWidths).toEqual({ conversationList: 320, inspector: 320 });
    expect(layout.splitters[0]?.max).toBe(420);
    expect(layout.splitters[1]?.defaultValue).toBe(320);
  });

  it("keeps the inspector inline on standard desktop without embedding the primary rail", () => {
    const layout = getWorkbenchLayout(1180, {
      panelWidths: { conversationList: 410, inspector: 390 },
    });

    expect(layout.mode).toBe("standard");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("inline");
    expect(layout.gridTemplateColumns).not.toContain("23vw");
    expect(layout.gridTemplateColumns).not.toContain("var(--sidebar-collapsed)");
    expect(layout.panelWidths.conversationList).toBeLessThanOrEqual(360);
    expect(layout.panelWidths.inspector).toBeLessThanOrEqual(340);
    expect(layout.gridTemplateColumns).toContain("var(--workbench-main-min-width)");
  });

  it("uses a drawer inspector on compact tablet widths", () => {
    const layout = getWorkbenchLayout(900);

    expect(layout.mode).toBe("compact");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(true);
    expect(layout.inspectorMode).toBe("drawer");
    expect(layout.gridTemplateColumns).toBe(
      "minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr)",
    );
    expect(layout.splitters).toEqual([]);
  });

  it("falls back to drawer mode when the available content width cannot fit readable inline panels", () => {
    const layout = getWorkbenchLayout(980, {
      availableWidth: 916,
    });

    expect(layout.mode).toBe("compact");
    expect(layout.inspectorMode).toBe("drawer");
    expect(layout.splitters).toEqual([]);
  });

  it("uses a single focused column with recoverable inspector drawer on phone widths", () => {
    const layout = getWorkbenchLayout(390);

    expect(layout.mode).toBe("single");
    expect(layout.sidebarLabels).toBe(false);
    expect(layout.showConversationList).toBe(false);
    expect(layout.inspectorMode).toBe("drawer");
    expect(layout.gridTemplateColumns).toBe("minmax(0, 1fr)");
  });

  it("falls back to the standard desktop rules for invalid measurements", () => {
    expect(getWorkbenchLayout(Number.NaN)).toEqual(getWorkbenchLayout(1180));
  });

  it("resets unsafe stored panel widths when the main reading pane would collapse", () => {
    const layout = getWorkbenchLayout(1100, {
      panelWidths: { conversationList: 900, inspector: 900 },
    });

    expect(layout.panelWidths).toEqual({ conversationList: 280, inspector: 300 });
    expect(layout.gridTemplateColumns).toBe(
      "280px var(--workbench-splitter-width) minmax(var(--workbench-main-min-width), 1fr) var(--workbench-splitter-width) 300px",
    );
  });
});
