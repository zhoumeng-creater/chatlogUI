import type { PrimaryWorkspaceDestination } from "./primaryWorkspaceNavigation";

export type LegacyWorkbenchModule =
  | "chat"
  | "stats"
  | "media"
  | "sns"
  | "developer"
  | "ai"
  | "graph"
  | "settings";

export interface WorkbenchContextDeepLink {
  label: string;
  href: string;
  disabled: boolean;
  disabledReason?: string;
}

const DESTINATION_BY_LEGACY_MODULE: Record<LegacyWorkbenchModule, PrimaryWorkspaceDestination> = {
  chat: "workbench",
  stats: "analytics",
  media: "media",
  sns: "sns",
  developer: "workbench",
  ai: "ai",
  graph: "graph",
  settings: "workbench",
};

const CONTEXT_DEEP_LINKS: Array<Omit<WorkbenchContextDeepLink, "disabled" | "disabledReason">> = [
  {
    label: "搜索此会话",
    href: "/search?scope=currentChat&source=workbench",
  },
  {
    label: "查看完整统计",
    href: "/analytics?scope=currentChat&source=workbench",
  },
  {
    label: "打开媒体库",
    href: "/media?scope=currentChat&source=workbench",
  },
  {
    label: "查看朋友圈",
    href: "/sns?scope=currentChat&source=workbench",
  },
  {
    label: "问这个会话",
    href: "/ai?scope=currentChat&source=workbench",
  },
  {
    label: "在图谱中查看",
    href: "/graph?scope=currentChat&source=workbench",
  },
];

export function resolveWorkbenchDestination(
  module: LegacyWorkbenchModule,
): PrimaryWorkspaceDestination {
  return DESTINATION_BY_LEGACY_MODULE[module];
}

export function getWorkbenchInspectorTitle(): string {
  return "会话详情";
}

export function isWorkbenchInspectorDestination(_module: LegacyWorkbenchModule): boolean {
  return false;
}

export function buildWorkbenchContextDeepLinks(input: {
  hasConversation: boolean;
}): WorkbenchContextDeepLink[] {
  return CONTEXT_DEEP_LINKS.map((item) => ({
    ...item,
    disabled: !input.hasConversation,
    disabledReason: input.hasConversation ? undefined : "先选择一个会话",
  }));
}

export function isWorkbenchReadySmokeSearch(search: string): boolean {
  return new URLSearchParams(search).get("codex-smoke") === "workbench-ready";
}
