import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type {
  SearchConversationDirectoryPage,
  SearchConversationDirectoryRequest,
  SearchDirectoryScope,
  SearchSenderDirectoryPage,
  SearchSenderDirectoryRequest,
} from "@/l2-coordinator/api-docs/search";
import {
  SearchDirectoryProtocolError,
  SearchDirectoryRequestError,
  fetchSearchConversationDirectory,
  fetchSearchSenderDirectory,
} from "@/l4-atom/network/fetchSearchDirectories";
import {
  applySearchDirectoryPage,
  beginSearchDirectoryContinuation,
  beginSearchDirectoryQuery,
  createSearchDirectoryModel,
  getSearchDirectoryContinuation,
  rejectSearchDirectoryRequest,
  toConversationDirectoryOptionPage,
  toSenderDirectoryOptionPage,
  toggleSearchDirectorySelection,
  type SearchDirectoryKind,
  type SearchDirectoryModel,
  type SearchDirectoryModelError,
  type SearchDirectoryOption,
} from "./searchDirectoryModel";

export interface SearchSenderDirectoryContext {
  scope: SearchDirectoryScope;
  chats: string[];
}

export interface SearchDirectoryCoordinatorState {
  conversation: SearchDirectoryModel;
  sender: SearchDirectoryModel;
}

export interface SearchDirectoryCoordinatorDependencies {
  fetchConversation: (
    request: SearchConversationDirectoryRequest,
    signal: AbortSignal,
  ) => Promise<SearchConversationDirectoryPage>;
  fetchSender: (
    request: SearchSenderDirectoryRequest,
    signal: AbortSignal,
  ) => Promise<SearchSenderDirectoryPage>;
  createToken: () => string;
}

export interface SearchDirectoryCoordinator {
  getState: () => SearchDirectoryCoordinatorState;
  subscribe: (listener: () => void) => () => void;
  setQuery: (kind: SearchDirectoryKind, query: string) => void;
  search: (kind: SearchDirectoryKind, senderContext?: SearchSenderDirectoryContext) => Promise<boolean>;
  loadMore: (
    kind: SearchDirectoryKind,
    senderContext?: SearchSenderDirectoryContext,
  ) => Promise<boolean>;
  toggleSelection: (kind: SearchDirectoryKind, option: SearchDirectoryOption) => void;
  dispose: () => void;
}

const DEFAULT_SENDER_CONTEXT: SearchSenderDirectoryContext = { scope: "all", chats: [] };

const defaultDependencies: SearchDirectoryCoordinatorDependencies = {
  fetchConversation: (request, signal) => fetchSearchConversationDirectory(request, { signal }),
  fetchSender: (request, signal) => fetchSearchSenderDirectory(request, { signal }),
  createToken: () => globalThis.crypto.randomUUID(),
};

export function createSearchDirectoryCoordinator(
  dependencies: SearchDirectoryCoordinatorDependencies = defaultDependencies,
): SearchDirectoryCoordinator {
  let state: SearchDirectoryCoordinatorState = {
    conversation: createSearchDirectoryModel("conversation"),
    sender: createSearchDirectoryModel("sender"),
  };
  const listeners = new Set<() => void>();
  const controllers: Partial<Record<SearchDirectoryKind, AbortController>> = {};
  let frozenSenderContext: SearchSenderDirectoryContext | null = null;
  let disposed = false;

  const publish = (next: SearchDirectoryCoordinatorState) => {
    if (disposed || next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const replaceModel = (kind: SearchDirectoryKind, model: SearchDirectoryModel) => {
    if (state[kind] === model) return;
    publish({ ...state, [kind]: model });
  };

  const abort = (kind: SearchDirectoryKind) => {
    controllers[kind]?.abort();
    delete controllers[kind];
  };

  const requestPage = async (
    kind: SearchDirectoryKind,
    requestToken: string,
    request:
      | SearchConversationDirectoryRequest
      | SearchSenderDirectoryRequest,
    controller: AbortController,
  ): Promise<boolean> => {
    try {
      const page =
        kind === "conversation"
          ? toConversationDirectoryOptionPage(
              await dependencies.fetchConversation(
                request as SearchConversationDirectoryRequest,
                controller.signal,
              ),
            )
          : toSenderDirectoryOptionPage(
              await dependencies.fetchSender(
                request as SearchSenderDirectoryRequest,
                controller.signal,
              ),
            );
      if (disposed || controller.signal.aborted) return false;
      const current = state[kind];
      const resolved = applySearchDirectoryPage(current, requestToken, page);
      if (resolved === current) return false;
      replaceModel(kind, resolved);
      if (controllers[kind] === controller) delete controllers[kind];
      return resolved.status === "ready" && resolved.error === null;
    } catch (error) {
      if (disposed || controller.signal.aborted) return false;
      const current = state[kind];
      const rejected = rejectSearchDirectoryRequest(
        current,
        requestToken,
        toSafeDirectoryModelError(error),
      );
      if (rejected === current) return false;
      replaceModel(kind, rejected);
      if (controllers[kind] === controller) delete controllers[kind];
      return false;
    }
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setQuery: (kind, query) => {
      if (disposed || state[kind].query === query) return;
      abort(kind);
      if (kind === "sender") frozenSenderContext = null;
      const current = state[kind];
      replaceModel(kind, {
        ...createSearchDirectoryModel(kind, current.selected),
        query,
        pageSize: current.pageSize,
      });
    },
    search: async (kind, senderContext) => {
      if (disposed) return false;
      abort(kind);
      const requestToken = dependencies.createToken();
      const current = state[kind];
      const loading = beginSearchDirectoryQuery(
        current,
        requestToken,
        current.query,
        current.pageSize,
      );
      replaceModel(kind, loading);
      const controller = new AbortController();
      controllers[kind] = controller;
      if (kind === "conversation") {
        return requestPage(
          kind,
          requestToken,
          { query: loading.query, limit: loading.pageSize },
          controller,
        );
      }
      const context = freezeSenderContext(senderContext ?? DEFAULT_SENDER_CONTEXT);
      frozenSenderContext = context;
      return requestPage(
        kind,
        requestToken,
        {
          query: loading.query,
          limit: loading.pageSize,
          scope: context.scope,
          chats: context.chats,
        },
        controller,
      );
    },
    loadMore: async (kind, senderContext) => {
      if (disposed) return false;
      const continuation = getSearchDirectoryContinuation(state[kind]);
      if (!continuation) return false;
      abort(kind);
      const requestToken = dependencies.createToken();
      const loading = beginSearchDirectoryContinuation(state[kind], requestToken);
      if (loading === state[kind]) return false;
      replaceModel(kind, loading);
      const controller = new AbortController();
      controllers[kind] = controller;
      if (kind === "conversation") {
        return requestPage(kind, requestToken, continuation, controller);
      }
      const context = frozenSenderContext ?? freezeSenderContext(senderContext ?? DEFAULT_SENDER_CONTEXT);
      return requestPage(
        kind,
        requestToken,
        { ...continuation, scope: context.scope, chats: context.chats },
        controller,
      );
    },
    toggleSelection: (kind, option) => {
      if (disposed) return;
      replaceModel(kind, toggleSearchDirectorySelection(state[kind], option));
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      abort("conversation");
      abort("sender");
      listeners.clear();
    },
  };
}

export function useSearchDirectoryCommander(
  dependencies: SearchDirectoryCoordinatorDependencies = defaultDependencies,
) {
  const coordinator = useMemo(
    () => createSearchDirectoryCoordinator(dependencies),
    [dependencies],
  );
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getState,
    coordinator.getState,
  );
  const activeCoordinatorRef = useRef(coordinator);
  const effectGenerationRef = useRef(0);
  activeCoordinatorRef.current = coordinator;

  useEffect(() => {
    const cleanupGeneration = ++effectGenerationRef.current;
    const generationRef = effectGenerationRef;
    const coordinatorRef = activeCoordinatorRef;
    return () => {
      queueMicrotask(() => {
        if (shouldDisposeSearchDirectoryCoordinator({
          cleanupGeneration,
          currentGeneration: generationRef.current,
          sameCoordinator: coordinatorRef.current === coordinator,
        })) {
          coordinator.dispose();
        }
      });
    };
  }, [coordinator]);

  return useMemo(() => ({ ...state, coordinator }), [coordinator, state]);
}

export function shouldDisposeSearchDirectoryCoordinator({
  cleanupGeneration,
  currentGeneration,
  sameCoordinator,
}: {
  cleanupGeneration: number;
  currentGeneration: number;
  sameCoordinator: boolean;
}): boolean {
  return !sameCoordinator || cleanupGeneration === currentGeneration;
}

function freezeSenderContext(context: SearchSenderDirectoryContext): SearchSenderDirectoryContext {
  return { scope: context.scope, chats: [...context.chats] };
}

function toSafeDirectoryModelError(error: unknown): SearchDirectoryModelError {
  if (error instanceof SearchDirectoryProtocolError) {
    return error.code === "invalid_directory_request" ? "invalid_request" : "invalid_response";
  }
  if (error instanceof SearchDirectoryRequestError) {
    if (error.code === "directory_stale") return "stale";
    if (
      error.code === "directory_invalid_request" ||
      error.code === "directory_invalid_query" ||
      error.code === "directory_invalid_scope" ||
      error.code === "directory_invalid_cursor" ||
      error.code === "request_too_large"
    ) {
      return "invalid_request";
    }
    if (
      error.code === "directory_unavailable" ||
      error.code === "directory_capacity" ||
      error.code === "database_not_ready" ||
      error.code === "database_decrypting" ||
      error.code === "database_error"
    ) {
      return "unavailable";
    }
    return "request_failed";
  }
  if (isRecord(error) && error.code === "directory_stale") return "stale";
  return "request_failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
