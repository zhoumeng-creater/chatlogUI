import { describe, expect, it } from "vitest";
import type {
  SearchCapabilities,
  SearchHit,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import { createDefaultSearchDraft } from "./searchDraftModel";
import {
  applySearchWindowPage,
  createSearchResultWindow,
  switchSearchBrowseMode,
} from "./searchResultWindowModel";
import {
  SEARCH_EXPORT_CONFIRM_THRESHOLD,
  SearchExportTaskError,
  abandonSearchExportTask,
  beginSearchExportFinalization,
  cancelSearchExportTask,
  commitAllSearchExportPage,
  completeSearchExportTask,
  confirmSearchExport,
  createSearchExportDialogSelection,
  createSearchExportDialogSnapshot,
  failSearchExportAttempt,
  retrySearchExportTask,
  startSearchExportAttempt,
  validateAllSearchExportPage,
} from "./searchExportTaskModel";

describe("searchExportTaskModel", () => {
  it("freezes only applied and coverage metadata without materializing retained content", () => {
    let resultWindow = createSearchResultWindow(page(0, 2, 5), "manual");
    resultWindow = applySearchWindowPage(resultWindow, page(4, 1, 5), "gap");
    const applied = appliedRequest();

    const dialog = createSearchExportDialogSnapshot({
      applied,
      resultWindow,
      capabilities: v2Capabilities(),
      stale: false,
      sortMode: "newest",
      groupingMode: "conversation",
      format: "markdown",
      privacyOn: false,
      locale: "zh-CN",
      timeZone: "Europe/London",
      openedAt: 1_700_000_000_000,
    });

    expect(dialog).toMatchObject({
      snapshotId: "snapshot",
      dataRevision: "revision",
      totalCount: 5,
      browseMode: "manual",
      sortMode: "newest",
      groupingMode: "conversation",
      format: "markdown",
      privacyOn: false,
      timeZone: "Asia/Shanghai",
      stale: false,
      defaultScope: "all",
      all: { allowed: true, count: 5, unavailableReason: null },
      partial: {
        kind: "retained_ranges",
        rangeCount: 2,
        gapCount: 1,
        unloadedCount: 2,
        count: 3,
      },
    });
    expect("recordChunks" in dialog.partial).toBe(false);
    expect("records" in dialog.partial).toBe(false);
    expect(JSON.stringify(dialog)).not.toContain("needle-0");
    expect("selectedScope" in dialog).toBe(false);
    expect(Object.isFrozen(dialog)).toBe(true);

    applied.request.keyword = "MUTATED";
    applied.dateContext!.timeZone = "UTC";
    expect(dialog.applied.request.keyword).toBe("PRIVATE needle");
    expect(dialog.applied.dateContext).toEqual({
      timeZone: "Asia/Shanghai",
      utcOffsetMinutes: 480,
      since: 1_699_920_000,
      until: 1_700_006_399,
    });
  });

  it("freezes only the current page in paged mode and rejects unsupported formats", () => {
    let resultWindow = createSearchResultWindow(page(0, 2, 5), "manual");
    resultWindow = switchSearchBrowseMode(resultWindow, "paged", null);
    resultWindow = applySearchWindowPage(resultWindow, page(2, 2, 5), "page");

    const dialog = createSearchExportDialogSnapshot({
      applied: appliedRequest(),
      resultWindow,
      capabilities: v2Capabilities(),
      stale: false,
      sortMode: "oldest",
      groupingMode: "date",
      format: "csv",
      privacyOn: false,
      openedAt: 1,
    });

    expect(dialog.partial).toMatchObject({
      kind: "current_page",
      rangeCount: 1,
      gapCount: 0,
      unloadedCount: 0,
      count: 2,
      label: "当前页 2 条",
    });
    expect("recordChunks" in dialog.partial).toBe(false);

    expect(() =>
      createSearchExportDialogSnapshot({
        applied: appliedRequest(),
        resultWindow,
        capabilities: v2Capabilities(),
        stale: false,
        sortMode: "baseline",
        groupingMode: "none",
        format: "txt" as never,
        privacyOn: false,
        openedAt: 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid_format" }));
  });

  it("keeps 5000 frozen coverage ranges out of public dialog state", () => {
    const ranges = Array.from({ length: 5_000 }, (_, index) => ({
      start: index * 2,
      end: index * 2 + 1,
    }));
    const gaps = Array.from({ length: 4_999 }, (_, index) => ({
      start: index * 2 + 1,
      end: index * 2 + 2,
    }));
    const resultWindow = {
      ...createSearchResultWindow(page(0, 1, 10_000), "manual"),
      loadedRanges: ranges,
      gaps,
    };

    const dialog = createSearchExportDialogSnapshot({
      applied: appliedRequest(),
      resultWindow,
      capabilities: v2Capabilities(),
      stale: false,
      sortMode: "baseline",
      groupingMode: "none",
      format: "json",
      privacyOn: false,
      openedAt: 1,
    });

    expect(dialog.partial).toMatchObject({
      rangeCount: 5_000,
      gapCount: 4_999,
      unloadedCount: 4_999,
    });
    expect("ranges" in dialog.partial).toBe(false);
    expect("gaps" in dialog.partial).toBe(false);
    expect(JSON.stringify(dialog).length).toBeLessThan(20_000);
  });

  it("fails all-match export closed and keeps public dialog facts privacy-safe", () => {
    const dialog = createSearchExportDialogSnapshot({
      applied: appliedRequest(),
      resultWindow: createSearchResultWindow(page(0, 1, 1), "manual"),
      capabilities: { ...v2Capabilities(), completeScope: false },
      stale: false,
      sortMode: "baseline",
      groupingMode: "none",
      format: "json",
      privacyOn: true,
      openedAt: 1,
    });

    expect(dialog).toMatchObject({
      defaultScope: "partial",
      all: {
        allowed: false,
        unavailableReason: "后端尚未证明搜索范围完整，不能导出全部命中。",
      },
    });
    expect(JSON.stringify(dialog.publicSummary)).not.toContain("PRIVATE");
    expect(JSON.stringify(dialog.publicSummary)).not.toContain("private-chat");

    const selection = createSearchExportDialogSelection(dialog);
    expect(selection).toEqual({ scope: "partial", unredactedConfirmed: false });
    expect(() =>
      confirmSearchExport(
        dialog,
        { scope: "all", unredactedConfirmed: false },
        {
          taskId: "task-all",
          thresholdConfirmed: true,
        },
      ),
    ).toThrowError(expect.objectContaining({ code: "invalid_scope" }));
  });

  it("freezes the mutable scope selection only on confirmation and gates large exports", () => {
    const dialog = createSearchExportDialogSnapshot({
      applied: appliedRequest(),
      resultWindow: createSearchResultWindow(
        page(0, 1, SEARCH_EXPORT_CONFIRM_THRESHOLD + 1),
        "manual",
      ),
      capabilities: v2Capabilities(),
      stale: false,
      sortMode: "baseline",
      groupingMode: "none",
      format: "json",
      privacyOn: false,
      openedAt: 1,
    });
    const selection = createSearchExportDialogSelection(dialog);
    selection.scope = "partial";
    selection.unredactedConfirmed = true;
    const partialTask = confirmSearchExport(dialog, selection, {
      taskId: "task-partial",
      thresholdConfirmed: false,
    });
    selection.scope = "all";
    expect(partialTask.scope).toBe("partial");
    expect(partialTask.selection.unredactedConfirmed).toBe(true);
    expect(partialTask.totalCount).toBe(1);

    expect(() =>
      confirmSearchExport(dialog, selection, {
        taskId: "task-all",
        thresholdConfirmed: false,
      }),
    ).toThrowError(expect.objectContaining({ code: "confirmation_required" }));
    const allTask = confirmSearchExport(dialog, selection, {
      taskId: "task-all",
      thresholdConfirmed: true,
    });
    expect(allTask).toMatchObject({
      scope: "all",
      totalCount: SEARCH_EXPORT_CONFIRM_THRESHOLD + 1,
    });
    expect(Object.isFrozen(allTask.selection)).toBe(true);
  });

  it("never confirms an unredacted selection captured while privacy mode is on", () => {
    const dialog = createSearchExportDialogSnapshot({
      applied: appliedRequest(),
      resultWindow: createSearchResultWindow(page(0, 1, 1), "manual"),
      capabilities: v2Capabilities(),
      stale: false,
      sortMode: "baseline",
      groupingMode: "none",
      format: "json",
      privacyOn: true,
      openedAt: 1,
    });
    expect(() =>
      confirmSearchExport(
        dialog,
        { scope: "partial", unredactedConfirmed: true },
        { taskId: "task-private", thresholdConfirmed: false },
      ),
    ).toThrowError(expect.objectContaining({ code: "invalid_privacy" }));
  });

  it("validates then commits strict contiguous pages without retaining hit payloads", () => {
    const dialog = allDialog(3);
    let task = startSearchExportAttempt(
      confirmSearchExport(
        dialog,
        { scope: "all", unredactedConfirmed: false },
        {
          taskId: "task",
          thresholdConfirmed: true,
        },
      ),
      "attempt-1",
    );

    const tracker = identityTracker();
    const first = validateAllSearchExportPage(task, "attempt-1", null, page(0, 2, 3), tracker);
    expect(first.kind).toBe("accepted");
    if (first.kind !== "accepted") throw new Error("expected accepted page");
    expect(first.records.map((record) => record.sourceIndex)).toEqual([0, 1]);
    task = commitAllSearchExportPage(task, first);
    expect(task).toMatchObject({
      status: "running",
      processedCount: 2,
      nextCursor: "next-2",
    });
    expect("hits" in task).toBe(false);
    expect("records" in task).toBe(false);
    expect("seenMessageIds" in task).toBe(false);
    expect("seenCursors" in task).toBe(false);
    trackAcceptedPage(tracker, first);

    const final = validateAllSearchExportPage(task, "attempt-1", "next-2", page(2, 1, 3), tracker);
    if (final.kind !== "accepted") throw new Error("expected accepted page");
    task = commitAllSearchExportPage(task, final);
    expect(task).toMatchObject({ status: "running", processedCount: 3, nextCursor: null });
  });

  it.each([
    [
      "snapshot",
      "invalid_page",
      (value: SearchSnapshotPage) => ({ ...value, snapshotId: "other" }),
    ],
    [
      "revision",
      "stale_revision",
      (value: SearchSnapshotPage) => ({ ...value, dataRevision: "other" }),
    ],
    ["exact", "invalid_page", (value: SearchSnapshotPage) => ({ ...value, exactTotal: false })],
    [
      "complete",
      "invalid_page",
      (value: SearchSnapshotPage) => ({ ...value, completeScope: false }),
    ],
    ["total", "invalid_page", (value: SearchSnapshotPage) => ({ ...value, totalCount: 4 })],
    ["count", "invalid_page", (value: SearchSnapshotPage) => ({ ...value, count: 1 })],
    ["window", "invalid_page", (value: SearchSnapshotPage) => ({ ...value, windowStart: 1 })],
    [
      "source index",
      "invalid_page",
      (value: SearchSnapshotPage) => ({
        ...value,
        messages: [{ ...value.messages[0], sourceIndex: 9 }, value.messages[1]],
      }),
    ],
  ] as Array<
    [string, "invalid_page" | "stale_revision", (value: SearchSnapshotPage) => SearchSnapshotPage]
  >)("rejects a page with invalid %s facts", (_label, code, mutate) => {
    const task = runningAllTask(3);
    expect(() =>
      validateAllSearchExportPage(
        task,
        "attempt-1",
        null,
        mutate(page(0, 2, 3)),
        identityTracker(),
      ),
    ).toThrowError(expect.objectContaining({ code }));
  });

  it("rejects empty intermediate, duplicate identities, duplicate cursors, and duplicate pages", () => {
    let task = runningAllTask(3);
    expect(() =>
      validateAllSearchExportPage(
        task,
        "attempt-1",
        null,
        {
          ...page(0, 2, 3),
          count: 0,
          messages: [],
        },
        identityTracker(),
      ),
    ).toThrowError(expect.objectContaining({ code: "invalid_page" }));

    const tracker = identityTracker();
    const first = validateAllSearchExportPage(task, "attempt-1", null, page(0, 2, 3), tracker);
    if (first.kind !== "accepted") throw new Error("expected accepted page");
    task = commitAllSearchExportPage(task, first);
    trackAcceptedPage(tracker, first);

    const duplicateIdentity = page(2, 1, 3);
    duplicateIdentity.messages[0].messageId = "message-0";
    duplicateIdentity.messages[0].conversationId = first.records[0].conversationId;
    duplicateIdentity.messages[0].seq = first.records[0].seq;
    expect(() =>
      validateAllSearchExportPage(task, "attempt-1", "next-2", duplicateIdentity, tracker),
    ).toThrowError(expect.objectContaining({ code: "invalid_page" }));

    const sameLocalIdInAnotherConversation = page(2, 1, 3);
    sameLocalIdInAnotherConversation.messages[0].messageId = "message-0";
    sameLocalIdInAnotherConversation.messages[0].conversationId = "other-conversation";
    expect(
      validateAllSearchExportPage(
        task,
        "attempt-1",
        "next-2",
        sameLocalIdInAnotherConversation,
        tracker,
      ).kind,
    ).toBe("accepted");

    const sameMessageInSameConversationAtAnotherSequence = page(2, 1, 3);
    sameMessageInSameConversationAtAnotherSequence.messages[0].messageId = "message-0";
    sameMessageInSameConversationAtAnotherSequence.messages[0].conversationId =
      first.records[0].conversationId;
    sameMessageInSameConversationAtAnotherSequence.messages[0].seq =
      first.records[0].seq + 1;
    expect(
      validateAllSearchExportPage(
        task,
        "attempt-1",
        "next-2",
        sameMessageInSameConversationAtAnotherSequence,
        tracker,
      ).kind,
    ).toBe("accepted");

    const duplicateNextCursor = page(2, 1, 4);
    const fourTracker = identityTracker();
    const fourTask = commitFirstPage(runningAllTask(4), fourTracker);
    duplicateNextCursor.nextCursor = "next-2";
    expect(() =>
      validateAllSearchExportPage(
        fourTask,
        "attempt-1",
        "next-2",
        duplicateNextCursor,
        fourTracker,
      ),
    ).toThrowError(expect.objectContaining({ code: "invalid_page" }));

    expect(() =>
      validateAllSearchExportPage(task, "attempt-1", null, page(0, 2, 3), tracker),
    ).toThrowError(expect.objectContaining({ code: "invalid_page" }));
  });

  it("ignores late pages by attempt identity before inspecting their private payload", () => {
    const task = runningAllTask(1);
    const late = validateAllSearchExportPage(
      task,
      "attempt-old",
      null,
      {
        ...page(0, 1, 1),
        snapshotId: "PRIVATE INVALID",
      },
      identityTracker(),
    );
    expect(late).toEqual({ kind: "ignored", reason: "late_attempt" });
  });

  it("retries from the last safe checkpoint but makes stale and expired failures terminal", () => {
    let task = commitFirstPage(runningAllTask(4), identityTracker());
    task = failSearchExportAttempt(task, "attempt-1", "request_failed", { checkpointSafe: true });
    expect(task).toMatchObject({
      status: "error",
      processedCount: 2,
      nextCursor: "next-2",
      error: { code: "request_failed", retryable: true },
    });
    task = retrySearchExportTask(task, "attempt-2");
    expect(task).toMatchObject({
      status: "running",
      attempt: 2,
      attemptId: "attempt-2",
      processedCount: 2,
      nextCursor: "next-2",
    });

    for (const code of ["stale_revision", "snapshot_expired"] as const) {
      const terminal = failSearchExportAttempt(runningAllTask(1), "attempt-1", code, {
        checkpointSafe: false,
      });
      expect(terminal.error).toMatchObject({ code, retryable: false });
      expect(() => retrySearchExportTask(terminal, "attempt-2")).toThrowError(
        expect.objectContaining({ code: "not_retryable" }),
      );
    }
  });

  it("cancels only the active attempt and uses privacy-safe typed errors", () => {
    const task = runningAllTask(1);
    expect(cancelSearchExportTask(task, "attempt-old")).toBe(task);
    expect(cancelSearchExportTask(task, "attempt-1")).toMatchObject({
      status: "cancelled",
      attemptId: null,
    });
    expect(String(new SearchExportTaskError("snapshot_expired"))).toBe(
      "SearchExportTaskError: Search export snapshot expired",
    );
  });

  it("keeps native finalization cancellable and can abandon a paused checkpoint", () => {
    let task = runningAllTask(1);
    const accepted = validateAllSearchExportPage(
      task,
      "attempt-1",
      null,
      page(0, 1, 1),
      identityTracker(),
    );
    if (accepted.kind !== "accepted") throw new Error("expected accepted page");
    task = commitAllSearchExportPage(task, accepted);
    task = beginSearchExportFinalization(task, "attempt-1");
    expect(task.status).toBe("finalizing");
    expect(cancelSearchExportTask(task, "attempt-1").status).toBe("cancelled");
    expect(completeSearchExportTask(task, "attempt-1").status).toBe("completed");

    const paused = failSearchExportAttempt(runningAllTask(1), "attempt-1", "request_failed", {
      checkpointSafe: true,
    });
    expect(abandonSearchExportTask(paused)).toMatchObject({
      status: "cancelled",
      attemptId: null,
      error: null,
    });
  });

  it("keeps public task state constant-size across a 250k-hit, 5000-page export", () => {
    const totalCount = 250_000;
    const tracker = identityTracker();
    let task = runningAllTask(totalCount);
    let cursor: string | null = null;

    for (let start = 0; start < totalCount; start += 50) {
      const accepted = validateAllSearchExportPage(
        task,
        "attempt-1",
        cursor,
        page(start, 50, totalCount),
        tracker,
      );
      if (accepted.kind !== "accepted") throw new Error("expected accepted page");
      trackAcceptedPage(tracker, accepted);
      task = commitAllSearchExportPage(task, accepted);
      cursor = task.nextCursor;
    }

    expect(task).toMatchObject({ processedCount: totalCount, nextCursor: null });
    expect("seenMessageIds" in task).toBe(false);
    expect("seenCursors" in task).toBe(false);
    expect(JSON.stringify(task).length).toBeLessThan(20_000);
    expect(tracker.messageIdentities.size).toBe(totalCount);
    expect(tracker.cursors.size).toBe(4_999);
  }, 10_000);
});

function allDialog(totalCount: number) {
  return createSearchExportDialogSnapshot({
    applied: appliedRequest(),
    resultWindow: createSearchResultWindow(page(0, Math.min(totalCount, 1), totalCount), "manual"),
    capabilities: v2Capabilities(),
    stale: false,
    sortMode: "baseline",
    groupingMode: "none",
    format: "json",
    privacyOn: false,
    openedAt: 1,
  });
}

function runningAllTask(totalCount: number) {
  return startSearchExportAttempt(
    confirmSearchExport(
      allDialog(totalCount),
      { scope: "all", unredactedConfirmed: false },
      {
        taskId: "task",
        thresholdConfirmed: true,
      },
    ),
    "attempt-1",
  );
}

function commitFirstPage(
  task: ReturnType<typeof runningAllTask>,
  tracker: ReturnType<typeof identityTracker>,
) {
  const accepted = validateAllSearchExportPage(
    task,
    "attempt-1",
    null,
    page(0, 2, task.totalCount),
    tracker,
  );
  if (accepted.kind !== "accepted") throw new Error("expected accepted page");
  trackAcceptedPage(tracker, accepted);
  return commitAllSearchExportPage(task, accepted);
}

function identityTracker() {
  const messageIdentities = new Set<string>();
  const cursors = new Set<string>();
  return {
    messageIdentities,
    cursors,
    hasMessageIdentity: (identity: string) => messageIdentities.has(identity),
    hasCursor: (cursor: string) => cursors.has(cursor),
  };
}

function trackAcceptedPage(
  tracker: ReturnType<typeof identityTracker>,
  accepted: { messageIdentities: readonly string[]; requestedCursor: string | null },
): void {
  for (const identity of accepted.messageIdentities) tracker.messageIdentities.add(identity);
  if (accepted.requestedCursor) tracker.cursors.add(accepted.requestedCursor);
}

function appliedRequest() {
  const draft = { ...createDefaultSearchDraft(), keyword: "PRIVATE needle" };
  const request: SearchV2Request = {
    keyword: "PRIVATE needle",
    chats: ["private-chat"],
    since: 1_699_920_000,
    until: 1_700_006_399,
    limit: 50,
  };
  return {
    draft,
    request,
    dateContext: {
      timeZone: "Asia/Shanghai",
      utcOffsetMinutes: 480,
      since: request.since,
      until: request.until,
    },
    succeededAt: 1_700_000_000_000,
  };
}

function v2Capabilities(): SearchCapabilities {
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

function page(start: number, count: number, total: number): SearchSnapshotPage {
  return {
    snapshotId: "snapshot",
    dataRevision: "revision",
    exactTotal: true,
    completeScope: true,
    totalCount: total,
    count,
    windowStart: start,
    previousCursor: start > 0 ? `previous-${start}` : "",
    nextCursor: start + count < total ? `next-${start + count}` : "",
    hasPrevious: start > 0,
    hasNext: start + count < total,
    messages: Array.from({ length: count }, (_, index) => hit(start + index)),
  };
}

function hit(sourceIndex: number): SearchHit {
  return {
    messageId: `message-${sourceIndex}`,
    seq: sourceIndex,
    sourceIndex,
    conversationId: sourceIndex === 4 ? "other-chat" : "private-chat",
    conversationName: sourceIndex === 4 ? "Other Chat" : "Private Chat",
    senderId: "private-sender",
    senderName: "Private Sender",
    timestamp: 1_700_000_000 - sourceIndex,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: `needle-${sourceIndex}`,
    matchSegments: [{ text: `needle-${sourceIndex}`, matched: true }],
  };
}
