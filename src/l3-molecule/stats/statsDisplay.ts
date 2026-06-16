import type { AdaptedStats, StatsComparisonState, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import type { StatsGranularity } from "@l2/commander/statsControlModel";

export interface MetricRowData {
  key: string;
  label: string;
  value: string;
  description: string;
  comparison?: string | null;
  comparisonTone?: "positive" | "negative" | "neutral";
}

type TopSender = AdaptedStats["topSenders"][number];

export function buildMetricRows(stats: AdaptedStats, comparison?: StatsComparisonState): MetricRowData[] {
  const rows: MetricRowData[] = [
    {
      key: "total",
      label: "消息总数",
      value: stats.total.toLocaleString(),
      description: "当前查询范围内的消息数量",
    },
    {
      key: "sent",
      label: "发送",
      value: stats.sentCount.toLocaleString(),
      description: "本账号发送的消息数量",
    },
    {
      key: "received",
      label: "接收",
      value: stats.receivedCount.toLocaleString(),
      description: "对方或群成员发送的消息数量",
    },
    {
      key: "activeSenders",
      label: "活跃人数",
      value: stats.activeSenders.toLocaleString(),
      description: stats.isGroup ? "群聊中的活跃发送者数量" : "私聊双方的活跃发送者数量",
    },
    {
      key: "activeDays",
      label: "活跃天数",
      value: stats.activeDays.toLocaleString(),
      description: "有消息记录的自然日数量",
    },
    {
      key: "range",
      label: "查询范围",
      value: stats.queryRangeLabel || "全部",
      description: "后端返回的统计时间范围",
    },
  ];
  if (!comparison || comparison.mode !== "previousPeriod" || comparison.unavailableReason) return rows;
  const comparisonByKey = new Map(comparison.rows.map((row) => [row.key, row]));
  return rows.map((row) => {
    const match = comparisonByKey.get(row.key);
    if (!match || match.deltaPercent === null) return row;
    const rounded = Math.round(match.deltaPercent);
    return {
      ...row,
      comparison: `较上一周期 ${rounded > 0 ? "+" : ""}${rounded}%`,
      comparisonTone: rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral",
    };
  });
}

export function groupTrendData(data: TrendDataPoint[], granularity: StatsGranularity): TrendDataPoint[] {
  if (granularity === "day") return data;
  const grouped = new Map<string, number>();
  for (const point of data) {
    const key = granularity === "week" ? getWeekKey(point.date) : point.date.slice(0, 7);
    grouped.set(key, (grouped.get(key) ?? 0) + point.count);
  }
  return Array.from(grouped.entries()).map(([date, count]) => ({ date, count }));
}

export function shouldUseTrendTable(data: TrendDataPoint[], inspectorWidth: number): boolean {
  return data.length > 14 || inspectorWidth < 300;
}

export function summarizeTrendRange(data: TrendDataPoint[]): string {
  if (data.length === 0) return "没有趋势数据";
  return `${data[0].date} 至 ${data[data.length - 1].date}`;
}

export function formatTopSenderName(sender: TopSender, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏联系人";
  return getTopSenderRawLabel(sender);
}

export function formatTopSenderAvatarAlt(sender: TopSender, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏联系人头像";
  return `${getTopSenderRawLabel(sender)} 头像`;
}

export function formatTopSenderFallback(sender: TopSender, privacyOn: boolean): string {
  if (privacyOn) return "隐";
  return getTopSenderRawLabel(sender).slice(0, 2);
}

function getTopSenderRawLabel(sender: TopSender): string {
  return sender.display.trim() || sender.sender.trim() || "未知联系人";
}

function getWeekKey(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateText;
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return `${date.toISOString().slice(0, 10)} 周`;
}
