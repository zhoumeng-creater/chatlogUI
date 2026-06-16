import type {
  MediaAttachment,
  MediaAvailabilityFilter,
  MediaFilterField,
  MediaFilters,
  MediaSourceFilter,
  MediaTypeFilter,
} from "@l2/data-clerk/stores/useMediaStore";

export interface MediaFilterChip {
  id: MediaFilterField;
  label: string;
  value: string;
}

export interface MediaFilterResult {
  visibleAttachments: MediaAttachment[];
  selectedAttachmentIds: string[];
  activeChips: MediaFilterChip[];
  totalCount: number;
  visibleCount: number;
  filteredOutCount: number;
}

const TYPE_LABELS: Record<MediaTypeFilter, string> = {
  all: "全部媒体",
  image: "图片",
  video: "视频",
  voice: "语音",
  file: "文件",
};

const SOURCE_LABELS: Record<MediaSourceFilter, string> = {
  all: "全部来源",
  history: "当前会话",
  favorite: "收藏",
  new_message: "增量消息",
};

const AVAILABILITY_LABELS: Record<MediaAvailabilityFilter, string> = {
  all: "全部状态",
  available: "可预览",
  missing: "资源缺失",
};

export function createDefaultMediaFilters(): MediaFilters {
  return {
    type: "all",
    source: "all",
    availability: "all",
    dateRange: { start: "", end: "" },
  };
}

export function filterMediaAttachments(
  attachments: MediaAttachment[],
  filters: MediaFilters,
  selectedAttachmentIds: string[] = [],
): MediaFilterResult {
  const normalized = normalizeMediaFilters(filters);
  const visibleAttachments = attachments.filter((attachment) => matchesFilters(attachment, normalized));
  const visibleIds = new Set(visibleAttachments.map((attachment) => attachment.id));

  return {
    visibleAttachments,
    selectedAttachmentIds: selectedAttachmentIds.filter((id) => visibleIds.has(id)),
    activeChips: buildMediaFilterChips(normalized),
    totalCount: attachments.length,
    visibleCount: visibleAttachments.length,
    filteredOutCount: Math.max(0, attachments.length - visibleAttachments.length),
  };
}

export function clearMediaFilter(filters: MediaFilters, field: MediaFilterField): MediaFilters {
  const defaults = createDefaultMediaFilters();
  if (field === "dateRange") {
    return { ...filters, dateRange: defaults.dateRange };
  }
  return { ...filters, [field]: defaults[field] };
}

export function normalizeMediaFilters(filters: Partial<MediaFilters> | null | undefined): MediaFilters {
  const defaults = createDefaultMediaFilters();
  const type = filters?.type;
  const source = filters?.source;
  const availability = filters?.availability;
  const dateRange = filters?.dateRange;
  return {
    type: isMediaType(type) ? type : defaults.type,
    source: isMediaSource(source) ? source : defaults.source,
    availability: isAvailability(availability) ? availability : defaults.availability,
    dateRange: {
      start: normalizeDateInput(dateRange?.start),
      end: normalizeDateInput(dateRange?.end),
    },
  };
}

export function buildMediaFilterChips(filters: MediaFilters): MediaFilterChip[] {
  const normalized = normalizeMediaFilters(filters);
  const chips: MediaFilterChip[] = [];

  if (normalized.type !== "all") {
    chips.push({ id: "type", label: "类型", value: TYPE_LABELS[normalized.type] });
  }
  if (normalized.source !== "all") {
    chips.push({ id: "source", label: "来源", value: SOURCE_LABELS[normalized.source] });
  }
  if (normalized.availability !== "all") {
    chips.push({ id: "availability", label: "状态", value: AVAILABILITY_LABELS[normalized.availability] });
  }
  if (normalized.dateRange.start || normalized.dateRange.end) {
    chips.push({ id: "dateRange", label: "时间", value: formatMediaDateRange(normalized.dateRange) });
  }

  return chips;
}

export function formatMediaFilterSummary(filters: MediaFilters): string[] {
  const normalized = normalizeMediaFilters(filters);
  const summary: string[] = [];
  if (normalized.type !== "all") summary.push(`类型：${TYPE_LABELS[normalized.type]}`);
  if (normalized.source !== "all") summary.push(`来源：${SOURCE_LABELS[normalized.source]}`);
  if (normalized.availability !== "all") {
    summary.push(`状态：${AVAILABILITY_LABELS[normalized.availability]}`);
  }
  if (normalized.dateRange.start || normalized.dateRange.end) {
    summary.push(`时间：${formatMediaDateRange(normalized.dateRange)}`);
  }
  return summary.length ? summary : ["媒体筛选：无"];
}

export function mediaTypeLabel(type: MediaTypeFilter): string {
  return TYPE_LABELS[type];
}

export function mediaSourceLabel(source: MediaSourceFilter): string {
  return SOURCE_LABELS[source];
}

export function mediaAvailabilityLabel(availability: MediaAvailabilityFilter): string {
  return AVAILABILITY_LABELS[availability];
}

function matchesFilters(attachment: MediaAttachment, filters: MediaFilters): boolean {
  if (!matchesType(attachment, filters.type)) return false;
  if (filters.source !== "all" && attachment.source !== filters.source) return false;
  if (!matchesAvailability(attachment, filters.availability)) return false;
  return matchesDateRange(attachment, filters.dateRange);
}

function matchesType(attachment: MediaAttachment, type: MediaTypeFilter): boolean {
  if (type === "all") return true;
  if (type === "image") return attachment.kind === "image" || attachment.kind === "sticker";
  return attachment.kind === type;
}

function matchesAvailability(
  attachment: Pick<MediaAttachment, "resourceKey" | "directUrl">,
  availability: MediaAvailabilityFilter,
): boolean {
  if (availability === "all") return true;
  const available = Boolean(attachment.resourceKey || attachment.directUrl);
  return availability === "available" ? available : !available;
}

function matchesDateRange(
  attachment: Pick<MediaAttachment, "time">,
  dateRange: MediaFilters["dateRange"],
): boolean {
  const start = normalizeDateInput(dateRange.start);
  const end = normalizeDateInput(dateRange.end);
  if (!start && !end) return true;

  const date = normalizeDateInput(attachment.time);
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function formatMediaDateRange(dateRange: MediaFilters["dateRange"]): string {
  const start = normalizeDateInput(dateRange.start);
  const end = normalizeDateInput(dateRange.end);
  if (start && end) return `${start} 到 ${end}`;
  if (start) return `${start} 之后`;
  if (end) return `${end} 之前`;
  return "不限时间";
}

function normalizeDateInput(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  const match = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? "";
}

function isMediaType(value: unknown): value is MediaTypeFilter {
  return value === "all" || value === "image" || value === "video" || value === "voice" || value === "file";
}

function isMediaSource(value: unknown): value is MediaSourceFilter {
  return value === "all" || value === "history" || value === "favorite" || value === "new_message";
}

function isAvailability(value: unknown): value is MediaAvailabilityFilter {
  return value === "all" || value === "available" || value === "missing";
}
