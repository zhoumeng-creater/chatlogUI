import {
  SEARCH_CATEGORIES,
  type SearchCategory,
} from "@/l2-coordinator/api-docs/search";
import {
  validateSearchDateRange,
  type SearchDateRange,
} from "./searchDateRange";
import { unicodeDefaultCaseFold } from "./unicodeCaseFold";

export type SearchScope =
  | { kind: "all" }
  | { kind: "current"; chatId: string | null }
  | { kind: "selected"; chatIds: string[] };

export interface SearchDraft {
  keyword: string;
  scope: SearchScope;
  categories: SearchCategory[];
  senderIds: string[];
  dateRange: SearchDateRange;
}

export interface NormalizedSearchKeyword {
  displayKeyword: string;
  uniqueDisplayTerms: string[];
  canonicalTerms: string[];
  graphemeCount: number;
  termCount: number;
}

export interface CanonicalSearchDraft extends Omit<SearchDraft, "scope"> {
  keyword: string;
  scope:
    | { kind: "all" }
    | { kind: "current"; chatId: string }
    | { kind: "selected"; chatIds: string[] };
}

export interface SearchDraftErrors {
  keyword?: string;
  scope?: string;
  categories?: string;
  senders?: string;
  dateRange?: string;
}

export interface SearchDraftValidation {
  valid: boolean;
  normalized: NormalizedSearchKeyword;
  errors: SearchDraftErrors;
  value?: CanonicalSearchDraft;
}

export type SearchDraftDirtySource = "keyword" | "scope" | "categories" | "senders" | "dates";
export type SearchDraftConditionSource = "scope" | "categories" | "senders" | "dates";
export type SearchDraftDirectoryKind = "conversation" | "sender";
export type SearchConditionDraftIntent =
  | { type: "choose-all-conversations" }
  | { type: "choose-current-conversation"; conversationId: string }
  | { type: "clear-message-categories" }
  | { type: "toggle-message-category"; category: SearchCategory }
  | { type: "change-date-range"; value: SearchDateRange };

export function createDefaultSearchDraft(): SearchDraft {
  return {
    keyword: "",
    scope: { kind: "all" },
    categories: [],
    senderIds: [],
    dateRange: {},
  };
}

export function clearSearchDraftCondition(
  draft: SearchDraft,
  source: SearchDraftConditionSource,
): SearchDraft {
  if (source === "scope") return replaceSearchDraftScope(draft, { kind: "all" });
  if (source === "categories") return { ...draft, categories: [] };
  if (source === "senders") return { ...draft, senderIds: [] };
  return { ...draft, dateRange: {} };
}

export function replaceSearchDraftScope(
  draft: SearchDraft,
  scope: SearchScope,
): SearchDraft {
  if (scopeKey(draft.scope) === scopeKey(scope)) return draft;
  return { ...draft, scope, senderIds: [] };
}

export function toggleSearchDraftDirectorySelection(
  draft: SearchDraft,
  kind: SearchDraftDirectoryKind,
  optionId: string,
): SearchDraft {
  const id = optionId.trim();
  if (!id) return draft;
  if (kind === "sender") {
    return {
      ...draft,
      senderIds: toggleStableId(draft.senderIds, id),
    };
  }

  const current = getSearchDraftDirectorySelectionIds(draft, kind);
  const chatIds = toggleStableId(current, id);
  return replaceSearchDraftScope(
    draft,
    chatIds.length > 0 ? { kind: "selected", chatIds } : { kind: "all" },
  );
}

export function getSearchDraftDirectorySelectionIds(
  draft: SearchDraft,
  kind: SearchDraftDirectoryKind,
): string[] {
  if (kind === "sender") return uniqueStableIds(draft.senderIds);
  if (draft.scope.kind === "selected") return uniqueStableIds(draft.scope.chatIds);
  return [];
}

export function normalizeSearchKeyword(keyword: string): NormalizedSearchKeyword {
  const displayKeyword = keyword.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const seen = new Set<string>();
  const uniqueDisplayTerms: string[] = [];
  const canonicalTerms: string[] = [];
  for (const term of displayKeyword ? displayKeyword.split(" ") : []) {
    const canonical = unicodeDefaultCaseFold(term);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    uniqueDisplayTerms.push(term);
    canonicalTerms.push(canonical);
  }
  canonicalTerms.sort();
  return {
    displayKeyword,
    uniqueDisplayTerms,
    canonicalTerms,
    graphemeCount: countGraphemes(uniqueDisplayTerms.join(" ")),
    termCount: uniqueDisplayTerms.length,
  };
}

export function validateSearchDraft(draft: SearchDraft): SearchDraftValidation {
  const normalized = normalizeSearchKeyword(draft.keyword);
  const errors: SearchDraftErrors = {};
  if (!normalized.displayKeyword) {
    errors.keyword = "请输入搜索关键词";
  } else if (normalized.graphemeCount > 200) {
    errors.keyword = "关键词最多 200 个字符";
  } else if (normalized.termCount > 20) {
    errors.keyword = "关键词最多 20 个词项";
  }

  const scope = canonicalizeScope(draft.scope);
  if (!scope) {
    errors.scope = draft.scope.kind === "current"
      ? "无法确定当前会话，请选择会话或切换到全部会话"
      : "请至少选择一个会话";
  }
  const categories = canonicalCategories(draft.categories);
  if (!categories) errors.categories = "消息类型筛选无效，请重新选择";
  const senderIds = canonicalPrivateIDs(draft.senderIds);
  if (!senderIds) errors.senders = "发送者筛选无效，请重新选择";

  const dateValidation = validateSearchDateRange(draft.dateRange);
  if (!dateValidation.valid) {
    errors.dateRange = dateValidation.rangeError ?? dateValidation.startError ?? dateValidation.endError;
  }

  if (Object.keys(errors).length > 0 || !scope || !categories || !senderIds) {
    return { valid: false, normalized, errors };
  }
  return {
    valid: true,
    normalized,
    errors,
    value: {
      keyword: normalized.displayKeyword,
      scope,
      categories,
      senderIds,
      dateRange: { ...draft.dateRange },
    },
  };
}

export function getSearchDraftChange(
  draft: SearchDraft,
  applied: SearchDraft | null,
): { dirtySources: SearchDraftDirtySource[]; submitLabel: "搜索" | "应用筛选" } {
  if (!applied) {
    return {
      dirtySources: ["keyword", "scope", "categories", "senders", "dates"],
      submitLabel: "搜索",
    };
  }
  const dirtySources: SearchDraftDirtySource[] = [];
  if (normalizeSearchKeyword(draft.keyword).displayKeyword !== normalizeSearchKeyword(applied.keyword).displayKeyword) {
    dirtySources.push("keyword");
  }
  if (scopeKey(draft.scope) !== scopeKey(applied.scope)) dirtySources.push("scope");
  if (setKey(draft.categories) !== setKey(applied.categories)) dirtySources.push("categories");
  if (setKey(draft.senderIds) !== setKey(applied.senderIds)) dirtySources.push("senders");
  if ((draft.dateRange.start ?? "") !== (applied.dateRange.start ?? "") ||
      (draft.dateRange.end ?? "") !== (applied.dateRange.end ?? "")) {
    dirtySources.push("dates");
  }
  return {
    dirtySources,
    submitLabel: dirtySources.length > 0 && !dirtySources.includes("keyword")
      ? "应用筛选"
      : "搜索",
  };
}

function canonicalizeScope(scope: SearchScope): CanonicalSearchDraft["scope"] | null {
  if (scope.kind === "all") return { kind: "all" };
  if (scope.kind === "current") {
    return scope.chatId ? { kind: "current", chatId: scope.chatId } : null;
  }
  const chatIds = canonicalPrivateIDs(scope.chatIds);
  return chatIds && chatIds.length > 0 ? { kind: "selected", chatIds } : null;
}

function canonicalCategories(categories: SearchCategory[]): SearchCategory[] | null {
  if (!categories.every((category) => (SEARCH_CATEGORIES as readonly string[]).includes(category))) {
    return null;
  }
  return [...new Set(categories)].sort();
}

function canonicalPrivateIDs(values: string[]): string[] | null {
  if (!values.every((value) => typeof value === "string" && value.length > 0)) return null;
  return [...new Set(values)].sort();
}

function scopeKey(scope: SearchScope): string {
  if (scope.kind === "all") return "all";
  if (scope.kind === "current") return `current:${scope.chatId ?? ""}`;
  return `selected:${setKey(scope.chatIds)}`;
}

function setKey(values: readonly string[]): string {
  return [...new Set(values)].sort().join("\u0000");
}

function toggleStableId(values: readonly string[], id: string): string[] {
  const unique = uniqueStableIds(values);
  return unique.includes(id) ? unique.filter((value) => value !== id) : [...unique, id];
}

function uniqueStableIds(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

interface SegmenterLike {
  segment(value: string): Iterable<unknown>;
}

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: "grapheme" },
) => SegmenterLike;

function countGraphemes(value: string): number {
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
  return countFallbackGraphemes(value);
}

function countFallbackGraphemes(value: string): number {
  let count = 0;
  let joinNext = false;
  let regionalRun = 0;
  let previous = "";
  for (const character of value) {
    if (character === "\u200D") {
      joinNext = true;
      continue;
    }
    if (/\p{Mark}/u.test(character) || /[\uFE00-\uFE0F]/u.test(character) ||
        /[\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(character)) {
      if (count === 0) count = 1;
      continue;
    }
    if (/\p{Regional_Indicator}/u.test(character)) {
      if (regionalRun % 2 === 0) count += 1;
      regionalRun += 1;
      joinNext = false;
      previous = character;
      continue;
    }
    regionalRun = 0;
    if (!(joinNext || (previous === "\r" && character === "\n"))) count += 1;
    joinNext = false;
    previous = character;
  }
  return count;
}
