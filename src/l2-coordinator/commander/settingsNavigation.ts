import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";

export type SettingsSource =
  | "app-shell"
  | "setup"
  | "workbench"
  | "search"
  | "analytics"
  | "media"
  | "sns"
  | "ai"
  | "graph"
  | "update";

type SettingsReturnKey =
  | "setup"
  | "workbench"
  | "search"
  | "analytics"
  | "media"
  | "sns"
  | "ai"
  | "graph";

export interface SettingsReturnAction {
  label: string;
  target: string;
  replace: boolean;
}

export interface SettingsReturnInput {
  source?: string | null;
  returnRoute?: string | null;
  dbReady: boolean;
}

export interface BuildSettingsRouteInput {
  source?: string | null;
  returnRoute?: string | null;
  section?: string | null;
}

export interface SettingsInitialCategoryInput {
  source?: string | null;
  section?: string | null;
}

const returnTargets: Record<SettingsReturnKey, { target: string; label: string }> = {
  setup: { target: "/", label: "返回设置中心" },
  workbench: { target: "/workbench", label: "返回工作台" },
  search: { target: "/search", label: "返回搜索" },
  analytics: { target: "/analytics", label: "返回统计" },
  media: { target: "/media", label: "返回媒体" },
  sns: { target: "/sns", label: "返回朋友圈" },
  ai: { target: "/ai", label: "返回 AI 工作台" },
  graph: { target: "/graph", label: "返回图谱" },
};

const routeToReturnKey: Record<string, SettingsReturnKey> = {
  "/": "setup",
  "/workbench": "workbench",
  "/search": "search",
  "/analytics": "analytics",
  "/media": "media",
  "/sns": "sns",
  "/ai": "ai",
  "/graph": "graph",
};

const sourceToReturnKey: Partial<Record<SettingsSource, SettingsReturnKey>> = {
  setup: "setup",
  workbench: "workbench",
  search: "search",
  analytics: "analytics",
  media: "media",
  sns: "sns",
  ai: "ai",
  graph: "graph",
};

const safeSections = new Set([
  "data",
  "service",
  "appearance",
  "ai",
  "semantic",
  "privacy",
  "diagnostics",
  "advanced",
  "developer",
  "about",
  "update",
]);

export function deriveSettingsReturnAction(input: SettingsReturnInput): SettingsReturnAction {
  const source = normalizeSettingsSource(input.source);

  if (source === "setup" || !input.dbReady) {
    return actionForKey("setup");
  }

  if (source === "app-shell") {
    const returnKey = safeReturnKey(input.returnRoute);
    return actionForKey(returnKey ?? "workbench");
  }

  if (source === "update") {
    const returnKey = safeReturnKey(input.returnRoute);
    return returnKey ? actionForKey(returnKey) : {
      label: "留在关于与更新",
      target: "/settings?section=about",
      replace: true,
    };
  }

  if (source) {
    const sourceReturnKey = sourceToReturnKey[source];
    if (sourceReturnKey) return actionForKey(sourceReturnKey);
  }

  return actionForKey(input.dbReady ? "workbench" : "setup");
}

export function buildSettingsRoute(input: BuildSettingsRouteInput): string {
  const params = new URLSearchParams();
  const source = normalizeSettingsSource(input.source);
  const returnKey = safeReturnKey(input.returnRoute);
  const section = safeSection(input.section);

  if (source) params.set("source", source);
  if (returnKey && returnKey !== "setup") params.set("return", returnKey);
  if (section) params.set("section", section);

  const query = params.toString();
  return `/settings${query ? `?${query}` : ""}`;
}

export function normalizeSettingsInitialCategory(
  input: SettingsInitialCategoryInput,
): SettingsCategory {
  const section = safeSection(input.section);
  if (section === "appearance") return "appearance";
  if (section === "ai" || section === "semantic") return "ai";
  if (section === "privacy" || section === "diagnostics" || section === "advanced" || section === "developer") {
    return "advanced";
  }
  if (section === "about" || section === "update") return "about";

  const source = normalizeSettingsSource(input.source);
  if (source === "ai") return "ai";
  if (source === "update") return "about";
  return "data";
}

function actionForKey(key: SettingsReturnKey): SettingsReturnAction {
  const target = returnTargets[key];
  return {
    label: target.label,
    target: target.target,
    replace: true,
  };
}

function normalizeSettingsSource(value: string | null | undefined): SettingsSource | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  switch (normalized) {
    case "app-shell":
    case "setup":
    case "workbench":
    case "search":
    case "analytics":
    case "media":
    case "sns":
    case "ai":
    case "graph":
    case "update":
      return normalized;
    default:
      return null;
  }
}

function safeReturnKey(value: string | null | undefined): SettingsReturnKey | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized in returnTargets) return normalized as SettingsReturnKey;
  if (!normalized.startsWith("/")) return null;

  const path = normalized.split(/[?#]/, 1)[0];
  return routeToReturnKey[path] ?? null;
}

function safeSection(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !safeSections.has(normalized)) return null;
  return normalized;
}
