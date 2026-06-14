import type { PrimaryWorkspaceId } from "./primaryWorkspaceNavigation";

export type WorkspaceRailMode = "expanded" | "collapsed" | "peek";

export interface WorkspacePanelWidths {
  conversationList: number;
  inspector: number;
}

export interface WorkspacePreferences {
  railMode: WorkspaceRailMode;
  panelWidths: WorkspacePanelWidths;
  lastPrimaryRoute: PrimaryWorkspaceId | null;
  inspectorOpen: boolean;
  selectedTab: string | null;
}

export const DEFAULT_WORKSPACE_PANEL_WIDTHS: WorkspacePanelWidths = {
  conversationList: 320,
  inspector: 320,
};

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  railMode: "expanded",
  panelWidths: { ...DEFAULT_WORKSPACE_PANEL_WIDTHS },
  lastPrimaryRoute: null,
  inspectorOpen: false,
  selectedTab: null,
};

const primaryRouteIds: PrimaryWorkspaceId[] = [
  "workbench",
  "search",
  "media",
  "sns",
  "analytics",
  "ai",
  "graph",
];

export function sanitizeWorkspacePreferences(raw: unknown): WorkspacePreferences {
  if (!raw || typeof raw !== "object") {
    return cloneDefaultWorkspacePreferences();
  }

  const input = raw as Record<string, unknown>;

  return {
    railMode: sanitizeRailMode(input.railMode),
    panelWidths: sanitizePanelWidths(input.panelWidths),
    lastPrimaryRoute: sanitizePrimaryWorkspaceId(input.lastPrimaryRoute),
    inspectorOpen: typeof input.inspectorOpen === "boolean"
      ? input.inspectorOpen
      : DEFAULT_WORKSPACE_PREFERENCES.inspectorOpen,
    selectedTab: sanitizeStructuralString(input.selectedTab),
  };
}

export function cloneDefaultWorkspacePreferences(): WorkspacePreferences {
  return {
    ...DEFAULT_WORKSPACE_PREFERENCES,
    panelWidths: { ...DEFAULT_WORKSPACE_PANEL_WIDTHS },
  };
}

export function getEffectiveRailMode(
  railMode: WorkspaceRailMode,
  viewportWidth: number,
): WorkspaceRailMode {
  if (!Number.isFinite(viewportWidth) || viewportWidth < 1280) {
    return "collapsed";
  }
  return railMode;
}

export function getWorkspaceRailWidth(railMode: WorkspaceRailMode): number {
  if (railMode === "expanded") return 192;
  if (railMode === "peek") return 88;
  return 64;
}

export function toggleWorkspaceRailMode(railMode: WorkspaceRailMode): WorkspaceRailMode {
  return railMode === "expanded" ? "collapsed" : "expanded";
}

function sanitizeRailMode(value: unknown): WorkspaceRailMode {
  return value === "expanded" || value === "collapsed" || value === "peek"
    ? value
    : DEFAULT_WORKSPACE_PREFERENCES.railMode;
}

function sanitizePanelWidths(value: unknown): WorkspacePanelWidths {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_WORKSPACE_PANEL_WIDTHS };
  }

  const rawWidths = value as Record<string, unknown>;
  const conversationList = sanitizeWidth(rawWidths.conversationList);
  const inspector = sanitizeWidth(rawWidths.inspector);

  if (conversationList === null || inspector === null) {
    return { ...DEFAULT_WORKSPACE_PANEL_WIDTHS };
  }

  return { conversationList, inspector };
}

function sanitizeWidth(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 220 || value > 520) return null;
  return Math.round(value);
}

function sanitizePrimaryWorkspaceId(value: unknown): PrimaryWorkspaceId | null {
  return typeof value === "string" && primaryRouteIds.includes(value as PrimaryWorkspaceId)
    ? value as PrimaryWorkspaceId
    : DEFAULT_WORKSPACE_PREFERENCES.lastPrimaryRoute;
}

function sanitizeStructuralString(value: unknown): string | null {
  if (typeof value !== "string") return DEFAULT_WORKSPACE_PREFERENCES.selectedTab;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return DEFAULT_WORKSPACE_PREFERENCES.selectedTab;
  return /^[a-z0-9_-]+$/i.test(trimmed) ? trimmed : DEFAULT_WORKSPACE_PREFERENCES.selectedTab;
}
