import { useEffect, useMemo, useSyncExternalStore } from "react";
import type {
  SearchHit,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import {
  createSearchExportStreamEncoder,
  getBusinessExportExtension,
  type BusinessExportExtension,
  type SearchExportStreamEncoder,
  type SearchExportStreamRow,
} from "./businessExportModel";
import {
  SearchExportTaskError,
  abandonSearchExportTask,
  beginSearchExportFinalization,
  cancelSearchExportTask,
  commitAllSearchExportPage,
  commitPartialSearchExportChunk,
  completeSearchExportTask,
  confirmSearchExport,
  createSearchExportDialogSelection,
  createSearchExportDialogSnapshot,
  failSearchExportAttempt,
  retrySearchExportTask,
  startSearchExportAttempt,
  validateAllSearchExportPage,
  type SearchExportDialogSelection,
  type SearchExportDialogSnapshot,
  type SearchExportFailureCode,
  type SearchExportIdentityGuard,
  type SearchExportRecord,
  type SearchExportScope,
  type SearchExportTask,
} from "./searchExportTaskModel";
import type { SearchLoadedRange, SearchResultWindow } from "./searchResultWindowModel";
import { classifySearchRequestError } from "./useSearchRequest";

export const SEARCH_EXPORT_MAX_SINK_CHUNK_BYTES = 900 * 1024;

export interface SearchExportStreamRequest {
  fileName: string;
  extension: BusinessExportExtension;
  redactionPolicy: "redacted" | "unredacted-confirmed";
}

export interface SearchExportStreamCompletedSummary {
  fileName: string;
  extension: BusinessExportExtension;
  bytesWritten: number;
  locationSummary: string;
}

export interface SearchExportChunkStream {
  append: (chunk: string) => Promise<void>;
  complete: () => Promise<SearchExportStreamCompletedSummary>;
  cancel: () => Promise<void>;
}

export type SearchExportStreamOpenResult =
  | { status: "cancelled" }
  | { status: "opened"; stream: SearchExportChunkStream };

export interface SearchExportCoordinatorDependencies {
  fetchPage: (request: SearchV2Request, signal: AbortSignal) => Promise<SearchSnapshotPage>;
  beginStream: (request: SearchExportStreamRequest) => Promise<SearchExportStreamOpenResult>;
  now: () => number;
  createId: (kind: "task" | "attempt") => string;
}

export interface SearchExportCoordinatorState {
  isOpen: boolean;
  dialog: Readonly<SearchExportDialogSnapshot> | null;
  selection: SearchExportDialogSelection | null;
  task: SearchExportTask | null;
  confirmationRequired: boolean;
  result: SearchExportStreamCompletedSummary | null;
}

export interface SearchExportCoordinator {
  getState: () => SearchExportCoordinatorState;
  subscribe: (listener: () => void) => () => void;
  openDialog: (input: Parameters<typeof createSearchExportDialogSnapshot>[0]) => boolean;
  selectScope: (scope: SearchExportScope) => boolean;
  setUnredactedConfirmed: (confirmed: boolean) => boolean;
  confirm: (options: { thresholdConfirmed: boolean }) => Promise<boolean>;
  retry: () => Promise<boolean>;
  cancel: () => Promise<void>;
  close: () => Promise<void>;
}

export type SearchExportCommanderView = SearchExportCoordinatorState &
  Omit<SearchExportCoordinator, "getState" | "subscribe">;

export function createSearchExportCoordinator(
  dependencies: SearchExportCoordinatorDependencies,
): SearchExportCoordinator {
  let state: SearchExportCoordinatorState = initialState();
  const listeners = new Set<() => void>();
  let activeController: AbortController | null = null;
  let stream: SearchExportChunkStream | null = null;
  let encoder: SearchExportStreamEncoder | null = null;
  let partialSource: SearchExportPartialChunkSource | null = null;
  let seenMessageIdentities = new Set<string>();
  let seenCursors = new Set<string>();
  const identityGuard: SearchExportIdentityGuard = {
    hasMessageIdentity: (identity) => seenMessageIdentities.has(identity),
    hasCursor: (cursor) => seenCursors.has(cursor),
  };

  const resetIdentityGuards = (): void => {
    seenMessageIdentities = new Set<string>();
    seenCursors = new Set<string>();
  };

  const publish = (next: SearchExportCoordinatorState): void => {
    state = next;
    for (const listener of listeners) listener();
  };

  const updateTask = (task: SearchExportTask): void => {
    publish({ ...state, task });
  };

  const isActiveAttempt = (attemptId: string): boolean =>
    state.task?.status === "running" &&
    state.task.attemptId === attemptId &&
    activeController !== null &&
    !activeController.signal.aborted;

  const isCurrentAttempt = (attemptId: string): boolean =>
    (state.task?.status === "running" || state.task?.status === "finalizing") &&
    state.task.attemptId === attemptId;

  const canEditSelection = (): boolean =>
    state.isOpen &&
    state.dialog !== null &&
    state.selection !== null &&
    state.task?.status !== "running" &&
    state.task?.status !== "finalizing" &&
    state.task?.status !== "error";

  const cancelStream = async (): Promise<void> => {
    const current = stream;
    stream = null;
    encoder = null;
    if (!current) return;
    try {
      await current.cancel();
    } catch {
      // The native cancel operation is best-effort and idempotent. Never surface a path.
    }
  };

  const appendEncoded = async (attemptId: string, content: string): Promise<boolean> => {
    const current = stream;
    if (!current) throw new Error("Search export stream is unavailable");
    for (const chunk of splitUtf8Chunks(content, SEARCH_EXPORT_MAX_SINK_CHUNK_BYTES)) {
      if (!isActiveAttempt(attemptId)) return false;
      await current.append(chunk);
      if (!isActiveAttempt(attemptId)) return false;
    }
    return true;
  };

  const failAttempt = async (
    attemptId: string,
    code: SearchExportFailureCode,
    checkpointSafe: boolean,
  ): Promise<boolean> => {
    if (checkpointSafe ? !isActiveAttempt(attemptId) : !isCurrentAttempt(attemptId)) return false;
    if (!checkpointSafe) {
      await cancelStream();
      resetIdentityGuards();
    }
    if (!isCurrentAttempt(attemptId)) return false;
    const failed = failSearchExportAttempt(state.task!, attemptId, code, { checkpointSafe });
    if (!failed.error?.retryable) partialSource = null;
    updateTask(failed);
    activeController = null;
    return false;
  };

  const ensureStream = async (attemptId: string): Promise<"ready" | "cancelled" | "late"> => {
    if (stream && encoder) return "ready";
    const task = state.task;
    if (!task || !isActiveAttempt(attemptId)) return "late";
    const extension = getBusinessExportExtension(task.dialog.format);
    const opened = await dependencies.beginStream({
      fileName: `chatlog-search-${dependencies.now()}.${extension}`,
      extension,
      redactionPolicy:
        task.dialog.privacyOn || !task.selection.unredactedConfirmed
          ? "redacted"
          : "unredacted-confirmed",
    });
    if (!isActiveAttempt(attemptId)) {
      if (opened.status === "opened") {
        try {
          await opened.stream.cancel();
        } catch {
          // Late native handles must still be abandoned without exposing details.
        }
      }
      return "late";
    }
    if (opened.status === "cancelled") {
      const cancelled = cancelSearchExportTask(state.task!, attemptId);
      activeController = null;
      partialSource = null;
      resetIdentityGuards();
      publish({
        ...state,
        isOpen: false,
        dialog: null,
        selection: null,
        task: cancelled,
        confirmationRequired: false,
      });
      return "cancelled";
    }
    stream = opened.stream;
    encoder = createEncoder(state.task!, partialSource);
    const appended = await appendEncoded(attemptId, encoder.start());
    return appended ? "ready" : "late";
  };

  const runPartial = async (attemptId: string): Promise<boolean> => {
    const task = state.task!;
    if (!partialSource || partialSource.count !== task.totalCount) {
      return failAttempt(attemptId, "invalid_page", false);
    }
    while (state.task!.processedCount < state.task!.totalCount) {
      const records = partialSource.read(
        state.task!.processedCount,
        Math.min(50, state.task!.totalCount - state.task!.processedCount),
      );
      if (records.length === 0 || records.length > 50) {
        return failAttempt(attemptId, "invalid_page", false);
      }
      const encoded = encoder!.append(records.map(toStreamRow));
      if (!(await appendEncoded(attemptId, encoded))) return false;
      if (!isActiveAttempt(attemptId)) return false;
      updateTask(commitPartialSearchExportChunk(state.task!, attemptId, records.length));
    }
    return finalize(attemptId);
  };

  const runAll = async (attemptId: string): Promise<boolean> => {
    while (isActiveAttempt(attemptId) && state.task!.processedCount < state.task!.totalCount) {
      const task = state.task!;
      const requestedCursor = task.nextCursor;
      let page: SearchSnapshotPage;
      try {
        page = await dependencies.fetchPage(
          buildAllRequest(task, requestedCursor),
          activeController!.signal,
        );
      } catch (error) {
        if (!isActiveAttempt(attemptId)) return false;
        const code = classifyExportFailure(error);
        return failAttempt(attemptId, code, code === "request_failed");
      }
      if (!isActiveAttempt(attemptId)) return false;
      let accepted: ReturnType<typeof validateAllSearchExportPage>;
      try {
        accepted = validateAllSearchExportPage(
          task,
          attemptId,
          requestedCursor,
          page,
          identityGuard,
        );
      } catch (error) {
        return failAttempt(attemptId, classifyExportFailure(error), false);
      }
      if (accepted.kind === "ignored") return false;
      try {
        const encoded = encoder!.append(accepted.records.map(toStreamRow));
        if (!(await appendEncoded(attemptId, encoded))) return false;
      } catch {
        return failAttempt(attemptId, "write_failed", false);
      }
      if (!isActiveAttempt(attemptId)) return false;
      for (const identity of accepted.messageIdentities) seenMessageIdentities.add(identity);
      if (accepted.requestedCursor) seenCursors.add(accepted.requestedCursor);
      updateTask(commitAllSearchExportPage(state.task!, accepted));
    }
    if (!isActiveAttempt(attemptId)) return false;
    return finalize(attemptId);
  };

  const finalize = async (attemptId: string): Promise<boolean> => {
    const currentStream = stream;
    if (!currentStream || !encoder || !isActiveAttempt(attemptId)) return false;
    try {
      if (!(await appendEncoded(attemptId, encoder.finish()))) return false;
      if (!isActiveAttempt(attemptId)) return false;
      updateTask(beginSearchExportFinalization(state.task!, attemptId));
      activeController = null;
      encoder = null;
      resetIdentityGuards();
      const result = await currentStream.complete();
      if (!isCurrentAttempt(attemptId) || state.task?.status !== "finalizing") return false;
      const completed = completeSearchExportTask(state.task!, attemptId);
      stream = null;
      encoder = null;
      partialSource = null;
      publish({
        ...state,
        isOpen: false,
        dialog: null,
        selection: null,
        task: completed,
        confirmationRequired: false,
        result,
      });
      return true;
    } catch {
      return failAttempt(attemptId, "write_failed", false);
    }
  };

  const runAttempt = async (attemptId: string): Promise<boolean> => {
    try {
      const streamStatus = await ensureStream(attemptId);
      if (streamStatus !== "ready") return false;
      return state.task!.scope === "partial"
        ? await runPartial(attemptId)
        : await runAll(attemptId);
    } catch {
      return failAttempt(attemptId, "write_failed", false);
    }
  };

  const confirm: SearchExportCoordinator["confirm"] = async ({ thresholdConfirmed }) => {
    if (
      !state.isOpen ||
      !state.dialog ||
      !state.selection ||
      state.task?.status === "running" ||
      state.task?.status === "finalizing" ||
      state.task?.status === "error"
    ) {
      return false;
    }
    try {
      let task = confirmSearchExport(state.dialog, state.selection, {
        taskId: dependencies.createId("task"),
        thresholdConfirmed,
      });
      const attemptId = dependencies.createId("attempt");
      task = startSearchExportAttempt(task, attemptId);
      if (task.scope === "all") partialSource = null;
      resetIdentityGuards();
      activeController = new AbortController();
      publish({ ...state, task, result: null, confirmationRequired: false });
      return await runAttempt(attemptId);
    } catch (error) {
      if (error instanceof SearchExportTaskError && error.code === "confirmation_required") {
        publish({ ...state, confirmationRequired: true });
      }
      return false;
    }
  };

  const retry: SearchExportCoordinator["retry"] = async () => {
    const task = state.task;
    if (!task || task.status !== "error" || !task.error?.retryable) return false;
    if (task.error.checkpointSafe && (!stream || !encoder)) return false;
    const checkpointSafe = task.error.checkpointSafe;
    const attemptId = dependencies.createId("attempt");
    try {
      const running = retrySearchExportTask(task, attemptId);
      if (!checkpointSafe) {
        resetIdentityGuards();
      }
      activeController = new AbortController();
      publish({ ...state, task: running, result: null, confirmationRequired: false });
      return await runAttempt(attemptId);
    } catch {
      return false;
    }
  };

  const cancel: SearchExportCoordinator["cancel"] = async () => {
    const task = state.task;
    if (!task || task.status === "finalizing") return;
    const attemptId = task.attemptId;
    activeController?.abort();
    activeController = null;
    let cancelled = task;
    if (task.status === "error") cancelled = abandonSearchExportTask(task);
    else if (attemptId) cancelled = cancelSearchExportTask(task, attemptId);
    partialSource = null;
    resetIdentityGuards();
    publish({
      ...state,
      isOpen: false,
      dialog: null,
      selection: null,
      task: cancelled,
      confirmationRequired: false,
    });
    await cancelStream();
  };

  const close: SearchExportCoordinator["close"] = async () => {
    if (state.task?.status === "finalizing") return;
    activeController?.abort();
    activeController = null;
    await cancelStream();
    partialSource = null;
    resetIdentityGuards();
    publish(initialState());
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    openDialog: (input) => {
      if (state.task?.status === "running" || stream) return false;
      const dialog = createSearchExportDialogSnapshot(input);
      partialSource = createPartialChunkSource(
        input.resultWindow,
        input.sortMode,
        input.groupingMode,
        input.locale ?? "zh-CN",
        dialog.timeZone,
      );
      resetIdentityGuards();
      publish({
        isOpen: true,
        dialog,
        selection: createSearchExportDialogSelection(dialog),
        task: null,
        confirmationRequired: false,
        result: null,
      });
      return true;
    },
    selectScope: (scope) => {
      if (!canEditSelection()) return false;
      if (scope === "all" && !state.dialog!.all.allowed) return false;
      publish({
        ...state,
        selection: { ...state.selection!, scope },
        confirmationRequired: false,
      });
      return true;
    },
    setUnredactedConfirmed: (confirmed) => {
      if (!canEditSelection() || (confirmed && state.dialog!.privacyOn)) return false;
      publish({
        ...state,
        selection: { ...state.selection!, unredactedConfirmed: confirmed },
      });
      return true;
    },
    confirm,
    retry,
    cancel,
    close,
  };
}

export function useSearchExportCommander(
  dependencies: SearchExportCoordinatorDependencies,
): SearchExportCommanderView {
  const coordinator = useMemo(() => createSearchExportCoordinator(dependencies), [dependencies]);
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getState,
    coordinator.getState,
  );
  useEffect(
    () => () => {
      void coordinator.close();
    },
    [coordinator],
  );
  return {
    ...state,
    openDialog: coordinator.openDialog,
    selectScope: coordinator.selectScope,
    setUnredactedConfirmed: coordinator.setUnredactedConfirmed,
    confirm: coordinator.confirm,
    retry: coordinator.retry,
    cancel: coordinator.cancel,
    close: coordinator.close,
  };
}

interface SearchExportPartialChunkSource {
  count: number;
  ranges: readonly SearchLoadedRange[];
  gaps: readonly SearchLoadedRange[];
  read: (offset: number, limit: number) => SearchExportRecord[];
}

function createPartialChunkSource(
  resultWindow: SearchResultWindow,
  sortMode: Readonly<SearchExportDialogSnapshot>["sortMode"],
  groupingMode: Readonly<SearchExportDialogSnapshot>["groupingMode"],
  locale: string,
  timeZone: string | null,
): SearchExportPartialChunkSource {
  const hits: readonly SearchHit[] =
    resultWindow.browseMode === "paged" ? resultWindow.currentPageHits : resultWindow.retainedHits;
  const ranges: readonly SearchLoadedRange[] =
    resultWindow.browseMode === "paged"
      ? rangesForHits(resultWindow.currentPageHits)
      : resultWindow.loadedRanges;
  const gaps: readonly SearchLoadedRange[] =
    resultWindow.browseMode === "paged" ? [] : resultWindow.gaps;
  let orderedIndexes: number[] | null = null;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });

  const hitAt = (position: number): SearchHit => {
    if (sortMode === "baseline") return hits[position];
    if (!orderedIndexes) {
      orderedIndexes = Array.from({ length: hits.length }, (_, index) => index).sort(
        (leftIndex, rightIndex) => {
          const left = hits[leftIndex];
          const right = hits[rightIndex];
          const timeDelta = left.timestamp - right.timestamp;
          if (timeDelta !== 0) return sortMode === "oldest" ? timeDelta : -timeDelta;
          return left.sourceIndex - right.sourceIndex;
        },
      );
    }
    return hits[orderedIndexes[position]];
  };

  return {
    count: hits.length,
    ranges,
    gaps,
    read: (offset, limit) => {
      if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(limit) ||
        offset < 0 ||
        limit < 1 ||
        limit > 50 ||
        offset >= hits.length
      ) {
        return [];
      }
      const records: SearchExportRecord[] = [];
      const end = Math.min(hits.length, offset + limit);
      for (let position = offset; position < end; position += 1) {
        const hit = hitAt(position);
        const group = exportGroup(hit, groupingMode, dateFormatter);
        records.push({
          messageId: hit.messageId,
          seq: hit.seq,
          sourceIndex: hit.sourceIndex,
          conversationId: hit.conversationId,
          conversationName: hit.conversationName,
          senderId: hit.senderId,
          senderName: hit.senderName,
          timestamp: hit.timestamp,
          category: hit.category,
          matchField: hit.matchField,
          snippet: hit.snippet,
          groupKey: group.key,
          groupLabel: group.label,
        });
      }
      return records;
    },
  };
}

function exportGroup(
  hit: SearchHit,
  groupingMode: Readonly<SearchExportDialogSnapshot>["groupingMode"],
  dateFormatter: Intl.DateTimeFormat,
): { key: string | null; label: string | null } {
  if (groupingMode === "none") return { key: null, label: null };
  if (groupingMode === "conversation") {
    return {
      key: `conversation:${hit.conversationId}`,
      label: hit.conversationName || hit.conversationId,
    };
  }
  const date = new Date(hit.timestamp * 1000);
  if (Number.isNaN(date.getTime())) return { key: "date:unknown", label: "未知日期" };
  const parts = dateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return {
    key: `date:${year}-${month}-${day}`,
    label: dateFormatter.format(date),
  };
}

function rangesForHits(hits: readonly SearchHit[]): SearchLoadedRange[] {
  const indexes = [...new Set(hits.map((hit) => hit.sourceIndex))].sort(
    (left, right) => left - right,
  );
  const ranges: SearchLoadedRange[] = [];
  for (const sourceIndex of indexes) {
    const previous = ranges[ranges.length - 1];
    if (previous?.end === sourceIndex) previous.end += 1;
    else ranges.push({ start: sourceIndex, end: sourceIndex + 1 });
  }
  return ranges;
}

function initialState(): SearchExportCoordinatorState {
  return {
    isOpen: false,
    dialog: null,
    selection: null,
    task: null,
    confirmationRequired: false,
    result: null,
  };
}

function createEncoder(
  task: SearchExportTask,
  partialSource: SearchExportPartialChunkSource | null,
): SearchExportStreamEncoder {
  const dialog = task.dialog;
  const all = task.scope === "all";
  const dateContext = dialog.applied.dateContext;
  return createSearchExportStreamEncoder({
    format: dialog.format,
    privacyOn: dialog.privacyOn,
    requestedUnredacted: task.selection.unredactedConfirmed,
    unredactedConfirmed: task.selection.unredactedConfirmed,
    generatedAt: new Date(dialog.openedAt),
    snapshotId: dialog.snapshotId,
    dataRevision: dialog.dataRevision,
    revisionState: dialog.stale ? "stale" : "current",
    query: dialog.applied.request.keyword,
    scopeSummary: safeScopeSummary(dialog),
    filterSummary: safeFilterSummary(dialog),
    exportScope: task.scope,
    exportedCount: task.totalCount,
    totalCount: dialog.totalCount,
    ranges: all ? allExportRanges(task) : (partialSource?.ranges ?? []),
    gaps: all ? [] : (partialSource?.gaps ?? []),
    browseMode: dialog.browseMode,
    sortMode: all ? "baseline" : dialog.sortMode,
    groupingMode: all ? "none" : dialog.groupingMode,
    timeZone: dialog.timeZone,
    utcOffsetMinutes: dateContext?.utcOffsetMinutes ?? null,
    querySince: dateContext?.since ?? dialog.applied.request.since ?? null,
    queryUntil: dateContext?.until ?? dialog.applied.request.until ?? null,
  });
}

function allExportRanges(task: SearchExportTask): Array<{ start: number; end: number }> {
  if (task.dialog.totalCount === 0) return [];
  return [{ start: 0, end: task.dialog.totalCount }];
}

function buildAllRequest(task: SearchExportTask, cursor: string | null): SearchV2Request {
  const request: SearchV2Request = {
    ...task.dialog.applied.request,
    chats: task.dialog.applied.request.chats ? [...task.dialog.applied.request.chats] : undefined,
    categories: task.dialog.applied.request.categories
      ? [...task.dialog.applied.request.categories]
      : undefined,
    senderIds: task.dialog.applied.request.senderIds
      ? [...task.dialog.applied.request.senderIds]
      : undefined,
    limit: 50,
    snapshotId: task.dialog.snapshotId,
    dataRevision: task.dialog.dataRevision,
  };
  if (cursor) request.cursor = cursor;
  else delete request.cursor;
  return request;
}

function toStreamRow(record: SearchExportRecord): SearchExportStreamRow {
  return {
    sourceIndex: record.sourceIndex,
    timestamp: record.timestamp,
    chat: record.conversationName || record.conversationId,
    sender: record.senderName || record.senderId,
    type: record.category,
    content: record.snippet,
    groupKey: record.groupKey,
    groupLabel: record.groupLabel,
  };
}

function safeScopeSummary(dialog: Readonly<SearchExportDialogSnapshot>): string {
  switch (dialog.applied.draft.scope.kind) {
    case "all":
      return "全部会话";
    case "current":
      return "当前会话";
    case "selected":
      return `已选 ${dialog.applied.draft.scope.chatIds.length} 个会话`;
  }
}

function safeFilterSummary(dialog: Readonly<SearchExportDialogSnapshot>): string[] {
  const summary: string[] = [];
  if (dialog.applied.draft.categories.length > 0) {
    summary.push(`${dialog.applied.draft.categories.length} 类消息`);
  }
  if (dialog.applied.draft.senderIds.length > 0) {
    summary.push(`${dialog.applied.draft.senderIds.length} 位发送者`);
  }
  if (dialog.applied.draft.dateRange.start || dialog.applied.draft.dateRange.end) {
    summary.push("已应用日期范围");
  }
  return summary;
}

function classifyExportFailure(error: unknown): SearchExportFailureCode {
  if (error instanceof SearchExportTaskError) {
    if (error.code === "stale_revision") return "stale_revision";
    if (error.code === "snapshot_expired") return "snapshot_expired";
    if (error.code === "invalid_page") return "invalid_page";
    return "request_failed";
  }
  const classified = classifySearchRequestError(error);
  if (classified === "stale_revision" || classified === "snapshot_expired") return classified;
  return "request_failed";
}

export function splitUtf8Chunks(content: string, maximumBytes: number): string[] {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 4) {
    throw new Error("Search export chunk limit is invalid");
  }
  if (!content) return [];
  const chunks: string[] = [];
  let characters: string[] = [];
  let byteLength = 0;
  for (const character of content) {
    const characterBytes = utf8CodePointBytes(character.codePointAt(0)!);
    if (byteLength > 0 && byteLength + characterBytes > maximumBytes) {
      chunks.push(characters.join(""));
      characters = [];
      byteLength = 0;
    }
    characters.push(character);
    byteLength += characterBytes;
  }
  if (characters.length > 0) chunks.push(characters.join(""));
  return chunks;
}

function utf8CodePointBytes(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}
