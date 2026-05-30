import { describe, expect, it } from "vitest";
import type { AdaptedStats, TrendDataPoint } from "@l2/data-clerk/stores/useStatsStore";
import {
  buildMetricRows,
  formatTopSenderAvatarAlt,
  formatTopSenderLabel,
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
    expect(shouldUseTrendTable(dense.slice(0, 7), 284)).toBe(true);
  });

  it("summarizes trend range", () => {
    expect(summarizeTrendRange([
      { date: "2026-05-28", count: 1 },
      { date: "2026-05-29", count: 2 },
    ])).toBe("2026-05-28 至 2026-05-29");
    expect(summarizeTrendRange([])).toBe("没有趋势数据");
  });

  it("masks top sender labels and avatar alt text when privacy is enabled", () => {
    const sender = { sender: "wxid_private", display: "Alice Private", count: 10 };

    expect(formatTopSenderLabel(sender, true)).toBe("***** *******");
    expect(formatTopSenderAvatarAlt(sender, true)).toBe("已隐藏活跃联系人头像");
    expect(formatTopSenderLabel(sender, false)).toBe("Alice Private");
    expect(formatTopSenderAvatarAlt(sender, false)).toBe("Alice Private");
  });
});
