import { SEARCH_DIRECTORY_SELF_SENDER_ID } from "@/utils/constants";
import type {
  SearchConversationDirectoryItem,
  SearchConversationDirectoryPage,
  SearchConversationDirectoryRequest,
  SearchSenderDirectoryItem,
  SearchSenderDirectoryPage,
  SearchSenderDirectoryRequest,
} from "@/l2-coordinator/api-docs/search";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

const DEFAULT_DIRECTORY_PAGE_SIZE = 50;
const MAX_DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_QUERY_GRAPHEMES = 200;

export class SearchDirectoryProtocolError extends Error {
  readonly code: "invalid_directory_request" | "invalid_directory_response";

  constructor(code: SearchDirectoryProtocolError["code"]) {
    super(
      code === "invalid_directory_request"
        ? "Search directory request is invalid"
        : "Search directory response is invalid",
    );
    this.name = "SearchDirectoryProtocolError";
    this.code = code;
  }
}

export type SearchDirectoryRequestErrorCode =
  | "directory_invalid_request"
  | "directory_invalid_query"
  | "directory_invalid_scope"
  | "directory_invalid_cursor"
  | "directory_stale"
  | "directory_unavailable"
  | "directory_capacity"
  | "directory_internal"
  | "request_too_large"
  | "request_cancelled"
  | "request_timeout"
  | "database_not_ready"
  | "database_decrypting"
  | "database_error"
  | "request_failed";

export class SearchDirectoryRequestError extends Error {
  readonly code: SearchDirectoryRequestErrorCode;
  readonly status: number | null;

  constructor(code: SearchDirectoryRequestErrorCode, status: number | null) {
    super("Search directory request failed");
    this.name = "SearchDirectoryRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchSearchConversationDirectory(
  request: SearchConversationDirectoryRequest,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SearchConversationDirectoryPage> {
  const body = buildDirectoryRequestBody(request);
  const raw = await requestSearchDirectoryJson(
    buildChatlogApiUrl("/api/v1/search/conversations/query", diagnosticOptions?.serviceBaseUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 30_000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "search_conversation_directory",
        method: "POST",
      }),
    },
  );
  const page = adaptConversationDirectoryPage(raw, body.data_revision, body.limit);
  if (!page) throw new SearchDirectoryProtocolError("invalid_directory_response");
  return page;
}

export async function fetchSearchSenderDirectory(
  request: SearchSenderDirectoryRequest,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SearchSenderDirectoryPage> {
  const baseBody = buildDirectoryRequestBody(request);
  if (!isValidSenderScope(request.scope, request.chats)) {
    throw new SearchDirectoryProtocolError("invalid_directory_request");
  }
  const body = { ...baseBody, scope: request.scope, chats: [...request.chats] };
  const raw = await requestSearchDirectoryJson(
    buildChatlogApiUrl("/api/v1/search/senders/query", diagnosticOptions?.serviceBaseUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 30_000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "search_sender_directory",
        method: "POST",
      }),
    },
  );
  const page = adaptSenderDirectoryPage(raw, body.data_revision, body.limit);
  if (!page) throw new SearchDirectoryProtocolError("invalid_directory_response");
  return page;
}

async function requestSearchDirectoryJson(
  url: string,
  options: Parameters<typeof requestJson>[1],
): Promise<unknown> {
  try {
    return await requestJson<unknown>(url, options);
  } catch (error) {
    throw toSafeDirectoryRequestError(error);
  }
}

function toSafeDirectoryRequestError(error: unknown): SearchDirectoryRequestError {
  if (!(error instanceof ChatlogHttpError)) {
    return new SearchDirectoryRequestError("request_failed", null);
  }
  if (error.status === null) {
    if (error.message === "请求已取消") {
      return new SearchDirectoryRequestError("request_cancelled", null);
    }
    if (error.message === "请求超时") {
      return new SearchDirectoryRequestError("request_timeout", null);
    }
    return new SearchDirectoryRequestError("request_failed", null);
  }
  const code = readSafeDirectoryErrorCode(error.body, error.status);
  return new SearchDirectoryRequestError(code, error.status);
}

function readSafeDirectoryErrorCode(
  body: string | null,
  status: number,
): SearchDirectoryRequestErrorCode {
  let code: unknown;
  try {
    const payload: unknown = body ? JSON.parse(body) : null;
    code = isRecord(payload) ? payload.code : undefined;
  } catch {
    return "request_failed";
  }
  const allowedByStatus: Partial<Record<number, readonly SearchDirectoryRequestErrorCode[]>> = {
    400: [
      "directory_invalid_request",
      "directory_invalid_query",
      "directory_invalid_scope",
      "directory_invalid_cursor",
    ],
    409: ["directory_stale"],
    413: ["request_too_large"],
    499: ["request_cancelled"],
    500: ["directory_internal"],
    503: [
      "directory_unavailable",
      "directory_capacity",
      "database_not_ready",
      "database_decrypting",
      "database_error",
    ],
    504: ["request_timeout"],
  };
  const candidates = allowedByStatus[status];
  return typeof code === "string" && candidates?.includes(code as SearchDirectoryRequestErrorCode)
    ? (code as SearchDirectoryRequestErrorCode)
    : "request_failed";
}

function buildDirectoryRequestBody(request: SearchConversationDirectoryRequest): {
  query: string;
  limit: number;
  cursor: string;
  data_revision: string;
} {
  const cursor = request?.cursor ?? "";
  const dataRevision = request?.dataRevision ?? "";
  const limit = request?.limit ?? DEFAULT_DIRECTORY_PAGE_SIZE;
  if (
    !request ||
    typeof request.query !== "string" ||
    countGraphemes(request.query.normalize("NFKC").trim().replace(/\s+/gu, " ")) >
      MAX_DIRECTORY_QUERY_GRAPHEMES ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_DIRECTORY_PAGE_SIZE ||
    typeof cursor !== "string" ||
    typeof dataRevision !== "string" ||
    (cursor === "") !== (dataRevision === "")
  ) {
    throw new SearchDirectoryProtocolError("invalid_directory_request");
  }
  return { query: request.query, limit, cursor, data_revision: dataRevision };
}

function adaptConversationDirectoryPage(
  raw: unknown,
  expectedRevision: string,
  expectedLimit: number,
): SearchConversationDirectoryPage | null {
  if (!isRecord(raw)) return null;
  const base = adaptDirectoryPageBase(raw, expectedRevision, expectedLimit);
  if (!base || !Array.isArray(raw.items)) return null;
  const items: SearchConversationDirectoryItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw.items) {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ["conversation_id", "display_name", "kind", "disambiguator"]) ||
      !isNonEmptyString(entry.conversation_id) ||
      !isNonEmptyString(entry.display_name) ||
      (entry.kind !== "direct" && entry.kind !== "group") ||
      typeof entry.disambiguator !== "string" ||
      seen.has(entry.conversation_id)
    ) {
      return null;
    }
    seen.add(entry.conversation_id);
    items.push({
      conversationId: entry.conversation_id,
      displayName: entry.display_name,
      kind: entry.kind,
      disambiguator: entry.disambiguator,
    });
  }
  if (base.count !== items.length) return null;
  return { ...base, items };
}

function adaptSenderDirectoryPage(
  raw: unknown,
  expectedRevision: string,
  expectedLimit: number,
): SearchSenderDirectoryPage | null {
  if (!isRecord(raw)) return null;
  const base = adaptDirectoryPageBase(raw, expectedRevision, expectedLimit);
  if (!base || !Array.isArray(raw.items)) return null;
  const items: SearchSenderDirectoryItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw.items) {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, [
        "sender_id",
        "display_name",
        "is_self",
        "conversation_count",
        "context_label",
        "disambiguator",
      ]) ||
      !isNonEmptyString(entry.sender_id) ||
      !isNonEmptyString(entry.display_name) ||
      typeof entry.is_self !== "boolean" ||
      !isPositiveSafeInteger(entry.conversation_count) ||
      !isNonEmptyString(entry.context_label) ||
      typeof entry.disambiguator !== "string" ||
      entry.is_self !== (entry.sender_id === SEARCH_DIRECTORY_SELF_SENDER_ID) ||
      seen.has(entry.sender_id)
    ) {
      return null;
    }
    seen.add(entry.sender_id);
    items.push({
      senderId: entry.sender_id,
      displayName: entry.display_name,
      isSelf: entry.is_self,
      conversationCount: entry.conversation_count,
      contextLabel: entry.context_label,
      disambiguator: entry.disambiguator,
    });
  }
  if (base.count !== items.length) return null;
  return { ...base, items };
}

function isValidSenderScope(
  scope: SearchSenderDirectoryRequest["scope"],
  chats: unknown,
): chats is string[] {
  if (!Array.isArray(chats)) return false;
  if (
    (scope === "all" && chats.length !== 0) ||
    (scope === "current" && chats.length !== 1) ||
    (scope === "selected" && chats.length === 0) ||
    (scope !== "all" && scope !== "current" && scope !== "selected")
  ) {
    return false;
  }
  const seen = new Set<string>();
  for (const chat of chats) {
    if (typeof chat !== "string" || chat.trim().length === 0 || seen.has(chat)) return false;
    seen.add(chat);
  }
  return true;
}

function adaptDirectoryPageBase(raw: unknown, expectedRevision: string, expectedLimit: number) {
  if (
    !isRecord(raw) ||
    !hasExactKeys(raw, [
      "data_revision",
      "exact_total",
      "complete",
      "total_count",
      "count",
      "has_more",
      "next_cursor",
      "items",
    ]) ||
    !isNonEmptyString(raw.data_revision) ||
    raw.exact_total !== true ||
    raw.complete !== true ||
    !isNonNegativeSafeInteger(raw.total_count) ||
    !isNonNegativeSafeInteger(raw.count) ||
    raw.count > MAX_DIRECTORY_PAGE_SIZE ||
    raw.count > expectedLimit ||
    raw.count > raw.total_count ||
    typeof raw.has_more !== "boolean" ||
    typeof raw.next_cursor !== "string" ||
    (raw.has_more && raw.next_cursor.length === 0) ||
    (!raw.has_more && raw.next_cursor.length > 0) ||
    (raw.has_more && raw.count === 0) ||
    (raw.has_more && raw.count !== expectedLimit) ||
    (expectedRevision === "" &&
      ((raw.has_more && raw.total_count <= raw.count) ||
        (!raw.has_more && raw.total_count !== raw.count))) ||
    (expectedRevision !== "" && raw.data_revision !== expectedRevision)
  ) {
    return null;
  }
  return {
    dataRevision: raw.data_revision,
    exactTotal: true as const,
    complete: true as const,
    totalCount: raw.total_count,
    count: raw.count,
    hasMore: raw.has_more,
    nextCursor: raw.next_cursor,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
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
  if (Segmenter) {
    return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value)).length;
  }
  let count = 0;
  let joinNext = false;
  let regionalRun = 0;
  let previous = "";
  for (const character of value) {
    if (character === "\u200D") {
      joinNext = true;
      continue;
    }
    if (
      /\p{Mark}/u.test(character) ||
      /[\uFE00-\uFE0F]/u.test(character) ||
      /[\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(character)
    ) {
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
