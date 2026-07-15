import type { SearchDraft } from "./searchDraftModel";

export type SearchZeroResultSuggestionId =
  | "clear-dates"
  | "all-categories"
  | "clear-senders"
  | "all-conversations"
  | "edit-keyword";

export interface SearchZeroResultSuggestion {
  id: SearchZeroResultSuggestionId;
  label: string;
}

export function buildSearchZeroResultSuggestions(
  applied: SearchDraft,
): SearchZeroResultSuggestion[] {
  const suggestions: SearchZeroResultSuggestion[] = [];
  if (applied.dateRange.start || applied.dateRange.end) {
    suggestions.push({ id: "clear-dates", label: "移除日期限制" });
  }
  if (applied.categories.length > 0) {
    suggestions.push({ id: "all-categories", label: "改为全部消息类型" });
  }
  if (applied.senderIds.length > 0) {
    suggestions.push({ id: "clear-senders", label: "移除发送者限制" });
  }
  if (applied.scope.kind !== "all") {
    suggestions.push({ id: "all-conversations", label: "改为全部会话" });
  }
  return suggestions.length > 0
    ? suggestions.slice(0, 3)
    : [{ id: "edit-keyword", label: "修改关键词" }];
}

export function applySearchZeroResultSuggestion(
  draft: SearchDraft,
  suggestion: SearchZeroResultSuggestionId,
): SearchDraft {
  const next = cloneDraft(draft);
  if (suggestion === "clear-dates") next.dateRange = {};
  if (suggestion === "all-categories") next.categories = [];
  if (suggestion === "clear-senders") next.senderIds = [];
  if (suggestion === "all-conversations") next.scope = { kind: "all" };
  return next;
}

function cloneDraft(draft: SearchDraft): SearchDraft {
  return {
    ...draft,
    scope:
      draft.scope.kind === "selected"
        ? { kind: "selected", chatIds: [...draft.scope.chatIds] }
        : { ...draft.scope },
    categories: [...draft.categories],
    senderIds: [...draft.senderIds],
    dateRange: { ...draft.dateRange },
  };
}
