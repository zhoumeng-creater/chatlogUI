import { beforeEach, describe, expect, it } from "vitest";
import { useStatsStore, type AdaptedStats } from "./useStatsStore";

describe("useStatsStore", () => {
  beforeEach(() => {
    useStatsStore.getState().clear();
  });

  it("drops stale stats and trend completions after a newer analytics request starts", () => {
    const store = useStatsStore.getState();

    store.startStatsRequest("stats-a");
    store.startStatsRequest("stats-b");
    expect(store.completeStatsRequest("stats-a", stats("old-chat"))).toBe(false);
    expect(useStatsStore.getState()).toMatchObject({
      activeStatsRequestId: "stats-b",
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

    store.startTrendRequest("trend-a");
    store.startTrendRequest("trend-b");
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

    store.startStatsRequest("stats-a");
    store.startStatsRequest("stats-b");

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
