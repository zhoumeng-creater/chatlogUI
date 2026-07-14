import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatlogHttpError } from "@/l4-atom/network";
import type {
  SearchCapabilities,
  SearchHit,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { createDefaultSearchDraft } from "./searchDraftModel";
import {
  classifySearchRequestError,
  createSearchRequestCoordinatorLifecycle,
  createSearchRequestCoordinator,
  type SearchRequestDependencies,
} from "./useSearchRequest";

beforeEach(() => {
  useSearchStore.getState().reset();
  useSearchPreferenceStore.getState().reset();
});

describe("createSearchRequestCoordinator", () => {
  it("replaces a disposed StrictMode effect coordinator while keeping a stable facade", async () => {
    const deps = dependencies();
    const lifecycle = createSearchRequestCoordinatorLifecycle();
    const first = lifecycle.activate(deps);
    lifecycle.deactivate(first);
    lifecycle.activate(deps);
    readyToSearch("strict-mode");

    await expect(lifecycle.facade.probeCapabilities()).resolves.toBe(true);
    await expect(lifecycle.facade.submit()).resolves.toBe(true);
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().resultWindow?.snapshotId).toBe("snapshot-strict-mode");
  });

  it("recovers capability discovery after the local service becomes available", async () => {
    const deps = dependencies({
      fetchCapabilities: vi
        .fn()
        .mockRejectedValueOnce(
          new ChatlogHttpError("offline", { status: null, body: null, url: "http://127.0.0.1" }),
        )
        .mockResolvedValueOnce(capabilities()),
    });
    const coordinator = createSearchRequestCoordinator(deps);

    await expect(coordinator.probeCapabilities()).resolves.toBe(false);
    expect(useSearchStore.getState().capabilities.status).toBe("error");
    await expect(coordinator.probeCapabilities()).resolves.toBe(true);
    expect(useSearchStore.getState().capabilities).toMatchObject({
      status: "ready",
      value: { mode: "v2", contractVersion: "search.v2" },
    });
  });

  it("does not request on draft, readiness, or local preference changes and submits only explicitly", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");

    useSearchStore.getState().setDraft({ ...useSearchStore.getState().draft, keyword: "edited" });
    useSearchStore.getState().setReadiness({ httpReady: false, dbReady: false });
    useSearchStore.getState().setReadiness({ httpReady: true, dbReady: true });
    useSearchPreferenceStore.getState().setSortMode("oldest");
    useSearchPreferenceStore.getState().setGroupingMode("conversation");
    await Promise.resolve();
    expect(deps.fetchPage).not.toHaveBeenCalled();

    await expect(coordinator.submit()).resolves.toBe(true);
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState()).toMatchObject({
      pending: null,
      applied: { draft: { keyword: "edited" } },
      resultWindow: { snapshotId: "snapshot-edited" },
    });
    expect(deps.recordSuccessfulQuery).toHaveBeenCalledWith("edited", 1_001, false);
  });

  it("fails readiness and invalid scope closed without cancelling stable results or calling the network", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("old");
    await coordinator.submit();
    const stableWindow = useSearchStore.getState().resultWindow;

    useSearchStore.getState().setReadiness({ dbReady: false });
    useSearchStore.getState().setDraft({
      ...createDefaultSearchDraft(),
      keyword: "PRIVATE NEW QUERY",
      scope: { kind: "current", chatId: null },
    });
    await expect(coordinator.submit()).resolves.toBe(false);

    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().resultWindow).toEqual(stableWindow);
    expect(useSearchStore.getState().replacementRequest).toEqual({
      status: "error",
      errorCode: "database_unavailable",
    });
  });

  it("aborts a superseded request and rejects its late response by request identity", async () => {
    const first = deferred<SearchSnapshotPage>();
    const second = deferred<SearchSnapshotPage>();
    const signals: AbortSignal[] = [];
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request, signal: AbortSignal) => {
        signals.push(signal);
        return request.keyword === "first" ? first.promise : second.promise;
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("first");
    const firstOutcome = coordinator.submit();

    useSearchStore.getState().setDraft({ ...useSearchStore.getState().draft, keyword: "second" });
    const secondOutcome = coordinator.submit();
    expect(signals[0].aborted).toBe(true);

    first.resolve(page("snapshot-first", "first"));
    await expect(firstOutcome).resolves.toBe(false);
    expect(useSearchStore.getState().applied).toBeNull();

    second.resolve(page("snapshot-second", "second"));
    await expect(secondOutcome).resolves.toBe(true);
    expect(useSearchStore.getState().applied?.draft.keyword).toBe("second");
    expect(deps.recordSuccessfulQuery).toHaveBeenCalledTimes(1);
  });

  it("cancels pending work on dispose and never promotes its later response", async () => {
    const response = deferred<SearchSnapshotPage>();
    let signal: AbortSignal | undefined;
    const deps = dependencies({
      fetchPage: vi.fn((_request: SearchV2Request, nextSignal: AbortSignal) => {
        signal = nextSignal;
        return response.promise;
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    const outcome = coordinator.submit();

    coordinator.dispose();
    expect(signal?.aborted).toBe(true);
    expect(useSearchStore.getState().firstRequest).toEqual({ status: "cancelled" });
    response.resolve(page("late-snapshot", "needle"));
    await expect(outcome).resolves.toBe(false);
    expect(useSearchStore.getState().applied).toBeNull();
  });

  it("binds continuation requests to snapshot/revision and marks conflicts stale locally", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    vi.mocked(deps.fetchPage).mockRejectedValueOnce(
      new ChatlogHttpError("HTTP 409", {
        status: 409,
        body: JSON.stringify({ code: "search_snapshot_stale", private: "PRIVATE BODY" }),
        url: "http://127.0.0.1:5030/api/v1/search?format=json",
      }),
    );
    await expect(coordinator.load("forward")).resolves.toBe(false);

    expect(deps.fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        keyword: "needle",
        snapshotId: "snapshot-needle",
        dataRevision: "revision-1",
        cursor: "next-1",
      }),
      expect.any(AbortSignal),
    );
    expect(useSearchStore.getState().stale).toBe(true);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "stale_revision",
    });
  });

  it("ignores a late continuation failure after a replacement snapshot commits", async () => {
    const lateContinuation = deferred<SearchSnapshotPage>();
    let call = 0;
    const deps = dependencies({
      fetchPage: vi.fn(async (request: SearchV2Request) => {
        call += 1;
        if (call === 1) return page("snapshot-old", "old");
        if (call === 2) return lateContinuation.promise;
        return page("snapshot-new", request.keyword);
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("old");
    await coordinator.submit();
    const loadOutcome = coordinator.load("forward");

    useSearchStore.getState().setDraft({ ...useSearchStore.getState().draft, keyword: "new" });
    await coordinator.submit();
    lateContinuation.reject(
      new ChatlogHttpError("HTTP 409", {
        status: 409,
        body: JSON.stringify({ code: "search_snapshot_stale" }),
        url: "http://127.0.0.1/search",
      }),
    );

    await expect(loadOutcome).resolves.toBe(false);
    expect(useSearchStore.getState()).toMatchObject({
      stale: false,
      resultWindow: { snapshotId: "snapshot-new" },
    });
  });

  it("ignores a late refresh conflict after a replacement snapshot commits", async () => {
    const lateRefresh = deferred<SearchSnapshotPage>();
    let call = 0;
    const deps = dependencies({
      fetchPage: vi.fn(async (request: SearchV2Request) => {
        call += 1;
        if (call === 1) return page("snapshot-old", "old");
        if (call === 2) return lateRefresh.promise;
        return page("snapshot-new", request.keyword);
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("old");
    await coordinator.submit();
    const refreshOutcome = coordinator.refresh();

    useSearchStore.getState().setDraft({ ...useSearchStore.getState().draft, keyword: "new" });
    await coordinator.submit();
    lateRefresh.reject(
      new ChatlogHttpError("HTTP 409", {
        status: 409,
        body: JSON.stringify({ code: "search_snapshot_stale" }),
        url: "http://127.0.0.1/search",
      }),
    );

    await expect(refreshOutcome).resolves.toBe(false);
    expect(useSearchStore.getState()).toMatchObject({
      stale: false,
      resultWindow: { snapshotId: "snapshot-new" },
    });
  });

  it("marks the snapshot stale when a locally validated page has a different revision", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    vi.mocked(deps.fetchPage).mockResolvedValueOnce({
      ...page("snapshot-needle", "needle"),
      windowStart: 1,
      previousCursor: "previous-1",
      nextCursor: "",
      hasPrevious: true,
      hasNext: false,
      dataRevision: "revision-other",
      messages: [hit("needle", 1)],
    });

    await expect(coordinator.load("forward")).resolves.toBe(false);
    expect(useSearchStore.getState().stale).toBe(true);
  });

  it("invalidates a cancelled window operation even when the dependency ignores abort", async () => {
    const continuation = deferred<SearchSnapshotPage>();
    let continuationSignal: AbortSignal | undefined;
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request, signal: AbortSignal) => {
        if (!request.cursor) return Promise.resolve(page("snapshot-needle", "needle"));
        continuationSignal = signal;
        return continuation.promise;
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    const outcome = coordinator.load("forward");
    expect(useSearchStore.getState().resultWindow?.operations.forward.status).toBe("loading");
    coordinator.cancelWindowOperation("forward");

    expect(continuationSignal?.aborted).toBe(true);
    expect(useSearchStore.getState().resultWindow?.operations.forward.status).toBe("idle");
    continuation.resolve(continuationPage("snapshot-needle", "needle"));
    await expect(outcome).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow?.retainedHits).toHaveLength(1);
  });

  it("fails retry and refresh closed when required capabilities have degraded", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);

    useSearchStore.getState().setCapabilitiesState({
      status: "ready",
      value: { ...capabilities(), exactTotal: false },
    });
    await expect(coordinator.refresh()).resolves.toBe(false);
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().replacementRequest).toEqual({
      status: "error",
      errorCode: "capability_unavailable",
    });

    useSearchStore.setState({
      retryCandidate: {
        requestId: "failed-1",
        kind: "replacement",
        draft: { ...createDefaultSearchDraft(), keyword: "needle" },
        request: { keyword: "needle", limit: 50 },
        dateContext: { timeZone: null, utcOffsetMinutes: 480 },
        startedAt: 1,
      },
    });
    await expect(coordinator.retry()).resolves.toBe(false);
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
  });

  it("fails continuation closed in its local operation when capabilities have degraded", async () => {
    const deps = dependencies();
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    useSearchStore.getState().setCapabilitiesState({
      status: "ready",
      value: { ...capabilities(), snapshotCursor: false },
    });
    await expect(coordinator.load("forward")).resolves.toBe(false);

    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "capability_unavailable",
    });
  });
});

describe("classifySearchRequestError", () => {
  it("returns only privacy-safe whitelisted categories", () => {
    const error = new ChatlogHttpError("HTTP 410 PRIVATE", {
      status: 410,
      body: JSON.stringify({ code: "search_snapshot_expired", detail: "PRIVATE BODY" }),
      url: "http://127.0.0.1/search?keyword=PRIVATE",
    });
    expect(classifySearchRequestError(error)).toBe("snapshot_expired");
    expect(String(classifySearchRequestError(error))).not.toContain("PRIVATE");
  });

  it("maps the closed backend readiness, size, timeout, and identity codes without trusting private bodies", () => {
    const cases = [
      [503, "database_not_ready", "database_unavailable"],
      [503, "database_decrypting", "database_unavailable"],
      [503, "database_error", "database_unavailable"],
      [413, "request_too_large", "invalid_request"],
      [504, "request_timeout", "timeout"],
      [409, "search_identity_conflict", "request_failed"],
    ] as const;
    for (const [status, code, expected] of cases) {
      const error = new ChatlogHttpError("HTTP PRIVATE", {
        status,
        body: JSON.stringify({ code, detail: "PRIVATE BODY" }),
        url: "http://127.0.0.1/search?keyword=PRIVATE",
      });
      expect(classifySearchRequestError(error)).toBe(expected);
    }
  });
});

function readyToSearch(keyword: string): void {
  useSearchStore.getState().setCapabilitiesState({ status: "ready", value: capabilities() });
  useSearchStore.getState().setReadiness({ httpReady: true, dbReady: true });
  useSearchStore.getState().setDraft({ ...createDefaultSearchDraft(), keyword });
}

function dependencies(overrides: Partial<SearchRequestDependencies> = {}) {
  let now = 999;
  const deps = {
    fetchCapabilities: vi.fn(async () => capabilities()),
    fetchPage: vi.fn(async (request: SearchV2Request) =>
      page(`snapshot-${request.keyword}`, request.keyword),
    ),
    getBrowseMode: vi.fn(() => "manual" as const),
    getPrivacyOn: vi.fn(() => false),
    recordSuccessfulQuery: vi.fn(),
    now: vi.fn(() => ++now),
    ...overrides,
  } satisfies SearchRequestDependencies;
  return deps;
}

function capabilities(): SearchCapabilities {
  return {
    mode: "v2",
    contractVersion: "search.v2",
    exactTotal: true,
    completeScope: true,
    senderFilter: true,
    taxonomy: [
      "text",
      "image_emoji",
      "video",
      "voice",
      "file",
      "link_card",
      "quote_forward",
      "location",
      "system_other",
    ],
    snapshotCursor: true,
    inclusiveTimeBoundaries: true,
    defaultPageSize: 50,
    maxPageSize: 50,
    maxKeywordGraphemes: 200,
    maxKeywordTerms: 20,
    directoryVersion: "search.directory.v1",
    conversationDirectory: true,
    senderDirectory: true,
    directorySelfSenderId: "chatlog:sender:self:v1",
    directoryDefaultPageSize: 50,
    directoryMaxPageSize: 100,
    directoryMaxQueryGraphemes: 200,
    historyContextVersion: "history.context.v1",
    historyContextQuery: true,
    historyContextRevisionBinding: true,
    historyContextDefaultLimit: 51,
    historyContextMaxLimit: 101,
    historyContextMaxExactCandidates: 4096,
    historyContextMaxExactBatches: 32,
    historyContextMaxShards: 256,
  };
}

function page(snapshotId: string, keyword: string): SearchSnapshotPage {
  return {
    snapshotId,
    dataRevision: "revision-1",
    exactTotal: true,
    completeScope: true,
    totalCount: 2,
    count: 1,
    windowStart: 0,
    previousCursor: "",
    nextCursor: "next-1",
    hasPrevious: false,
    hasNext: true,
    messages: [hit(keyword, 0)],
  };
}

function continuationPage(snapshotId: string, keyword: string): SearchSnapshotPage {
  return {
    ...page(snapshotId, keyword),
    count: 1,
    windowStart: 1,
    previousCursor: "previous-1",
    nextCursor: "",
    hasPrevious: true,
    hasNext: false,
    messages: [hit(keyword, 1)],
  };
}

function hit(keyword: string, sourceIndex: number): SearchHit {
  return {
    messageId: `message-${keyword}-${sourceIndex}`,
    seq: sourceIndex + 1,
    sourceIndex,
    conversationId: "private-chat",
    conversationName: "Synthetic Chat",
    senderId: "private-sender",
    senderName: "Synthetic Sender",
    timestamp: 1,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: keyword,
    matchSegments: [{ text: keyword, matched: true }],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
