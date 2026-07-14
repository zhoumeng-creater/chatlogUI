export interface SearchDateRange {
  start?: string;
  end?: string;
}

export type SearchDateShortcut = "today" | "last7" | "last30" | "monthToDate";

export interface SearchDateRangeValidation {
  valid: boolean;
  startError?: string;
  endError?: string;
  rangeError?: string;
}

export class SearchDateRangeError extends Error {
  constructor() {
    super("Search date range is invalid");
    this.name = "SearchDateRangeError";
  }
}

export function validateSearchDateRange(range: SearchDateRange): SearchDateRangeValidation {
  const start = range.start ? parseLocalDay(range.start) : null;
  const end = range.end ? parseLocalDay(range.end) : null;
  if (range.start && !start) return { valid: false, startError: "请输入有效日期" };
  if (range.end && !end) return { valid: false, endError: "请输入有效日期" };
  if (start && end && start.getTime() > end.getTime()) {
    return { valid: false, rangeError: "开始日期不能晚于结束日期" };
  }
  return { valid: true };
}

// The backend contract uses inclusive epoch seconds. Deriving the end from
// the next local calendar midnight preserves 23/25-hour DST days.
export function toInclusiveEpochRange(range: SearchDateRange): { since?: number; until?: number } {
  const validation = validateSearchDateRange(range);
  if (!validation.valid) throw new SearchDateRangeError();
  const result: { since?: number; until?: number } = {};
  if (range.start) {
    result.since = Math.floor(parseLocalDay(range.start)!.getTime() / 1000);
  }
  if (range.end) {
    const nextDay = parseLocalDay(range.end)!;
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    result.until = Math.floor(nextDay.getTime() / 1000) - 1;
  }
  return result;
}

export function createSearchDateShortcut(
  shortcut: SearchDateShortcut,
  now: Date = new Date(),
): Required<SearchDateRange> {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  switch (shortcut) {
    case "today":
      break;
    case "last7":
      start.setDate(start.getDate() - 6);
      break;
    case "last30":
      start.setDate(start.getDate() - 29);
      break;
    case "monthToDate":
      start.setDate(1);
      break;
  }
  return { start: formatLocalDay(start), end: formatLocalDay(today) };
}

export function formatLocalDay(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1970 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}
