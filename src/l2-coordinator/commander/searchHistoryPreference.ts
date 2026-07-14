const MAX_SEARCH_HISTORY_TERMS = 5;
export const SEARCH_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SearchHistoryEntry {
  normalizedQuery: string;
  displayQuery: string;
  succeededAt: number;
  expiresAt: number;
}

export function addSearchHistoryEntry(
  existingEntries: SearchHistoryEntry[],
  query: string,
  succeededAt: number,
  privacyOn: boolean,
): SearchHistoryEntry[] {
  if (privacyOn) return existingEntries;
  const displayQuery = normalizeDisplayQuery(query);
  if (!displayQuery || !Number.isFinite(succeededAt)) {
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

function sanitizeEntry(value: unknown, now: number): SearchHistoryEntry | null {
  if (typeof value === "string") {
    const displayQuery = normalizeDisplayQuery(value);
    if (!displayQuery) return null;
    return {
      normalizedQuery: normalizeHistoryKey(displayQuery),
      displayQuery,
      succeededAt: now,
      expiresAt: now + SEARCH_HISTORY_TTL_MS,
    };
  }
  if (!isRecord(value) || typeof value.displayQuery !== "string") return null;
  const displayQuery = normalizeDisplayQuery(value.displayQuery);
  const succeededAt = value.succeededAt;
  const storedExpiresAt = value.expiresAt;
  if (
    !displayQuery ||
    typeof succeededAt !== "number" ||
    !Number.isFinite(succeededAt) ||
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
  return query.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function normalizeHistoryKey(query: string): string {
  return query.toUpperCase().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
