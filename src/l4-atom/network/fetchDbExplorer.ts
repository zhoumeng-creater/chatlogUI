import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  adaptDbFilesResponse,
  adaptDbRowsResponse,
  adaptDbSearchResponse,
  classifyReadOnlySql,
  type AdaptedDbRowsTable,
  type AdaptedDbSearchResponse,
  type DbSqlBlockReason,
  type ReadOnlySqlClassification,
} from "./dbExplorerAdapters";
import type { AdaptedDbFile } from "./dbExplorerAdapters";

export class DbQueryBlockedError extends Error {
  readonly reason: DbSqlBlockReason;
  readonly classification: ReadOnlySqlClassification;

  constructor(classification: ReadOnlySqlClassification) {
    super(classification.message);
    this.name = "DbQueryBlockedError";
    this.reason = classification.reason ?? "unsupported";
    this.classification = classification;
  }
}

export interface FetchDbTablesOptions {
  group: string;
  file: string;
}

export interface FetchDbTableDataOptions extends FetchDbTablesOptions {
  table: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface SearchDbOptions {
  keyword: string;
  mode?: "quick" | "deep";
  limit?: number;
}

export interface ExecuteReadOnlyDbQueryOptions extends FetchDbTablesOptions {
  sql: string;
}

export interface ClearDbCacheResponse {
  message: string;
  deletedCount: number;
}

export async function fetchDbFiles(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<AdaptedDbFile[]> {
  const raw = await requestJson<unknown>(buildChatlogApiUrl("/api/v1/db?format=json", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "db",
      method: "GET",
    }),
  });

  return adaptDbFilesResponse(raw);
}

export async function fetchDbTables(
  options: FetchDbTablesOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<string[]> {
  const params = dbRefParams(options);
  const raw = await requestJson<unknown>(buildChatlogApiUrl(`/api/v1/db/tables?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "db_tables",
      method: "GET",
    }),
  });

  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
}

export async function fetchDbTableData(
  options: FetchDbTableDataOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<AdaptedDbRowsTable> {
  const params = dbRefParams(options);
  params.set("table", options.table);
  if (options.keyword) params.set("keyword", options.keyword);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));

  const raw = await requestJson<unknown>(buildChatlogApiUrl(`/api/v1/db/data?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 20000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "db_data",
      method: "GET",
    }),
  });

  return adaptDbRowsResponse(raw);
}

export async function searchDb(
  options: SearchDbOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<AdaptedDbSearchResponse> {
  const keyword = options.keyword.trim();
  if (!keyword) {
    throw new Error("请输入数据库搜索关键词。");
  }

  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("keyword", keyword);
  params.set("mode", options.mode ?? "quick");
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const raw = await requestJson<unknown>(buildChatlogApiUrl(`/api/v1/db/search?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: options.mode === "deep" ? 45000 : 20000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "db_search",
      method: "GET",
    }),
  });

  return adaptDbSearchResponse(raw as Parameters<typeof adaptDbSearchResponse>[0]);
}

export async function executeReadOnlyDbQuery(
  options: ExecuteReadOnlyDbQueryOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<AdaptedDbRowsTable> {
  const classification = classifyReadOnlySql(options.sql);
  if (!classification.allowed) {
    throw new DbQueryBlockedError(classification);
  }

  const params = dbRefParams(options);
  params.set("sql", options.sql.trim());

  const raw = await requestJson<unknown>(buildChatlogApiUrl(`/api/v1/db/query?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "db_query",
      method: "GET",
    }),
  });

  return adaptDbRowsResponse(raw);
}

export async function clearDbCache(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<ClearDbCacheResponse> {
  const raw = await requestJson<Partial<ClearDbCacheResponse>>(
    buildChatlogApiUrl("/api/v1/cache/clear?format=json", diagnosticOptions?.serviceBaseUrl),
    {
      method: "POST",
      timeoutMs: 30000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "cache_clear",
        method: "POST",
      }),
    },
  );

  return {
    message: raw.message ?? "Cache clear completed",
    deletedCount: typeof raw.deletedCount === "number" ? raw.deletedCount : 0,
  };
}

function dbRefParams(options: FetchDbTablesOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("group", options.group);
  params.set("file", options.file);
  return params;
}
