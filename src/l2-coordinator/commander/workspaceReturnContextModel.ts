export type WorkspaceReturnSource =
  | "search"
  | "graph"
  | "ai-evidence"
  | "media"
  | "sns";

export interface WorkspaceReturnContext {
  label: string;
  actionLabel: string | null;
  returnRoute: string | null;
}

interface BuildWorkspaceReturnContextInput {
  source?: string | null;
  returnRoute?: string | null;
}

const sourceLabels: Record<WorkspaceReturnSource, { label: string; actionLabel: string }> = {
  search: { label: "来自搜索结果", actionLabel: "返回搜索结果" },
  graph: { label: "来自图谱实体", actionLabel: "返回图谱" },
  "ai-evidence": { label: "来自 AI 证据", actionLabel: "返回 AI 证据" },
  media: { label: "来自媒体库", actionLabel: "返回媒体库" },
  sns: { label: "来自朋友圈", actionLabel: "返回朋友圈" },
};

export function buildWorkspaceReturnContext({
  source,
  returnRoute,
}: BuildWorkspaceReturnContextInput): WorkspaceReturnContext | null {
  if (!isWorkspaceReturnSource(source)) return null;

  const safeReturnRoute = sanitizeReturnRoute(returnRoute);
  const labels = sourceLabels[source];

  return {
    label: labels.label,
    actionLabel: safeReturnRoute ? labels.actionLabel : null,
    returnRoute: safeReturnRoute,
  };
}

export function getWorkspaceReturnSourceForChatAnchor(
  source: string | null | undefined,
): WorkspaceReturnSource {
  if (source === "ai") return "ai-evidence";
  if (source === "graph" || source === "media" || source === "sns" || source === "search") {
    return source;
  }
  return "search";
}

function isWorkspaceReturnSource(value: unknown): value is WorkspaceReturnSource {
  return value === "search" ||
    value === "graph" ||
    value === "ai-evidence" ||
    value === "media" ||
    value === "sns";
}

function sanitizeReturnRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (/[\r\n]/.test(value)) return null;
  if (value.includes("\\") || value.includes(":")) return null;
  return value;
}
