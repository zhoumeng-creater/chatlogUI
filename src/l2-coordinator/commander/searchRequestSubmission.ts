import type { SearchCapabilities, SearchV2Request } from "@/l2-coordinator/api-docs/search";
import type {
  PendingSearchKind,
  PendingSearchRequest,
  SearchDateContext,
} from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { toInclusiveEpochRange } from "./searchDateRange";
import { validateSearchDraft, type SearchDraft } from "./searchDraftModel";

export type SearchSubmissionErrorCode = "invalid_request" | "capability_unavailable";

export class SearchSubmissionError extends Error {
  readonly code: SearchSubmissionErrorCode;

  constructor(code: SearchSubmissionErrorCode) {
    super(
      code === "invalid_request"
        ? "Search request is invalid"
        : "Required search capability is unavailable",
    );
    this.name = "SearchSubmissionError";
    this.code = code;
  }
}

export function prepareSearchSubmission(input: {
  draft: SearchDraft;
  capabilities: SearchCapabilities;
  requestId: string;
  kind: PendingSearchKind;
  startedAt: number;
}): Readonly<PendingSearchRequest> {
  const validation = validateSearchDraft(input.draft);
  if (!validation.valid || !validation.value) throw new SearchSubmissionError("invalid_request");
  const canonical = validation.value;
  assertCapabilities(input.capabilities, canonical);

  const timeZone = resolvedTimeZone();
  const dates = toInclusiveEpochRange(canonical.dateRange, timeZone ?? undefined);
  const request: SearchV2Request = {
    keyword: canonical.keyword,
    ...scopeRequest(canonical.scope),
    categories: canonical.categories.length > 0 ? [...canonical.categories] : undefined,
    senderIds: canonical.senderIds.length > 0 ? [...canonical.senderIds] : undefined,
    ...dates,
    limit: 50,
  };
  const dateContext: SearchDateContext = {
    timeZone,
    utcOffsetMinutes: -new Date(input.startedAt).getTimezoneOffset(),
    ...dates,
  };
  return deepFreeze({
    requestId: input.requestId,
    kind: input.kind,
    draft: {
      keyword: canonical.keyword,
      scope:
        canonical.scope.kind === "selected"
          ? { kind: "selected", chatIds: [...canonical.scope.chatIds] }
          : { ...canonical.scope },
      categories: [...canonical.categories],
      senderIds: [...canonical.senderIds],
      dateRange: { ...canonical.dateRange },
    },
    request,
    dateContext,
    startedAt: input.startedAt,
  });
}

export function assertSearchSubmissionCapabilities(
  draft: SearchDraft,
  capabilities: SearchCapabilities,
): void {
  const validation = validateSearchDraft(draft);
  if (!validation.valid || !validation.value) {
    throw new SearchSubmissionError("invalid_request");
  }
  assertCapabilities(capabilities, validation.value);
}

function assertCapabilities(
  capabilities: SearchCapabilities,
  draft: ReturnType<typeof validateSearchDraft>["value"] & {},
): void {
  if (
    capabilities.mode !== "v2" ||
    capabilities.contractVersion !== "search.v2" ||
    !capabilities.exactTotal ||
    !capabilities.completeScope ||
    !capabilities.snapshotCursor ||
    capabilities.maxPageSize < 50 ||
    capabilities.maxKeywordGraphemes < 200 ||
    capabilities.maxKeywordTerms < 20
  ) {
    throw new SearchSubmissionError("capability_unavailable");
  }
  if (draft.senderIds.length > 0 && !capabilities.senderFilter) {
    throw new SearchSubmissionError("capability_unavailable");
  }
  if (draft.categories.some((category) => !capabilities.taxonomy.includes(category))) {
    throw new SearchSubmissionError("capability_unavailable");
  }
  if ((draft.dateRange.start || draft.dateRange.end) && !capabilities.inclusiveTimeBoundaries) {
    throw new SearchSubmissionError("capability_unavailable");
  }
}

function scopeRequest(
  scope:
    | { kind: "all" }
    | { kind: "current"; chatId: string }
    | { kind: "selected"; chatIds: string[] },
): Pick<SearchV2Request, "chats"> {
  if (scope.kind === "all") return {};
  if (scope.kind === "current") return { chats: [scope.chatId] };
  return { chats: [...scope.chatIds] };
}

function resolvedTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  visited.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, visited);
  return Object.freeze(value);
}
