import { useCallback, useRef, useEffect } from "react";
import { useAiStore } from "@/l2-coordinator/data-clerk/stores/useAiStore";
import { useChatCommander } from "@/l2-coordinator/commander/useChatCommander";
import { translateError } from "@/l2-coordinator/diplomat/errorTranslator";
import { parseSSEChunk, createTokenBuffer } from "@/l2-coordinator/diplomat/sseParser";
import { withOverloadRetry } from "@/l2-coordinator/diplomat/overloadInterceptor";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import {
  streamQA,
  fetchSemanticSearch,
  fetchSemanticTopics,
  fetchSemanticProfiles,
  fetchSemanticConfig,
  setSemanticConfig,
  testLLMConnection,
  fetchIndexStatus,
  manageIndex,
} from "@l4/network";
import {
  INDEX_POLL_INTERVAL_MS,
  INDEX_BUILD_TIMEOUT_MS,
  SEMANTIC_SEARCH_DEBOUNCE_MS,
} from "@/utils/constants";
import type { SemanticConfig, QARequest, SemanticSearchRequest } from "@/l2-coordinator/api-docs/semantic";

type IndexAction = "rebuild" | "pause" | "resume" | "clear";

export function useAiCommander() {
  const store = useAiStore();
  const { selectedContact, selectedChatRoom } = useChatCommander();
  const sseAbortRef = useRef<AbortController | null>(null);
  const indexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChat = selectedContact?.userName || selectedChatRoom?.name;

  const startIndexPolling = useCallback(() => {
    if (indexPollRef.current) clearInterval(indexPollRef.current);
    const startTime = Date.now();

    indexPollRef.current = setInterval(async () => {
      try {
        const status = await fetchIndexStatus();
        store.setIndexStatus(status);

        if (status.status === "ready") {
          clearInterval(indexPollRef.current!);
          store.setPhase("index_ready");
        } else if (status.status === "error") {
          clearInterval(indexPollRef.current!);
          store.setPhase("index_error");
          store.setError(status.error || "索引构建失败");
        } else if (Date.now() - startTime > INDEX_BUILD_TIMEOUT_MS) {
          clearInterval(indexPollRef.current!);
          store.setError("索引构建超时，请检查系统资源后重试");
        }
      } catch {
        // polling failure, continue retrying
      }
    }, INDEX_POLL_INTERVAL_MS);
  }, [store]);

  const initialize = useCallback(async () => {
    store.setPhase("checking_config");
    try {
      const config = await fetchSemanticConfig();
      if (!config) {
        store.setPhase("not_configured");
        return;
      }
      store.setConfig(config);
      store.setPhase("index_checking");
      const status = await fetchIndexStatus();
      store.setIndexStatus(status);
      if (status.status === "ready") {
        store.setPhase("index_ready");
      } else if (status.status === "building") {
        store.setPhase("index_building");
        startIndexPolling();
      } else {
        store.setPhase("index_not_built");
      }
    } catch {
      store.setPhase("not_configured");
    }
  }, [store, startIndexPolling]);

  const saveConfig = useCallback(async (config: SemanticConfig) => {
    try {
      await setSemanticConfig(config);
      store.setConfig(config);
      store.setPhase("index_not_built");
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [store]);

  const testConnection = useCallback(async (provider: string, cfg: Record<string, string>) => {
    try {
      return await testLLMConnection(provider, cfg);
    } catch (error) {
      return { success: false, message: String(error) };
    }
  }, []);

  const doIndexAction = useCallback(async (action: IndexAction) => {
    try {
      await manageIndex(action);
      if (action === "rebuild") {
        store.setPhase("index_building");
        startIndexPolling();
      } else if (action === "clear") {
        store.setPhase("index_not_built");
        store.setIndexStatus({ status: "idle", total: 0, completed: 0 });
      }
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [store, startIndexPolling]);

  useEffect(() => {
    return () => {
      if (indexPollRef.current) clearInterval(indexPollRef.current);
      if (sseAbortRef.current) sseAbortRef.current.abort();
    };
  }, []);

  const askQuestion = useCallback((query: string, scope?: "contact" | "all") => {
    if (!query.trim()) return;

    sseAbortRef.current?.abort();
    const abortController = new AbortController();
    sseAbortRef.current = abortController;

    const userMsgId = `user-${Date.now()}`;
    store.addQAMessage({
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: Date.now(),
    });

    const aiMsgId = `ai-${Date.now()}`;
    store.addQAMessage({
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    });

    store.setQAStreaming(true);

    const params: QARequest = {
      query,
      chat: scope === "all" ? undefined : (currentChat || undefined),
      scope: scope || undefined,
    };

    const tokenBuffer = createTokenBuffer(50);

    streamQA(
      params,
      (chunk) => {
        const parsed = parseSSEChunk(chunk);
        if (parsed.type === "token") {
          tokenBuffer.feed(parsed.content, (text) => {
            store.appendQAToken(aiMsgId, text);
          });
        } else if (parsed.type === "done") {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          store.setQAStreaming(false);
          const msgs = useAiStore.getState().qaMessages;
          const finalMsgs = msgs.map((m) =>
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          );
          useAiStore.setState({ qaMessages: finalMsgs, qaStreaming: false });
        } else if (parsed.type === "error") {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          store.setQAStreaming(false);
          store.setError(translateError(parsed.error || "ESEMANTIC_SSE_ERROR"));
        }
      },
      (error) => {
        store.setQAStreaming(false);
        if (error.name !== "AbortError") {
          store.setError(translateError(error.message || "ESEMANTIC_SSE_ERROR"));
        }
      },
      abortController.signal
    );
  }, [currentChat, store]);

  const semanticSearch = useCallback(async (query: string, scope?: "contact" | "all") => {
    if (!query.trim()) {
      store.setSearchResults(null);
      return;
    }
    store.setSearchLoading(true);
    try {
      const params: SemanticSearchRequest = {
        query,
        chat: scope === "all" ? undefined : (currentChat || undefined),
        scope,
      };
      const results = await withOverloadRetry(() => fetchSemanticSearch(params));
      store.setSearchResults(results);
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [currentChat, store]);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();
  useEffect(() => {
    debouncedSearchRef.current = debounce(semanticSearch, SEMANTIC_SEARCH_DEBOUNCE_MS);
    return () => { debouncedSearchRef.current?.cancel(); };
  }, [semanticSearch]);

  const debouncedSearch = useCallback((query: string, scope?: "contact" | "all") => {
    debouncedSearchRef.current?.(query, scope);
  }, []);

  const loadAnalysis = useCallback(async () => {
    if (!currentChat) return;

    store.setTopicsLoading(true);
    store.setProfileLoading(true);

    try {
      const topics = await withOverloadRetry(() => fetchSemanticTopics(currentChat));
      store.setTopics(topics);
    } catch (error) {
      store.setTopicsLoading(false);
      store.setError(translateError(String(error)));
    }

    try {
      const profile = await withOverloadRetry(() => fetchSemanticProfiles(currentChat));
      store.setProfile(profile);
    } catch {
      store.setProfileLoading(false);
    }
  }, [currentChat, store]);

  useEffect(() => {
    if (currentChat) {
      store.setSearchResults(null);
      store.setSearchQuery("");
      store.setTopics(null);
      store.setProfile(null);
    }
  }, [currentChat, store]);

  return {
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    qaMessages: store.qaMessages,
    qaLoading: store.qaLoading,
    qaStreaming: store.qaStreaming,
    searchQuery: store.searchQuery,
    searchResults: store.searchResults,
    searchLoading: store.searchLoading,
    topics: store.topics,
    topicsLoading: store.topicsLoading,
    profile: store.profile,
    profileLoading: store.profileLoading,
    error: store.error,
    initialize,
    saveConfig,
    testConnection,
    doIndexAction,
    askQuestion,
    debouncedSearch,
    semanticSearch,
    loadAnalysis,
    clearError: () => store.setError(null),
    clearQAMessages: store.clearQAMessages,
    reset: store.reset,
  };
}
