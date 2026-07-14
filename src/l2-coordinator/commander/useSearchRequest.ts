import { useEffect, useRef } from "react";
import type {
  SearchCapabilities,
  SearchSnapshotPage,
  SearchV2Request,
} from "@/l2-coordinator/api-docs/search";
import {
  useSearchStore,
  type PendingSearchRequest,
  type SearchRequestErrorCode,
} from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import {
  ChatlogHttpError,
  fetchSearchCapabilities,
  fetchSearchV2,
  SearchProtocolError,
} from "@/l4-atom/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import {
  assertSearchSubmissionCapabilities,
  prepareSearchSubmission,
  SearchSubmissionError,
} from "./searchRequestSubmission";
import { SearchWindowError, type SearchLoadedRange } from "./searchResultWindowModel";

export interface SearchRequestDependencies {
  fetchCapabilities: (signal: AbortSignal) => Promise<SearchCapabilities>;
  fetchPage: (request: SearchV2Request, signal: AbortSignal) => Promise<SearchSnapshotPage>;
  getBrowseMode: () => "manual" | "infinite" | "paged";
  getPrivacyOn: () => boolean;
  recordSuccessfulQuery: (query: string, succeededAt: number, privacyOn: boolean) => void;
  now: () => number;
}

export interface SearchRequestCoordinator {
  probeCapabilities: () => Promise<boolean>;
  submit: () => Promise<boolean>;
  retry: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
  load: (
    target: "forward" | "backward" | "page" | "gap",
    options?: { cursor?: string; gap?: SearchLoadedRange },
  ) => Promise<boolean>;
  cancelPending: () => void;
  cancelWindowOperation: (
    target: "forward" | "backward" | "page" | "gap",
    gap?: SearchLoadedRange,
  ) => void;
  dispose: () => void;
}

type ClassifiedSearchError = SearchRequestErrorCode | "cancelled";

export function createSearchRequestCoordinator(
  dependencies: SearchRequestDependencies,
): SearchRequestCoordinator {
  let disposed = false;
  let requestSequence = 0;
  let operationSequence = 0;
  let pendingController: { requestId: string; controller: AbortController } | null = null;
  let capabilityController: AbortController | null = null;
  const windowControllers = new Map<
    string,
    {
      token: number;
      controller: AbortController;
      operation:
        | { kind: "forward" | "backward" | "page" }
        | { kind: "gap"; range: SearchLoadedRange };
    }
  >();

  const nextRequestId = (kind: string): string => {
    requestSequence += 1;
    return `${kind}-${requestSequence}`;
  };

  const runPrepared = async (pending: Readonly<PendingSearchRequest>): Promise<boolean> => {
    if (disposed) return false;
    const previous = pendingController;
    previous?.controller.abort();
    if (previous) useSearchStore.getState().cancelPending(previous.requestId);

    const controller = new AbortController();
    pendingController = { requestId: pending.requestId, controller };
    useSearchStore.getState().beginPending(pending);
    try {
      const page = await dependencies.fetchPage(pending.request, controller.signal);
      if (disposed) return false;
      const succeededAt = dependencies.now();
      const committed = useSearchStore
        .getState()
        .commitPending(pending.requestId, page, succeededAt, dependencies.getBrowseMode());
      if (committed) {
        try {
          dependencies.recordSuccessfulQuery(
            pending.draft.keyword,
            succeededAt,
            dependencies.getPrivacyOn(),
          );
        } catch {
          // Search history is best-effort and cannot invalidate a good snapshot.
        }
      }
      return committed;
    } catch (error) {
      if (disposed) return false;
      const classified = classifySearchRequestError(error);
      if (classified === "cancelled") {
        useSearchStore.getState().cancelPending(pending.requestId);
      } else {
        const failed = useSearchStore.getState().failPending(pending.requestId, classified);
        if (
          failed &&
          pending.kind === "refresh" &&
          (classified === "stale_revision" || classified === "snapshot_expired")
        ) {
          useSearchStore.getState().markSnapshotStale();
        }
      }
      return false;
    } finally {
      if (pendingController?.requestId === pending.requestId) pendingController = null;
    }
  };

  const submit = async (): Promise<boolean> => {
    const state = useSearchStore.getState();
    const readinessError = readinessFailure(state.readiness);
    if (readinessError) {
      state.rejectSubmission(readinessError);
      return false;
    }
    const capabilities = state.capabilities.status === "ready" ? state.capabilities.value : null;
    if (!capabilities) {
      state.rejectSubmission("capability_unavailable");
      return false;
    }
    try {
      const pending = prepareSearchSubmission({
        draft: state.draft,
        capabilities,
        requestId: nextRequestId(state.applied ? "replacement" : "initial"),
        kind: state.applied ? "replacement" : "initial",
        startedAt: dependencies.now(),
      });
      return await runPrepared(pending);
    } catch (error) {
      state.rejectSubmission(classifySubmissionError(error));
      return false;
    }
  };

  const retry = async (): Promise<boolean> => {
    const state = useSearchStore.getState();
    const candidate = state.retryCandidate;
    const readinessError = readinessFailure(state.readiness);
    const capabilities = state.capabilities.status === "ready" ? state.capabilities.value : null;
    if (!candidate || readinessError || !capabilities) {
      if (readinessError) state.rejectSubmission(readinessError);
      else if (candidate) state.rejectSubmission("capability_unavailable");
      return false;
    }
    try {
      assertSearchSubmissionCapabilities(candidate.draft, capabilities);
    } catch (error) {
      state.rejectSubmission(classifySubmissionError(error));
      return false;
    }
    const pending: PendingSearchRequest = {
      ...candidate,
      requestId: nextRequestId("retry"),
      kind: "retry",
      startedAt: dependencies.now(),
    };
    return runPrepared(pending);
  };

  const refresh = async (): Promise<boolean> => {
    const state = useSearchStore.getState();
    const applied = state.applied;
    const readinessError = readinessFailure(state.readiness);
    const capabilities = state.capabilities.status === "ready" ? state.capabilities.value : null;
    if (!applied || readinessError || !capabilities) {
      if (readinessError) state.rejectSubmission(readinessError);
      else if (applied) state.rejectSubmission("capability_unavailable");
      return false;
    }
    try {
      assertSearchSubmissionCapabilities(applied.draft, capabilities);
    } catch (error) {
      state.rejectSubmission(classifySubmissionError(error));
      return false;
    }
    const request = { ...applied.request };
    delete request.cursor;
    delete request.snapshotId;
    delete request.dataRevision;
    return runPrepared({
      requestId: nextRequestId("refresh"),
      kind: "refresh",
      draft: cloneDraft(applied.draft),
      request: cloneRequest(request),
      dateContext: { ...applied.dateContext },
      startedAt: dependencies.now(),
    });
  };

  const load: SearchRequestCoordinator["load"] = async (target, options = {}) => {
    const state = useSearchStore.getState();
    const window = state.resultWindow;
    const applied = state.applied;
    if (!window || !applied || state.stale) return false;
    if (target === "gap" && !options.gap) return false;
    const operation =
      target === "gap"
        ? { kind: "gap" as const, range: options.gap! }
        : ({ kind: target } as const);
    const readinessError = readinessFailure(state.readiness);
    if (readinessError) {
      state.setWindowOperation(operation, {
        status: "error",
        errorCode: readinessError,
      });
      return false;
    }
    const capabilities = state.capabilities.status === "ready" ? state.capabilities.value : null;
    try {
      if (!capabilities) throw new SearchSubmissionError("capability_unavailable");
      assertSearchSubmissionCapabilities(applied.draft, capabilities);
    } catch (error) {
      state.setWindowOperation(operation, {
        status: "error",
        errorCode: classifySubmissionError(error),
      });
      return false;
    }
    const cursor =
      options.cursor ??
      (target === "forward"
        ? window.nextCursor
        : target === "backward"
          ? window.previousCursor
          : "");
    if (!cursor) return false;

    const key = operationKey(target, options.gap);
    const previous = windowControllers.get(key);
    previous?.controller.abort();
    const controller = new AbortController();
    operationSequence += 1;
    const token = operationSequence;
    windowControllers.set(key, { token, controller, operation });
    state.setWindowOperation(operation, { status: "loading" });

    try {
      const page = await dependencies.fetchPage(
        {
          ...cloneRequest(applied.request),
          snapshotId: window.snapshotId,
          dataRevision: window.dataRevision,
          cursor,
          limit: 50,
        },
        controller.signal,
      );
      const active = windowControllers.get(key);
      const current = useSearchStore.getState();
      if (
        disposed ||
        active?.token !== token ||
        current.stale ||
        current.resultWindow?.snapshotId !== window.snapshotId
      ) {
        return false;
      }
      current.applyWindowPage(page, target);
      useSearchStore.getState().setWindowOperation(operation, { status: "idle" });
      return true;
    } catch (error) {
      const current = useSearchStore.getState();
      if (
        disposed ||
        windowControllers.get(key)?.token !== token ||
        current.resultWindow?.snapshotId !== window.snapshotId ||
        current.resultWindow?.dataRevision !== window.dataRevision
      ) {
        return false;
      }
      const classified = classifySearchRequestError(error);
      if (classified === "cancelled") {
        useSearchStore.getState().setWindowOperation(operation, { status: "idle" });
        return false;
      }
      if (classified === "stale_revision" || classified === "snapshot_expired") {
        useSearchStore.getState().markSnapshotStale();
      }
      useSearchStore.getState().setWindowOperation(operation, {
        status: "error",
        errorCode: classified,
      });
      return false;
    } finally {
      if (windowControllers.get(key)?.token === token) windowControllers.delete(key);
    }
  };

  const probeCapabilities = async (): Promise<boolean> => {
    capabilityController?.abort();
    const controller = new AbortController();
    capabilityController = controller;
    const previous = useSearchStore.getState().capabilities.value;
    useSearchStore.getState().setCapabilitiesState({ status: "loading", value: previous });
    try {
      const capabilities = await dependencies.fetchCapabilities(controller.signal);
      if (disposed || capabilityController !== controller) return false;
      useSearchStore.getState().setCapabilitiesState({ status: "ready", value: capabilities });
      return true;
    } catch (error) {
      if (classifySearchRequestError(error) === "cancelled") return false;
      if (capabilityController === controller) {
        useSearchStore.getState().setCapabilitiesState({
          status: "error",
          value: previous,
          errorCode: "request_failed",
        });
      }
      return false;
    } finally {
      if (capabilityController === controller) capabilityController = null;
    }
  };

  const cancelPending = (): void => {
    const active = pendingController;
    pendingController = null;
    active?.controller.abort();
    if (active) useSearchStore.getState().cancelPending(active.requestId);
  };

  const cancelWindowOperation: SearchRequestCoordinator["cancelWindowOperation"] = (
    target,
    gap,
  ) => {
    const key = operationKey(target, gap);
    const active = windowControllers.get(key);
    if (!active) return;
    windowControllers.delete(key);
    active.controller.abort();
    useSearchStore.getState().setWindowOperation(active.operation, { status: "idle" });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    capabilityController?.abort();
    capabilityController = null;
    cancelPending();
    for (const active of windowControllers.values()) {
      active.controller.abort();
      useSearchStore.getState().setWindowOperation(active.operation, { status: "idle" });
    }
    windowControllers.clear();
  };

  return {
    probeCapabilities,
    submit,
    retry,
    refresh,
    load,
    cancelPending,
    cancelWindowOperation,
    dispose,
  };
}

export interface SearchRequestCoordinatorLifecycle {
  facade: SearchRequestCoordinator;
  activate: (dependencies: SearchRequestDependencies) => SearchRequestCoordinator;
  deactivate: (coordinator: SearchRequestCoordinator) => void;
}

export function createSearchRequestCoordinatorLifecycle(): SearchRequestCoordinatorLifecycle {
  let current: SearchRequestCoordinator | null = null;
  const facade: SearchRequestCoordinator = {
    probeCapabilities: () => current?.probeCapabilities() ?? Promise.resolve(false),
    submit: () => current?.submit() ?? Promise.resolve(false),
    retry: () => current?.retry() ?? Promise.resolve(false),
    refresh: () => current?.refresh() ?? Promise.resolve(false),
    load: (target, options) => current?.load(target, options) ?? Promise.resolve(false),
    cancelPending: () => current?.cancelPending(),
    cancelWindowOperation: (target, gap) => current?.cancelWindowOperation(target, gap),
    dispose: () => {
      const coordinator = current;
      current = null;
      coordinator?.dispose();
    },
  };
  return {
    facade,
    activate: (dependencies) => {
      current?.dispose();
      current = createSearchRequestCoordinator(dependencies);
      return current;
    },
    deactivate: (coordinator) => {
      if (current !== coordinator) return;
      current = null;
      coordinator.dispose();
    },
  };
}

export function useSearchRequest(
  dependencies: SearchRequestDependencies = defaultDependencies,
): SearchRequestCoordinator {
  const lifecycleRef = useRef<SearchRequestCoordinatorLifecycle | null>(null);
  if (!lifecycleRef.current) {
    lifecycleRef.current = createSearchRequestCoordinatorLifecycle();
  }
  useEffect(() => {
    const lifecycle = lifecycleRef.current!;
    const coordinator = lifecycle.activate(dependencies);
    void coordinator.probeCapabilities();
    return () => lifecycle.deactivate(coordinator);
  }, [dependencies]);
  return lifecycleRef.current.facade;
}

export function classifySearchRequestError(error: unknown): ClassifiedSearchError {
  if (error instanceof SearchSubmissionError) return error.code;
  if (error instanceof SearchWindowError) {
    return error.code === "stale_revision" ? "stale_revision" : "request_failed";
  }
  if (error instanceof SearchProtocolError) {
    return error.code === "invalid_search_request" ? "invalid_request" : "request_failed";
  }
  if (!(error instanceof ChatlogHttpError)) return "request_failed";
  if (error.status === null) {
    if (error.message === "请求已取消") return "cancelled";
    if (error.message === "请求超时") return "timeout";
    return "request_failed";
  }
  const code = safeResponseCode(error.body);
  if (code === "search_snapshot_stale" || code === "search_revision_changed")
    return "stale_revision";
  if (code === "search_snapshot_expired") return "snapshot_expired";
  if (code === "search_identity_conflict") return "request_failed";
  if (
    code === "database_unavailable" ||
    code === "database_not_ready" ||
    code === "database_decrypting" ||
    code === "database_error"
  )
    return "database_unavailable";
  if (
    code === "service_unavailable" ||
    code === "search_unavailable" ||
    code === "search_reader_unavailable" ||
    code === "search_capacity" ||
    code === "search_snapshot_capacity"
  )
    return "service_unavailable";
  if (code === "request_too_large") return "invalid_request";
  if (code === "request_timeout") return "timeout";
  if (error.status === 409) return "stale_revision";
  if (error.status === 410) return "snapshot_expired";
  if (error.status === 400 || error.status === 422) return "invalid_request";
  if (error.status === 503) return "service_unavailable";
  return "request_failed";
}

function classifySubmissionError(error: unknown): SearchRequestErrorCode {
  const classified = classifySearchRequestError(error);
  return classified === "cancelled" ? "request_failed" : classified;
}

function readinessFailure(readiness: {
  httpReady: boolean;
  dbReady: boolean;
}): SearchRequestErrorCode | null {
  if (!readiness.httpReady) return "service_unavailable";
  if (!readiness.dbReady) return "database_unavailable";
  return null;
}

function safeResponseCode(body: string | null): string | null {
  if (!body || body.length > 16_384) return null;
  try {
    const value = JSON.parse(body) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const code = (value as Record<string, unknown>).code;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

function operationKey(
  target: "forward" | "backward" | "page" | "gap",
  gap?: SearchLoadedRange,
): string {
  return target === "gap" ? `gap:${gap?.start ?? 0}:${gap?.end ?? 0}` : target;
}

function cloneDraft(draft: PendingSearchRequest["draft"]): PendingSearchRequest["draft"] {
  return {
    keyword: draft.keyword,
    scope:
      draft.scope.kind === "selected"
        ? { kind: "selected", chatIds: [...draft.scope.chatIds] }
        : { ...draft.scope },
    categories: [...draft.categories],
    senderIds: [...draft.senderIds],
    dateRange: { ...draft.dateRange },
  };
}

function cloneRequest(request: SearchV2Request): SearchV2Request {
  return {
    ...request,
    chats: request.chats ? [...request.chats] : undefined,
    categories: request.categories ? [...request.categories] : undefined,
    senderIds: request.senderIds ? [...request.senderIds] : undefined,
  };
}

const defaultDependencies: SearchRequestDependencies = {
  fetchCapabilities: (signal) =>
    fetchSearchCapabilities({
      ...createDiagnosticHttpOptions({
        endpointFamily: "search_capabilities",
        method: "GET",
        recoveryHint: "retry",
      }),
      signal,
    }),
  fetchPage: (request, signal) =>
    fetchSearchV2(request, {
      ...createDiagnosticHttpOptions({
        endpointFamily: "search",
        method: "POST",
        recoveryHint: "retry",
      }),
      signal,
    }),
  getBrowseMode: () => useSearchPreferenceStore.getState().browseMode,
  getPrivacyOn: () => useSettingsStore.getState().settings.privacyOn,
  recordSuccessfulQuery: (query, succeededAt, privacyOn) => {
    useSearchPreferenceStore.getState().recordSuccessfulQuery(query, succeededAt, privacyOn);
  },
  now: () => Date.now(),
};
