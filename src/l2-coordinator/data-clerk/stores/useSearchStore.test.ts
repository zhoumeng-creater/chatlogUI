import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SearchHit,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import {
  createDefaultSearchDraft,
  type SearchDraft,
} from "@/l2-coordinator/commander/searchDraftModel";
import { createSearchReturnSnapshot } from "@/l2-coordinator/commander/searchReturnSnapshot";
import {
  useSearchStore,
  type PendingSearchRequest,
  type SearchAppliedRequest,
} from "./useSearchStore";

beforeEach(() => {
  useSearchStore.getState().reset();
});

describe("useSearchStore explicit request state", () => {
  it("edits only the draft until an explicit pending request begins", () => {
    useSearchStore.getState().setDraft({ ...createDefaultSearchDraft(), keyword: "draft only" });

    expect(useSearchStore.getState()).toMatchObject({
      draft: { keyword: "draft only" },
      pending: null,
      applied: null,
      resultWindow: null,
      firstRequest: { status: "idle" },
      replacementRequest: { status: "idle" },
    });
  });

  it("atomically commits the matching first request and ignores a late response", () => {
    const pending = pendingRequest("request-1", draft("needle"));
    useSearchStore.getState().beginPending(pending);

    expect(useSearchStore.getState()).toMatchObject({
      pending: { requestId: "request-1", kind: "initial" },
      applied: null,
      resultWindow: null,
      firstRequest: { status: "loading" },
    });
    expect(
      useSearchStore.getState().commitPending("late-request", page("late"), 20, "manual"),
    ).toBe(false);
    expect(useSearchStore.getState().applied).toBeNull();

    expect(
      useSearchStore.getState().commitPending("request-1", page("snapshot-1"), 20, "manual"),
    ).toBe(true);
    expect(useSearchStore.getState()).toMatchObject({
      pending: null,
      applied: {
        draft: { keyword: "needle" },
        request: { keyword: "needle", limit: 50 },
        succeededAt: 20,
      },
      resultWindow: { snapshotId: "snapshot-1", totalCount: 1 },
      firstRequest: { status: "success" },
    });
  });

  it("keeps last-known-good applied results through replacement failure and cancellation", () => {
    establishApplied("old", "old-snapshot");
    const previousApplied = useSearchStore.getState().applied;
    const previousWindow = useSearchStore.getState().resultWindow;

    useSearchStore.getState().setDraft(draft("new"));
    useSearchStore
      .getState()
      .beginPending(pendingRequest("replacement-1", draft("new"), "replacement"));
    expect(useSearchStore.getState()).toMatchObject({
      pending: { requestId: "replacement-1" },
      applied: { draft: { keyword: "old" } },
      resultWindow: { snapshotId: "old-snapshot" },
      replacementRequest: { status: "loading" },
    });

    useSearchStore.getState().failPending("replacement-1", "timeout");
    expect(useSearchStore.getState().applied).toEqual(previousApplied);
    expect(useSearchStore.getState().resultWindow).toEqual(previousWindow);
    expect(useSearchStore.getState()).toMatchObject({
      pending: null,
      replacementRequest: { status: "error", errorCode: "timeout" },
    });

    useSearchStore
      .getState()
      .beginPending(pendingRequest("replacement-2", draft("new"), "replacement"));
    useSearchStore.getState().cancelPending("replacement-2");
    expect(useSearchStore.getState().applied).toEqual(previousApplied);
    expect(useSearchStore.getState().resultWindow).toEqual(previousWindow);
    expect(useSearchStore.getState().replacementRequest).toEqual({ status: "cancelled" });
  });

  it("keeps directional errors local and refuses to mix a stale revision", () => {
    establishApplied("needle", "snapshot-1");
    useSearchStore.getState().setWindowOperation({ kind: "forward" }, { status: "loading" });
    useSearchStore
      .getState()
      .setWindowOperation({ kind: "forward" }, { status: "error", errorCode: "request_failed" });

    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "request_failed",
    });
    expect(useSearchStore.getState().firstRequest).toEqual({ status: "success" });

    useSearchStore.getState().markSnapshotStale();
    expect(useSearchStore.getState().stale).toBe(true);
    expect(() =>
      useSearchStore.getState().applyWindowPage(page("snapshot-1", "revision-1"), "forward"),
    ).toThrowError(expect.objectContaining({ code: "stale_revision" }));
    expect(useSearchStore.getState().resultWindow?.retainedHits).toHaveLength(1);
  });

  it("ends the applied task without erasing reusable filters or local preferences", () => {
    const filteredDraft: SearchDraft = {
      keyword: "needle",
      scope: { kind: "selected", chatIds: ["private-chat"] },
      categories: ["file"],
      senderIds: ["private-sender"],
      dateRange: { start: "2026-07-01", end: "2026-07-14" },
    };
    useSearchStore.getState().setDraft(filteredDraft);
    useSearchStore.getState().beginPending(pendingRequest("request-1", filteredDraft));
    useSearchStore.getState().commitPending("request-1", page("snapshot-1"), 20, "paged");

    useSearchStore.getState().endSearch();

    expect(useSearchStore.getState()).toMatchObject({
      draft: {
        keyword: "",
        scope: filteredDraft.scope,
        categories: ["file"],
        senderIds: ["private-sender"],
        dateRange: filteredDraft.dateRange,
      },
      pending: null,
      applied: null,
      resultWindow: null,
      stale: false,
    });
  });

  it("restores a full in-memory return snapshot without issuing a new search", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const currentDraft: SearchDraft = {
      ...draft("private current query"),
      scope: { kind: "current", chatId: "private-chat" },
    };
    useSearchStore.getState().setDraft(currentDraft);
    useSearchStore.getState().beginPending(pendingRequest("initial", currentDraft));
    useSearchStore.getState().commitPending("initial", page("snapshot-return"), 10, "paged");
    const applied = useSearchStore.getState().applied!;
    const resultWindow = {
      ...useSearchStore.getState().resultWindow!,
      activeSourceIndex: 0,
      loadedRanges: [{ start: 0, end: 1 }],
      scrollAnchors: { manual: "manual-row", infinite: null, paged: "paged-row" },
    };
    const snapshot = createSearchReturnSnapshot({
      draft: currentDraft,
      applied,
      resultWindow,
      stale: true,
      activeSourceIndex: 0,
      scrollAnchor: "paged-row",
      sortMode: "oldest",
      groupingMode: "conversation",
      capturedAt: 20,
    });

    useSearchStore.getState().reset();
    useSearchStore.getState().setDraft(draft("unrelated draft"));
    useSearchStore.getState().restoreReturnSnapshot(snapshot);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useSearchStore.getState()).toMatchObject({
      draft: currentDraft,
      pending: null,
      applied: {
        draft: currentDraft,
        request: { keyword: "private current query", limit: 50 },
        dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      },
      resultWindow: {
        snapshotId: "snapshot-return",
        browseMode: "paged",
        loadedRanges: [{ start: 0, end: 1 }],
        activeSourceIndex: 0,
        restoreScrollAnchor: "paged-row",
      },
      stale: true,
      query: "private current query",
      scope: "current",
      activeResultId: "message-1",
      navigationByMessageId: {},
    });
    fetchSpy.mockRestore();
  });

  it("keeps navigation failures local to one result row and clears only that row on retry", () => {
    useSearchStore.getState().beginResultNavigation("message-1", 0);
    useSearchStore.getState().failResultNavigation("message-1", "无法精确定位这条消息。", true);
    useSearchStore.getState().beginResultNavigation("message-2", 1);

    expect(useSearchStore.getState().navigationByMessageId).toEqual({
      "message-1": {
        status: "error",
        sourceIndex: 0,
        message: "无法精确定位这条消息。",
        nearbyFallbackAvailable: true,
      },
      "message-2": {
        status: "loading",
        sourceIndex: 1,
        message: null,
        nearbyFallbackAvailable: false,
      },
    });

    useSearchStore.getState().beginResultNavigation("message-1", 0);
    expect(useSearchStore.getState().navigationByMessageId["message-1"]).toEqual({
      status: "loading",
      sourceIndex: 0,
      message: null,
      nearbyFallbackAvailable: false,
    });
    expect(useSearchStore.getState().navigationByMessageId["message-2"]?.status).toBe("loading");
  });
});

function establishApplied(keyword: string, snapshotId: string): SearchAppliedRequest {
  const request = pendingRequest("initial", draft(keyword));
  useSearchStore.getState().setDraft(request.draft);
  useSearchStore.getState().beginPending(request);
  useSearchStore.getState().commitPending(request.requestId, page(snapshotId), 10, "manual");
  return useSearchStore.getState().applied!;
}

function pendingRequest(
  requestId: string,
  value: SearchDraft,
  kind: PendingSearchRequest["kind"] = "initial",
): PendingSearchRequest {
  const request: SearchV2Request = { keyword: value.keyword, limit: 50 };
  return {
    requestId,
    kind,
    draft: value,
    request,
    dateContext: {
      timeZone: "Asia/Shanghai",
      utcOffsetMinutes: 480,
      since: request.since,
      until: request.until,
    },
    startedAt: 1,
  };
}

function draft(keyword: string): SearchDraft {
  return { ...createDefaultSearchDraft(), keyword };
}

function page(snapshotId: string, revision = "revision-1"): SearchSnapshotPage {
  return {
    snapshotId,
    dataRevision: revision,
    exactTotal: true,
    completeScope: true,
    totalCount: 1,
    count: 1,
    windowStart: 0,
    previousCursor: "",
    nextCursor: "",
    hasPrevious: false,
    hasNext: false,
    messages: [hit()],
  };
}

function hit(): SearchHit {
  return {
    messageId: "message-1",
    seq: 1,
    sourceIndex: 0,
    conversationId: "private-chat",
    conversationName: "Synthetic Chat",
    senderId: "private-sender",
    senderName: "Synthetic Sender",
    timestamp: 1,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: "needle",
    matchSegments: [{ text: "needle", matched: true }],
  };
}
