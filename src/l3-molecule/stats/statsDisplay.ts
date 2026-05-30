import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";

export interface MetricRowData {
  label: string;
  value: string;
  description: string;
}

type TopSender = AdaptedStats["topSenders"][number];

function maskDisplayText(value: string): string {
  return value.replace(/[^\s]/g, "*");
}

export function buildMetricRows(stats: AdaptedStats): MetricRowData[] {
  return [
    {
      label: "消息总数",
      value: stats.total.toLocaleString(),
      description: "当前查询范围内的消息数量",
    },
    {
      label: "发送",
      value: stats.sentCount.toLocaleString(),
      description: "本账号发送的消息数量",
    },
    {
      label: "接收",
      value: stats.receivedCount.toLocaleString(),
      description: "对方或群成员发送的消息数量",
    },
    {
      label: "活跃人数",
      value: stats.activeSenders.toLocaleString(),
      description: stats.isGroup ? "群聊中的活跃发送者数量" : "私聊双方的活跃发送者数量",
    },
    {
      label: "活跃天数",
      value: stats.activeDays.toLocaleString(),
      description: "有消息记录的自然日数量",
    },
    {
      label: "查询范围",
      value: stats.queryRangeLabel || "全部",
      description: "后端返回的统计时间范围",
    },
  ];
}

export function shouldUseTrendTable(data: TrendDataPoint[], inspectorWidth: number): boolean {
  return data.length > 14 || inspectorWidth < 300;
}

export function summarizeTrendRange(data: TrendDataPoint[]): string {
  if (data.length === 0) return "没有趋势数据";
  return `${data[0].date} 至 ${data[data.length - 1].date}`;
}

export function formatTopSenderLabel(sender: TopSender, privacyOn = false): string {
  const label = sender.display || sender.sender;
  return privacyOn ? maskDisplayText(label) : label;
}

export function formatTopSenderAvatarAlt(sender: TopSender, privacyOn = false): string {
  return privacyOn ? "已隐藏活跃联系人头像" : (sender.display || sender.sender);
}
