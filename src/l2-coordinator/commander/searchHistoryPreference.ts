import { normalizeSearchKeyword } from "./searchDraftModel";

const MAX_SEARCH_HISTORY_TERMS = 5;
export const SEARCH_HISTORY_STORAGE_VERSION = 1 as const;
export const SEARCH_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SearchHistoryEntry {
  normalizedQuery: string;
  displayQuery: string;
  succeededAt: number;
  expiresAt: number;
}

export interface SearchHistoryStorageValue {
  version: typeof SEARCH_HISTORY_STORAGE_VERSION;
  rememberRecentSearches: boolean;
  entries: SearchHistoryEntry[];
}

export interface DecodedSearchHistoryStorage {
  value: SearchHistoryStorageValue;
  requiresWriteback: boolean;
}

export function addSearchHistoryEntry(
  existingEntries: SearchHistoryEntry[],
  query: string,
  succeededAt: number,
  privacyOn: boolean,
): SearchHistoryEntry[] {
  if (privacyOn) return existingEntries;
  const displayQuery = normalizeDisplayQuery(query);
  if (!isValidHistoryQuery(displayQuery) || !Number.isFinite(succeededAt)) {
    return sanitizeSearchHistory(existingEntries, succeededAt);
  }
  const normalizedQuery = normalizeHistoryKey(displayQuery);
  const existing = sanitizeSearchHistory(existingEntries, succeededAt)
    .filter((entry) => entry.normalizedQuery !== normalizedQuery);
  return [{
    normalizedQuery,
    displayQuery,
    succeededAt,
    expiresAt: succeededAt + SEARCH_HISTORY_TTL_MS,
  }, ...existing].slice(0, MAX_SEARCH_HISTORY_TERMS);
}

export function removeSearchHistoryEntry(
  existingEntries: SearchHistoryEntry[],
  query: string,
  now: number = Date.now(),
): SearchHistoryEntry[] {
  const normalizedQuery = normalizeHistoryKey(normalizeDisplayQuery(query));
  return sanitizeSearchHistory(existingEntries, now)
    .filter((entry) => entry.normalizedQuery !== normalizedQuery);
}

export function clearSearchHistory(): SearchHistoryEntry[] {
  return [];
}

export function createSearchHistoryStorageValue(
  rememberRecentSearches: boolean,
  entries: unknown[],
  now: number = Date.now(),
): SearchHistoryStorageValue {
  return {
    version: SEARCH_HISTORY_STORAGE_VERSION,
    rememberRecentSearches,
    entries: rememberRecentSearches ? sanitizeSearchHistory(entries, now) : [],
  };
}

export function decodeSearchHistoryStorage(
  value: unknown,
  now: number = Date.now(),
): DecodedSearchHistoryStorage {
  if (Array.isArray(value)) {
    const migrated = value.map((item) => migrateLegacyEntry(item, now));
    return {
      value: createSearchHistoryStorageValue(
        true,
        migrated.filter((item) => item !== null),
        now,
      ),
      requiresWriteback: true,
    };
  }

  if (isRecord(value) && value.version === SEARCH_HISTORY_STORAGE_VERSION) {
    const rememberRecentSearches = typeof value.rememberRecentSearches === "boolean"
      ? value.rememberRecentSearches
      : true;
    const decoded = createSearchHistoryStorageValue(
      rememberRecentSearches,
      Array.isArray(value.entries) ? value.entries : [],
      now,
    );
    return {
      value: decoded,
      requiresWriteback: !storageValuesEqual(value, decoded),
    };
  }

  return {
    value: createSearchHistoryStorageValue(true, [], now),
    requiresWriteback: value !== null && value !== undefined,
  };
}

export function sanitizeSearchHistory(value: unknown, now: number = Date.now()): SearchHistoryEntry[] {
  if (!Array.isArray(value) || !Number.isFinite(now)) return [];
  const candidates: SearchHistoryEntry[] = [];
  for (const item of value) {
    const entry = sanitizeEntry(item, now);
    if (entry) candidates.push(entry);
  }
  candidates.sort((left, right) => right.succeededAt - left.succeededAt);
  const result: SearchHistoryEntry[] = [];
  const seen = new Set<string>();
  for (const entry of candidates) {
    if (seen.has(entry.normalizedQuery)) continue;
    seen.add(entry.normalizedQuery);
    result.push(entry);
    if (result.length >= MAX_SEARCH_HISTORY_TERMS) break;
  }
  return result;
}

export function visibleSearchHistory(
  entries: SearchHistoryEntry[],
  privacyOn: boolean,
  now: number = Date.now(),
): string[] {
  if (privacyOn) return [];
  return sanitizeSearchHistory(entries, now).map((entry) => entry.displayQuery);
}

function migrateLegacyEntry(value: unknown, now: number): unknown {
  if (typeof value !== "string") return value;
  const displayQuery = normalizeDisplayQuery(value);
  if (!Number.isFinite(now) || !isValidHistoryQuery(displayQuery)) return null;
  return {
    normalizedQuery: normalizeHistoryKey(displayQuery),
    displayQuery,
    succeededAt: now,
    expiresAt: now + SEARCH_HISTORY_TTL_MS,
  } satisfies SearchHistoryEntry;
}

function sanitizeEntry(value: unknown, now: number): SearchHistoryEntry | null {
  if (!isRecord(value) || typeof value.displayQuery !== "string") return null;
  const displayQuery = normalizeDisplayQuery(value.displayQuery);
  const succeededAt = value.succeededAt;
  const storedExpiresAt = value.expiresAt;
  if (
    !isValidHistoryQuery(displayQuery) ||
    typeof succeededAt !== "number" ||
    !Number.isFinite(succeededAt) ||
    succeededAt < 0 ||
    succeededAt > now ||
    typeof storedExpiresAt !== "number" ||
    !Number.isFinite(storedExpiresAt)
  ) {
    return null;
  }
  const expiresAt = Math.min(storedExpiresAt, succeededAt + SEARCH_HISTORY_TTL_MS);
  if (expiresAt <= now || expiresAt <= succeededAt) return null;
  return {
    normalizedQuery: normalizeHistoryKey(displayQuery),
    displayQuery,
    succeededAt,
    expiresAt,
  };
}

function normalizeDisplayQuery(query: string): string {
  return normalizeSearchKeyword(query).displayKeyword;
}

function isValidHistoryQuery(query: string): boolean {
  const normalized = normalizeSearchKeyword(query);
  return Boolean(
    normalized.displayKeyword &&
    normalized.graphemeCount <= 200 &&
    normalized.termCount <= 20
  );
}

function normalizeHistoryKey(query: string): string {
  return normalizeSearchKeyword(query).canonicalTerms.join("\u0000");
}

function storageValuesEqual(left: unknown, right: SearchHistoryStorageValue): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
