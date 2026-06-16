import type { FetchDashboardTrendOptions, FetchStatsOptions } from "@l4/network/fetchStats";

export type StatsTimePreset = "7d" | "30d" | "90d" | "all" | "custom";
export type StatsGranularity = "day" | "week" | "month";
export type StatsObjectFilter = "all" | "me" | "other" | "selectedMember";
export type StatsComparisonMode = "off" | "previousPeriod";

export interface StatsControlState {
  timePreset: StatsTimePreset;
  customStart?: string;
  customEnd?: string;
  granularity: StatsGranularity;
  objectFilter: StatsObjectFilter;
  comparisonMode: StatsComparisonMode;
}

export interface StatsControlOption<T extends string> {
  value: T;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string | null;
}

export interface StatsControlViewModel {
  timeOptions: Array<StatsControlOption<StatsTimePreset>>;
  granularityOptions: Array<StatsControlOption<StatsGranularity>>;
  objectOptions: Array<StatsControlOption<StatsObjectFilter>>;
  comparison: {
    enabled: boolean;
    label: string;
    disabled: boolean;
    disabledReason: string | null;
  };
  activeLabels: string[];
  customRange: { start: string; end: string };
  customRangeError: string | null;
  canReset: boolean;
  exportScopeSummary: string;
  warnings: string[];
  pending: boolean;
}

export interface StatsRequestResolveInput {
  chat: string;
  control: StatsControlState;
}

export interface ResolvedTrendRequest {
  supported: boolean;
  params: FetchDashboardTrendOptions | null;
  reason?: string;
  warning: string | null;
}

export interface ResolvedPreviousPeriodRequest {
  supported: boolean;
  params: FetchStatsOptions | null;
  rangeLabel: string | null;
  reason: string | null;
}

const DEFAULT_CONTROL: StatsControlState = {
  timePreset: "7d",
  granularity: "day",
  objectFilter: "all",
  comparisonMode: "off",
};

const presetLabels: Record<StatsTimePreset, string> = {
  "7d": "近 7 天",
  "30d": "近 30 天",
  "90d": "近 90 天",
  all: "全部",
  custom: "自定义",
};

const granularityLabels: Record<StatsGranularity, string> = {
  day: "按日",
  week: "按周",
  month: "按月",
};

const objectLabels: Record<StatsObjectFilter, string> = {
  all: "全部成员",
  me: "我",
  other: "对方/成员",
  selectedMember: "指定成员",
};

const finitePresetDays: Partial<Record<StatsTimePreset, number>> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function createDefaultStatsControlState(): StatsControlState {
  return { ...DEFAULT_CONTROL };
}

export function buildStatsControlViewModel({
  control,
  hasTrendData,
  pending = false,
}: {
  control: StatsControlState;
  hasTrendData: boolean;
  pending?: boolean;
}): StatsControlViewModel {
  const customRangeError = validateCustomRange(control);
  const timeOptions = (Object.keys(presetLabels) as StatsTimePreset[]).map((value) => ({
    value,
    label: presetLabels[value],
    selected: control.timePreset === value,
    disabled: false,
    disabledReason: null,
  }));
  const granularityOptions = (Object.keys(granularityLabels) as StatsGranularity[]).map((value) => ({
    value,
    label: granularityLabels[value],
    selected: control.granularity === value,
    disabled: !hasTrendData,
    disabledReason: hasTrendData ? null : "趋势数据加载后可切换汇总粒度。",
  }));
  const objectOptions = (Object.keys(objectLabels) as StatsObjectFilter[]).map((value) => ({
    value,
    label: objectLabels[value],
    selected: control.objectFilter === value,
    disabled: value !== "all",
    disabledReason: objectDisabledReason(value),
  }));
  const warnings = buildStatsControlWarnings(control, customRangeError);
  const activeLabels = [
    formatStatsTimePreset(control),
    granularityLabels[control.granularity],
    objectLabels[control.objectFilter],
    control.comparisonMode === "previousPeriod" ? "与上一周期比较" : null,
  ].filter((label): label is string => Boolean(label));

  return {
    timeOptions,
    granularityOptions,
    objectOptions,
    comparison: {
      enabled: control.comparisonMode === "previousPeriod",
      label: "与上一周期比较",
      disabled: control.timePreset === "all" || Boolean(customRangeError),
      disabledReason: comparisonDisabledReason(control, customRangeError),
    },
    activeLabels,
    customRange: {
      start: control.customStart ?? "",
      end: control.customEnd ?? "",
    },
    customRangeError,
    canReset: !controlsEqual(control, DEFAULT_CONTROL),
    exportScopeSummary: activeLabels.join(" · "),
    warnings,
    pending,
  };
}

export function resolveStatsRequest({ chat, control }: StatsRequestResolveInput): FetchStatsOptions {
  const params: FetchStatsOptions = { chat };
  if (control.timePreset === "all") return params;
  if (control.timePreset === "custom") {
    if (validateCustomRange(control)) return params;
    const since = parseDateOnlyAsUnixSeconds(control.customStart);
    const until = parseDateOnlyAsUnixSeconds(control.customEnd, { endExclusive: true });
    if (since !== null) params.since = since;
    if (until !== null) params.until = until;
    return params;
  }
  params.time = control.timePreset;
  return params;
}

export function resolveTrendRequest({ chat, control }: StatsRequestResolveInput): ResolvedTrendRequest {
  if (control.timePreset === "custom") {
    return {
      supported: false,
      params: null,
      reason: "自定义时间趋势暂不可用，请先查看概览统计或切回预设时间。",
      warning: "自定义时间趋势暂不可用，当前只展示概览统计。",
    };
  }
  if (control.timePreset === "all") {
    return {
      supported: false,
      params: null,
      reason: "全部时间趋势暂不可用，请切换到 7 天、30 天或 90 天。",
      warning: "全部时间趋势暂不可用。",
    };
  }
  return {
    supported: true,
    params: { chat, window: control.timePreset, summary: false },
    warning: control.granularity === "day" ? null : `${granularityLabels[control.granularity]}为当前趋势数据的本地汇总。`,
  };
}

export function resolvePreviousPeriodRequest({
  chat,
  control,
  referenceDate = new Date(),
}: StatsRequestResolveInput & { referenceDate?: Date }): ResolvedPreviousPeriodRequest {
  if (control.comparisonMode !== "previousPeriod") {
    return { supported: false, params: null, rangeLabel: null, reason: "未启用上一周期比较。" };
  }
  if (control.timePreset === "all") {
    return { supported: false, params: null, rangeLabel: null, reason: "全部时间没有可比较的上一周期。" };
  }
  if (control.timePreset === "custom") {
    if (validateCustomRange(control)) {
      return { supported: false, params: null, rangeLabel: null, reason: "自定义时间范围无效，无法比较。" };
    }
    const since = parseDateOnlyAsUnixSeconds(control.customStart);
    const until = parseDateOnlyAsUnixSeconds(control.customEnd, { endExclusive: true });
    if (since === null || until === null || until <= since) {
      return { supported: false, params: null, rangeLabel: null, reason: "自定义时间范围不完整，无法比较。" };
    }
    const span = until - since;
    return {
      supported: true,
      params: { chat, since: since - span, until: since },
      rangeLabel: "上一周期",
      reason: null,
    };
  }

  const days = finitePresetDays[control.timePreset];
  if (!days) {
    return { supported: false, params: null, rangeLabel: null, reason: "当前时间范围无法比较。" };
  }
  const currentEnd = floorDateUtc(referenceDate);
  const currentStart = currentEnd - days * 86_400;
  const previousStart = currentStart - days * 86_400;
  return {
    supported: true,
    params: { chat, since: previousStart, until: currentStart },
    rangeLabel: "上一周期",
    reason: null,
  };
}

export function formatStatsTimePreset(control: StatsControlState): string {
  if (control.timePreset !== "custom") return presetLabels[control.timePreset];
  if (control.customStart && control.customEnd) return `${control.customStart} 至 ${control.customEnd}`;
  if (control.customStart) return `${control.customStart} 之后`;
  if (control.customEnd) return `${control.customEnd} 之前`;
  return "自定义时间";
}

export function validateCustomRange(control: StatsControlState): string | null {
  if (control.timePreset !== "custom") return null;
  const start = parseDateOnlyAsUnixSeconds(control.customStart);
  const end = parseDateOnlyAsUnixSeconds(control.customEnd);
  if (control.customStart && start === null) return "开始日期格式无效。";
  if (control.customEnd && end === null) return "结束日期格式无效。";
  if (start !== null && end !== null && end < start) return "结束日期不能早于开始日期。";
  return null;
}

export function getStatsMetricDefinitions(): Array<{ key: string; label: string; description: string }> {
  return [
    { key: "total", label: "消息总数", description: "当前统计范围内的消息数量。" },
    { key: "sent", label: "发送", description: "本账号在当前范围内发送的消息数量。" },
    { key: "received", label: "接收", description: "对方或群成员在当前范围内发送的消息数量。" },
    { key: "activeSenders", label: "活跃人数", description: "当前范围内有发言记录的发送者数量。" },
    { key: "activeDays", label: "活跃天数", description: "当前范围内有消息记录的自然日数量。" },
    { key: "range", label: "查询范围", description: "统计请求实际使用的时间范围。" },
  ];
}

function comparisonDisabledReason(control: StatsControlState, customRangeError: string | null): string | null {
  if (customRangeError) return customRangeError;
  if (control.timePreset === "all") return "全部时间没有明确上一周期，暂不可比较。";
  return null;
}

function buildStatsControlWarnings(control: StatsControlState, customRangeError: string | null): string[] {
  const warnings: string[] = [];
  if (customRangeError) warnings.push(customRangeError);
  const trend = resolveTrendRequest({ chat: "preview", control });
  if (trend.warning) warnings.push(trend.warning);
  if (control.objectFilter !== "all") {
    warnings.push(objectDisabledReason(control.objectFilter) ?? "对象筛选暂不可用。");
  }
  return warnings;
}

function objectDisabledReason(value: StatsObjectFilter): string | null {
  if (value === "all") return null;
  if (value === "selectedMember") return "本机统计接口暂不支持指定成员统计。";
  return "本机统计接口暂不支持按发送方筛选。";
}

function controlsEqual(left: StatsControlState, right: StatsControlState): boolean {
  return left.timePreset === right.timePreset
    && left.customStart === right.customStart
    && left.customEnd === right.customEnd
    && left.granularity === right.granularity
    && left.objectFilter === right.objectFilter
    && left.comparisonMode === right.comparisonMode;
}

function parseDateOnlyAsUnixSeconds(
  value: string | undefined,
  options: { endExclusive?: boolean } = {},
): number | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day + (options.endExclusive ? 1 : 0));
  if (Number.isNaN(timestamp)) return null;
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() !== month - 1
    || normalized.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(timestamp / 1000);
}

function floorDateUtc(value: Date): number {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 1000);
}
