export type PrimaryWorkspaceDestination =
  | "workbench"
  | "search"
  | "media"
  | "sns"
  | "analytics"
  | "ai"
  | "graph";

export interface PrimaryWorkspaceDestinationDefinition {
  destination: PrimaryWorkspaceDestination;
  label: string;
  ariaLabel: string;
  href: string;
}

export interface PrimaryWorkspaceNavItem extends PrimaryWorkspaceDestinationDefinition {
  active: boolean;
}

export const PRIMARY_WORKSPACE_DESTINATIONS: PrimaryWorkspaceDestinationDefinition[] = [
  {
    destination: "workbench",
    label: "会话",
    ariaLabel: "打开会话工作台",
    href: "/workbench",
  },
  {
    destination: "search",
    label: "搜索",
    ariaLabel: "打开搜索工作区",
    href: "/search",
  },
  {
    destination: "media",
    label: "媒体",
    ariaLabel: "打开媒体库",
    href: "/media",
  },
  {
    destination: "sns",
    label: "朋友圈",
    ariaLabel: "打开朋友圈工作区",
    href: "/sns",
  },
  {
    destination: "analytics",
    label: "统计",
    ariaLabel: "打开统计分析",
    href: "/analytics",
  },
  {
    destination: "ai",
    label: "AI",
    ariaLabel: "打开 AI 工作台",
    href: "/ai",
  },
  {
    destination: "graph",
    label: "图谱",
    ariaLabel: "打开知识图谱",
    href: "/graph",
  },
];

const CANONICAL_BY_PATH = new Map(
  PRIMARY_WORKSPACE_DESTINATIONS.map((item) => [item.href, item.destination]),
);

const LEGACY_WORKBENCH_ALIASES = new Map<string, PrimaryWorkspaceDestination>([
  ["/workbench/search", "search"],
  ["/workbench/stats", "analytics"],
  ["/workbench/media", "media"],
  ["/workbench/sns", "sns"],
  ["/workbench/ai", "ai"],
  ["/workbench/graph", "graph"],
]);

export function buildPrimaryWorkspaceNavItems(
  activeDestination: PrimaryWorkspaceDestination,
): PrimaryWorkspaceNavItem[] {
  return PRIMARY_WORKSPACE_DESTINATIONS.map((item) => ({
    ...item,
    active: item.destination === activeDestination,
  }));
}

export function resolvePrimaryWorkspaceDestinationFromPath(
  pathname: string,
): PrimaryWorkspaceDestination | null {
  const normalizedPath = normalizePathname(pathname);
  return CANONICAL_BY_PATH.get(normalizedPath) ?? LEGACY_WORKBENCH_ALIASES.get(normalizedPath) ?? null;
}

export function getPrimaryWorkspaceAliasRedirect(pathname: string): string | null {
  const destination = LEGACY_WORKBENCH_ALIASES.get(normalizePathname(pathname));
  if (!destination) return null;
  return PRIMARY_WORKSPACE_DESTINATIONS.find((item) => item.destination === destination)?.href ?? null;
}

function normalizePathname(pathname: string): string {
  const [pathOnly] = pathname.split("?");
  const trimmed = pathOnly.endsWith("/") && pathOnly.length > 1
    ? pathOnly.slice(0, -1)
    : pathOnly;
  return trimmed || "/";
}
