export type DbFileCategory = "message" | "media" | "sns" | "contact" | "system" | "other";
export type DbSearchMode = "quick" | "deep";
export type DbStatementKind = "select" | "pragma" | "explain" | "blocked";
export type DbSqlBlockReason = "empty" | "multi-statement" | "mutation" | "unsupported";

export interface AdaptedDbFile {
  id: string;
  group: string;
  file: string;
  displayName: string;
  groupLabel: string;
  category: DbFileCategory;
}

export interface AdaptedDbRow {
  id: string;
  cells: Record<string, string>;
}

export interface AdaptedDbRowsTable {
  columns: string[];
  rows: AdaptedDbRow[];
  rowCount: number;
  columnCount: number;
  isEmpty: boolean;
}

export interface AdaptedDbSearchHit {
  id: string;
  group: string;
  file: string;
  dbName: string;
  table: string;
  column: string;
  rowId: string;
  preview: string;
  rowSummary: string;
}

export interface AdaptedDbSearchResponse {
  keyword: string;
  mode: DbSearchMode;
  total: number;
  items: AdaptedDbSearchHit[];
}

export interface ReadOnlySqlClassification {
  allowed: boolean;
  kind: DbStatementKind;
  reason?: DbSqlBlockReason;
  message: string;
}

interface RawDbSearchHit {
  group?: unknown;
  file?: unknown;
  db_name?: unknown;
  table?: unknown;
  column?: unknown;
  row_id?: unknown;
  preview?: unknown;
  row?: unknown;
}

interface RawDbSearchResponse {
  keyword?: unknown;
  mode?: unknown;
  total?: unknown;
  items?: unknown;
}

const MUTATION_KEYWORDS = /\b(insert|update|delete|drop|alter|create|replace|truncate|vacuum|reindex|begin|commit|rollback)\b/i;
const UNSUPPORTED_KEYWORDS = /\b(attach|detach|load_extension)\b/i;
const MUTATING_PRAGMA_NAMES = new Set([
  "application_id",
  "auto_vacuum",
  "cache_size",
  "foreign_keys",
  "ignore_check_constraints",
  "incremental_vacuum",
  "journal_mode",
  "locking_mode",
  "mmap_size",
  "optimize",
  "schema_version",
  "secure_delete",
  "synchronous",
  "temp_store",
  "user_version",
  "wal_checkpoint",
  "writable_schema",
]);
const MAX_CELL_LENGTH = 120;

export function adaptDbFilesResponse(raw: unknown): AdaptedDbFile[] {
  if (!isRecord(raw)) return [];

  return Object.entries(raw).flatMap(([group, value]) => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((file): file is string => typeof file === "string" && file.trim().length > 0)
      .map((file) => ({
        id: `${group}/${file}`,
        group,
        file,
        displayName: file,
        groupLabel: group,
        category: categorizeDbFile(group, file),
      }));
  });
}

export function adaptDbRowsResponse(raw: unknown): AdaptedDbRowsTable {
  const rows = normalizeRawRows(raw);
  const columns = rows.reduce<string[]>((keys, row) => {
    for (const key of Object.keys(row)) {
      if (!keys.includes(key)) keys.push(key);
    }
    return keys;
  }, []);

  const adaptedRows = rows.map((row, index) => {
    const cells = columns.reduce<Record<string, string>>((result, column) => {
      result[column] = formatDbCellValue(row[column], false);
      return result;
    }, {});

    return {
      id: cellIdentity(row, index),
      cells,
    };
  });

  return {
    columns,
    rows: adaptedRows,
    rowCount: adaptedRows.length,
    columnCount: columns.length,
    isEmpty: adaptedRows.length === 0,
  };
}

export function adaptDbSearchResponse(raw: RawDbSearchResponse): AdaptedDbSearchResponse {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const mode = raw.mode === "deep" ? "deep" : "quick";

  return {
    keyword: safeString(raw.keyword),
    mode,
    total: safeNumber(raw.total, items.length),
    items: items
      .filter(isRecord)
      .map((item) => adaptDbSearchHit(item as RawDbSearchHit)),
  };
}

export function classifyReadOnlySql(sql: string): ReadOnlySqlClassification {
  const normalized = normalizeSql(sql);
  if (!normalized) {
    return {
      allowed: false,
      kind: "blocked",
      reason: "empty",
      message: "请输入只读 SQL。",
    };
  }

  const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "").trim();
  if (withoutTrailingSemicolon.includes(";")) {
    return {
      allowed: false,
      kind: "blocked",
      reason: "multi-statement",
      message: "一次只能执行一条只读 SQL。",
    };
  }

  const statement = withoutTrailingSemicolon.toLowerCase();
  const scanTarget = stripSqlLiterals(statement);
  if (UNSUPPORTED_KEYWORDS.test(scanTarget)) {
    return {
      allowed: false,
      kind: "blocked",
      reason: "unsupported",
      message: "该 SQL 语句不在允许的只读范围内。",
    };
  }

  if (MUTATION_KEYWORDS.test(scanTarget)) {
    return {
      allowed: false,
      kind: "blocked",
      reason: "mutation",
      message: "已阻止可能修改数据库的 SQL。",
    };
  }

  if (/^select\b/i.test(withoutTrailingSemicolon)) {
    return { allowed: true, kind: "select", message: "只读 SELECT 查询。" };
  }

  if (/^with\b/i.test(withoutTrailingSemicolon) && /\bselect\b/i.test(withoutTrailingSemicolon)) {
    return { allowed: true, kind: "select", message: "只读 WITH/SELECT 查询。" };
  }

  if (/^pragma\b/i.test(withoutTrailingSemicolon) && isReadOnlyPragma(withoutTrailingSemicolon)) {
    return { allowed: true, kind: "pragma", message: "只读 PRAGMA 查询。" };
  }

  if (/^pragma\b/i.test(withoutTrailingSemicolon)) {
    return {
      allowed: false,
      kind: "blocked",
      reason: "mutation",
      message: "已阻止可能修改数据库设置的 PRAGMA。",
    };
  }

  if (/^explain\b/i.test(withoutTrailingSemicolon)) {
    return { allowed: true, kind: "explain", message: "只读 EXPLAIN 查询。" };
  }

  return {
    allowed: false,
    kind: "blocked",
    reason: "unsupported",
    message: "仅允许 SELECT、WITH SELECT、PRAGMA 或 EXPLAIN。",
  };
}

export function formatDbCellValue(value: unknown, privacyOn: boolean): string {
  if (value === null || value === undefined) return "";
  if (privacyOn) return "已隐藏";

  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > MAX_CELL_LENGTH ? `${text.slice(0, MAX_CELL_LENGTH)}...` : text;
}

export function maskDbFile(file: AdaptedDbFile): AdaptedDbFile {
  return {
    ...file,
    displayName: "已隐藏数据库文件",
  };
}

function adaptDbSearchHit(raw: RawDbSearchHit): AdaptedDbSearchHit {
  const group = safeString(raw.group);
  const file = safeString(raw.file);
  const table = safeString(raw.table);
  const column = safeString(raw.column);
  const rowId = safeString(raw.row_id);

  return {
    id: [group, file, table, column, rowId].filter(Boolean).join("/") || "db-search-hit",
    group,
    file,
    dbName: safeString(raw.db_name) || file,
    table,
    column,
    rowId,
    preview: formatDbCellValue(raw.preview, false),
    rowSummary: summarizeRow(raw.row),
  };
}

function normalizeRawRows(raw: unknown): Array<Record<string, unknown>> {
  const value = isRecord(raw) && Array.isArray(raw.items) ? raw.items : raw;
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function summarizeRow(row: unknown): string {
  if (!isRecord(row)) return "";
  return Object.entries(row)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${summarizeCell(value)}`)
    .join(" · ");
}

function summarizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.length > 20 ? `[text:${value.length}]` : value;
  return Array.isArray(value) ? `[items:${value.length}]` : "[object]";
}

function cellIdentity(row: Record<string, unknown>, index: number): string {
  const value = row.id ?? row.local_id ?? row.rowid ?? row.row_id;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return `row-${index + 1}`;
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();
}

function stripSqlLiterals(sql: string): string {
  return sql.replace(/'([^']|'')*'/g, "''").replace(/"([^"]|"")*"/g, "\"\"");
}

function isReadOnlyPragma(statement: string): boolean {
  if (statement.includes("=")) return false;

  const match = /^pragma\s+(?:\w+\.)?([a-z_]+)/i.exec(statement.trim());
  const name = match?.[1]?.toLowerCase();
  return Boolean(name && !MUTATING_PRAGMA_NAMES.has(name));
}

function categorizeDbFile(group: string, file: string): DbFileCategory {
  const text = `${group} ${file}`.toLowerCase();
  if (text.includes("media")) return "media";
  if (text.includes("sns")) return "sns";
  if (text.includes("contact") || text.includes("wccontact")) return "contact";
  if (text.includes("msg") || text.includes("message")) return "message";
  if (text.includes("config") || text.includes("system")) return "system";
  return "other";
}

function safeString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
