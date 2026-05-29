export type WorkbenchMode = "wide" | "standard" | "compact" | "single";
export type WorkbenchInspectorMode = "inline" | "drawer" | "hidden";

export interface WorkbenchLayout {
  mode: WorkbenchMode;
  sidebarLabels: boolean;
  showConversationList: boolean;
  inspectorMode: WorkbenchInspectorMode;
  gridTemplateColumns: string;
}

export function getWorkbenchLayout(viewportWidth: number): WorkbenchLayout {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return getWorkbenchLayout(1180);
  }

  if (viewportWidth < 720) {
    return {
      mode: "single",
      sidebarLabels: false,
      showConversationList: false,
      inspectorMode: "hidden",
      gridTemplateColumns: "minmax(0, 1fr)",
    };
  }

  if (viewportWidth < 980) {
    return {
      mode: "compact",
      sidebarLabels: false,
      showConversationList: true,
      inspectorMode: "drawer",
      gridTemplateColumns:
        "var(--sidebar-collapsed) minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr)",
    };
  }

  if (viewportWidth < 1280) {
    return {
      mode: "standard",
      sidebarLabels: false,
      showConversationList: true,
      inspectorMode: "inline",
      gridTemplateColumns:
        "var(--sidebar-collapsed) minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr) minmax(260px, var(--inspector-width-compact))",
    };
  }

  return {
    mode: "wide",
    sidebarLabels: true,
    showConversationList: true,
    inspectorMode: "inline",
    gridTemplateColumns:
      "var(--sidebar-expanded) var(--conversation-list-width) minmax(0, 1fr) var(--inspector-width)",
  };
}
