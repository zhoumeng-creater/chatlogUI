import type { FetchHistoryOptions } from "@l4/network/fetchHistory";

interface BuildDateJumpHistoryRequestInput {
  chat: string;
  date: string;
  limit: number;
}

export function validateDateJumpInput(date: string): string | null {
  if (!date.trim()) return "请选择要跳转的日期。";
  return parseDateParts(date) ? null : "日期格式无效。";
}

export function buildDateJumpHistoryRequest({
  chat,
  date,
  limit,
}: BuildDateJumpHistoryRequestInput): FetchHistoryOptions {
  const parts = parseDateParts(date);
  if (!parts) {
    return { chat, limit, offset: 0 };
  }

  return {
    chat,
    limit,
    offset: 0,
    since: Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) / 1000),
    until: Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59) / 1000),
  };
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (
    candidate.getUTCFullYear() !== parts.year ||
    candidate.getUTCMonth() !== parts.month - 1 ||
    candidate.getUTCDate() !== parts.day
  ) {
    return null;
  }
  return parts;
}
