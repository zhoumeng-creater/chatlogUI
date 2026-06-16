import type { ShortcutContextId } from "./shortcutCatalog";

export type CoachMarkId =
  | "rail-collapse"
  | "privacy-mode"
  | "search-scope"
  | "ai-setup-index"
  | "graph-evidence"
  | "export-redaction";

export type CoachMarkPlacement = "top" | "right" | "bottom" | "left";

export interface CoachMarkView {
  id: CoachMarkId;
  anchorId: string;
  title: string;
  body: string;
  placement: CoachMarkPlacement;
  position?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface CoachMarkCandidate extends CoachMarkView {
  contexts: ShortcutContextId[];
  priority: number;
  minViewportWidth?: number;
}

export interface CoachMarkSelectionInput {
  candidates: CoachMarkCandidate[];
  dismissedIds: readonly string[];
  blocking: boolean;
  overlayOpen: boolean;
  viewportWidth: number;
  now: number;
  pausedUntil: number | null;
}

export interface CoachMarkPreferenceFields {
  dismissedCoachMarkIds: CoachMarkId[];
  coachMarksPausedUntil: number | null;
}

const knownCoachMarkIds: CoachMarkId[] = [
  "rail-collapse",
  "privacy-mode",
  "search-scope",
  "ai-setup-index",
  "graph-evidence",
  "export-redaction",
];

export function buildCoachMarkCandidates({
  contextId,
  anchors,
}: {
  contextId: ShortcutContextId;
  privacyOn: boolean;
  viewportWidth: number;
  anchors: ReadonlySet<string>;
}): CoachMarkCandidate[] {
  return defaultCoachMarks()
    .filter((candidate) => candidate.contexts.includes(contextId))
    .filter((candidate) => anchors.has(candidate.anchorId));
}

export function selectCoachMark(input: CoachMarkSelectionInput): CoachMarkView | null {
  if (input.blocking || input.overlayOpen) return null;
  if (input.pausedUntil !== null && input.pausedUntil > input.now) return null;
  const dismissed = new Set(input.dismissedIds);
  const [selected] = input.candidates
    .filter((candidate) => !dismissed.has(candidate.id))
    .filter((candidate) => !candidate.minViewportWidth || input.viewportWidth >= candidate.minViewportWidth)
    .sort((left, right) => left.priority - right.priority);

  if (!selected) return null;

  return {
    id: selected.id,
    anchorId: selected.anchorId,
    title: selected.title,
    body: selected.body,
    placement: selected.placement,
  };
}

export function sanitizeCoachMarkPreferences(raw: unknown): CoachMarkPreferenceFields {
  if (!raw || typeof raw !== "object") {
    return { dismissedCoachMarkIds: [], coachMarksPausedUntil: null };
  }

  const input = raw as Record<string, unknown>;
  return {
    dismissedCoachMarkIds: sanitizeCoachMarkIds(input.dismissedCoachMarkIds),
    coachMarksPausedUntil: sanitizePausedUntil(input.coachMarksPausedUntil),
  };
}

export function dismissCoachMark(
  dismissedIds: readonly CoachMarkId[],
  id: CoachMarkId,
): CoachMarkId[] {
  return dismissedIds.includes(id) ? [...dismissedIds] : [...dismissedIds, id];
}

export function isCoachMarkId(value: unknown): value is CoachMarkId {
  return typeof value === "string" && knownCoachMarkIds.includes(value as CoachMarkId);
}

function sanitizeCoachMarkIds(value: unknown): CoachMarkId[] {
  if (!Array.isArray(value)) return [];
  const ids: CoachMarkId[] = [];
  for (const item of value) {
    if (!isCoachMarkId(item)) continue;
    if (!ids.includes(item)) ids.push(item);
  }
  return ids;
}

function sanitizePausedUntil(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

function defaultCoachMarks(): CoachMarkCandidate[] {
  return [
    {
      id: "rail-collapse",
      anchorId: "primary-workspace-rail",
      title: "导航栏可以收起",
      body: "宽屏时可以收起或展开一级导航，偏好只保存结构状态。",
      placement: "right",
      contexts: ["workbench", "search", "media", "sns", "analytics", "ai", "graph"],
      priority: 10,
      minViewportWidth: 1280,
    },
    {
      id: "privacy-mode",
      anchorId: "privacy-toggle",
      title: "隐私模式保留结构",
      body: "这里切换隐私遮罩。数量、类型和布局会保留，姓名、内容和路径会隐藏。",
      placement: "bottom",
      contexts: ["setup", "settings", "workbench", "search", "media", "sns", "analytics", "ai", "graph"],
      priority: 20,
    },
    {
      id: "search-scope",
      anchorId: "workspace-scope",
      title: "这里控制当前范围",
      body: "切换范围会影响搜索、统计和导出，但不会保存私密关键词。",
      placement: "bottom",
      contexts: ["search", "analytics", "media", "sns", "ai", "graph"],
      priority: 5,
    },
    {
      id: "ai-setup-index",
      anchorId: "ai-primary-task",
      title: "先看 AI 主任务",
      body: "未配置、未索引和可提问时，这里会给出一个最合适的下一步。",
      placement: "bottom",
      contexts: ["ai"],
      priority: 5,
    },
    {
      id: "graph-evidence",
      anchorId: "graph-evidence",
      title: "图谱证据可以回到来源",
      body: "查看图谱关系时，可以从摘要或详情回到来源上下文核对。",
      placement: "bottom",
      contexts: ["graph"],
      priority: 5,
      minViewportWidth: 720,
    },
    {
      id: "export-redaction",
      anchorId: "export-redaction",
      title: "导出默认走脱敏",
      body: "业务导出会优先保留结构和统计，敏感内容默认脱敏。",
      placement: "bottom",
      contexts: ["workbench", "search", "media", "sns", "analytics", "ai", "graph"],
      priority: 30,
    },
  ];
}
