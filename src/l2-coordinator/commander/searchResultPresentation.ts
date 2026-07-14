import type {
  SearchCategory,
  SearchHit,
  SearchMatchSegment,
} from "@/l2-coordinator/api-docs/search";

export type SearchPresentationSortMode = "baseline" | "newest" | "oldest";
export type SearchPresentationGroupingMode = "none" | "conversation" | "date";

export interface SearchPresentationRow {
  id: string;
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

export function buildSearchResultPresentation(
  hits: SearchHit[],
  options: {
    sortMode: SearchPresentationSortMode;
    groupingMode: SearchPresentationGroupingMode;
    locale?: string;
    timeZone?: string;
  },
): SearchResultPresentation {
  const ordered = orderHits(hits, options.sortMode);
  const locale = options.locale ?? "zh-CN";
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
  const rows = ordered.map((hit) => toPresentationRow(hit, timeFormatter));
  return {
    sortMode: options.sortMode,
    groupingMode: options.groupingMode,
    groups: groupRows(rows, options.groupingMode, locale, options.timeZone),
  };
}

function orderHits(hits: SearchHit[], sortMode: SearchPresentationSortMode): SearchHit[] {
  return hits.map(cloneHit).sort((left, right) => {
    if (sortMode === "baseline") return left.sourceIndex - right.sourceIndex;
    const timeDelta = left.timestamp - right.timestamp;
    if (timeDelta !== 0) return sortMode === "oldest" ? timeDelta : -timeDelta;
    return left.sourceIndex - right.sourceIndex;
  });
}

function toPresentationRow(hit: SearchHit, formatter: Intl.DateTimeFormat): SearchPresentationRow {
  return {
    id: hit.messageId,
    hit,
    conversationLabel: hit.conversationName || hit.conversationId,
    senderLabel: hit.senderName || hit.senderId || "未知发送者",
    categoryLabel: categoryLabels[hit.category],
    matchFieldLabel: matchFieldLabels[hit.matchField] ?? "可见内容",
    timeLabel: formatTimestamp(hit.timestamp, formatter),
    snippetSegments: hit.matchSegments.map((segment) => ({ ...segment })),
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
