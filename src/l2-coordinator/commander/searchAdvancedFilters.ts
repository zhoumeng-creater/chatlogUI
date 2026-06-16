import type { FetchSearchOptions } from "@l4/network/fetchSearch";

export type SearchSortMode = "time-desc" | "time-asc" | "relevance";
export type SearchGroupMode = "flat" | "conversation" | "date";
export type SearchAdvancedFilterField =
  | "dateRange"
  | "selectedChats"
  | "sender"
  | "favoriteOnly"
  | "attachmentOnly"
  | "sortMode"
  | "groupMode";

export interface SearchAdvancedFilterSelection {
  id: string;
  label: string;
}

export interface SearchAdvancedDateRange {
  start?: string;
  end?: string;
}

export interface SearchAdvancedFiltersState {
  dateRange: SearchAdvancedDateRange | null;
  selectedChats: SearchAdvancedFilterSelection[];
  sender: string;
  favoriteOnly: boolean;
  attachmentOnly: boolean;
  sortMode: SearchSortMode;
  groupMode: SearchGroupMode;
}

export interface SearchFilterCapability {
  field: SearchAdvancedFilterField;
  status: "backend-applied" | "local-only" | "disabled";
  reason?: string;
}

export interface SearchActiveFilterChip {
  id: SearchAdvancedFilterField;
  label: string;
  value: string;
  clearAction: SearchAdvancedFilterField;
}

const SORT_LABELS: Record<SearchSortMode, string> = {
  "time-desc": "时间从新到旧",
  "time-asc": "时间从早到晚",
  relevance: "相关性",
};

const GROUP_LABELS: Record<SearchGroupMode, string> = {
  flat: "不分组",
  conversation: "按会话分组",
  date: "按日期分组",
};

export function createDefaultSearchAdvancedFilters(): SearchAdvancedFiltersState {
  return {
    dateRange: null,
    selectedChats: [],
    sender: "",
    favoriteOnly: false,
    attachmentOnly: false,
    sortMode: "time-desc",
    groupMode: "flat",
  };
}

export function mapSearchAdvancedFiltersToRequest(
  filters: SearchAdvancedFiltersState,
): Pick<FetchSearchOptions, "chats" | "since" | "until"> {
  const request: Pick<FetchSearchOptions, "chats" | "since" | "until"> = {};
  const chats = filters.selectedChats
    .map((chat) => sanitizeChatId(chat.id))
    .filter((chat): chat is string => Boolean(chat));
  if (chats.length > 0) request.chats = chats;

  const since = parseDateStart(filters.dateRange?.start);
  const until = parseDateEnd(filters.dateRange?.end);
  if (since !== undefined) request.since = since;
  if (until !== undefined) request.until = until;

  return request;
}

export function getSearchAdvancedFilterRequestKey(filters: SearchAdvancedFiltersState): string {
  return JSON.stringify(mapSearchAdvancedFiltersToRequest(filters));
}

export function resolveSearchFilterCapabilities(): SearchFilterCapability[] {
  return [
    { field: "dateRange", status: "backend-applied" },
    { field: "selectedChats", status: "backend-applied" },
    {
      field: "sender",
      status: "disabled",
      reason: "发送者筛选需要后端支持，当前不会静默发送无效参数。",
    },
    {
      field: "favoriteOnly",
      status: "disabled",
      reason: "收藏筛选需要后端支持，当前不会静默发送无效参数。",
    },
    {
      field: "attachmentOnly",
      status: "disabled",
      reason: "附件筛选需要后端支持，当前不会静默发送无效参数。",
    },
    { field: "sortMode", status: "local-only", reason: "当前结果在前端按已加载消息排序。" },
    { field: "groupMode", status: "local-only", reason: "分组只整理已加载结果，不改变后端查询。" },
  ];
}

export function buildSearchAdvancedFilterChips(
  filters: SearchAdvancedFiltersState,
): SearchActiveFilterChip[] {
  const chips: SearchActiveFilterChip[] = [];

  if (filters.dateRange?.start || filters.dateRange?.end) {
    chips.push({
      id: "dateRange",
      label: "时间",
      value: formatDateRange(filters.dateRange),
      clearAction: "dateRange",
    });
  }
  if (filters.selectedChats.length > 0) {
    chips.push({
      id: "selectedChats",
      label: "会话",
      value: `${filters.selectedChats.length} 个会话`,
      clearAction: "selectedChats",
    });
  }
  if (filters.sortMode !== "time-desc") {
    chips.push({
      id: "sortMode",
      label: "排序",
      value: SORT_LABELS[filters.sortMode],
      clearAction: "sortMode",
    });
  }
  if (filters.groupMode !== "flat") {
    chips.push({
      id: "groupMode",
      label: "分组",
      value: GROUP_LABELS[filters.groupMode],
      clearAction: "groupMode",
    });
  }

  return chips;
}

export function clearSearchAdvancedFilter(
  filters: SearchAdvancedFiltersState,
  field: SearchAdvancedFilterField,
): SearchAdvancedFiltersState {
  if (field === "dateRange") return { ...filters, dateRange: null };
  if (field === "selectedChats") return { ...filters, selectedChats: [] };
  if (field === "sortMode") return { ...filters, sortMode: "time-desc" };
  if (field === "groupMode") return { ...filters, groupMode: "flat" };
  if (field === "sender") return { ...filters, sender: "" };
  if (field === "favoriteOnly") return { ...filters, favoriteOnly: false };
  return { ...filters, attachmentOnly: false };
}

export function searchSortModeLabel(sortMode: SearchSortMode): string {
  return SORT_LABELS[sortMode];
}

export function searchGroupModeLabel(groupMode: SearchGroupMode): string {
  return GROUP_LABELS[groupMode];
}

export function formatDateRange(dateRange: SearchAdvancedDateRange | null): string {
  if (!dateRange) return "不限时间";
  if (dateRange.start && dateRange.end) return `${dateRange.start} 到 ${dateRange.end}`;
  if (dateRange.start) return `${dateRange.start} 之后`;
  if (dateRange.end) return `${dateRange.end} 之前`;
  return "不限时间";
}

function sanitizeChatId(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || normalized.length > 120) return null;
  return /^[a-zA-Z0-9_@.-]+$/.test(normalized) ? normalized : null;
}

function parseDateStart(value: string | undefined): number | undefined {
  const parts = parseDateParts(value);
  if (!parts) return undefined;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0) / 1000);
}

function parseDateEnd(value: string | undefined): number | undefined {
  const parts = parseDateParts(value);
  if (!parts) return undefined;
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59) / 1000);
}

function parseDateParts(value: string | undefined): { year: number; month: number; day: number } | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}
