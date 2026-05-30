import type { WorkbenchLayout, WorkbenchMode } from "@l3/workbench/workbenchLayout";

export type WorkbenchModule = "chat" | "stats" | "ai" | "graph" | "settings";
export type SinglePaneView = "list" | "detail";

export interface WorkbenchRailItemState {
  module: WorkbenchModule;
  label: string;
  active: boolean;
}

const RAIL_MODULES: { module: WorkbenchModule; label: string }[] = [
  { module: "chat", label: "会话" },
  { module: "stats", label: "统计" },
  { module: "ai", label: "AI" },
  { module: "graph", label: "图谱" },
  { module: "settings", label: "设置" },
];

export function resolveSinglePaneView(
  mode: WorkbenchMode,
  selectedConversationId: string | null,
  requestedView: SinglePaneView,
): SinglePaneView {
  if (mode !== "single") return "detail";
  if (requestedView === "list") return "list";
  return selectedConversationId ? "detail" : "list";
}

export function shouldRenderConversationListAsMain(
  layout: WorkbenchLayout,
  selectedConversationId: string | null,
  requestedView: SinglePaneView,
): boolean {
  return resolveSinglePaneView(layout.mode, selectedConversationId, requestedView) === "list";
}

export function buildWorkbenchRailItems(activeModule: WorkbenchModule): WorkbenchRailItemState[] {
  return RAIL_MODULES.map((item) => ({
    ...item,
    active: item.module === activeModule,
  }));
}

export function getInspectorTitle(module: WorkbenchModule): string {
  switch (module) {
    case "ai":
      return "AI 分析";
    case "graph":
      return "知识图谱";
    case "settings":
      return "设置";
    case "chat":
    case "stats":
      return "统计数据";
  }
}

export function isInspectorModule(module: WorkbenchModule): boolean {
  return module === "stats" || module === "ai" || module === "graph";
}
