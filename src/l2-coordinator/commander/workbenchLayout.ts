import {
  DEFAULT_WORKSPACE_PANEL_WIDTHS,
  type WorkspacePanelWidths,
} from "./workspacePreferenceModel";

export type WorkbenchMode = "wide" | "standard" | "compact" | "single";
export type WorkbenchInspectorMode = "inline" | "drawer" | "hidden";

export type WorkbenchPanel = "conversationList" | "inspector";

export interface WorkbenchPanelSplitter {
  panel: WorkbenchPanel;
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  direction: "normal" | "reverse";
}

export interface WorkbenchLayout {
  mode: WorkbenchMode;
  sidebarLabels: boolean;
  showConversationList: boolean;
  inspectorMode: WorkbenchInspectorMode;
  gridTemplateColumns: string;
  panelWidths: WorkspacePanelWidths;
  splitters: WorkbenchPanelSplitter[];
}

interface WorkbenchLayoutOptions {
  panelWidths?: WorkspacePanelWidths;
  availableWidth?: number;
}

const WORKBENCH_SPLITTER_WIDTH = 8;
const WORKBENCH_MAIN_MIN_WIDTH = 420;

const listBounds = { min: 240, maxWide: 420, maxStandard: 360, defaultStandard: 280 };
const inspectorBounds = { min: 280, maxWide: 420, maxStandard: 340, defaultStandard: 300 };

export function getWorkbenchLayout(
  viewportWidth: number,
  options: WorkbenchLayoutOptions = {},
): WorkbenchLayout {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return getWorkbenchLayout(1180);
  }

  const availableWidth = resolveAvailableWidth(viewportWidth, options.availableWidth);
  const panelWidths = resolvePanelWidths(
    viewportWidth,
    availableWidth,
    options.panelWidths,
  );

  if (viewportWidth < 720) {
    return {
      mode: "single",
      sidebarLabels: false,
      showConversationList: false,
      inspectorMode: "drawer",
      gridTemplateColumns: "minmax(0, 1fr)",
      panelWidths,
      splitters: [],
    };
  }

  if (viewportWidth < 980 || !canFitInlineLayout(availableWidth, panelWidths)) {
    return {
      mode: "compact",
      sidebarLabels: false,
      showConversationList: true,
      inspectorMode: "drawer",
      gridTemplateColumns:
        "minmax(220px, var(--conversation-list-width-compact)) minmax(0, 1fr)",
      panelWidths,
      splitters: [],
    };
  }

  if (viewportWidth < 1280) {
    return {
      mode: "standard",
      sidebarLabels: false,
      showConversationList: true,
      inspectorMode: "inline",
      gridTemplateColumns: buildInlineGridTemplate(panelWidths),
      panelWidths,
      splitters: buildSplitters(panelWidths, viewportWidth),
    };
  }

  return {
    mode: "wide",
    sidebarLabels: true,
    showConversationList: true,
    inspectorMode: "inline",
    gridTemplateColumns: buildInlineGridTemplate(panelWidths),
    panelWidths,
    splitters: buildSplitters(panelWidths, viewportWidth),
  };
}

function resolveAvailableWidth(viewportWidth: number, availableWidth: number | undefined): number {
  if (!Number.isFinite(availableWidth) || !availableWidth || availableWidth <= 0) {
    return viewportWidth;
  }
  return Math.min(viewportWidth, availableWidth);
}

function canFitInlineLayout(
  availableWidth: number,
  panelWidths: WorkspacePanelWidths,
): boolean {
  const minimumWidth = panelWidths.conversationList
    + panelWidths.inspector
    + (WORKBENCH_SPLITTER_WIDTH * 2)
    + WORKBENCH_MAIN_MIN_WIDTH;

  return availableWidth >= minimumWidth;
}

function resolvePanelWidths(
  breakpointWidth: number,
  availableWidth: number,
  storedWidths: WorkspacePanelWidths | undefined,
): WorkspacePanelWidths {
  const defaults = breakpointWidth < 1280
    ? {
        conversationList: listBounds.defaultStandard,
        inspector: inspectorBounds.defaultStandard,
      }
    : DEFAULT_WORKSPACE_PANEL_WIDTHS;

  const maxList = breakpointWidth < 1280 ? listBounds.maxStandard : listBounds.maxWide;
  const maxInspector = breakpointWidth < 1280 ? inspectorBounds.maxStandard : inspectorBounds.maxWide;
  const requested = {
    conversationList: clampWidth(
      storedWidths?.conversationList ?? defaults.conversationList,
      listBounds.min,
      maxList,
    ),
    inspector: clampWidth(
      storedWidths?.inspector ?? defaults.inspector,
      inspectorBounds.min,
      maxInspector,
    ),
  };

  const occupiedWidth = requested.conversationList + requested.inspector + (WORKBENCH_SPLITTER_WIDTH * 2);
  if (availableWidth - occupiedWidth < WORKBENCH_MAIN_MIN_WIDTH) {
    return defaults;
  }

  return requested;
}

function clampWidth(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildInlineGridTemplate(panelWidths: WorkspacePanelWidths): string {
  return `${panelWidths.conversationList}px var(--workbench-splitter-width) minmax(var(--workbench-main-min-width), 1fr) var(--workbench-splitter-width) ${panelWidths.inspector}px`;
}

function buildSplitters(
  panelWidths: WorkspacePanelWidths,
  viewportWidth: number,
): WorkbenchPanelSplitter[] {
  const maxList = viewportWidth < 1280 ? listBounds.maxStandard : listBounds.maxWide;
  const maxInspector = viewportWidth < 1280 ? inspectorBounds.maxStandard : inspectorBounds.maxWide;

  return [
    {
      panel: "conversationList",
      label: "调整会话列表宽度",
      value: panelWidths.conversationList,
      min: listBounds.min,
      max: maxList,
      defaultValue: viewportWidth < 1280
        ? listBounds.defaultStandard
        : DEFAULT_WORKSPACE_PANEL_WIDTHS.conversationList,
      direction: "normal",
    },
    {
      panel: "inspector",
      label: "调整会话详情宽度",
      value: panelWidths.inspector,
      min: inspectorBounds.min,
      max: maxInspector,
      defaultValue: viewportWidth < 1280
        ? inspectorBounds.defaultStandard
        : DEFAULT_WORKSPACE_PANEL_WIDTHS.inspector,
      direction: "reverse",
    },
  ];
}
