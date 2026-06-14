import type {
  SnsActiveTab,
  SnsContentTypeFilter,
  SnsDraftFilters,
  SnsFilters,
} from "@l2/data-clerk/stores/useSnsStore";

export type SnsFilterCapability = "backend-applied" | "local-only" | "request-on-apply";
export type SnsFilterField = "user" | "since" | "until" | "contentType" | "mediaOnly" | "includeRead";

export type SnsAppliedFilters = SnsFilters;
export type { SnsDraftFilters };

export interface SnsFilterChip {
  id: SnsFilterField;
  label: string;
  value: string;
  field: SnsFilterField;
  capability: SnsFilterCapability;
  clearable: boolean;
  ariaLabel: string;
}

export interface SnsFilterViewModel {
  chips: SnsFilterChip[];
  dirty: boolean;
  summary: string;
  exportScopeSummary: string;
  applyLabel: string;
  resetLabel: string;
}

export interface BuildSnsFilterViewModelInput {
  appliedFilters: SnsAppliedFilters;
  draftFilters: SnsDraftFilters;
  dirty: boolean;
  privacyOn: boolean;
  activeTab: SnsActiveTab;
  loadedCount: number;
  visibleCount: number;
  searchQuery?: string;
}

export interface ApplySnsDraftFiltersResult {
  appliedFilters: SnsAppliedFilters;
  changedFields: SnsFilterField[];
  shouldReload: boolean;
  shouldRefreshLocal: boolean;
}

const CONTENT_TYPE_LABELS: Record<SnsContentTypeFilter, string> = {
  all: "全部类型",
  text: "文本",
  image: "图片",
  video: "视频",
  article: "文章",
  finder: "视频号",
  unknown: "其他",
};

const REQUEST_FIELDS = new Set<SnsFilterField>(["user", "since", "until", "includeRead"]);

export function toSnsDraftFilters(filters: SnsAppliedFilters): SnsDraftFilters {
  return {
    user: filters.user,
    since: filters.since,
    until: filters.until,
    contentType: filters.contentType,
    mediaOnly: filters.mediaOnly,
    includeRead: filters.includeRead,
  };
}

export function hasSnsDraftChanges(appliedFilters: SnsAppliedFilters, draftFilters: SnsDraftFilters): boolean {
  return getChangedSnsFilterFields(draftFilters, appliedFilters).length > 0;
}

export function applySnsDraftFilters(
  draftFilters: SnsDraftFilters,
  currentFilters: SnsAppliedFilters,
): ApplySnsDraftFiltersResult {
  const changedFields = getChangedSnsFilterFields(draftFilters, currentFilters);
  const shouldReload = changedFields.some((field) => REQUEST_FIELDS.has(field));
  const shouldRefreshLocal = changedFields.some((field) => field === "contentType" || field === "mediaOnly");

  return {
    appliedFilters: {
      ...currentFilters,
      ...draftFilters,
    },
    changedFields,
    shouldReload,
    shouldRefreshLocal,
  };
}

export function clearSnsFilterField(
  filters: SnsAppliedFilters,
  field: SnsFilterField,
): SnsAppliedFilters {
  if (field === "user") return { ...filters, user: "" };
  if (field === "since") return { ...filters, since: "" };
  if (field === "until") return { ...filters, until: "" };
  if (field === "contentType") return { ...filters, contentType: "all" };
  if (field === "mediaOnly") return { ...filters, mediaOnly: false };
  return { ...filters, includeRead: false };
}

export function validateSnsDraftFilters(
  draftFilters: Pick<SnsDraftFilters, "since" | "until">,
): { ok: true; message: null } | { ok: false; message: string } {
  if (draftFilters.since && draftFilters.until && draftFilters.since > draftFilters.until) {
    return { ok: false, message: "开始日期不能晚于结束日期。" };
  }
  return { ok: true, message: null };
}

export function buildSnsFilterViewModel(input: BuildSnsFilterViewModelInput): SnsFilterViewModel {
  const chips = buildSnsFilterChips(input.appliedFilters, input.privacyOn);
  const summary = chips.length
    ? chips.map((chip) => `${chip.label} ${chip.value}`).join(" · ")
    : "当前显示全部朋友圈动态";
  return {
    chips,
    dirty: input.dirty,
    summary,
    exportScopeSummary: buildSnsExportScopeSummary(input),
    applyLabel: input.dirty ? "应用筛选" : "筛选已应用",
    resetLabel: chips.length || input.dirty ? "重置筛选" : "无筛选可重置",
  };
}

export function buildSnsExportScopeSummary({
  activeTab,
  appliedFilters,
  loadedCount,
  visibleCount,
  searchQuery,
  privacyOn,
}: {
  activeTab: SnsActiveTab;
  appliedFilters: SnsAppliedFilters;
  loadedCount: number;
  visibleCount: number;
  searchQuery?: string;
  privacyOn: boolean;
}): string {
  const parts = [
    "朋友圈",
    activeTabLabel(activeTab),
    `已加载 ${loadedCount.toLocaleString()} 条`,
    `当前可见 ${visibleCount.toLocaleString()} 条`,
  ];
  if (activeTab === "search" && searchQuery?.trim()) {
    parts.push(`查询 ${privacyOn ? "已隐藏查询" : searchQuery.trim()}`);
  }
  parts.push(...buildAppliedFilterSummary(appliedFilters, privacyOn));
  return parts.join(" · ");
}

export function buildAppliedFilterSummary(filters: SnsAppliedFilters, privacyOn: boolean): string[] {
  const summary: string[] = [];
  if (filters.user.trim()) {
    summary.push(`作者 ${privacyOn ? "已隐藏作者筛选" : filters.user.trim()}`);
  }
  if (filters.since || filters.until) {
    summary.push(`日期 ${filters.since || "不限"} 至 ${filters.until || "不限"}`);
  }
  if (filters.contentType !== "all") {
    summary.push(`类型 ${CONTENT_TYPE_LABELS[filters.contentType] ?? "其他"}`);
  }
  if (filters.mediaOnly) summary.push("只看含媒体");
  if (filters.includeRead) summary.push("包含已读通知");
  return summary;
}

function buildSnsFilterChips(filters: SnsAppliedFilters, privacyOn: boolean): SnsFilterChip[] {
  const chips: SnsFilterChip[] = [];
  if (filters.user.trim()) {
    chips.push(chip("user", "作者", privacyOn ? "已隐藏作者筛选" : filters.user.trim(), "backend-applied"));
  }
  if (filters.since) {
    chips.push(chip("since", "开始", filters.since, "backend-applied"));
  }
  if (filters.until) {
    chips.push(chip("until", "结束", filters.until, "backend-applied"));
  }
  if (filters.contentType !== "all") {
    chips.push(chip("contentType", "类型", CONTENT_TYPE_LABELS[filters.contentType] ?? "其他", "local-only"));
  }
  if (filters.mediaOnly) {
    chips.push(chip("mediaOnly", "媒体", "只看含媒体", "local-only"));
  }
  if (filters.includeRead) {
    chips.push(chip("includeRead", "通知", "包含已读", "request-on-apply"));
  }
  return chips;
}

function chip(
  field: SnsFilterField,
  label: string,
  value: string,
  capability: SnsFilterCapability,
): SnsFilterChip {
  const capabilityLabel = capabilityText(capability);
  return {
    id: field,
    label,
    value,
    field,
    capability,
    clearable: true,
    ariaLabel: `${label}：${value}，${capabilityLabel}`,
  };
}

function getChangedSnsFilterFields(
  draftFilters: SnsDraftFilters,
  currentFilters: SnsAppliedFilters,
): SnsFilterField[] {
  return (["user", "since", "until", "contentType", "mediaOnly", "includeRead"] as SnsFilterField[])
    .filter((field) => draftFilters[field] !== currentFilters[field]);
}

export function capabilityText(capability: SnsFilterCapability): string {
  if (capability === "backend-applied") return "接口筛选";
  if (capability === "request-on-apply") return "应用后请求";
  return "本地筛选";
}

export function contentTypeLabel(value: SnsContentTypeFilter): string {
  return CONTENT_TYPE_LABELS[value] ?? "其他";
}

export function activeTabLabel(tab: SnsActiveTab): string {
  if (tab === "search") return "搜索";
  if (tab === "notifications") return "通知";
  return "动态";
}
