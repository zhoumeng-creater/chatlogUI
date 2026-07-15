import type {
  SearchConversationDirectoryPage,
  SearchSenderDirectoryPage,
} from "@/l2-coordinator/api-docs/search";

export type SearchDirectoryKind = "conversation" | "sender";

export interface SearchConversationDirectoryOption {
  kind: "conversation";
  id: string;
  displayName: string;
  disambiguator: string;
  conversationKind: "direct" | "group";
}

export interface SearchSenderDirectoryOption {
  kind: "sender";
  id: string;
  displayName: string;
  disambiguator: string;
  isSelf: boolean;
  conversationCount: number;
  contextLabel: string;
}

export type SearchDirectoryOption = SearchConversationDirectoryOption | SearchSenderDirectoryOption;

export interface SearchDirectoryOptionPage {
  dataRevision: string;
  totalCount: number;
  count: number;
  hasMore: boolean;
  nextCursor: string;
  items: SearchDirectoryOption[];
}

export type SearchDirectoryStatus = "idle" | "loading" | "ready" | "error";
export type SearchDirectoryLoadingMode = "replace" | "append";

export interface SearchDirectoryModel {
  kind: SearchDirectoryKind;
  query: string;
  pageSize: number;
  status: SearchDirectoryStatus;
  loadingMode: SearchDirectoryLoadingMode | null;
  pendingRequestToken: string | null;
  items: SearchDirectoryOption[];
  selected: SearchDirectoryOption[];
  dataRevision: string;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string;
  error: SearchDirectoryModelError | null;
}

export type SearchDirectoryModelError =
  | "invalid_response"
  | "invalid_request"
  | "stale"
  | "unavailable"
  | "request_failed";

export function createSearchDirectoryModel(
  kind: SearchDirectoryKind,
  selected: SearchDirectoryOption[] = [],
): SearchDirectoryModel {
  return {
    kind,
    query: "",
    pageSize: 50,
    status: "idle",
    loadingMode: null,
    pendingRequestToken: null,
    items: [],
    selected: uniqueDirectoryOptions(selected.filter((option) => option.kind === kind)),
    dataRevision: "",
    totalCount: 0,
    hasMore: false,
    nextCursor: "",
    error: null,
  };
}

function uniqueDirectoryOptions(options: SearchDirectoryOption[]): SearchDirectoryOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (option.id.length === 0 || seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

export function beginSearchDirectoryQuery(
  model: SearchDirectoryModel,
  requestToken: string,
  query: string,
  pageSize = 50,
): SearchDirectoryModel {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return {
      ...model,
      status: "error",
      loadingMode: null,
      pendingRequestToken: null,
      error: "invalid_request",
    };
  }
  return {
    ...model,
    query,
    pageSize,
    status: "loading",
    loadingMode: "replace",
    pendingRequestToken: requestToken,
    items: [],
    dataRevision: "",
    totalCount: 0,
    hasMore: false,
    nextCursor: "",
    error: null,
  };
}

export interface SearchDirectoryContinuation {
  query: string;
  limit: number;
  cursor: string;
  dataRevision: string;
}

export function getSearchDirectoryContinuation(
  model: SearchDirectoryModel,
): SearchDirectoryContinuation | null {
  if (
    model.status !== "ready" ||
    !model.hasMore ||
    model.nextCursor.length === 0 ||
    model.dataRevision.length === 0
  ) {
    return null;
  }
  return {
    query: model.query,
    limit: model.pageSize,
    cursor: model.nextCursor,
    dataRevision: model.dataRevision,
  };
}

export function beginSearchDirectoryContinuation(
  model: SearchDirectoryModel,
  requestToken: string,
): SearchDirectoryModel {
  if (!getSearchDirectoryContinuation(model) || requestToken.length === 0) return model;
  return {
    ...model,
    status: "loading",
    loadingMode: "append",
    pendingRequestToken: requestToken,
    error: null,
  };
}

export function applySearchDirectoryPage(
  model: SearchDirectoryModel,
  requestToken: string,
  page: SearchDirectoryOptionPage,
): SearchDirectoryModel {
  if (model.pendingRequestToken !== requestToken || model.loadingMode === null) {
    return model;
  }
  if (!isValidDirectoryPage(model, page, model.loadingMode)) {
    if (model.loadingMode === "append") {
      return {
        ...model,
        status: "ready",
        loadingMode: null,
        pendingRequestToken: null,
        error: "invalid_response",
      };
    }
    return {
      ...model,
      status: "error",
      loadingMode: null,
      pendingRequestToken: null,
      items: [],
      dataRevision: "",
      totalCount: 0,
      hasMore: false,
      nextCursor: "",
      error: "invalid_response",
    };
  }
  const items = model.loadingMode === "append" ? [...model.items, ...page.items] : [...page.items];
  return {
    ...model,
    status: "ready",
    loadingMode: null,
    pendingRequestToken: null,
    items,
    dataRevision: page.dataRevision,
    totalCount: page.totalCount,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    error: null,
  };
}

export function rejectSearchDirectoryRequest(
  model: SearchDirectoryModel,
  requestToken: string,
  error: SearchDirectoryModelError,
): SearchDirectoryModel {
  if (model.pendingRequestToken !== requestToken || model.loadingMode === null) return model;
  if (model.loadingMode === "append") {
    return {
      ...model,
      status: "ready",
      loadingMode: null,
      pendingRequestToken: null,
      error,
    };
  }
  return {
    ...model,
    status: "error",
    loadingMode: null,
    pendingRequestToken: null,
    items: [],
    dataRevision: "",
    totalCount: 0,
    hasMore: false,
    nextCursor: "",
    error,
  };
}

export function toggleSearchDirectorySelection(
  model: SearchDirectoryModel,
  option: SearchDirectoryOption,
): SearchDirectoryModel {
  if (option.kind !== model.kind || option.id.length === 0) return model;
  const existingIndex = model.selected.findIndex((selected) => selected.id === option.id);
  if (existingIndex >= 0) {
    return {
      ...model,
      selected: model.selected.filter((_, index) => index !== existingIndex),
    };
  }
  return { ...model, selected: [...model.selected, option] };
}

function isValidDirectoryPage(
  model: SearchDirectoryModel,
  page: SearchDirectoryOptionPage,
  mode: SearchDirectoryLoadingMode,
): boolean {
  if (
    page.dataRevision.length === 0 ||
    !Number.isSafeInteger(page.totalCount) ||
    page.totalCount < 0 ||
    page.count !== page.items.length ||
    page.count < 0 ||
    page.count > page.totalCount ||
    page.count > model.pageSize ||
    (page.hasMore && (page.nextCursor.length === 0 || page.count === 0)) ||
    (page.hasMore && page.count !== model.pageSize) ||
    (!page.hasMore && page.nextCursor.length > 0)
  ) {
    return false;
  }
  const seen = new Set<string>();
  for (const option of page.items) {
    if (option.kind !== model.kind || option.id.length === 0 || seen.has(option.id)) return false;
    seen.add(option.id);
  }
  if (mode === "replace") {
    return page.hasMore ? page.count < page.totalCount : page.count === page.totalCount;
  }
  if (page.dataRevision !== model.dataRevision || page.totalCount !== model.totalCount)
    return false;
  const existing = new Set(model.items.map((option) => option.id));
  if (page.items.some((option) => existing.has(option.id))) return false;
  const combinedCount = model.items.length + page.items.length;
  return page.hasMore ? combinedCount < page.totalCount : combinedCount === page.totalCount;
}

export function toConversationDirectoryOptionPage(
  page: SearchConversationDirectoryPage,
): SearchDirectoryOptionPage {
  return {
    dataRevision: page.dataRevision,
    totalCount: page.totalCount,
    count: page.count,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    items: page.items.map((item) => ({
      kind: "conversation",
      id: item.conversationId,
      displayName: item.displayName,
      disambiguator: item.disambiguator,
      conversationKind: item.kind,
    })),
  };
}

export function toSenderDirectoryOptionPage(
  page: SearchSenderDirectoryPage,
): SearchDirectoryOptionPage {
  return {
    dataRevision: page.dataRevision,
    totalCount: page.totalCount,
    count: page.count,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
    items: page.items.map((item) => ({
      kind: "sender",
      id: item.senderId,
      displayName: item.displayName,
      disambiguator: item.disambiguator,
      isSelf: item.isSelf,
      conversationCount: item.conversationCount,
      contextLabel: item.contextLabel,
    })),
  };
}
