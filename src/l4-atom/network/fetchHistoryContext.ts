import {
  HISTORY_CONTEXT_CONTRACT_VERSION,
  HISTORY_CONTEXT_DEFAULT_LIMIT,
  HISTORY_CONTEXT_MAX_LIMIT,
  type HistoryContextMessage,
  type HistoryContextPage,
  type HistoryContextRequest,
} from "@/l2-coordinator/api-docs/historyContext";
import { SEARCH_DIRECTORY_SELF_SENDER_ID } from "@/l2-coordinator/api-docs/search";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

const MAX_OPAQUE_TOKEN_BYTES = 4_096;

export class HistoryContextProtocolError extends Error {
  readonly code: "invalid_history_context_request" | "invalid_history_context_response";

  constructor(code: HistoryContextProtocolError["code"]) {
    super(
      code === "invalid_history_context_request"
        ? "History context request is invalid"
        : "History context response is invalid",
    );
    this.name = "HistoryContextProtocolError";
    this.code = code;
  }
}

export type HistoryContextRequestErrorCode =
  | "history_context_invalid_request"
  | "history_context_invalid_conversation"
  | "history_context_invalid_seq"
  | "history_context_invalid_limit"
  | "history_context_conversation_not_found"
  | "history_context_message_not_found"
  | "history_context_stale"
  | "history_context_identity_conflict"
  | "history_context_request_too_large"
  | "history_context_cancelled"
  | "history_context_internal"
  | "history_context_capacity"
  | "history_context_unavailable"
  | "history_context_timeout"
  | "database_not_ready"
  | "database_decrypting"
  | "database_error"
  | "request_failed";

export class HistoryContextRequestError extends Error {
  readonly code: HistoryContextRequestErrorCode;
  readonly status: number | null;

  constructor(code: HistoryContextRequestErrorCode, status: number | null) {
    super("History context request failed");
    this.name = "HistoryContextRequestError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchHistoryContext(
  request: HistoryContextRequest,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HistoryContextPage> {
  const body = buildHistoryContextRequestBody(request);
  const raw = await requestHistoryContextJson(
    buildChatlogApiUrl("/api/v1/history/context/query", diagnosticOptions?.serviceBaseUrl),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs: 30_000,
      appendJsonFormat: false,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "history_context",
        method: "POST",
      }),
    },
  );
  const expectedLimit =
    request.limit && request.limit > 0 ? request.limit : HISTORY_CONTEXT_DEFAULT_LIMIT;
  const page = adaptHistoryContextPage(raw, {
    conversationId: request.conversationId,
    seq: request.seq,
    dataRevision: request.dataRevision ?? "",
    limit: expectedLimit,
  });
  if (!page) throw new HistoryContextProtocolError("invalid_history_context_response");
  return page;
}

async function requestHistoryContextJson(
  url: string,
  options: Parameters<typeof requestJson>[1],
): Promise<unknown> {
  try {
    return await requestJson<unknown>(url, options);
  } catch (error) {
    throw toSafeHistoryContextRequestError(error);
  }
}

function toSafeHistoryContextRequestError(error: unknown): HistoryContextRequestError {
  if (!(error instanceof ChatlogHttpError)) {
    return new HistoryContextRequestError("request_failed", null);
  }
  if (error.status === null) {
    if (error.message === "请求已取消") {
      return new HistoryContextRequestError("history_context_cancelled", null);
    }
    if (error.message === "请求超时") {
      return new HistoryContextRequestError("history_context_timeout", null);
    }
    return new HistoryContextRequestError("request_failed", null);
  }
  return new HistoryContextRequestError(
    readSafeHistoryContextErrorCode(error.body, error.status),
    error.status,
  );
}

function readSafeHistoryContextErrorCode(
  body: string | null,
  status: number,
): HistoryContextRequestErrorCode {
  let code: unknown;
  try {
    const payload: unknown = body ? JSON.parse(body) : null;
    code = isRecord(payload) ? payload.code : undefined;
  } catch {
    return "request_failed";
  }
  const allowedByStatus: Partial<Record<number, readonly HistoryContextRequestErrorCode[]>> = {
    400: [
      "history_context_invalid_request",
      "history_context_invalid_conversation",
      "history_context_invalid_seq",
      "history_context_invalid_limit",
    ],
    404: ["history_context_conversation_not_found", "history_context_message_not_found"],
    409: ["history_context_stale", "history_context_identity_conflict"],
    413: ["history_context_request_too_large"],
    499: ["history_context_cancelled"],
    500: ["history_context_internal"],
    503: [
      "history_context_capacity",
      "history_context_unavailable",
      "database_not_ready",
      "database_decrypting",
      "database_error",
    ],
    504: ["history_context_timeout"],
  };
  const candidates = allowedByStatus[status];
  return typeof code === "string" && candidates?.includes(code as HistoryContextRequestErrorCode)
    ? (code as HistoryContextRequestErrorCode)
    : "request_failed";
}

function buildHistoryContextRequestBody(request: HistoryContextRequest): Record<string, unknown> {
  if (
    !request ||
    !isBoundedPrivateIdentifier(request.conversationId) ||
    !isPositiveSafeInteger(request.seq) ||
    !isOptionalLimit(request.limit) ||
    !isOptionalBoundedToken(request.dataRevision)
  ) {
    throw new HistoryContextProtocolError("invalid_history_context_request");
  }
  const body: Record<string, unknown> = {
    conversation_id: request.conversationId,
    seq: request.seq,
  };
  if (request.limit !== undefined) body.limit = request.limit;
  if (request.dataRevision !== undefined) body.data_revision = request.dataRevision;
  return body;
}

function adaptHistoryContextPage(
  raw: unknown,
  expected: { conversationId: string; seq: number; dataRevision: string; limit: number },
): HistoryContextPage | null {
  if (
    !isRecord(raw) ||
    !hasExactKeys(raw, [
      "contract_version",
      "data_revision",
      "exact",
      "complete",
      "conversation_id",
      "anchor_seq",
      "anchor_index",
      "limit",
      "count",
      "has_before",
      "has_after",
      "messages",
    ]) ||
    raw.contract_version !== HISTORY_CONTEXT_CONTRACT_VERSION ||
    !isBoundedNonEmptyToken(raw.data_revision) ||
    (expected.dataRevision !== "" && raw.data_revision !== expected.dataRevision) ||
    raw.exact !== true ||
    raw.complete !== true ||
    raw.conversation_id !== expected.conversationId ||
    raw.anchor_seq !== expected.seq ||
    raw.limit !== expected.limit ||
    !isPositiveSafeInteger(raw.limit) ||
    raw.limit > HISTORY_CONTEXT_MAX_LIMIT ||
    !isPositiveSafeInteger(raw.count) ||
    raw.count > raw.limit ||
    !isNonNegativeSafeInteger(raw.anchor_index) ||
    raw.anchor_index >= raw.count ||
    typeof raw.has_before !== "boolean" ||
    typeof raw.has_after !== "boolean" ||
    !Array.isArray(raw.messages) ||
    raw.messages.length !== raw.count
  ) {
    return null;
  }

  const messages: HistoryContextMessage[] = [];
  let previousSeq = 0;
  for (const entry of raw.messages) {
    const message = adaptHistoryContextMessage(entry, expected.conversationId, previousSeq);
    if (!message) return null;
    previousSeq = message.seq;
    messages.push(message);
  }
  if (messages[raw.anchor_index]?.seq !== expected.seq) return null;
  const conversationName = messages[raw.anchor_index].conversationName;
  if (messages.some((message) => message.conversationName !== conversationName)) return null;

  return {
    contractVersion: HISTORY_CONTEXT_CONTRACT_VERSION,
    dataRevision: raw.data_revision,
    exact: true,
    complete: true,
    conversationId: expected.conversationId,
    anchorSeq: expected.seq,
    anchorIndex: raw.anchor_index,
    limit: raw.limit,
    count: raw.count,
    hasBefore: raw.has_before,
    hasAfter: raw.has_after,
    messages,
  };
}

function adaptHistoryContextMessage(
  raw: unknown,
  conversationId: string,
  previousSeq: number,
): HistoryContextMessage | null {
  if (
    !isRecord(raw) ||
    !hasExactKeys(raw, [
      "seq",
      "timestamp",
      "conversation_id",
      "conversation_name",
      "sender_id",
      "sender_name",
      "is_self",
      "type",
      "sub_type",
      "content",
    ]) ||
    !isPositiveSafeInteger(raw.seq) ||
    raw.seq <= previousSeq ||
    !isNonNegativeSafeInteger(raw.timestamp) ||
    raw.conversation_id !== conversationId ||
    typeof raw.conversation_name !== "string" ||
    typeof raw.sender_id !== "string" ||
    typeof raw.sender_name !== "string" ||
    typeof raw.is_self !== "boolean" ||
    raw.is_self !== (raw.sender_id === SEARCH_DIRECTORY_SELF_SENDER_ID) ||
    !isSafeInteger(raw.type) ||
    !isSafeInteger(raw.sub_type) ||
    typeof raw.content !== "string"
  ) {
    return null;
  }
  return {
    seq: raw.seq,
    timestamp: raw.timestamp,
    conversationId,
    conversationName: raw.conversation_name,
    senderId: raw.sender_id,
    senderName: raw.sender_name,
    isSelf: raw.is_self,
    type: raw.type,
    subType: raw.sub_type,
    content: raw.content,
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

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value > 0;
}

function isOptionalLimit(value: unknown): boolean {
  return (
    value === undefined ||
    (isSafeInteger(value) && value >= 0 && value <= HISTORY_CONTEXT_MAX_LIMIT)
  );
}

function isBoundedPrivateIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    utf8ByteLength(value) <= MAX_OPAQUE_TOKEN_BYTES
  );
}

function isOptionalBoundedToken(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && utf8ByteLength(value) <= MAX_OPAQUE_TOKEN_BYTES)
  );
}

function isBoundedNonEmptyToken(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && utf8ByteLength(value) <= MAX_OPAQUE_TOKEN_BYTES
  );
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
