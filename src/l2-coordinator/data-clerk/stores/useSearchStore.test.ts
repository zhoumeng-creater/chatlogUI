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
import { createSearchHitIdentity } from "@/l2-coordinator/commander/searchHitIdentity";
import {
  useSearchStore,
  type PendingSearchRequest,
  type SearchAppliedRequest,
} from "./useSearchStore";

beforeEach(() => {
  useSearchStore.getState().reset();
});

describe("useSearchStore explicit request state", () => {
  it("does not expose the removed legacy search facade alongside canonical state", () => {
    const state = useSearchStore.getState();
    const removedKeys = [
      "query",
      "activeFilter",
      "scope",
      "advancedFilters",
      "activeResultId",
      "activeRequest",
      "results",
      "status",
      "loading",
      "error",
      "setQuery",
      "setFilter",
      "setScope",
      "setAdvancedFilters",
      "setSearchSortMode",
      "setSearchGroupMode",
      "setActiveResultId",
      "setActiveRequest",
      "clearActiveRequest",
      "settleActiveRequest",
      "setResults",
      "setLoading",
      "setError",
      "setInvalid",
      "setCancelled",
      "clear",
    ];

    expect(removedKeys.filter((key) => key in state)).toEqual([]);
  });

  it("advances search intent only when a new request or explicit reset can invalidate work", () => {
    const initialGeneration = useSearchStore.getState().searchIntentGeneration;
    const first = pendingRequest("request-generation-a", draft("needle"));

    useSearchStore.getState().beginPending(first);
    expect(useSearchStore.getState().searchIntentGeneration).toBe(initialGeneration + 1);
    useSearchStore
      .getState()
      .commitPending(first.requestId, page("snapshot-generation-a"), 2, "manual");
    expect(useSearchStore.getState().searchIntentGeneration).toBe(initialGeneration + 1);

    const replacement = pendingRequest("request-generation-b", draft("replacement"));
    useSearchStore.getState().beginPending(replacement);
    expect(useSearchStore.getState().searchIntentGeneration).toBe(initialGeneration + 2);
    useSearchStore.getState().cancelPending(replacement.requestId);
    expect(useSearchStore.getState().searchIntentGeneration).toBe(initialGeneration + 2);

    useSearchStore.getState().reset();
    expect(useSearchStore.getState().searchIntentGeneration).toBe(initialGeneration + 3);
  });

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

  it("retains retry candidates only for failures that are safe to repeat unchanged", () => {
    const retryable = ["timeout", "service_unavailable", "database_unavailable", "request_failed"] as const;
    for (const errorCode of retryable) {
      useSearchStore.getState().reset();
      useSearchStore.getState().beginPending(pendingRequest(`retry-${errorCode}`, draft("needle"), "initial"));
      useSearchStore.getState().failPending(`retry-${errorCode}`, errorCode);
      expect(useSearchStore.getState().retryCandidate?.draft.keyword).toBe("needle");
    }

    const nonRetryable = [
      "invalid_request",
      "permission_denied",
      "identity_conflict",
      "stale_revision",
      "snapshot_expired",
      "capability_unavailable",
    ] as const;
    for (const errorCode of nonRetryable) {
      useSearchStore.getState().reset();
      useSearchStore.getState().beginPending(pendingRequest(`stop-${errorCode}`, draft("needle"), "initial"));
      useSearchStore.getState().failPending(`stop-${errorCode}`, errorCode);
      expect(useSearchStore.getState().retryCandidate).toBeNull();
    }
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

  it("keeps an exact failed page attempt and clears it for cancellation or a new query", () => {
    establishApplied("needle", "snapshot-1");
    const exactAttempt = {
      attemptedCursor: "opaque-page-3",
      targetPageStart: 100,
    } as const;

    useSearchStore.getState().setWindowOperation(
      { kind: "page" },
      { status: "loading", ...exactAttempt },
    );
    useSearchStore.getState().setWindowOperation(
      { kind: "page" },
      { status: "error", errorCode: "request_failed", ...exactAttempt },
    );
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({
      status: "error",
      errorCode: "request_failed",
      ...exactAttempt,
    });

    useSearchStore.getState().setWindowOperation({ kind: "page" }, { status: "idle" });
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({ status: "idle" });

    useSearchStore.getState().setWindowOperation(
      { kind: "page" },
      { status: "error", errorCode: "request_failed", ...exactAttempt },
    );
    useSearchStore
      .getState()
      .beginPending(pendingRequest("replacement", draft("new query"), "replacement"));
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({ status: "idle" });
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
      scrollAnchors: {
        manual: { resultId: "manual-row", offsetFromViewportTop: -12 },
        infinite: null,
        paged: { resultId: "paged-row", offsetFromViewportTop: 18.5 },
      },
    };
    const snapshot = createSearchReturnSnapshot({
      draft: currentDraft,
      applied,
      resultWindow,
      stale: true,
      activeSourceIndex: 0,
      scrollAnchor: { resultId: "paged-row", offsetFromViewportTop: 18.5 },
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
        restoreScrollAnchor: { resultId: "paged-row", offsetFromViewportTop: 18.5 },
      },
      stale: true,
      navigationByResultId: {},
      restoredFromNavigation: true,
    });
    expect(useSearchStore.getState().consumeRestoredNavigation()).toBe(true);
    expect(useSearchStore.getState().restoredFromNavigation).toBe(false);
    expect(useSearchStore.getState().consumeRestoredNavigation()).toBe(false);
    fetchSpy.mockRestore();
  });

  it("keeps navigation failures local to one result row and clears only that row on retry", () => {
    const firstResultId = "search-hit-first";
    const secondResultId = "search-hit-second";
    useSearchStore.getState().beginResultNavigation(firstResultId, 0);
    useSearchStore.getState().failResultNavigation(firstResultId, "无法精确定位这条消息。", true);
    useSearchStore.getState().beginResultNavigation(secondResultId, 1);

    const navigationByResultId = (
      useSearchStore.getState() as unknown as {
        navigationByResultId: Record<string, { status: string; sourceIndex: number }>;
      }
    ).navigationByResultId;
    expect(navigationByResultId).toEqual({
      [firstResultId]: {
        status: "error",
        sourceIndex: 0,
        message: "无法精确定位这条消息。",
        nearbyFallbackAvailable: true,
      },
      [secondResultId]: {
        status: "loading",
        sourceIndex: 1,
        message: null,
        nearbyFallbackAvailable: false,
      },
    });

    useSearchStore.getState().beginResultNavigation(firstResultId, 0);
    const retriedNavigation = (
      useSearchStore.getState() as unknown as {
        navigationByResultId: Record<string, { status: string; sourceIndex: number }>;
      }
    ).navigationByResultId;
    expect(retriedNavigation[firstResultId]).toEqual({
      status: "loading",
      sourceIndex: 0,
      message: null,
      nearbyFallbackAvailable: false,
    });
    expect(retriedNavigation[secondResultId]?.status).toBe("loading");
    expect("navigationByMessageId" in useSearchStore.getState()).toBe(false);
  });

  it("owns browse mode, active source, and one-shot scroll restoration in the canonical window", () => {
    const currentDraft = draft("browse");
    useSearchStore.getState().setDraft(currentDraft);
    useSearchStore.getState().beginPending(pendingRequest("browse", currentDraft));
    useSearchStore.getState().commitPending("browse", page("snapshot-browse"), 10, "manual");

    expect(useSearchStore.getState().setResultActiveSourceIndex(0)).toBe(true);
    const manualAnchor = { resultId: "manual-row", offsetFromViewportTop: -8.25 };
    expect(useSearchStore.getState().switchResultBrowseMode("paged", manualAnchor)).toBe(true);
    expect(useSearchStore.getState().resultWindow).toMatchObject({
      browseMode: "paged",
      activeSourceIndex: 0,
      scrollAnchors: { manual: manualAnchor },
    });
    expect(useSearchStore.getState().resultWindow?.scrollAnchors.manual).not.toBe(manualAnchor);

    const pagedAnchor = { resultId: "paged-row", offsetFromViewportTop: 32 };
    expect(useSearchStore.getState().rememberResultPageReadingPosition(pagedAnchor)).toBe(true);
    expect(useSearchStore.getState().resultWindow?.pageReadingPositions["0"]).toEqual({
      activeSourceIndex: 0,
      scrollAnchor: pagedAnchor,
    });
    expect(
      useSearchStore.getState().resultWindow?.pageReadingPositions["0"]?.scrollAnchor,
    ).not.toBe(pagedAnchor);
    expect(useSearchStore.getState().rememberResultScrollAnchor("paged", pagedAnchor)).toBe(true);
    expect(useSearchStore.getState().switchResultBrowseMode("manual", pagedAnchor)).toBe(true);
    expect(useSearchStore.getState().consumeResultRestoreScrollAnchor()).toEqual(manualAnchor);
    expect(useSearchStore.getState().consumeResultRestoreScrollAnchor()).toBeNull();
  });

  it("restores a refreshed active hit by composite identity and announces disappearance", () => {
    establishApplied("first", "snapshot-first");
    const identity = createSearchHitIdentity(hit());
    const refresh = {
      ...pendingRequest("refresh", draft("first"), "refresh"),
      restoreActiveHitIdentity: identity,
    };
    useSearchStore.getState().beginPending(refresh);
    const moved = {
      ...page("snapshot-refreshed"),
      totalCount: 2,
      count: 2,
      messages: [
        { ...hit(), messageId: "newer-message", seq: 2, sourceIndex: 0 },
        { ...hit(), sourceIndex: 1 },
      ],
    };
    expect(
      useSearchStore.getState().commitPending(refresh.requestId, moved, 20, "manual"),
    ).toBe(true);
    expect(useSearchStore.getState().resultWindow?.activeSourceIndex).toBe(1);
    expect(useSearchStore.getState().refreshActiveNotice).toBe("已恢复刷新前定位的结果。");

    const missing = {
      ...pendingRequest("refresh-missing", draft("first"), "refresh"),
      restoreActiveHitIdentity: identity,
    };
    useSearchStore.getState().beginPending(missing);
    expect(
      useSearchStore
        .getState()
        .commitPending(
          missing.requestId,
          {
            ...page("snapshot-without-active"),
            messages: [{ ...hit(), messageId: "replacement-message", seq: 3 }],
          },
          30,
          "manual",
        ),
    ).toBe(true);
    expect(useSearchStore.getState().resultWindow?.activeSourceIndex).toBe(0);
    expect(useSearchStore.getState().refreshActiveNotice).toContain("原先定位的结果已不存在");
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
