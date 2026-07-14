import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawSearchResponse } from "./chatlogRawTypes";
import {
  adaptSearchCapabilities,
  adaptSearchResponse,
  adaptSearchV2Response,
} from "./chatlogAdapters";
import {
  SEARCH_CATEGORIES,
  type SearchCapabilities,
  type SearchV2Request,
} from "@/l2-coordinator/api-docs/search";

export interface FetchSearchOptions {
  keyword: string;
  limit?: number;
  offset?: number;
  chats?: string[];
  time?: string;
  since?: number;
  until?: number;
  msgType?: number;
}

export class SearchProtocolError extends Error {
  readonly code: "invalid_search_request" | "invalid_search_response";

  constructor(code: SearchProtocolError["code"]) {
    super(
      code === "invalid_search_request"
        ? "Search request is invalid"
        : "Search response is invalid",
    );
    this.name = "SearchProtocolError";
    this.code = code;
  }
}

export async function fetchSearch(
  options: FetchSearchOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("keyword", options.keyword);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.chats && options.chats.length > 0) params.set("chats", options.chats.join(","));
  if (options.time) params.set("time", options.time);
  if (options.since !== undefined) params.set("since", String(options.since));
  if (options.until !== undefined) params.set("until", String(options.until));
  if (options.msgType !== undefined) params.set("msg_type", String(options.msgType));

  const raw = await requestJson<RawSearchResponse>(
    buildChatlogApiUrl(`/api/v1/search?${params.toString()}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 20000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "search",
        method: "GET",
      }),
    },
  );
  return adaptSearchResponse(raw);
}

export async function fetchSearchCapabilities(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SearchCapabilities> {
  try {
    const raw = await requestJson<unknown>(
      buildChatlogApiUrl("/api/v1/search/capabilities", diagnosticOptions?.serviceBaseUrl),
      {
        method: "GET",
        timeoutMs: 10000,
        ...withRequestDiagnostics(diagnosticOptions, {
          endpointFamily: "search_capabilities",
          method: "GET",
        }),
      },
    );
    return adaptSearchCapabilities(raw) ?? legacySearchCapabilities("invalid_response");
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 404) {
      return legacySearchCapabilities("not_supported");
    }
    throw error;
  }
}

export async function fetchSearchV2(
  request: SearchV2Request,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  validateSearchV2Request(request);
  const body: Record<string, unknown> = { keyword: request.keyword };
  if (request.chats !== undefined) body.chats = request.chats;
  if (request.categories !== undefined) body.categories = request.categories;
  if (request.senderIds !== undefined) body.sender_ids = request.senderIds;
  if (request.since !== undefined) body.since = request.since;
  if (request.until !== undefined) body.until = request.until;
  if (request.limit !== undefined) body.limit = request.limit;
  if (request.snapshotId) body.snapshot_id = request.snapshotId;
  if (request.dataRevision) body.data_revision = request.dataRevision;
  if (request.cursor) body.cursor = request.cursor;

  const raw = await requestJson<unknown>(
    buildChatlogApiUrl("/api/v1/search", diagnosticOptions?.serviceBaseUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 30000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "search",
        method: "POST",
      }),
    },
  );
  const adapted = adaptSearchV2Response(raw);
  if (!adapted) throw new SearchProtocolError("invalid_search_response");
  return adapted;
}

function validateSearchV2Request(request: SearchV2Request): void {
  if (
    !request ||
    typeof request.keyword !== "string" ||
    request.keyword.trim().length === 0 ||
    !isOptionalIntegerInRange(request.limit, 1, 50) ||
    !isOptionalSafeInteger(request.since) ||
    !isOptionalSafeInteger(request.until) ||
    (request.since !== undefined && request.until !== undefined && request.since > request.until) ||
    !isOptionalPrivateIDList(request.chats) ||
    !isOptionalPrivateIDList(request.senderIds) ||
    !isOptionalCategoryList(request.categories) ||
    !isOptionalNonEmptyString(request.snapshotId) ||
    !isOptionalNonEmptyString(request.dataRevision) ||
    !isOptionalNonEmptyString(request.cursor) ||
    (request.snapshotId === undefined) !== (request.dataRevision === undefined) ||
    (request.cursor !== undefined && request.snapshotId === undefined)
  ) {
    throw new SearchProtocolError("invalid_search_request");
  }
}

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.length > 0);
}

function isOptionalIntegerInRange(value: unknown, minimum: number, maximum: number): boolean {
  return (
    value === undefined ||
    (Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum)
  );
}

function isOptionalSafeInteger(value: unknown): boolean {
  return value === undefined || Number.isSafeInteger(value);
}

function isOptionalPrivateIDList(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0))
  );
}

function isOptionalCategoryList(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "string" && (SEARCH_CATEGORIES as readonly string[]).includes(item),
      ))
  );
}

function legacySearchCapabilities(
  unavailableReason: NonNullable<SearchCapabilities["unavailableReason"]>,
): SearchCapabilities {
  return {
    mode: "legacy",
    contractVersion: "legacy",
    exactTotal: false,
    completeScope: false,
    senderFilter: false,
    taxonomy: [],
    snapshotCursor: false,
    inclusiveTimeBoundaries: false,
    defaultPageSize: 20,
    maxPageSize: 50,
    maxKeywordGraphemes: 0,
    maxKeywordTerms: 0,
    directoryVersion: "legacy",
    conversationDirectory: false,
    senderDirectory: false,
    directorySelfSenderId: "",
    directoryDefaultPageSize: 0,
    directoryMaxPageSize: 0,
    directoryMaxQueryGraphemes: 0,
    historyContextVersion: "legacy",
    historyContextQuery: false,
    historyContextRevisionBinding: false,
    historyContextDefaultLimit: 0,
    historyContextMaxLimit: 0,
    historyContextMaxExactCandidates: 0,
    historyContextMaxExactBatches: 0,
    historyContextMaxShards: 0,
    unavailableReason,
  };
}
