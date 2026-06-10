export type PrimaryWorkspaceId = "workbench" | "search" | "media" | "sns" | "analytics" | "ai" | "graph";

export interface PrimaryWorkspaceDestination {
  id: PrimaryWorkspaceId;
  label: string;
  route: string;
}

export interface PrimaryWorkspaceRailItem extends PrimaryWorkspaceDestination {
  active: boolean;
  badge?: string;
}

export type PrimaryWorkspaceBadges = Partial<Record<PrimaryWorkspaceId, string>>;

export const primaryWorkspaceDestinations: PrimaryWorkspaceDestination[] = [
  { id: "workbench", label: "会话", route: "/workbench" },
  { id: "search", label: "搜索", route: "/search" },
  { id: "media", label: "媒体", route: "/media" },
  { id: "sns", label: "朋友圈", route: "/sns" },
  { id: "analytics", label: "统计", route: "/analytics" },
  { id: "ai", label: "AI", route: "/ai" },
  { id: "graph", label: "图谱", route: "/graph" },
];

export function getPrimaryWorkspaceRoute(id: PrimaryWorkspaceId): string {
  return primaryWorkspaceDestinations.find((item) => item.id === id)?.route ?? "/workbench";
}

export function buildPrimaryWorkspaceRailItems(
  activeWorkspace: PrimaryWorkspaceId,
  badges: PrimaryWorkspaceBadges = {},
): PrimaryWorkspaceRailItem[] {
  return primaryWorkspaceDestinations.map((item) => ({
    ...item,
    active: item.id === activeWorkspace,
    badge: badges[item.id],
  }));
}
