import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
  type SearchResultWindow,
} from "./searchResultWindowModel";
import { SEARCH_EXPORT_CONFIRM_THRESHOLD, SearchExportTaskError } from "./searchExportTaskModel";
import { SearchExportDialog } from "@/l3-molecule/search/SearchExportDialog";
import {
  SEARCH_EXPORT_MAX_SINK_CHUNK_BYTES,
  createSearchExportCoordinator,
  type SearchExportChunkStream,
  type SearchExportCommanderView,
  type SearchExportCoordinator,
  type SearchExportCoordinatorDependencies,
} from "./useSearchExportCommander";

describe("createSearchExportCoordinator", () => {
  it("changes the frozen dialog output format before an attempt starts", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));

    expect(coordinator.setFormat("csv")).toBe(true);
    expect(coordinator.getState().dialog?.format).toBe("csv");
    coordinator.selectScope("partial");
    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);
    expect(deps.beginStream).toHaveBeenCalledWith(
      expect.objectContaining({ extension: "csv" }),
    );
  });

  it("streams the frozen partial presentation without fetching or including gaps", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    let resultWindow = createSearchResultWindow(page(0, 2, 5), "manual");
    resultWindow = applySearchWindowPage(resultWindow, page(4, 1, 5), "gap");
    coordinator.openDialog(
      dialogInput(resultWindow, {
        sortMode: "oldest",
        groupingMode: "conversation",
        format: "json",
      }),
    );
    coordinator.selectScope("partial");
    expect(coordinator.setUnredactedConfirmed(true)).toBe(true);

    resultWindow = applySearchWindowPage(resultWindow, page(2, 2, 5), "gap");
    expect(resultWindow.retainedHits).toHaveLength(5);
    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

    expect(deps.fetchPage).not.toHaveBeenCalled();
    expect(deps.beginStream).toHaveBeenCalledWith({
      fileName: expect.stringMatching(/^chatlog-search-\d+\.json$/),
      extension: "json",
      redactionPolicy: "unredacted-confirmed",
    });
    const document = JSON.parse(stream.chunks.join("")) as {
      metadata: {
        partial: boolean;
        ranges: unknown[];
        gaps: unknown[];
        revisionState: string;
        querySince: number;
        queryUntil: number;
        utcOffsetMinutes: number;
      };
      messages: Array<{ sourceIndex: number; content: string; groupKey: string }>;
    };
    expect(document.metadata).toMatchObject({
      partial: true,
      ranges: [
        { start: 0, end: 2 },
        { start: 4, end: 5 },
      ],
      gaps: [{ start: 2, end: 4 }],
      revisionState: "current",
      querySince: 1_699_920_000,
      queryUntil: 1_700_006_399,
      utcOffsetMinutes: 480,
    });
    expect(document.messages.map((row) => row.sourceIndex)).toEqual([4, 1, 0]);
    expect(document.messages[2].content).toBe("needle-0");
    expect(document.messages.every((row) => row.groupKey.length > 0)).toBe(true);
    expect(coordinator.getState().task).toMatchObject({
      status: "completed",
      scope: "partial",
      processedCount: 3,
      totalCount: 3,
    });
    expect(stream.complete).toHaveBeenCalledTimes(1);
    expect(stream.commit).toHaveBeenCalledTimes(1);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState().isOpen).toBe(false);
  });

  it.each(["markdown", "csv", "json"] as const)(
    "keeps partial %s rows in the exact frozen grouped UI order",
    async (format) => {
      const stream = createStream();
      const deps = dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      });
      const groupedPage = page(0, 3, 3);
      groupedPage.messages = [
        {
          ...hit(0),
          conversationId: "conversation-a",
          conversationName: "Alpha",
          timestamp: 1_700_000_100,
        },
        {
          ...hit(1),
          conversationId: "conversation-b",
          conversationName: "Beta",
          timestamp: 1_700_000_300,
        },
        {
          ...hit(2),
          conversationId: "conversation-a",
          conversationName: "Alpha",
          timestamp: 1_700_000_200,
        },
      ];
      const coordinator = createSearchExportCoordinator(deps);
      coordinator.openDialog(
        dialogInput(createSearchResultWindow(groupedPage, "manual"), {
          sortMode: "baseline",
          groupingMode: "conversation",
          format,
        }),
      );
      coordinator.selectScope("partial");
      coordinator.setUnredactedConfirmed(true);

      await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

      const output = stream.chunks.join("");
      expect(readExportedSourceIndexes(format, output)).toEqual([0, 2, 1]);
      if (format === "markdown") {
        expect([...output.matchAll(/^## (Alpha|Beta)$/gm)].map((match) => match[1])).toEqual([
          "Alpha",
          "Beta",
        ]);
      }
    },
  );

  it("keeps privacy-off exports redacted until the dialog selection explicitly confirms raw content", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

    expect(deps.beginStream).toHaveBeenCalledWith(
      expect.objectContaining({ redactionPolicy: "redacted" }),
    );
    expect(stream.chunks.join("")).toContain("已隐藏消息内容");
    expect(stream.chunks.join("")).not.toContain("needle-0");
  });

  it("latches privacy on for an open dialog and never restores revoked raw permission", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    expect(coordinator.setUnredactedConfirmed(true)).toBe(true);

    deps.setPrivacyOn(true);

    await vi.waitFor(() => {
      expect(coordinator.getState().dialog?.privacyOn).toBe(true);
      expect(coordinator.getState().selection?.unredactedConfirmed).toBe(false);
    });
    deps.setPrivacyOn(false);
    expect(coordinator.getState().dialog?.privacyOn).toBe(true);
    expect(coordinator.getState().selection?.unredactedConfirmed).toBe(false);
    expect(coordinator.setUnredactedConfirmed(true)).toBe(false);

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);
    expect(deps.beginStream).toHaveBeenCalledWith(
      expect.objectContaining({ redactionPolicy: "redacted" }),
    );
    expect(stream.chunks.join("")).toContain("已隐藏消息内容");
    expect(stream.chunks.join("")).not.toContain("needle-0");
  });

  it("rechecks current privacy at confirmation even before a subscription notification", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    expect(coordinator.setUnredactedConfirmed(true)).toBe(true);

    deps.setPrivacyOn(true, false);
    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

    expect(deps.beginStream).toHaveBeenCalledWith(
      expect.objectContaining({ redactionPolicy: "redacted" }),
    );
    expect(stream.chunks.join("")).not.toContain("needle-0");
  });

  it("cancels an unredacted temporary stream when privacy turns on during a write", async () => {
    const write = deferred<void>();
    const stream = createStream();
    vi.mocked(stream.append).mockImplementationOnce(async () => write.promise);
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    coordinator.setUnredactedConfirmed(true);

    const running = coordinator.confirm({ thresholdConfirmed: false });
    await vi.waitFor(() => expect(stream.append).toHaveBeenCalledTimes(1));
    deps.setPrivacyOn(true);
    try {
      await vi.waitFor(() => {
        expect(stream.cancel).toHaveBeenCalledTimes(1);
        expect(coordinator.getState()).toMatchObject({
          dialog: { privacyOn: true },
          selection: { unredactedConfirmed: false },
          task: { status: "cancelled", selection: { unredactedConfirmed: false } },
        });
      });
    } finally {
      write.resolve();
      await running;
    }

    await expect(running).resolves.toBe(false);
    expect(stream.complete).not.toHaveBeenCalled();
    expect(coordinator.getState().result).toBeNull();
  });

  it("cancels an unredacted stream if privacy turns on while native completion is pending", async () => {
    const completed = deferred<{
      fileName: string;
      extension: "json";
      bytesWritten: number;
      locationSummary: string;
    }>();
    const stream = createStream({ complete: vi.fn(async () => completed.promise) });
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    coordinator.setUnredactedConfirmed(true);

    const running = coordinator.confirm({ thresholdConfirmed: false });
    await vi.waitFor(() => expect(coordinator.getState().task?.status).toBe("finalizing"));
    deps.setPrivacyOn(true);
    try {
      await vi.waitFor(() => {
        expect(stream.cancel).toHaveBeenCalledTimes(1);
        expect(coordinator.getState().task?.status).toBe("cancelled");
      });
    } finally {
      completed.resolve({
        fileName: "chatlog-search.json",
        extension: "json",
        bytesWritten: 1,
        locationSummary: "已保存到所选位置",
      });
      await running;
    }

    await expect(running).resolves.toBe(false);
    expect(coordinator.getState().result).toBeNull();
    expect(stream.commit).not.toHaveBeenCalled();
  });

  it("marks an allowed stale partial export with its frozen revision facts", async () => {
    const stream = createStream();
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      }),
    );
    coordinator.openDialog(
      dialogInput(createSearchResultWindow(page(0, 1, 1), "manual"), {
        stale: true,
      }),
    );
    expect(coordinator.getState().dialog?.all.allowed).toBe(false);
    expect(coordinator.getState().selection?.scope).toBe("partial");

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

    expect(JSON.parse(stream.chunks.join("")).metadata).toMatchObject({
      revisionState: "stale",
      snapshotId: "snapshot",
      dataRevision: "revision",
    });
  });

  it("runs all matches as an independent baseline cursor task without accumulating hits", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(page(0, 2, 3))
        .mockResolvedValueOnce(page(2, 1, 3)),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(
      dialogInput(createSearchResultWindow(page(0, 1, 3), "manual"), {
        sortMode: "newest",
        groupingMode: "date",
        format: "json",
      }),
    );

    await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(true);

    expect(deps.fetchPage).toHaveBeenNthCalledWith(
      1,
      {
        keyword: "PRIVATE needle",
        chats: ["private-chat"],
        since: 1_699_920_000,
        until: 1_700_006_399,
        limit: 50,
        snapshotId: "snapshot",
        dataRevision: "revision",
      },
      expect.any(AbortSignal),
    );
    expect(deps.fetchPage).toHaveBeenNthCalledWith(
      2,
      {
        keyword: "PRIVATE needle",
        chats: ["private-chat"],
        since: 1_699_920_000,
        until: 1_700_006_399,
        limit: 50,
        snapshotId: "snapshot",
        dataRevision: "revision",
        cursor: "next-2",
      },
      expect.any(AbortSignal),
    );
    const document = JSON.parse(stream.chunks.join("")) as {
      metadata: { sortMode: string; groupingMode: string; partial: boolean };
      messages: Array<{ sourceIndex: number; groupKey: string }>;
    };
    expect(document.metadata).toMatchObject({
      sortMode: "baseline",
      groupingMode: "none",
      partial: false,
    });
    expect(document.messages.map((row) => row.sourceIndex)).toEqual([0, 1, 2]);
    expect(document.messages.every((row) => row.groupKey === "")).toBe(true);
    const task = coordinator.getState().task;
    expect(task).toMatchObject({ status: "completed", processedCount: 3, nextCursor: null });
    expect(task && "hits" in task).toBe(false);
    expect(task && "records" in task).toBe(false);
  });

  it("completes a zero-match all export without issuing a cursor request", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 0, 0), "manual")));

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);

    expect(deps.fetchPage).not.toHaveBeenCalled();
    expect(JSON.parse(stream.chunks.join(""))).toMatchObject({
      metadata: { exportedCount: 0, totalCount: 0, partial: false },
      messages: [],
    });
  });

  it("requires threshold confirmation, rejects duplicate confirms, and ignores a late page after cancel", async () => {
    const response = deferred<SearchSnapshotPage>();
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi.fn(async () => response.promise),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(
      dialogInput(
        createSearchResultWindow(page(0, 1, SEARCH_EXPORT_CONFIRM_THRESHOLD + 1), "manual"),
      ),
    );

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(false);
    expect(coordinator.getState().confirmationRequired).toBe(true);
    expect(deps.beginStream).not.toHaveBeenCalled();

    const running = coordinator.confirm({ thresholdConfirmed: true });
    await vi.waitFor(() => expect(deps.fetchPage).toHaveBeenCalledTimes(1));
    await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
    await coordinator.cancel();
    response.resolve(page(0, 1, SEARCH_EXPORT_CONFIRM_THRESHOLD + 1));
    await expect(running).resolves.toBe(false);

    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(stream.complete).not.toHaveBeenCalled();
    expect(coordinator.getState().task?.status).toBe("cancelled");
    expect(coordinator.getState()).toMatchObject({ isOpen: false, dialog: null });
  });

  it("pauses a private request failure and retries from the confirmed cursor on the same temp stream", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi
        .fn()
        .mockResolvedValueOnce(page(0, 2, 4))
        .mockRejectedValueOnce(new Error("PRIVATE QUERY request failed"))
        .mockResolvedValueOnce(page(2, 2, 4)),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 4), "manual")));

    await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
    expect(coordinator.getState().task).toMatchObject({
      status: "error",
      processedCount: 2,
      nextCursor: "next-2",
      error: { code: "request_failed", retryable: true, checkpointSafe: true },
    });
    expect(JSON.stringify(coordinator.getState().task?.error)).not.toContain("PRIVATE");
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.selectScope("partial")).toBe(false);

    await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
    expect(deps.fetchPage).toHaveBeenCalledTimes(2);

    await expect(coordinator.retry()).resolves.toBe(true);
    expect(deps.beginStream).toHaveBeenCalledTimes(1);
    expect(deps.fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "next-2" }),
      expect.any(AbortSignal),
    );
    expect(coordinator.getState().task).toMatchObject({
      status: "completed",
      attempt: 2,
      processedCount: 4,
    });
    expect(JSON.parse(stream.chunks.join("")).messages).toHaveLength(4);
  });

  it("makes revision and expiry failures non-retryable and cancels the temp stream", async () => {
    for (const failure of [
      new SearchExportTaskError("snapshot_expired"),
      new SearchExportTaskError("stale_revision"),
    ]) {
      const stream = createStream();
      const deps = dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => {
          throw failure;
        }),
      });
      const coordinator = createSearchExportCoordinator(deps);
      coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 2), "manual")));

      await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
      expect(coordinator.getState().task?.error).toMatchObject({
        code: failure.code,
        retryable: false,
      });
      expect(stream.cancel).toHaveBeenCalledTimes(1);
      await expect(coordinator.retry()).resolves.toBe(false);
    }
  });

  it("cancels temp output on write errors and when a paused error dialog closes", async () => {
    const brokenStream = createStream({
      append: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("PRIVATE WRITE PATH")),
    });
    const broken = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream: brokenStream })),
        fetchPage: vi.fn(async () => page(0, 1, 1)),
      }),
    );
    broken.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    await expect(broken.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
    expect(broken.getState().task?.error).toMatchObject({ code: "write_failed" });
    expect(JSON.stringify(broken.getState().task?.error)).not.toContain("PRIVATE");
    expect(brokenStream.cancel).toHaveBeenCalledTimes(1);

    const pausedStream = createStream();
    const paused = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream: pausedStream })),
        fetchPage: vi.fn(async () => {
          throw new Error("PRIVATE NETWORK");
        }),
      }),
    );
    paused.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 2), "manual")));
    await paused.confirm({ thresholdConfirmed: true });
    expect(pausedStream.cancel).not.toHaveBeenCalled();
    await paused.close();
    expect(pausedStream.cancel).toHaveBeenCalledTimes(1);
    expect(paused.getState()).toMatchObject({ isOpen: false, dialog: null, task: null });
  });

  it("keeps an already committed stream recoverable across two lost commit acknowledgements", async () => {
    const privateCanary = "C:\\Users\\Synthetic\\PRIVATE-committed.json";
    let nativeCommitted = false;
    let acknowledgementAttempt = 0;
    const stream = createStream({
      commit: vi.fn(async () => {
        nativeCommitted = true;
        acknowledgementAttempt += 1;
        if (acknowledgementAttempt <= 2) throw new Error(privateCanary);
      }),
    });
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi.fn(async () => page(0, 1, 1)),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    coordinator.setUnredactedConfirmed(true);

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(false);

    expect(nativeCommitted).toBe(true);
    expect(stream.complete).toHaveBeenCalledTimes(1);
    expect(stream.commit).toHaveBeenCalledTimes(1);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      commitInFlight: false,
      result: { fileName: "chatlog-search.json" },
      task: {
        status: "commit_pending",
        error: {
          code: "commit_confirmation_interrupted",
          retryable: true,
          checkpointSafe: false,
        },
      },
    });
    expect(JSON.stringify(coordinator.getState())).not.toMatch(/PRIVATE-committed|cleanup_failed/i);

    deps.setPrivacyOn(true);
    await vi.waitFor(() => {
      expect(coordinator.getState()).toMatchObject({
        dialog: { privacyOn: true },
        selection: { unredactedConfirmed: false },
        task: {
          status: "commit_pending",
          dialog: { privacyOn: true },
          selection: { unredactedConfirmed: true },
        },
      });
    });
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(JSON.stringify(coordinator.getState())).not.toContain(privateCanary);

    await coordinator.cancel();
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState().task?.status).toBe("commit_pending");

    await expect(coordinator.retry()).resolves.toBe(false);
    expect(stream.commit).toHaveBeenCalledTimes(2);
    expect(stream.complete).toHaveBeenCalledTimes(1);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      commitInFlight: false,
      result: { fileName: "chatlog-search.json" },
      task: {
        status: "commit_pending",
        selection: { unredactedConfirmed: true },
        error: { code: "commit_confirmation_interrupted", retryable: true },
      },
    });

    await expect(coordinator.retry()).resolves.toBe(true);
    expect(deps.beginStream).toHaveBeenCalledTimes(1);
    expect(stream.complete).toHaveBeenCalledTimes(1);
    expect(stream.commit).toHaveBeenCalledTimes(3);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({
      isOpen: false,
      commitInFlight: false,
      result: { fileName: "chatlog-search.json" },
      task: {
        status: "completed",
        selection: { unredactedConfirmed: true },
        error: null,
      },
    });
  });

  it("retries only native commit when the published commit itself initially fails", async () => {
    const privateCanary = "C:\\Users\\Synthetic\\PRIVATE-published.json";
    const stream = createStream({
      commit: vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error(privateCanary))
        .mockResolvedValueOnce(undefined),
    });
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi.fn(async () => page(0, 1, 1)),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));

    await expect(coordinator.confirm({ thresholdConfirmed: true })).resolves.toBe(false);
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      result: { fileName: "chatlog-search.json" },
      task: {
        status: "commit_pending",
        error: { code: "commit_confirmation_interrupted", retryable: true },
      },
    });
    expect(stream.cancel).not.toHaveBeenCalled();

    await expect(coordinator.retry()).resolves.toBe(true);
    expect(deps.beginStream).toHaveBeenCalledTimes(1);
    expect(stream.complete).toHaveBeenCalledTimes(1);
    expect(stream.commit).toHaveBeenCalledTimes(2);
    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState().task?.status).toBe("completed");
    expect(JSON.stringify(coordinator.getState())).not.toMatch(/PRIVATE-published|cleanup_failed/i);
  });

  it("refuses close while commit confirmation is recoverable and retains the published stream", async () => {
    const stream = createStream({
      commit: vi
        .fn<() => Promise<void>>()
        .mockRejectedValueOnce(new Error("C:\\Users\\Synthetic\\PRIVATE-unknown-commit.json"))
        .mockResolvedValueOnce(undefined),
    });
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    await coordinator.confirm({ thresholdConfirmed: true });

    await coordinator.close();

    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      task: { status: "commit_pending" },
      result: { fileName: "chatlog-search.json" },
    });
    await expect(coordinator.retry()).resolves.toBe(true);
    expect(stream.commit).toHaveBeenCalledTimes(2);
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("abandons a paused safe checkpoint when cancel is requested", async () => {
    const stream = createStream();
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => {
          throw new Error("PRIVATE NETWORK");
        }),
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 2), "manual")));
    await coordinator.confirm({ thresholdConfirmed: true });
    expect(coordinator.getState().task?.error).toMatchObject({ checkpointSafe: true });

    await coordinator.cancel();

    expect(stream.cancel).toHaveBeenCalledTimes(1);
    expect(coordinator.getState()).toMatchObject({
      isOpen: false,
      dialog: null,
      selection: null,
      task: { status: "cancelled", error: null },
    });
    await expect(coordinator.retry()).resolves.toBe(false);
  });

  it("keeps native finalization recoverable when the user cancels", async () => {
    const completed = deferred<{
      fileName: string;
      extension: "json";
      bytesWritten: number;
      locationSummary: string;
    }>();
    const stream = createStream({ complete: vi.fn(async () => completed.promise) });
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => page(0, 1, 1)),
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    const running = coordinator.confirm({ thresholdConfirmed: true });
    await vi.waitFor(() => expect(coordinator.getState().task?.status).toBe("finalizing"));

    await coordinator.cancel();
    expect(coordinator.getState().task?.status).toBe("cancelled");
    expect(stream.cancel).toHaveBeenCalledTimes(1);

    completed.resolve({
      fileName: "chatlog-search.json",
      extension: "json",
      bytesWritten: 1,
      locationSummary: "已保存到所选位置",
    });
    await expect(running).resolves.toBe(false);
    expect(coordinator.getState()).toMatchObject({
      isOpen: false,
      dialog: null,
      task: { status: "cancelled" },
    });
    expect(stream.commit).not.toHaveBeenCalled();
  });

  it("ignores cancel intent after native commit starts and completes without cleanup failure", async () => {
    const commitStarted = deferred<void>();
    const commitAcknowledged = deferred<void>();
    const stream = createStream({
      commit: vi.fn(async () => {
        commitStarted.resolve();
        await commitAcknowledged.promise;
      }),
    });
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => page(0, 1, 1)),
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    const running = coordinator.confirm({ thresholdConfirmed: true });
    await commitStarted.promise;

    await coordinator.cancel();

    expect(stream.cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      task: { status: "finalizing", error: null },
    });

    commitAcknowledged.resolve();
    await expect(running).resolves.toBe(true);
    expect(coordinator.getState()).toMatchObject({
      isOpen: false,
      task: { status: "completed", error: null },
      result: { fileName: "chatlog-search.json" },
    });
    expect(stream.cancel).not.toHaveBeenCalled();

    await coordinator.close();
    expect(coordinator.getState()).toMatchObject({ isOpen: false, task: null, result: null });
    expect(stream.cancel).not.toHaveBeenCalled();
  });

  it("latches privacy without cancelling an irreversible native commit", async () => {
    const privateCanary = "C:\\Users\\Synthetic\\PRIVATE-commit-canary.json";
    const commitStarted = deferred<void>();
    const commitAcknowledged = deferred<void>();
    const cancel = vi.fn(async () => {
      throw new Error(privateCanary);
    });
    const stream = createStream({
      commit: vi.fn(async () => {
        commitStarted.resolve();
        await commitAcknowledged.promise;
      }),
      cancel,
    });
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
      fetchPage: vi.fn(async () => page(0, 1, 1)),
    });
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    coordinator.selectScope("partial");
    coordinator.setUnredactedConfirmed(true);
    const running = coordinator.confirm({ thresholdConfirmed: false });
    await commitStarted.promise;

    deps.setPrivacyOn(true);
    await vi.waitFor(() => {
      expect(coordinator.getState()).toMatchObject({
        dialog: { privacyOn: true },
        selection: { unredactedConfirmed: false },
        task: {
          status: "finalizing",
          error: null,
          dialog: { privacyOn: true },
          selection: { unredactedConfirmed: true },
        },
        commitInFlight: true,
      });
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(JSON.stringify(coordinator.getState())).not.toContain("cleanup_failed");
    expect(JSON.stringify(coordinator.getState())).not.toContain(privateCanary);

    const html = renderToStaticMarkup(
      createElement(SearchExportDialog, { view: commanderView(coordinator) }),
    );
    expect(html).toContain("未脱敏导出");
    expect(html).toContain("隐私模式不会追溯修改当前已写入文件");
    expect(html).not.toContain("隐私模式已开启，导出内容将保持脱敏");

    commitAcknowledged.resolve();
    await expect(running).resolves.toBe(true);
    expect(coordinator.getState()).toMatchObject({
      isOpen: false,
      task: {
        status: "completed",
        selection: { unredactedConfirmed: true },
        error: null,
      },
      commitInFlight: false,
      result: { locationSummary: "已保存到所选位置" },
    });
    expect(JSON.stringify(coordinator.getState())).not.toContain("cleanup_failed");
    expect(JSON.stringify(coordinator.getState())).not.toContain(privateCanary);

    await coordinator.close();
    expect(cancel).not.toHaveBeenCalled();
    expect(coordinator.getState()).toMatchObject({ isOpen: false, task: null, result: null });
  });

  it("surfaces native cleanup failure and keeps the stream retriable without leaking details", async () => {
    const completed = deferred<{
      fileName: string;
      extension: "json";
      bytesWritten: number;
      locationSummary: string;
    }>();
    const cancel = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("C:\\Users\\Synthetic\\PRIVATE-locked.json"))
      .mockResolvedValueOnce(undefined);
    const stream = createStream({
      complete: vi.fn(async () => completed.promise),
      cancel,
    });
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => page(0, 1, 1)),
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    const running = coordinator.confirm({ thresholdConfirmed: true });
    await vi.waitFor(() => expect(coordinator.getState().task?.status).toBe("finalizing"));

    await coordinator.cancel();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(coordinator.getState()).toMatchObject({
      isOpen: true,
      task: {
        status: "error",
        error: { code: "cleanup_failed", retryable: false, checkpointSafe: false },
      },
    });
    expect(JSON.stringify(coordinator.getState().task?.error)).not.toMatch(/PRIVATE|Users|locked/i);

    await coordinator.close();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(coordinator.getState()).toMatchObject({ isOpen: false, task: null, result: null });

    completed.resolve({
      fileName: "chatlog-search.json",
      extension: "json",
      bytesWritten: 1,
      locationSummary: "已保存到所选位置",
    });
    await expect(running).resolves.toBe(false);
    expect(stream.commit).not.toHaveBeenCalled();
  });

  it("times out a native completion that never settles and leaves retry or close recovery", async () => {
    const completed = deferred<{
      fileName: string;
      extension: "json";
      bytesWritten: number;
      locationSummary: string;
    }>();
    const stream = createStream({ complete: vi.fn(async () => completed.promise) });
    const coordinator = createSearchExportCoordinator(
      dependencies({
        beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
        fetchPage: vi.fn(async () => page(0, 1, 1)),
        finalizationTimeoutMs: 50,
      }),
    );
    coordinator.openDialog(dialogInput(createSearchResultWindow(page(0, 1, 1), "manual")));
    const running = coordinator.confirm({ thresholdConfirmed: true });
    await vi.waitFor(
      () => expect(coordinator.getState().task?.status).toBe("finalizing"),
      { interval: 1, timeout: 30 },
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 70));
      expect(coordinator.getState()).toMatchObject({
        isOpen: true,
        task: {
          status: "error",
          error: { code: "write_failed", retryable: true, checkpointSafe: false },
        },
      });
      expect(stream.cancel).toHaveBeenCalledTimes(1);
      expect(stream.commit).not.toHaveBeenCalled();
      await expect(running).resolves.toBe(false);
    } finally {
      completed.resolve({
        fileName: "chatlog-search.json",
        extension: "json",
        bytesWritten: 1,
        locationSummary: "已保存到所选位置",
      });
    }
  });

  it("splits every encoded string below the native one-mebibyte chunk limit", async () => {
    const stream = createStream();
    const deps = dependencies({
      beginStream: vi.fn(async () => ({ status: "opened" as const, stream })),
    });
    const hugePage = page(0, 1, 1);
    hugePage.messages[0].snippet = "𠮷".repeat(600_000);
    hugePage.messages[0].matchSegments = [{ text: hugePage.messages[0].snippet, matched: true }];
    const coordinator = createSearchExportCoordinator(deps);
    coordinator.openDialog(
      dialogInput(createSearchResultWindow(hugePage, "manual"), {
        format: "json",
      }),
    );
    coordinator.selectScope("partial");
    coordinator.setUnredactedConfirmed(true);

    await expect(coordinator.confirm({ thresholdConfirmed: false })).resolves.toBe(true);
    const encoder = new TextEncoder();
    expect(stream.chunks.length).toBeGreaterThan(3);
    expect(
      stream.chunks.every(
        (chunk) => encoder.encode(chunk).byteLength <= SEARCH_EXPORT_MAX_SINK_CHUNK_BYTES,
      ),
    ).toBe(true);
    expect(JSON.parse(stream.chunks.join("")).messages[0].content).toHaveLength(1_200_000);
  });

  it("keeps a 250k retained source private without cloning content into dialog or task state", () => {
    const canaryHit = { ...hit(0), snippet: "PRIVATE RETAINED CONTENT CANARY" };
    const resultWindow: SearchResultWindow = {
      ...createSearchResultWindow(page(0, 1, 250_000), "manual"),
      totalCount: 250_000,
      retainedHits: new Array<SearchHit>(250_000).fill(canaryHit),
      loadedRanges: Array.from({ length: 5_000 }, (_, index) => ({
        start: index * 50,
        end: index * 50 + 25,
      })),
      gaps: Array.from({ length: 4_999 }, (_, index) => ({
        start: index * 50 + 25,
        end: (index + 1) * 50,
      })),
    };
    const coordinator = createSearchExportCoordinator(dependencies());

    expect(coordinator.openDialog(dialogInput(resultWindow))).toBe(true);

    const state = coordinator.getState();
    expect(state.dialog?.partial.count).toBe(250_000);
    expect(state.dialog?.partial).toMatchObject({ rangeCount: 5_000, gapCount: 4_999 });
    expect(state.dialog && "ranges" in state.dialog.partial).toBe(false);
    expect(state.dialog && "gaps" in state.dialog.partial).toBe(false);
    expect(state.dialog && "recordChunks" in state.dialog.partial).toBe(false);
    expect(JSON.stringify(state)).not.toContain("PRIVATE RETAINED CONTENT CANARY");
    expect(JSON.stringify(state).length).toBeLessThan(20_000);
  });
});

function commanderView(coordinator: SearchExportCoordinator): SearchExportCommanderView {
  return {
    ...coordinator.getState(),
    confirmThreshold: SEARCH_EXPORT_CONFIRM_THRESHOLD,
    openDialog: coordinator.openDialog,
    setFormat: coordinator.setFormat,
    selectScope: coordinator.selectScope,
    setUnredactedConfirmed: coordinator.setUnredactedConfirmed,
    confirm: coordinator.confirm,
    retry: coordinator.retry,
    cancel: coordinator.cancel,
    close: coordinator.close,
  };
}

function dialogInput(
  resultWindow: SearchResultWindow,
  overrides: Partial<{
    sortMode: "baseline" | "newest" | "oldest";
    groupingMode: "none" | "conversation" | "date";
    format: "markdown" | "csv" | "json";
    privacyOn: boolean;
    stale: boolean;
  }> = {},
) {
  return {
    applied: appliedRequest(),
    resultWindow,
    capabilities: v2Capabilities(),
    stale: overrides.stale ?? false,
    sortMode: overrides.sortMode ?? "baseline",
    groupingMode: overrides.groupingMode ?? "none",
    format: overrides.format ?? "json",
    privacyOn: overrides.privacyOn ?? false,
    locale: "zh-CN",
    timeZone: "Asia/Shanghai",
    openedAt: 1_700_000_000_000,
  } as const;
}

function dependencies(
  overrides: Partial<SearchExportCoordinatorDependencies> = {},
): SearchExportCoordinatorDependencies & {
  fetchPage: ReturnType<typeof vi.fn>;
  beginStream: ReturnType<typeof vi.fn>;
  setPrivacyOn: (privacyOn: boolean, notify?: boolean) => void;
} {
  let now = 1_700_000_000_000;
  let privacyOn = false;
  const privacyListeners = new Set<(nextPrivacyOn: boolean) => void>();
  return {
    fetchPage: vi.fn(async () => page(0, 1, 1)),
    beginStream: vi.fn(async () => ({ status: "opened" as const, stream: createStream() })),
    now: vi.fn(() => ++now),
    createId: vi.fn((kind: string) => `${kind}-${++now}`),
    getPrivacyOn: () => privacyOn,
    subscribePrivacyOn: (listener: (nextPrivacyOn: boolean) => void) => {
      privacyListeners.add(listener);
      return () => privacyListeners.delete(listener);
    },
    setPrivacyOn: (nextPrivacyOn: boolean, notify = true) => {
      privacyOn = nextPrivacyOn;
      if (notify) {
        for (const listener of privacyListeners) listener(nextPrivacyOn);
      }
    },
    ...overrides,
  } as never;
}

function createStream(overrides: Partial<SearchExportChunkStream> = {}) {
  const chunks: string[] = [];
  const stream = {
    chunks,
    append: vi.fn(async (chunk: string) => {
      chunks.push(chunk);
    }),
    complete: vi.fn(async () => ({
      fileName: "chatlog-search.json",
      extension: "json" as const,
      bytesWritten: chunks.join("").length,
      locationSummary: "已保存到所选位置",
    })),
    commit: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    ...overrides,
  };
  return stream;
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function readExportedSourceIndexes(
  format: "markdown" | "csv" | "json",
  output: string,
): number[] {
  if (format === "json") {
    return (JSON.parse(output) as { messages: Array<{ sourceIndex: number }> }).messages.map(
      (row) => row.sourceIndex,
    );
  }
  if (format === "csv") {
    return output
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("message,"))
      .map((line) => Number(line.split(",")[1]));
  }
  return [...output.matchAll(/^\| (\d+) \|/gmu)].map((match) => Number(match[1]));
}
