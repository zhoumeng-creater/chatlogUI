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
import { getVisibleSearchHits, SearchWindowError } from "./searchResultWindowModel";
import {
  classifySearchRequestError,
  classifySearchRequestProblem,
  createSearchRequestCoordinatorLifecycle,
  createSearchRequestCoordinator,
  shouldProbeSearchCapabilities,
  type SearchRequestDependencies,
} from "./useSearchRequest";

beforeEach(() => {
  useSearchStore.getState().reset();
  useSearchPreferenceStore.getState().reset();
});

describe("createSearchRequestCoordinator", () => {
  it("keeps the safe backend validation field on the request lifecycle", async () => {
    const deps = dependencies({
      fetchPage: vi.fn(async () => {
        throw new ChatlogHttpError("HTTP PRIVATE", {
          status: 400,
          body: JSON.stringify({ code: "invalid_sender", detail: "PRIVATE BODY" }),
          url: "http://127.0.0.1/search?keyword=PRIVATE",
        });
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");

    await expect(coordinator.submit()).resolves.toBe(false);
    expect(useSearchStore.getState().firstRequest).toEqual({
      status: "error",
      errorCode: "invalid_request",
      errorField: "senders",
    });
  });

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

  it("restores an aborted capability probe to a probeable state during StrictMode cleanup", async () => {
    const firstProbe = deferred<SearchCapabilities>();
    const firstDependencies = dependencies({
      fetchCapabilities: vi.fn(() => firstProbe.promise),
    });
    const lifecycle = createSearchRequestCoordinatorLifecycle();
    const first = lifecycle.activate(firstDependencies);
    const firstOutcome = first.probeCapabilities();
    expect(useSearchStore.getState().capabilities.status).toBe("loading");

    lifecycle.deactivate(first);
    expect(useSearchStore.getState().capabilities.status).toBe("idle");
    expect(
      shouldProbeSearchCapabilities({
        restoredFromNavigation: false,
        capabilitiesStatus: useSearchStore.getState().capabilities.status,
      }),
    ).toBe(true);

    lifecycle.activate(dependencies());
    await expect(lifecycle.facade.probeCapabilities()).resolves.toBe(true);
    firstProbe.resolve(capabilities());
    await expect(firstOutcome).resolves.toBe(false);
    expect(useSearchStore.getState().capabilities.status).toBe("ready");
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

  it.each(["forward", "backward", "gap", "page"] as const)(
    "rejects a %s response window that does not belong to the requested cursor",
    async (target) => {
      const initialStart = target === "backward" ? 50 : 0;
      const deps = dependencies({
        fetchPage: vi
          .fn()
          .mockResolvedValueOnce(rangePage(initialStart, 50, 150))
          .mockResolvedValueOnce(rangePage(100, 50, 150)),
      });
      const coordinator = createSearchRequestCoordinator(deps);
      readyToSearch("needle");
      await coordinator.submit();

      if (target === "gap") {
        useSearchStore.getState().applyWindowPage(rangePage(100, 50, 150), "page");
      }
      if (target === "page") {
        useSearchStore.getState().switchResultBrowseMode("paged", null);
      }

      const outcome = target === "gap"
        ? coordinator.load("gap", { gap: { start: 50, end: 100 } })
        : target === "page"
          ? coordinator.load("page", { cursor: "next-50", targetPageStart: 50 })
          : coordinator.load(target);

      await expect(outcome).resolves.toBe(false);
      expect(deps.fetchPage).toHaveBeenCalledTimes(2);
      const operation = target === "gap"
        ? useSearchStore.getState().resultWindow?.operations.gaps["50:100"]
        : useSearchStore.getState().resultWindow?.operations[target];
      expect(operation).toMatchObject({ status: "error", errorCode: "request_failed" });
      expect(useSearchStore.getState().resultWindow?.loadedRanges).not.toContainEqual({
        start: target === "backward" ? 100 : 50,
        end: target === "backward" ? 150 : 100,
      });
    },
  );

  it("rejects a short non-final continuation window", async () => {
    const deps = dependencies({
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(rangePage(0, 50, 150))
        .mockResolvedValueOnce(rangePage(50, 25, 150)),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    await expect(coordinator.load("forward")).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow?.retainedHits).toHaveLength(50);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "request_failed",
    });
  });

  it("rejects continuation flags that disagree with the response position", async () => {
    const inconsistentPage = {
      ...rangePage(50, 50, 150),
      previousCursor: "",
      hasPrevious: false,
    };
    const deps = dependencies({
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(rangePage(0, 50, 150))
        .mockResolvedValueOnce(inconsistentPage),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    await expect(coordinator.load("forward")).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "request_failed",
    });
  });

  it("fails an ambiguous cursor closed before network access", async () => {
    const deps = dependencies({
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(rangePage(0, 50, 150))
        .mockResolvedValueOnce(rangePage(50, 50, 150)),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    const resultWindow = useSearchStore.getState().resultWindow!;
    useSearchStore.setState({
      resultWindow: {
        ...resultWindow,
        pageCursors: { ...resultWindow.pageCursors, 100: "next-50" },
      },
    });

    await expect(coordinator.load("forward")).resolves.toBe(false);
    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({ status: "idle" });
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

  it("freezes the active composite identity into a refresh request", async () => {
    const refreshed = deferred<SearchSnapshotPage>();
    let call = 0;
    const deps = dependencies({
      fetchPage: vi.fn(async () => {
        call += 1;
        return call === 1 ? page("snapshot-old", "needle") : refreshed.promise;
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    const outcome = coordinator.refresh();
    expect(useSearchStore.getState().pending?.restoreActiveHitIdentity).toMatch(
      /^search-hit-/u,
    );
    refreshed.resolve(page("snapshot-new", "needle"));
    await expect(outcome).resolves.toBe(true);
    expect(useSearchStore.getState().refreshActiveNotice).toBe("已恢复刷新前定位的结果。");
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

  it("cancels every active continuation as one page-lifecycle operation", async () => {
    const continuationSignals: AbortSignal[] = [];
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request, signal: AbortSignal) => {
        if (!request.cursor) return Promise.resolve(rangePage(0, 50, 150));
        continuationSignals.push(signal);
        return new Promise<SearchSnapshotPage>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        });
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    const forwardOutcome = coordinator.load("forward");
    const pageOutcome = coordinator.load("page", { cursor: "next-50", targetPageStart: 50 });
    expect(useSearchStore.getState().resultWindow?.operations.forward.status).toBe("loading");
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({
      status: "loading",
      attemptedCursor: "next-50",
      targetPageStart: 50,
    });

    coordinator.cancelAllWindowOperations();

    expect(continuationSignals).toHaveLength(2);
    expect(continuationSignals.every((signal) => signal.aborted)).toBe(true);
    expect(useSearchStore.getState().resultWindow?.operations.forward.status).toBe("idle");
    expect(useSearchStore.getState().resultWindow?.operations.page.status).toBe("idle");
    await expect(forwardOutcome).resolves.toBe(false);
    await expect(pageOutcome).resolves.toBe(false);
  });

  it("aborts sibling continuations when one operation proves the snapshot stale", async () => {
    const staleContinuation = deferred<SearchSnapshotPage>();
    let siblingSignal: AbortSignal | undefined;
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request, signal: AbortSignal) => {
        if (!request.cursor) return Promise.resolve(rangePage(0, 50, 150));
        if (request.cursor === "next-50") return staleContinuation.promise;
        siblingSignal = signal;
        return new Promise<SearchSnapshotPage>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        });
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    const resultWindow = useSearchStore.getState().resultWindow!;
    useSearchStore.setState({
      resultWindow: {
        ...resultWindow,
        pageCursors: { ...resultWindow.pageCursors, 100: "opaque-page-cursor" },
      },
    });

    const staleOutcome = coordinator.load("forward");
    const siblingOutcome = coordinator.load("page", {
      cursor: "opaque-page-cursor",
      targetPageStart: 100,
    });
    staleContinuation.reject(
      new ChatlogHttpError("HTTP 409", {
        status: 409,
        body: JSON.stringify({ code: "search_snapshot_stale" }),
        url: "http://127.0.0.1/search",
      }),
    );

    await expect(staleOutcome).resolves.toBe(false);
    expect(useSearchStore.getState().stale).toBe(true);
    expect(siblingSignal?.aborted).toBe(true);
    expect(useSearchStore.getState().resultWindow?.operations.forward).toEqual({
      status: "error",
      errorCode: "stale_revision",
    });
    expect(useSearchStore.getState().resultWindow?.operations.page.status).toBe("idle");
    await expect(siblingOutcome).resolves.toBe(false);
  });

  it("settles a continuation that finishes after an external stale marker", async () => {
    const continuation = deferred<SearchSnapshotPage>();
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request) =>
        request.cursor ? continuation.promise : Promise.resolve(page("snapshot-needle", "needle")),
      ),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    const outcome = coordinator.load("forward");
    useSearchStore.getState().markSnapshotStale();
    continuation.resolve(continuationPage("snapshot-needle", "needle"));

    await expect(outcome).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow?.operations.forward.status).toBe("idle");
    expect(useSearchStore.getState().resultWindow?.retainedHits).toHaveLength(1);
  });

  it("loads a retained middle gap with its frozen opaque cursor", async () => {
    const deps = dependencies({
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(rangePage(0, 50, 150))
        .mockResolvedValueOnce(rangePage(50, 50, 150)),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    useSearchStore.getState().applyWindowPage(rangePage(100, 50, 150), "page");

    await expect(
      coordinator.load("gap", { gap: { start: 50, end: 100 } }),
    ).resolves.toBe(true);
    expect(deps.fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        snapshotId: "snapshot-range",
        dataRevision: "revision-1",
        cursor: "previous-100",
        limit: 50,
      }),
      expect.any(AbortSignal),
    );
    expect(useSearchStore.getState().resultWindow?.loadedRanges).toEqual([
      { start: 0, end: 150 },
    ]);
  });

  it("keeps the paged visible window stable when a deferred backward load resolves after a mode switch", async () => {
    const continuation = deferred<SearchSnapshotPage>();
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request) =>
        request.cursor ? continuation.promise : Promise.resolve(rangePage(50, 50, 150)),
      ),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    useSearchStore.getState().setResultActiveSourceIndex(65);

    const outcome = coordinator.load("backward");
    const modeAnchor = { resultId: "visible-65", offsetFromViewportTop: 24 };
    useSearchStore.getState().switchResultBrowseMode("paged", modeAnchor);
    const before = useSearchStore.getState().resultWindow!;
    const visibleBefore = getVisibleSearchHits(before).map((hit) => hit.sourceIndex);

    continuation.resolve(rangePage(0, 50, 150));
    await expect(outcome).resolves.toBe(true);

    const after = useSearchStore.getState().resultWindow!;
    expect(after).toMatchObject({
      browseMode: "paged",
      currentPageStart: before.currentPageStart,
      activeSourceIndex: 65,
      previousCursor: before.previousCursor,
      nextCursor: before.nextCursor,
      hasPrevious: before.hasPrevious,
      hasNext: before.hasNext,
    });
    expect(getVisibleSearchHits(after).map((hit) => hit.sourceIndex)).toEqual(visibleBefore);
    expect(after.loadedRanges).toEqual([{ start: 0, end: 100 }]);
  });

  it("keeps the paged visible window stable when a deferred gap load resolves after a mode switch", async () => {
    const continuation = deferred<SearchSnapshotPage>();
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request) =>
        request.cursor ? continuation.promise : Promise.resolve(rangePage(0, 50, 150)),
      ),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    useSearchStore.getState().applyWindowPage(rangePage(100, 50, 150), "gap");

    const outcome = coordinator.load("gap", { gap: { start: 50, end: 100 } });
    const modeAnchor = { resultId: "visible-0", offsetFromViewportTop: -9 };
    useSearchStore.getState().switchResultBrowseMode("paged", modeAnchor);
    const before = useSearchStore.getState().resultWindow!;
    const visibleBefore = getVisibleSearchHits(before).map((hit) => hit.sourceIndex);

    continuation.resolve(rangePage(50, 50, 150));
    await expect(outcome).resolves.toBe(true);

    const after = useSearchStore.getState().resultWindow!;
    expect(after.currentPageStart).toBe(before.currentPageStart);
    expect(after.activeSourceIndex).toBe(before.activeSourceIndex);
    expect(getVisibleSearchHits(after).map((hit) => hit.sourceIndex)).toEqual(visibleBefore);
    expect(after.loadedRanges).toEqual([{ start: 0, end: 150 }]);
  });

  it("keeps cumulative active and restore anchors when a deferred page load resolves after switching back", async () => {
    const continuation = deferred<SearchSnapshotPage>();
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request) =>
        request.cursor ? continuation.promise : Promise.resolve(rangePage(0, 50, 150)),
      ),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    const manualAnchor = { resultId: "visible-0", offsetFromViewportTop: 18 };
    useSearchStore.getState().switchResultBrowseMode("paged", manualAnchor);

    const outcome = coordinator.load("page", { cursor: "next-50", targetPageStart: 50 });
    const pagedAnchor = { resultId: "visible-paged-0", offsetFromViewportTop: 31 };
    useSearchStore.getState().switchResultBrowseMode("manual", pagedAnchor);

    continuation.resolve(rangePage(50, 50, 150));
    await expect(outcome).resolves.toBe(true);

    const after = useSearchStore.getState().resultWindow!;
    expect(after.browseMode).toBe("manual");
    expect(after.activeSourceIndex).toBe(0);
    expect(after.restoreScrollAnchor).toEqual(manualAnchor);
    expect(after.loadedRanges).toEqual([{ start: 0, end: 100 }]);
  });

  it("retains and reuses the exact failed page cursor and target until success", async () => {
    const deps = dependencies({
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(rangePage(0, 50, 150))
        .mockRejectedValueOnce(
          new ChatlogHttpError("HTTP PRIVATE", {
            status: 500,
            body: JSON.stringify({ code: "internal_error", detail: "PRIVATE" }),
            url: "http://127.0.0.1/search?cursor=PRIVATE",
          }),
        )
        .mockResolvedValueOnce(rangePage(50, 50, 150)),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    await expect(
      coordinator.load("page", { cursor: "next-50", targetPageStart: 50 }),
    ).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({
      status: "error",
      errorCode: "request_failed",
      attemptedCursor: "next-50",
      targetPageStart: 50,
    });

    await expect(
      coordinator.load("page", { cursor: "next-50", targetPageStart: 50 }),
    ).resolves.toBe(true);
    expect(deps.fetchPage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ cursor: "next-50", snapshotId: "snapshot-range" }),
      expect.any(AbortSignal),
    );
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({ status: "idle" });
  });

  it("fails unknown, mismatched, and target-less page cursors closed before network access", async () => {
    const deps = dependencies({
      fetchPage: vi.fn().mockResolvedValueOnce(rangePage(0, 50, 150)),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();

    await expect(
      coordinator.load("page", { cursor: "malicious-cursor", targetPageStart: 50 }),
    ).resolves.toBe(false);
    await expect(
      coordinator.load("page", { cursor: "next-50", targetPageStart: 100 }),
    ).resolves.toBe(false);
    await expect(coordinator.load("page", { cursor: "next-50" })).resolves.toBe(false);

    expect(deps.fetchPage).toHaveBeenCalledTimes(1);
    expect(useSearchStore.getState().resultWindow?.operations.page).toEqual({ status: "idle" });
  });

  it("cancels an exact page attempt when a new query starts", async () => {
    const pageAttempt = deferred<SearchSnapshotPage>();
    let pageSignal: AbortSignal | undefined;
    const deps = dependencies({
      fetchPage: vi.fn((request: SearchV2Request, signal: AbortSignal) => {
        if (request.cursor) {
          pageSignal = signal;
          return pageAttempt.promise;
        }
        return Promise.resolve(
          request.keyword === "new query"
            ? page("snapshot-new", "new query")
            : rangePage(0, 50, 150),
        );
      }),
    });
    const coordinator = createSearchRequestCoordinator(deps);
    readyToSearch("needle");
    await coordinator.submit();
    const pageOutcome = coordinator.load("page", {
      cursor: "next-50",
      targetPageStart: 50,
    });
    expect(useSearchStore.getState().resultWindow?.operations.page).toMatchObject({
      status: "loading",
      attemptedCursor: "next-50",
      targetPageStart: 50,
    });

    useSearchStore.getState().setDraft({
      ...useSearchStore.getState().draft,
      keyword: "new query",
    });
    await expect(coordinator.submit()).resolves.toBe(true);

    expect(pageSignal?.aborted).toBe(true);
    pageAttempt.resolve(rangePage(50, 50, 150));
    await expect(pageOutcome).resolves.toBe(false);
    expect(useSearchStore.getState().resultWindow).toMatchObject({
      snapshotId: "snapshot-new",
      operations: { page: { status: "idle" } },
    });
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
      [409, "search_identity_conflict", "identity_conflict"],
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

  it("maps safe validation codes to the responsible search field", () => {
    const cases = [
      ["keyword_too_long", "keyword"],
      ["too_many_terms", "keyword"],
      ["invalid_chat", "scope"],
      ["too_many_chats", "scope"],
      ["invalid_category", "categories"],
      ["too_many_categories", "categories"],
      ["invalid_sender", "senders"],
      ["too_many_senders", "senders"],
      ["invalid_time_range", "dateRange"],
    ] as const;

    for (const [code, field] of cases) {
      const problem = classifySearchRequestProblem(
        new ChatlogHttpError("HTTP PRIVATE", {
          status: 400,
          body: JSON.stringify({ code, detail: "PRIVATE BODY" }),
          url: "http://127.0.0.1/search?keyword=PRIVATE",
        }),
      );
      expect(problem).toEqual({ code: "invalid_request", field });
      expect(JSON.stringify(problem)).not.toContain("PRIVATE");
    }
  });

  it("keeps identity and permission failures distinct without exposing response details", () => {
    const identity = classifySearchRequestProblem(
      new ChatlogHttpError("PRIVATE", {
        status: 409,
        body: JSON.stringify({ code: "search_identity_conflict", detail: "PRIVATE" }),
        url: "http://127.0.0.1/search?keyword=PRIVATE",
      }),
    );
    const permission = classifySearchRequestProblem(
      new ChatlogHttpError("PRIVATE", {
        status: 403,
        body: JSON.stringify({ code: "permission_denied", detail: "PRIVATE" }),
        url: "http://127.0.0.1/search?keyword=PRIVATE",
      }),
    );

    expect(identity).toEqual({ code: "identity_conflict" });
    expect(permission).toEqual({ code: "permission_denied" });
  });

  it("maps local window and backend snapshot protocol failures to their recovery families", () => {
    expect(classifySearchRequestProblem(new SearchWindowError("snapshot_mismatch"))).toEqual({
      code: "stale_revision",
    });
    expect(classifySearchRequestProblem(new SearchWindowError("identity_conflict"))).toEqual({
      code: "identity_conflict",
    });
    for (const code of ["search_snapshot_invalid", "invalid_snapshot", "invalid_cursor"]) {
      expect(
        classifySearchRequestProblem(
          new ChatlogHttpError("PRIVATE", {
            status: 400,
            body: JSON.stringify({ code, detail: "PRIVATE" }),
            url: "http://127.0.0.1/search?keyword=PRIVATE",
          }),
        ),
      ).toEqual({ code: "stale_revision" });
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

function rangePage(start: number, count: number, totalCount: number): SearchSnapshotPage {
  return {
    snapshotId: "snapshot-range",
    dataRevision: "revision-1",
    exactTotal: true,
    completeScope: true,
    totalCount,
    count,
    windowStart: start,
    previousCursor: start > 0 ? `previous-${start}` : "",
    nextCursor: start + count < totalCount ? `next-${start + count}` : "",
    hasPrevious: start > 0,
    hasNext: start + count < totalCount,
    messages: Array.from({ length: count }, (_, index) => hit("needle", start + index)),
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
