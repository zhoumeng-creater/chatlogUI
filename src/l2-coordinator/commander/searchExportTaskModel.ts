import type {
  SearchCapabilities,
  SearchHit,
  SearchSnapshotPage,
} from "@/l2-coordinator/api-docs/search";
import { createSearchHitIdentity } from "./searchHitIdentity";
import { BUSINESS_EXPORT_FORMATS, type BusinessExportFormat } from "./businessExportModel";
import type { SearchAppliedReturnSnapshot } from "./searchReturnSnapshot";
import type {
  SearchPresentationGroupingMode,
  SearchPresentationSortMode,
} from "./searchResultPresentation";
import type { SearchLoadedRange, SearchResultWindow } from "./searchResultWindowModel";

export const SEARCH_EXPORT_CONFIRM_THRESHOLD = 10_000;
export const SEARCH_EXPORT_RECORD_CHUNK_SIZE = 50;

export type SearchExportFormat = BusinessExportFormat;
export type SearchExportScope = "partial" | "all";
export type SearchExportTaskStatus =
  | "idle"
  | "running"
  | "finalizing"
  | "commit_pending"
  | "completed"
  | "error"
  | "cancelled";
export type SearchExportFailureCode =
  | "request_failed"
  | "write_failed"
  | "commit_confirmation_interrupted"
  | "cleanup_failed"
  | "invalid_page"
  | "stale_revision"
  | "snapshot_expired";

export interface SearchExportRecord {
  messageId: string;
  seq: number;
  sourceIndex: number;
  conversationId: string;
  conversationName: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  category: SearchHit["category"];
  matchField: string;
  snippet: string;
  groupKey: string | null;
  groupLabel: string | null;
}

export interface SearchExportDialogSnapshot {
  applied: SearchAppliedReturnSnapshot;
  snapshotId: string;
  dataRevision: string;
  totalCount: number;
  browseMode: SearchResultWindow["browseMode"];
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  format: SearchExportFormat;
  privacyOn: boolean;
  stale: boolean;
  locale: string;
  timeZone: string | null;
  openedAt: number;
  defaultScope: SearchExportScope;
  partial: {
    kind: "retained_ranges" | "current_page";
    rangeCount: number;
    gapCount: number;
    unloadedCount: number;
    count: number;
    label: string;
  };
  all: {
    allowed: boolean;
    count: number;
    unavailableReason: string | null;
  };
  publicSummary: {
    totalLabel: string;
    partialLabel: string;
    coverageLabel: string;
    defaultScopeLabel: string;
    privacyOn: boolean;
  };
}

export interface SearchExportDialogSelection {
  scope: SearchExportScope;
  unredactedConfirmed: boolean;
}

export interface SearchExportTaskFailure {
  code: SearchExportFailureCode;
  message: string;
  retryable: boolean;
  checkpointSafe: boolean;
}

export interface SearchExportTask {
  taskId: string;
  dialog: Readonly<SearchExportDialogSnapshot>;
  selection: Readonly<SearchExportDialogSelection>;
  scope: SearchExportScope;
  status: SearchExportTaskStatus;
  attempt: number;
  attemptId: string | null;
  processedCount: number;
  totalCount: number;
  nextCursor: string | null;
  error: SearchExportTaskFailure | null;
}

export interface SearchExportIdentityGuard {
  hasMessageIdentity: (identity: string) => boolean;
  hasCursor: (cursor: string) => boolean;
}

export interface AcceptedSearchExportPage {
  kind: "accepted";
  taskId: string;
  attemptId: string;
  requestedCursor: string | null;
  windowStart: number;
  count: number;
  nextCursor: string | null;
  messageIdentities: readonly string[];
  records: readonly SearchExportRecord[];
}

export type SearchExportPageValidation =
  | AcceptedSearchExportPage
  | { kind: "ignored"; reason: "late_attempt" };

export type SearchExportTaskErrorCode =
  | "invalid_format"
  | "confirmation_required"
  | "already_running"
  | "invalid_state"
  | "invalid_scope"
  | "invalid_privacy"
  | "invalid_page"
  | "stale_revision"
  | "snapshot_expired"
  | "not_retryable";

export class SearchExportTaskError extends Error {
  readonly code: SearchExportTaskErrorCode;

  constructor(code: SearchExportTaskErrorCode) {
    super(exportErrorMessage(code));
    this.name = "SearchExportTaskError";
    this.code = code;
  }
}

export function createSearchExportDialogSnapshot(input: {
  applied: SearchAppliedReturnSnapshot;
  resultWindow: SearchResultWindow;
  capabilities: SearchCapabilities;
  stale: boolean;
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  format: SearchExportFormat;
  privacyOn: boolean;
  locale?: string;
  timeZone?: string;
  openedAt: number;
}): Readonly<SearchExportDialogSnapshot> {
  assertExportFormat(input.format);
  const locale = input.locale ?? "zh-CN";
  const timeZone = input.applied.dateContext
    ? input.applied.dateContext.timeZone
    : (input.timeZone ?? null);
  const partialKind =
    input.resultWindow.browseMode === "paged" ? "current_page" : "retained_ranges";
  const partialHits =
    partialKind === "current_page"
      ? input.resultWindow.currentPageHits
      : input.resultWindow.retainedHits;
  const currentPageRanges =
    partialKind === "current_page"
      ? rangesForSourceIndexes(partialHits.map((hit) => hit.sourceIndex))
      : null;
  const rangeCount = currentPageRanges?.length ?? input.resultWindow.loadedRanges.length;
  const gapCount = partialKind === "retained_ranges" ? input.resultWindow.gaps.length : 0;
  const unloadedCount =
    partialKind === "retained_ranges" ? countCoveredIndexes(input.resultWindow.gaps) : 0;
  const partialLabel =
    partialKind === "current_page"
      ? `当前页 ${partialHits.length.toLocaleString("zh-CN")} 条`
      : `当前已加载 ${partialHits.length.toLocaleString("zh-CN")} 条`;
  const coverageLabel =
    gapCount > 0
      ? `包含 ${rangeCount.toLocaleString("zh-CN")} 个已加载区间，中间 ${unloadedCount.toLocaleString("zh-CN")} 条尚未加载`
      : `${rangeCount.toLocaleString("zh-CN")} 个已加载区间，无已知缺口`;
  const unavailableReason = resolveAllUnavailableReason(input);
  const defaultScope: SearchExportScope = unavailableReason === null ? "all" : "partial";
  const snapshot: SearchExportDialogSnapshot = {
    applied: cloneApplied(input.applied),
    snapshotId: input.resultWindow.snapshotId,
    dataRevision: input.resultWindow.dataRevision,
    totalCount: input.resultWindow.totalCount,
    browseMode: input.resultWindow.browseMode,
    sortMode: input.sortMode,
    groupingMode: input.groupingMode,
    format: input.format,
    privacyOn: input.privacyOn,
    stale: input.stale,
    locale,
    timeZone,
    openedAt: input.openedAt,
    defaultScope,
    partial: {
      kind: partialKind,
      rangeCount,
      gapCount,
      unloadedCount,
      count: partialHits.length,
      label: partialLabel,
    },
    all: {
      allowed: unavailableReason === null,
      count: input.resultWindow.totalCount,
      unavailableReason,
    },
    publicSummary: {
      totalLabel: `共 ${input.resultWindow.totalCount.toLocaleString("zh-CN")} 条命中`,
      partialLabel,
      coverageLabel,
      defaultScopeLabel: defaultScope === "all" ? "全部命中" : partialLabel,
      privacyOn: input.privacyOn,
    },
  };
  return deepFreeze(snapshot);
}

export function createSearchExportDialogSelection(
  snapshot: Readonly<SearchExportDialogSnapshot>,
): SearchExportDialogSelection {
  return { scope: snapshot.defaultScope, unredactedConfirmed: false };
}

export function confirmSearchExport(
  dialog: Readonly<SearchExportDialogSnapshot>,
  selection: SearchExportDialogSelection,
  options: { taskId: string; thresholdConfirmed: boolean },
): SearchExportTask {
  if (!options.taskId) throw new SearchExportTaskError("invalid_state");
  if (selection.scope === "all" && !dialog.all.allowed) {
    throw new SearchExportTaskError("invalid_scope");
  }
  if (dialog.privacyOn && selection.unredactedConfirmed) {
    throw new SearchExportTaskError("invalid_privacy");
  }
  const totalCount = selection.scope === "all" ? dialog.all.count : dialog.partial.count;
  if (
    selection.scope === "all" &&
    totalCount > SEARCH_EXPORT_CONFIRM_THRESHOLD &&
    !options.thresholdConfirmed
  ) {
    throw new SearchExportTaskError("confirmation_required");
  }
  const frozenSelection = Object.freeze({
    scope: selection.scope,
    unredactedConfirmed: selection.unredactedConfirmed,
  });
  return {
    taskId: options.taskId,
    dialog,
    selection: frozenSelection,
    scope: frozenSelection.scope,
    status: "idle",
    attempt: 0,
    attemptId: null,
    processedCount: 0,
    totalCount,
    nextCursor: null,
    error: null,
  };
}

export function startSearchExportAttempt(
  task: SearchExportTask,
  attemptId: string,
): SearchExportTask {
  if (!attemptId) throw new SearchExportTaskError("invalid_state");
  if (task.status === "running") throw new SearchExportTaskError("already_running");
  if (task.status !== "idle") throw new SearchExportTaskError("invalid_state");
  return {
    ...task,
    status: "running",
    attempt: task.attempt + 1,
    attemptId,
    error: null,
  };
}

export function validateAllSearchExportPage(
  task: SearchExportTask,
  attemptId: string,
  requestedCursor: string | null,
  page: SearchSnapshotPage,
  identity: SearchExportIdentityGuard,
): SearchExportPageValidation {
  if (task.attemptId !== attemptId) return { kind: "ignored", reason: "late_attempt" };
  if (task.status !== "running" || task.scope !== "all") {
    throw new SearchExportTaskError("invalid_state");
  }
  if (requestedCursor !== task.nextCursor) throw new SearchExportTaskError("invalid_page");
  if (page.dataRevision !== task.dialog.dataRevision) {
    throw new SearchExportTaskError("stale_revision");
  }
  if (
    page.snapshotId !== task.dialog.snapshotId ||
    !page.exactTotal ||
    !page.completeScope ||
    page.totalCount !== task.totalCount ||
    !isNonNegativeInteger(page.count) ||
    page.count > SEARCH_EXPORT_RECORD_CHUNK_SIZE ||
    page.messages.length !== page.count ||
    page.windowStart !== task.processedCount ||
    page.windowStart + page.count > task.totalCount
  ) {
    throw new SearchExportTaskError("invalid_page");
  }
  const remaining = task.totalCount - task.processedCount;
  if (
    (remaining > 0 && page.count === 0) ||
    (remaining === 0 && (task.totalCount !== 0 || page.count !== 0))
  ) {
    throw new SearchExportTaskError("invalid_page");
  }
  if (task.processedCount === 0) {
    if (page.hasPrevious || page.previousCursor) throw new SearchExportTaskError("invalid_page");
  } else if (!page.hasPrevious || !page.previousCursor) {
    throw new SearchExportTaskError("invalid_page");
  }

  const pageMessageIdentities = new Set<string>();
  for (let index = 0; index < page.messages.length; index += 1) {
    const hit = page.messages[index];
    const messageIdentity = createSearchExportMessageIdentity(hit);
    if (
      !hit.messageId ||
      !hit.conversationId ||
      hit.sourceIndex !== page.windowStart + index ||
      identity.hasMessageIdentity(messageIdentity) ||
      pageMessageIdentities.has(messageIdentity)
    ) {
      throw new SearchExportTaskError("invalid_page");
    }
    pageMessageIdentities.add(messageIdentity);
  }

  const processedAfter = task.processedCount + page.count;
  const isComplete = processedAfter === task.totalCount;
  if (isComplete) {
    if (page.hasNext || page.nextCursor) throw new SearchExportTaskError("invalid_page");
  } else {
    if (!page.hasNext || !page.nextCursor) throw new SearchExportTaskError("invalid_page");
    if (page.nextCursor === requestedCursor || identity.hasCursor(page.nextCursor)) {
      throw new SearchExportTaskError("invalid_page");
    }
  }

  const records = page.messages.map((hit) => toExportRecord(hit, null, null));
  return deepFreeze({
    kind: "accepted" as const,
    taskId: task.taskId,
    attemptId,
    requestedCursor,
    windowStart: page.windowStart,
    count: page.count,
    nextCursor: isComplete ? null : page.nextCursor,
    messageIdentities: [...pageMessageIdentities],
    records,
  });
}

export function commitAllSearchExportPage(
  task: SearchExportTask,
  accepted: AcceptedSearchExportPage,
): SearchExportTask {
  if (
    task.status !== "running" ||
    task.scope !== "all" ||
    task.taskId !== accepted.taskId ||
    task.attemptId !== accepted.attemptId ||
    task.processedCount !== accepted.windowStart ||
    task.nextCursor !== accepted.requestedCursor
  ) {
    throw new SearchExportTaskError("invalid_state");
  }
  return {
    ...task,
    processedCount: task.processedCount + accepted.count,
    nextCursor: accepted.nextCursor,
  };
}

export function commitPartialSearchExportChunk(
  task: SearchExportTask,
  attemptId: string,
  recordCount: number,
): SearchExportTask {
  if (
    task.status !== "running" ||
    task.scope !== "partial" ||
    task.attemptId !== attemptId ||
    !Number.isSafeInteger(recordCount) ||
    recordCount <= 0 ||
    task.processedCount + recordCount > task.totalCount
  ) {
    throw new SearchExportTaskError("invalid_state");
  }
  return { ...task, processedCount: task.processedCount + recordCount };
}

export function beginSearchExportFinalization(
  task: SearchExportTask,
  attemptId: string,
): SearchExportTask {
  if (
    task.status !== "running" ||
    task.attemptId !== attemptId ||
    task.processedCount !== task.totalCount
  ) {
    throw new SearchExportTaskError("invalid_state");
  }
  return { ...task, status: "finalizing" };
}

export function completeSearchExportTask(
  task: SearchExportTask,
  attemptId: string,
): SearchExportTask {
  if (
    (task.status !== "finalizing" && task.status !== "commit_pending") ||
    task.attemptId !== attemptId ||
    task.processedCount !== task.totalCount
  ) {
    throw new SearchExportTaskError("invalid_state");
  }
  return { ...task, status: "completed", attemptId: null, error: null };
}

export function interruptSearchExportCommitConfirmation(
  task: SearchExportTask,
  attemptId: string,
): SearchExportTask {
  if (task.status !== "finalizing" || task.attemptId !== attemptId) {
    throw new SearchExportTaskError("invalid_state");
  }
  return {
    ...task,
    status: "commit_pending",
    error: {
      code: "commit_confirmation_interrupted",
      message: publicFailureMessage("commit_confirmation_interrupted"),
      retryable: true,
      checkpointSafe: false,
    },
  };
}

export function failSearchExportAttempt(
  task: SearchExportTask,
  attemptId: string,
  code: SearchExportFailureCode,
  options: { checkpointSafe: boolean },
): SearchExportTask {
  if (task.attemptId !== attemptId) return task;
  if (task.status !== "running" && task.status !== "finalizing") {
    throw new SearchExportTaskError("invalid_state");
  }
  const retryable = code === "request_failed" || code === "write_failed";
  return {
    ...task,
    status: "error",
    attemptId: null,
    error: {
      code,
      message: publicFailureMessage(code),
      retryable,
      checkpointSafe: retryable && options.checkpointSafe,
    },
  };
}

export function failSearchExportCleanup(task: SearchExportTask): SearchExportTask {
  return {
    ...task,
    status: "error",
    attemptId: null,
    error: {
      code: "cleanup_failed",
      message: publicFailureMessage("cleanup_failed"),
      retryable: false,
      checkpointSafe: false,
    },
  };
}

export function retrySearchExportTask(task: SearchExportTask, attemptId: string): SearchExportTask {
  if (task.status !== "error" || !task.error) {
    throw new SearchExportTaskError("invalid_state");
  }
  if (!task.error.retryable) throw new SearchExportTaskError("not_retryable");
  const checkpointSafe = task.error.checkpointSafe;
  return {
    ...task,
    status: "running",
    attempt: task.attempt + 1,
    attemptId,
    processedCount: checkpointSafe ? task.processedCount : 0,
    nextCursor: checkpointSafe ? task.nextCursor : null,
    error: null,
  };
}

export function cancelSearchExportTask(
  task: SearchExportTask,
  attemptId: string,
): SearchExportTask {
  if (
    (task.status !== "running" && task.status !== "finalizing")
    || task.attemptId !== attemptId
  ) return task;
  return { ...task, status: "cancelled", attemptId: null, error: null };
}

export function abandonSearchExportTask(task: SearchExportTask): SearchExportTask {
  if (task.status !== "error") throw new SearchExportTaskError("invalid_state");
  return { ...task, status: "cancelled", attemptId: null, error: null };
}

function resolveAllUnavailableReason(input: {
  capabilities: SearchCapabilities;
  resultWindow: SearchResultWindow;
  stale: boolean;
}): string | null {
  if (input.stale) return "搜索快照已过期，请先刷新搜索。";
  if (
    input.capabilities.mode !== "v2" ||
    !input.capabilities.exactTotal ||
    !input.capabilities.completeScope ||
    !input.resultWindow.exactTotal ||
    !input.resultWindow.completeScope
  ) {
    return "后端尚未证明搜索范围完整，不能导出全部命中。";
  }
  if (!input.capabilities.snapshotCursor) {
    return "后端不支持稳定快照分页，不能导出全部命中。";
  }
  return null;
}

function toExportRecord(
  hit: SearchHit,
  groupKey: string | null,
  groupLabel: string | null,
): SearchExportRecord {
  return {
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
    groupKey,
    groupLabel,
  };
}

function rangesForSourceIndexes(sourceIndexes: number[]): SearchLoadedRange[] {
  const indexes = [...new Set(sourceIndexes)].sort((left, right) => left - right);
  const ranges: SearchLoadedRange[] = [];
  for (const sourceIndex of indexes) {
    const previous = ranges[ranges.length - 1];
    if (previous?.end === sourceIndex) previous.end += 1;
    else ranges.push({ start: sourceIndex, end: sourceIndex + 1 });
  }
  return ranges;
}

function countCoveredIndexes(ranges: readonly SearchLoadedRange[]): number {
  return ranges.reduce((total, range) => total + Math.max(0, range.end - range.start), 0);
}

function createSearchExportMessageIdentity(hit: SearchHit): string {
  return createSearchHitIdentity(hit);
}

function cloneApplied(applied: SearchAppliedReturnSnapshot): SearchAppliedReturnSnapshot {
  return {
    draft: {
      ...applied.draft,
      scope:
        applied.draft.scope.kind === "selected"
          ? { kind: "selected", chatIds: [...applied.draft.scope.chatIds] }
          : { ...applied.draft.scope },
      categories: [...applied.draft.categories],
      senderIds: [...applied.draft.senderIds],
      dateRange: { ...applied.draft.dateRange },
    },
    request: {
      ...applied.request,
      chats: applied.request.chats ? [...applied.request.chats] : undefined,
      categories: applied.request.categories ? [...applied.request.categories] : undefined,
      senderIds: applied.request.senderIds ? [...applied.request.senderIds] : undefined,
    },
    ...(applied.dateContext ? { dateContext: { ...applied.dateContext } } : {}),
    succeededAt: applied.succeededAt,
  };
}

function assertExportFormat(format: BusinessExportFormat): void {
  if (!(BUSINESS_EXPORT_FORMATS as readonly string[]).includes(format)) {
    throw new SearchExportTaskError("invalid_format");
  }
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function publicFailureMessage(code: SearchExportFailureCode): string {
  switch (code) {
    case "request_failed":
      return "导出请求失败，请重试。";
    case "write_failed":
      return "导出文件写入失败，请重试。";
    case "commit_confirmation_interrupted":
      return "文件已写入，但提交确认中断。请重试确认保存结果。";
    case "cleanup_failed":
      return "导出文件清理失败，请关闭占用文件后再次关闭。";
    case "invalid_page":
      return "导出数据不连续，已停止以避免生成错误文件。";
    case "stale_revision":
      return "数据已更新，请刷新搜索后重试。";
    case "snapshot_expired":
      return "搜索快照已过期，请刷新搜索后重试。";
  }
}

function deepFreeze<T>(value: T, visited = new WeakSet<object>()): T {
  if (typeof value !== "object" || value === null || visited.has(value)) return value;
  visited.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, visited);
  return Object.freeze(value);
}

function exportErrorMessage(code: SearchExportTaskErrorCode): string {
  switch (code) {
    case "invalid_format":
      return "Search export format is invalid";
    case "confirmation_required":
      return "Search export requires confirmation";
    case "already_running":
      return "Search export is already running";
    case "invalid_state":
      return "Search export state is invalid";
    case "invalid_scope":
      return "Search export scope is invalid";
    case "invalid_privacy":
      return "Search export privacy selection is invalid";
    case "invalid_page":
      return "Search export page is invalid";
    case "stale_revision":
      return "Search export revision is stale";
    case "snapshot_expired":
      return "Search export snapshot expired";
    case "not_retryable":
      return "Search export cannot be retried";
  }
}
