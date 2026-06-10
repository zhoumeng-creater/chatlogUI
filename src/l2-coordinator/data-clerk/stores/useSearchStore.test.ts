import { beforeEach, describe, expect, it } from "vitest";
import { useSearchStore, type SearchActiveRequest } from "./useSearchStore";

const activeRequest: SearchActiveRequest = {
  requestId: "search-1",
  kind: "search",
  query: "合同",
  filter: "all",
  scope: "all",
  scopeChat: null,
  offset: 0,
  limit: 20,
};

beforeEach(() => {
  useSearchStore.getState().clear();
});

describe("useSearchStore", () => {
  it("clears only the matching active request", () => {
    useSearchStore.getState().setActiveRequest(activeRequest);

    expect(useSearchStore.getState().activeRequest).toEqual(activeRequest);

    useSearchStore.getState().clearActiveRequest("search-2");
    expect(useSearchStore.getState().activeRequest).toEqual(activeRequest);

    useSearchStore.getState().clearActiveRequest("search-1");
    expect(useSearchStore.getState().activeRequest).toBeNull();
  });

  it("clears active requests when results settle", () => {
    useSearchStore.getState().setActiveRequest(activeRequest);

    useSearchStore.getState().setResults({
      totalCount: 0,
      count: 0,
      limit: 20,
      offset: 0,
      messages: [],
    });

    expect(useSearchStore.getState()).toMatchObject({
      activeRequest: null,
      status: "empty",
      loading: false,
      error: null,
    });
  });

  it("clears active requests and selected results when cancelled", () => {
    useSearchStore.getState().setActiveRequest(activeRequest);
    useSearchStore.getState().setActiveResultId("message-1");
    useSearchStore.getState().setLoading(true);

    useSearchStore.getState().setCancelled();

    expect(useSearchStore.getState()).toMatchObject({
      activeRequest: null,
      activeResultId: null,
      results: null,
      status: "cancelled",
      loading: false,
      error: null,
    });
  });
});
