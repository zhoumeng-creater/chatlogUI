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
export function toInclusiveEpochRange(
  range: SearchDateRange,
  timeZone?: string,
): { since?: number; until?: number } {
  const validation = validateSearchDateRange(range);
  if (!validation.valid) throw new SearchDateRangeError();
  const result: { since?: number; until?: number } = {};
  if (range.start) {
    result.since = Math.floor(startOfNaturalDay(range.start, timeZone) / 1000);
  }
  if (range.end) {
    result.until = Math.floor(startOfNaturalDay(nextCalendarDay(range.end), timeZone) / 1000) - 1;
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
  const day = parseCalendarDay(value);
  return day ? new Date(day.year, day.month - 1, day.day, 0, 0, 0, 0) : null;
}

interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

function parseCalendarDay(value: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year < 1970 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    (year === 9999 && month === 12 && day === 31)
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function nextCalendarDay(value: string): string {
  const day = parseCalendarDay(value)!;
  const next = new Date(Date.UTC(day.year, day.month - 1, day.day + 1));
  return [
    String(next.getUTCFullYear()).padStart(4, "0"),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function startOfNaturalDay(value: string, timeZone?: string): number {
  const day = parseCalendarDay(value)!;
  if (!timeZone) return new Date(day.year, day.month - 1, day.day, 0, 0, 0, 0).getTime();
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const targetAsUtc = Date.UTC(day.year, day.month - 1, day.day);
  const searchRadius = 36 * 60 * 60 * 1000;
  let lower = targetAsUtc - searchRadius;
  let upper = targetAsUtc + searchRadius;

  // Search by the formatted calendar date, not by an assumed numeric offset.
  // Some zones (for example America/Havana) advance at midnight, so 00:00 is
  // not a real wall-clock instant. The first instant whose local date is the
  // target is the truthful beginning of that natural day.
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (compareCalendarDays(formattedCalendarParts(middle, formatter), day) >= 0) {
      upper = middle;
    } else {
      lower = middle + 1;
    }
  }

  if (compareCalendarDays(formattedCalendarParts(lower, formatter), day) !== 0) {
    throw new SearchDateRangeError();
  }
  return lower;
}

function compareCalendarDays(left: CalendarDay, right: CalendarDay): number {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

function formattedCalendarParts(
  timestamp: number,
  formatter: Intl.DateTimeFormat,
): CalendarDay & { hour: number; minute: number; second: number } {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}
