import { beforeEach, describe, expect, it } from "vitest";
import {
  useStatsStore,
  type AdaptedStats,
  type StatsRequestSnapshot,
} from "./useStatsStore";

describe("useStatsStore", () => {
  beforeEach(() => {
    useStatsStore.getState().clear();
  });

  it("drops stale stats and trend completions after a newer analytics request starts", () => {
    const store = useStatsStore.getState();

    store.startStatsRequest("stats-a", snapshot("7d"));
    store.startStatsRequest("stats-b", snapshot("30d"));
    expect(store.completeStatsRequest("stats-a", stats("old-chat"))).toBe(false);
    expect(useStatsStore.getState()).toMatchObject({
      activeStatsRequestId: "stats-b",
      activeControlState: expect.objectContaining({ timePreset: "30d" }),
      stats: null,
      loading: true,
    });

    expect(store.completeStatsRequest("stats-b", stats("new-chat"))).toBe(true);
    expect(useStatsStore.getState()).toMatchObject({
      activeStatsRequestId: null,
      stats: { chat: "new-chat" },
      loading: false,
      error: null,
    });

    store.startTrendRequest("trend-a", snapshot("7d"));
    store.startTrendRequest("trend-b", snapshot("30d"));
    expect(store.completeTrendRequest("trend-a", [{ date: "2026-01-01", count: 1 }])).toBe(false);
    expect(useStatsStore.getState()).toMatchObject({
      activeTrendRequestId: "trend-b",
      trend: [],
    });

    expect(store.completeTrendRequest("trend-b", [{ date: "2026-01-02", count: 2 }])).toBe(true);
    expect(useStatsStore.getState()).toMatchObject({
      activeTrendRequestId: null,
      trend: [{ date: "2026-01-02", count: 2 }],
    });
  });

  it("drops stale stats failures and keeps the active failure visible", () => {
    const store = useStatsStore.getState();

    store.startStatsRequest("stats-a", snapshot("7d"));
    store.startStatsRequest("stats-b", snapshot("30d"));

    expect(store.failStatsRequest("stats-a", "old stats error")).toBe(false);
    expect(useStatsStore.getState()).toMatchObject({
      activeStatsRequestId: "stats-b",
      error: null,
      loading: true,
    });

    expect(store.failStatsRequest("stats-b", "new stats error")).toBe(true);
    expect(useStatsStore.getState()).toMatchObject({
      activeStatsRequestId: null,
      error: "new stats error",
      loading: false,
    });
  });

  it("tracks independent trend/comparison statuses and partial warnings", () => {
    const store = useStatsStore.getState();

    store.startStatsRequest("stats-a", snapshot("7d"));
    store.completeStatsRequest("stats-a", stats("chat-a"));
    store.startTrendRequest("trend-a", snapshot("7d"));
    store.failTrendRequest("trend-a", "趋势加载失败");
    store.setPartialWarnings(["上一周期比较暂不可用。"]);
    store.startComparisonRequest("comparison-a", snapshot("7d"));
    store.completeComparisonRequest("comparison-a", {
      mode: "previousPeriod",
      unavailableReason: null,
      rows: [
        { key: "total", label: "消息总数", current: 10, previous: 5, deltaPercent: 100 },
      ],
    });

    expect(useStatsStore.getState()).toMatchObject({
      statsStatus: "success",
      trendStatus: "error",
      comparisonStatus: "success",
      trendError: "趋势加载失败",
      partialWarnings: ["上一周期比较暂不可用。"],
      comparison: {
        rows: [expect.objectContaining({ deltaPercent: 100 })],
      },
    });
  });
});

function stats(chat: string): AdaptedStats {
  return {
    chat,
    username: chat,
    isGroup: false,
    chatType: "private",
    total: 10,
    sentCount: 4,
    receivedCount: 6,
    activeSenders: 2,
    activeDays: 3,
    firstMessageTime: 1,
    lastMessageTime: 2,
    queryRangeLabel: "全部",
    byType: [],
    topSenders: [],
    byHour: [],
  };
}

function snapshot(timePreset: "7d" | "30d"): StatsRequestSnapshot {
  return {
    chat: "session_synthetic_001",
    control: {
      timePreset,
      granularity: "day",
      objectFilter: "all",
      comparisonMode: "off",
    },
    scopeSummary: "当前会话",
    requestKey: timePreset,
  };
}
