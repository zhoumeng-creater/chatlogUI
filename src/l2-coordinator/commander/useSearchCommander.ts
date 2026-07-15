import { useCallback, useEffect } from "react";
import {
  useSearchStore,
  type SearchScope,
} from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { useSetupStore } from "@/l2-coordinator/data-clerk/stores/useSetupStore";
import {
  replaceSearchDraftScope,
  type SearchDraft,
} from "./searchDraftModel";
import { shouldProbeSearchCapabilities, useSearchRequest } from "./useSearchRequest";
import type { SearchLoadedRange } from "./searchResultWindowModel";

interface SearchCommanderOptions {
  scopedChat?: string | null;
}

/**
 * Canonical search-page coordinator. Network execution is owned by
 * useSearchRequest; edit actions below mutate only the canonical draft.
 */
export function useSearchCommander(options: SearchCommanderOptions = {}) {
  const store = useSearchStore();
  const request = useSearchRequest();
  const httpReady = useSetupStore((state) => state.httpReady);
  const dbReady = useSetupStore((state) => state.dbReady);

  useEffect(() => {
    const state = useSearchStore.getState();
    state.setReadiness({ httpReady, dbReady });
    if (
      httpReady &&
      shouldProbeSearchCapabilities({
        restoredFromNavigation: state.restoredFromNavigation,
        capabilitiesStatus: state.capabilities.status,
      })
    ) {
      void request.probeCapabilities();
    }
  }, [dbReady, httpReady, request]);

  useEffect(() => {
    const state = useSearchStore.getState();
    const chatId = normalizePrivateId(options.scopedChat);
    if (
      !shouldSynchronizeScopedChat(
        state.restoredFromNavigation,
        state.draft.scope.kind,
        state.draft.scope.kind === "current" ? state.draft.scope.chatId : null,
        chatId,
      )
    ) {
      return;
    }
    state.setDraft(applySearchRouteScopeDraft(state.draft, "current", chatId));
  }, [options.scopedChat]);

  const search = useCallback((keyword: string) => {
    const state = useSearchStore.getState();
    state.setDraft({ ...state.draft, keyword });
  }, []);

  const executeSearch = useCallback(
    async (keyword: string) => {
      search(keyword);
      return request.submit();
    },
    [request, search],
  );

  const changeScope = useCallback(
    (scope: SearchScope) => {
      const state = useSearchStore.getState();
      state.setDraft(applySearchRouteScopeDraft(state.draft, scope, options.scopedChat));
    },
    [options.scopedChat],
  );

  const cancelSearch = useCallback(() => request.cancelPending(), [request]);

  const clearSearch = useCallback(() => {
    const state = useSearchStore.getState();
    state.setDraft({ ...state.draft, keyword: "" });
  }, []);

  const endSearch = useCallback(() => {
    request.cancelPending();
    request.cancelAllWindowOperations();
    useSearchStore.getState().endSearch();
  }, [request]);

  const loadMoreResults = useCallback(() => request.load("forward"), [request]);
  const loadPreviousResults = useCallback(() => request.load("backward"), [request]);
  const loadPageResults = useCallback(
    (cursor: string, targetPageStart: number) =>
      request.load("page", { cursor, targetPageStart }),
    [request],
  );
  const loadGapResults = useCallback(
    (gap: SearchLoadedRange) => request.load("gap", { gap }),
    [request],
  );
  const cancelWindowOperation = useCallback(
    (target: "forward" | "backward" | "page" | "gap", gap?: SearchLoadedRange) =>
      request.cancelWindowOperation(target, gap),
    [request],
  );
  const retrySearch = useCallback(() => request.retry(), [request]);
  const refreshSearch = useCallback(() => request.refresh(), [request]);
  const reprobeCapabilities = useCallback(() => request.probeCapabilities(), [request]);

  return {
    ...store,
    search,
    executeSearch,
    changeScope,
    cancelSearch,
    clearSearch,
    endSearch,
    loadMoreResults,
    loadPreviousResults,
    loadPageResults,
    loadGapResults,
    cancelWindowOperation,
    retrySearch,
    refreshSearch,
    reprobeCapabilities,
  };
}

export function shouldSynchronizeScopedChat(
  restoredFromNavigation: boolean,
  scopeKind: ReturnType<typeof useSearchStore.getState>["draft"]["scope"]["kind"],
  currentChatId: string | null,
  scopedChatId: string | null,
): boolean {
  return !restoredFromNavigation && scopeKind === "current" && currentChatId !== scopedChatId;
}

export function applySearchRouteScopeDraft(
  draft: SearchDraft,
  scope: SearchScope,
  scopedChat?: string | null,
): SearchDraft {
  return replaceSearchDraftScope(
    draft,
    scope === "all"
      ? { kind: "all" }
      : { kind: "current", chatId: normalizePrivateId(scopedChat) },
  );
}

function normalizePrivateId(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
