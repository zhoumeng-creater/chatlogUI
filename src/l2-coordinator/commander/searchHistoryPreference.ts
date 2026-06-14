const MAX_SEARCH_HISTORY_TERMS = 5;

export function addSearchHistoryTerm(
  existingTerms: string[],
  term: string,
  privacyOn: boolean,
): string[] {
  if (privacyOn) return [];
  const normalized = normalizeSearchHistoryTerm(term);
  if (!normalized) return sanitizeSearchHistory(existingTerms);

  return [
    normalized,
    ...sanitizeSearchHistory(existingTerms).filter((item) => item !== normalized),
  ].slice(0, MAX_SEARCH_HISTORY_TERMS);
}

export function removeSearchHistoryTerm(existingTerms: string[], term: string): string[] {
  const normalized = normalizeSearchHistoryTerm(term);
  return sanitizeSearchHistory(existingTerms).filter((item) => item !== normalized);
}

export function clearSearchHistory(): string[] {
  return [];
}

export function sanitizeSearchHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const terms: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = normalizeSearchHistoryTerm(item);
    if (!normalized || terms.includes(normalized)) continue;
    terms.push(normalized);
    if (terms.length >= MAX_SEARCH_HISTORY_TERMS) break;
  }
  return terms;
}

function normalizeSearchHistoryTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ");
}
