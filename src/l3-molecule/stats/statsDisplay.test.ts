import { describe, expect, it } from "vitest";
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import {
  buildMetricRows,
  formatTopSenderAvatarAlt,
  formatTopSenderFallback,
  formatTopSenderName,
  shouldUseTrendTable,
  summarizeTrendRange,
} from "./statsDisplay";

const stats: AdaptedStats = {
  chat: "wxid_a",
  username: "wxid_a",
  isGroup: false,
  chatType: "private",
  total: 1200,
  sentCount: 500,
  receivedCount: 700,
  activeSenders: 2,
  activeDays: 8,
  firstMessageTime: 0,
  lastMessageTime: 0,
  queryRangeLabel: "最近 7 天",
  byType: [],
  topSenders: [],
  byHour: [],
};

describe("statsDisplay", () => {
  it("builds stable metric rows with labels and descriptions", () => {
    expect(buildMetricRows(stats).map((row) => row.label)).toEqual([
      "消息总数",
      "发送",
      "接收",
      "活跃人数",
      "活跃天数",
      "查询范围",
    ]);
    expect(buildMetricRows(stats)[0].value).toBe("1,200");
  });

  it("uses table fallback when the trend is too dense for the inspector", () => {
    const dense: TrendDataPoint[] = Array.from({ length: 40 }, (_, index) => ({
      date: `2026-05-${index + 1}`,
      count: index,
    }));
    expect(shouldUseTrendTable(dense, 300)).toBe(true);
    expect(shouldUseTrendTable(dense.slice(0, 7), 320)).toBe(false);
  });

  it("uses table fallback for narrow inspectors even with few points", () => {
    const sparse: TrendDataPoint[] = Array.from({ length: 4 }, (_, index) => ({
      date: `2026-05-${index + 1}`,
      count: index,
    }));

    expect(shouldUseTrendTable(sparse, 284)).toBe(true);
    expect(shouldUseTrendTable(sparse, 360)).toBe(false);
  });

  it("summarizes trend range", () => {
    expect(summarizeTrendRange([
      { date: "2026-05-28", count: 1 },
      { date: "2026-05-29", count: 2 },
    ])).toBe("2026-05-28 至 2026-05-29");
    expect(summarizeTrendRange([])).toBe("没有趋势数据");
  });

  it("formats top sender display without hiding aggregate counts when privacy is off", () => {
    const sender = { sender: "wxid_alice", display: "Alice", count: 42 };

    expect(formatTopSenderName(sender, false)).toBe("Alice");
    expect(formatTopSenderAvatarAlt(sender, false)).toBe("Alice 头像");
    expect(formatTopSenderFallback(sender, false)).toBe("Al");
    expect(sender.count).toBe(42);
  });

  it("masks top sender visible text and avatar accessibility when privacy is on", () => {
    const sender = { sender: "wxid_alice", display: "Alice", count: 42 };

    expect(formatTopSenderName(sender, true)).toBe("已隐藏联系人");
    expect(formatTopSenderAvatarAlt(sender, true)).toBe("已隐藏联系人头像");
    expect(formatTopSenderFallback(sender, true)).toBe("隐");
    expect(formatTopSenderName(sender, true)).not.toContain("Alice");
    expect(formatTopSenderAvatarAlt(sender, true)).not.toContain("wxid_alice");
  });

  it("does not reveal raw sender ids when display names are empty under privacy mode", () => {
    const sender = { sender: "wxid_private_sender", display: "", count: 7 };

    expect(formatTopSenderName(sender, true)).toBe("已隐藏联系人");
    expect(formatTopSenderFallback(sender, true)).toBe("隐");
    expect(formatTopSenderAvatarAlt(sender, true)).not.toContain("wxid_private_sender");
  });
});
