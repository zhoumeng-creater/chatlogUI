import type {
  SearchCategory,
  SearchHit,
  SearchMatchSegment,
} from "@/l2-coordinator/api-docs/search";
import { createSearchHitIdentity, type SearchHitIdentity } from "./searchHitIdentity";

export type SearchPresentationSortMode = "baseline" | "newest" | "oldest";
export type SearchPresentationGroupingMode = "none" | "conversation" | "date";

export interface SearchPresentationRow {
  id: SearchHitIdentity;
  hit: SearchHit;
  conversationLabel: string;
  senderLabel: string;
  categoryLabel: string;
  matchFieldLabel: string;
  timeLabel: string;
  snippetSegments: SearchMatchSegment[];
}

export interface SearchPresentationGroup {
  key: string;
  label: string | null;
  rows: SearchPresentationRow[];
}

export interface SearchResultPresentation {
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  groups: SearchPresentationGroup[];
}

export interface SearchPresentationOrderOptions {
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  locale?: string;
  timeZone?: string;
}

export function buildSearchResultPresentation(
  hits: SearchHit[],
  options: {
    sortMode: SearchPresentationSortMode;
    groupingMode: SearchPresentationGroupingMode;
    locale?: string;
    timeZone?: string;
    privacyOn?: boolean;
  },
): SearchResultPresentation {
  const ordered = buildSearchPresentationSourceOrder(hits, options).map((index) =>
    cloneHit(hits[index]),
  );
  const locale = options.locale ?? "zh-CN";
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
  const rows = ordered.map((hit) => toPresentationRow(hit, timeFormatter, options.privacyOn ?? false));
  return {
    sortMode: options.sortMode,
    groupingMode: options.groupingMode,
    groups: groupRows(rows, options.groupingMode, locale, options.timeZone),
  };
}

export function buildSearchPresentationSourceOrder(
  hits: readonly SearchHit[],
  options: SearchPresentationOrderOptions,
): number[] {
  const positions = Array.from({ length: hits.length }, (_, index) => index).sort(
    (leftIndex, rightIndex) => {
      const left = hits[leftIndex];
      const right = hits[rightIndex];
      if (options.sortMode === "baseline") return left.sourceIndex - right.sourceIndex;
      const timeDelta = left.timestamp - right.timestamp;
      if (timeDelta !== 0) return options.sortMode === "oldest" ? timeDelta : -timeDelta;
      return left.sourceIndex - right.sourceIndex;
    },
  );
  if (options.groupingMode === "none") return positions;

  const locale = options.locale ?? "zh-CN";
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
  const groups = new Map<string, number[]>();
  for (const position of positions) {
    const hit = hits[position];
    const key =
      options.groupingMode === "conversation"
        ? `conversation:${hit.conversationId}`
        : `date:${dateKey(new Date(hit.timestamp * 1000), dateFormatter)}`;
    const group = groups.get(key);
    if (group) group.push(position);
    else groups.set(key, [position]);
  }
  return [...groups.values()].flat();
}

function toPresentationRow(
  hit: SearchHit,
  formatter: Intl.DateTimeFormat,
  privacyOn: boolean,
): SearchPresentationRow {
  return {
    id: createSearchHitIdentity(hit),
    hit,
    conversationLabel: privacyOn ? "已隐藏会话" : hit.conversationName || hit.conversationId,
    senderLabel: privacyOn ? "已隐藏发送者" : hit.senderName || hit.senderId || "未知发送者",
    categoryLabel: categoryLabels[hit.category],
    matchFieldLabel: matchFieldLabels[hit.matchField] ?? "可见内容",
    timeLabel: formatTimestamp(hit.timestamp, formatter),
    snippetSegments: hit.matchSegments.map((segment) => ({
      ...segment,
      text: privacyOn ? "••••" : segment.text,
    })),
  };
}

function formatTimestamp(timestamp: number, formatter: Intl.DateTimeFormat): string {
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "未知时间" : formatter.format(date);
}

function groupRows(
  rows: SearchPresentationRow[],
  groupingMode: SearchPresentationGroupingMode,
  locale: string,
  timeZone?: string,
): SearchPresentationGroup[] {
  if (groupingMode === "none") return [{ key: "all", label: null, rows }];
  const groups = new Map<string, SearchPresentationGroup>();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
  for (const row of rows) {
    const conversation = groupingMode === "conversation";
    const date = new Date(row.hit.timestamp * 1000);
    const key = conversation
      ? `conversation:${row.hit.conversationId}`
      : `date:${dateKey(date, dateFormatter)}`;
    const label = conversation
      ? row.conversationLabel
      : dateFormatter.format(date);
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, { key, label, rows: [row] });
  }
  return [...groups.values()];
}

function dateKey(value: Date, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function cloneHit(hit: SearchHit): SearchHit {
  return { ...hit, matchSegments: hit.matchSegments.map((segment) => ({ ...segment })) };
}

const categoryLabels: Record<SearchCategory, string> = {
  text: "文字",
  image_emoji: "图片与表情",
  video: "视频",
  voice: "语音",
  file: "文件",
  link_card: "链接与卡片",
  quote_forward: "引用与转发",
  location: "位置",
  system_other: "系统与其他",
};

const matchFieldLabels: Record<string, string> = {
  content: "正文",
  media_caption: "媒体附言",
  file_title: "文件名",
  card_text: "卡片内容",
  location_text: "位置",
  quote_content: "引用内容",
  forward_content: "转发内容",
};
