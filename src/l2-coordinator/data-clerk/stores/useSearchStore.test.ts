import { beforeEach, describe, expect, it } from "vitest";
import { useSearchStore, type SearchResults } from "./useSearchStore";

const emptyResults: SearchResults = {
  totalCount: 0,
  count: 0,
  limit: 20,
  offset: 0,
  messages: [],
};

const readyResults: SearchResults = {
  ...emptyResults,
  totalCount: 1,
  count: 1,
  messages: [{
    id: "m1",
    timestamp: 1,
    content: "hello",
    sender: "Alice",
    username: "wxid_a",
    chat: "wxid_a",
  }],
};

describe("useSearchStore", () => {
  beforeEach(() => {
    useSearchStore.setState({
      query: "",
      activeFilter: "all",
      scope: "all",
      status: "idle",
      activeResultId: null,
      results: null,
      loading: false,
      error: null,
      navigationNotice: null,
    });
  });

  it("tracks invalid, cancelled, and error search states", () => {
    useSearchStore.getState().setInvalidQuery("   ");
    expect(useSearchStore.getState().status).toBe("invalid");
    expect(useSearchStore.getState().loading).toBe(false);

    useSearchStore.getState().setCancelled();
    expect(useSearchStore.getState().status).toBe("cancelled");

    useSearchStore.getState().setError("搜索失败");
    expect(useSearchStore.getState().status).toBe("error");
    expect(useSearchStore.getState().error).toBe("搜索失败");
  });

  it("distinguishes empty and ready results", () => {
    useSearchStore.getState().setResults(emptyResults);
    expect(useSearchStore.getState().status).toBe("empty");

    useSearchStore.getState().setResults(readyResults);
    expect(useSearchStore.getState().status).toBe("ready");
    expect(useSearchStore.getState().results?.messages).toHaveLength(1);
  });

  it("stores honest navigation notices independently from active selection", () => {
    useSearchStore.getState().setResults(readyResults);
    useSearchStore.getState().setNavigationNotice("目标消息不在当前加载页。");
    expect(useSearchStore.getState().navigationNotice).toBe("目标消息不在当前加载页。");

    useSearchStore.getState().setActiveResultId("m1");
    expect(useSearchStore.getState().navigationNotice).toBeNull();
  });
});
