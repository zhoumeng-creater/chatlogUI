import { useCallback, useRef, useEffect } from "react";
import { useAiStore } from "@/l2-coordinator/data-clerk/stores/useAiStore";
import { useChatCommander } from "@/l2-coordinator/commander/useChatCommander";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import { translateError } from "@/l2-coordinator/diplomat/errorTranslator";
import { createTokenBuffer } from "@/l2-coordinator/diplomat/sseParser";
import { withOverloadRetry } from "@/l2-coordinator/diplomat/overloadInterceptor";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import {
  streamQA,
  fetchSemanticSearch,
  fetchSemanticTopics,
  fetchSemanticProfiles,
  fetchSemanticConfig,
  fetchSemanticIndexPreview,
  setSemanticConfig,
  testLLMConnection,
  fetchIndexStatus,
  manageIndex,
  type SemanticPreviewKind,
} from "@l4/network";
import {
  INDEX_POLL_INTERVAL_MS,
  INDEX_BUILD_TIMEOUT_MS,
  SEMANTIC_SEARCH_DEBOUNCE_MS,
} from "@/utils/constants";
import type {
  SemanticConfig,
  QARequest,
  SemanticDiscoveryWindow,
  SemanticSearchDepth,
  SemanticSearchRequest,
  SemanticSearchScope,
} from "@/l2-coordinator/api-docs/semantic";
import {
  deriveCompactSemanticStatus,
  deriveSemanticModuleView,
  deriveSemanticQaView,
} from "./semanticViewModel";
import { buildSemanticPreviewView } from "./semanticPreviewViewModel";
import {
  buildSemanticAnalysisRequest,
  buildSemanticPreviewRequest,
  buildSemanticSearchRequest,
} from "./semanticDiscoveryRequestModel";
import { resolveSemanticSearchTarget } from "./semanticDiscoveryNavigation";
import { buildSemanticDiscoveryView } from "./semanticDiscoveryViewModel";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

type IndexAction = "rebuild" | "pause" | "resume" | "clear";

function semanticDiagnostics(method: "GET" | "POST" = "GET") {
  return createDiagnosticHttpOptions({
    endpointFamily: "semantic",
    method,
    recoveryHint: "retry",
  });
}

export function useAiCommander() {
  const store = useAiStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { selectedConversationId } = useChatCommander();
  const conversations = useChatStore((s) => s.conversations);
  const sseAbortRef = useRef<AbortController | null>(null);
  const indexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentConv = conversations.find(c => c.id === selectedConversationId);
  const currentChat = currentConv?.username;

  const startIndexPolling = useCallback(() => {
    if (indexPollRef.current) clearInterval(indexPollRef.current);
    const startTime = Date.now();

    indexPollRef.current = setInterval(async () => {
      try {
        const status = await fetchIndexStatus(semanticDiagnostics());
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
      const config = await fetchSemanticConfig(semanticDiagnostics());
      if (!config) {
        store.setPhase("not_configured");
        return;
      }
      store.setConfig(config);
      store.setPhase("index_checking");
      const status = await fetchIndexStatus(semanticDiagnostics());
      store.setIndexStatus(status);
      if (status.status === "ready") {
        store.setPhase("index_ready");
      } else if (status.status === "building" || status.status === "running") {
        store.setPhase("index_building");
        startIndexPolling();
      } else if (status.status === "paused") {
        store.setPhase("index_not_built");
      } else if (status.status === "error" || status.state === "error") {
        store.setPhase("index_error");
        store.setError(status.lastError || status.error || "语义索引不可用");
      } else {
        store.setPhase("index_not_built");
      }
    } catch {
      store.setPhase("not_configured");
    }
  }, [store, startIndexPolling]);

  const saveConfig = useCallback(async (config: SemanticConfig) => {
    try {
      await setSemanticConfig(config, semanticDiagnostics("POST"));
      store.setConfig(config);
      store.setPhase("index_not_built");
    } catch (error) {
      store.setError(translateError(String(error)));
    }
  }, [store]);

  const testConnection = useCallback(async (provider: string, cfg: Record<string, string>) => {
    try {
      return await testLLMConnection(provider, cfg, semanticDiagnostics("POST"));
    } catch (error) {
      return { ok: false, success: false, message: String(error) };
    }
  }, []);

  const doIndexAction = useCallback(async (action: IndexAction) => {
    try {
      await manageIndex(action, semanticDiagnostics("POST"));
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
      if (sseAbortRef.current) {
        sseAbortRef.current.abort();
        const aiStore = useAiStore.getState();
        if (aiStore.qaStreaming) {
          aiStore.setQAStatus("stopped");
        }
      }
    };
  }, []);

  const stopQAStream = useCallback(() => {
    sseAbortRef.current?.abort();
    sseAbortRef.current = null;
    const aiStore = useAiStore.getState();
    if (aiStore.qaStreaming) {
      aiStore.setQAStatus("stopped");
      aiStore.setQAStreaming(false);
      useAiStore.setState({
        qaMessages: aiStore.qaMessages.map((message) =>
          message.isStreaming ? { ...message, isStreaming: false } : message
        ),
      });
    }
  }, []);

  const askQuestion = useCallback((query: string, scope?: "contact" | "all", overrides: Partial<QARequest> = {}) => {
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

    store.setQAError(null);
    store.setQAStatus("connecting");

    const params: QARequest = {
      query,
      chat: scope === "all" ? undefined : (currentChat || undefined),
      scope: scope || undefined,
      window: store.discoveryWindow,
      retrievalDepth: store.searchDepth,
      sourceLimit: store.searchSourceLimit,
      ...overrides,
    };

    const tokenBuffer = createTokenBuffer(50);

    streamQA(
      params,
      (event) => {
        if (event.type === "delta") {
          if (useAiStore.getState().qaStatus === "connecting") {
            store.setQAStatus("streaming");
          }
          tokenBuffer.feed(event.text, (text) => {
            store.appendQAToken(aiMsgId, text);
          });
        } else if (event.type === "done") {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          const msgs = useAiStore.getState().qaMessages;
          const currentAnswer = msgs.find((m) => m.id === aiMsgId)?.content ?? "";
          const answer = currentAnswer || event.payload.answer;
          const finalMsgs = msgs.map((m) =>
            m.id === aiMsgId ? { ...m, content: answer, isStreaming: false } : m
          );
          useAiStore.setState({ qaMessages: finalMsgs });
          store.setQAStatus(answer.trim() ? "completed" : "empty");
        } else if (event.type === "error") {
          tokenBuffer.flush((text) => {
            if (text) store.appendQAToken(aiMsgId, text);
          });
          const message = translateError(event.error || "ESEMANTIC_SSE_ERROR");
          store.setQAStatus("failed");
          store.setQAError(message);
          store.setError(message);
        }
      },
      (error) => {
        store.setQAStatus("failed");
        if (error.name !== "AbortError") {
          const message = translateError(error.message || "ESEMANTIC_SSE_ERROR");
          store.setQAError(message);
          store.setError(message);
        }
      },
      abortController.signal,
      semanticDiagnostics("POST"),
    );
  }, [currentChat, store]);

  const askAboutSender = useCallback((senderId: string) => {
    const entityOverride = senderId.trim();
    if (!entityOverride) return;
    askQuestion("请基于当前会话总结这个对象的沟通主题和行为模式。", "contact", { entityOverride });
  }, [askQuestion]);

  const semanticSearch = useCallback(async (query = useAiStore.getState().searchQuery) => {
    store.setSearchQuery(query);
    store.setSearchNavigationNote(null);
    if (!query.trim()) {
      store.setSearchResults(null);
      store.setSearchError(null);
      return;
    }
    store.setSearchLoading(true);
    store.setSearchError(null);
    try {
      const aiStore = useAiStore.getState();
      const params: SemanticSearchRequest | null = buildSemanticSearchRequest({
        query,
        scope: aiStore.searchScope,
        currentChat,
        selectedChats: aiStore.selectedSearchChats,
        conversations,
        window: aiStore.discoveryWindow,
        depth: aiStore.searchDepth,
        sourceLimit: aiStore.searchSourceLimit,
        rerank: aiStore.searchRerank,
        limit: 20,
      });
      if (!params) return;
      const results = await withOverloadRetry(() =>
        fetchSemanticSearch(params, semanticDiagnostics()),
      );
      store.setSearchResults(results);
    } catch (error) {
      store.setSearchError(translateError(String(error)));
    }
  }, [conversations, currentChat, store]);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();
  useEffect(() => {
    debouncedSearchRef.current = debounce(semanticSearch, SEMANTIC_SEARCH_DEBOUNCE_MS);
    return () => { debouncedSearchRef.current?.cancel(); };
  }, [semanticSearch]);

  const debouncedSearch = useCallback((query: string) => {
    debouncedSearchRef.current?.(query);
  }, []);

  const loadAnalysis = useCallback(async () => {
    const request = buildSemanticAnalysisRequest(currentChat, useAiStore.getState().discoveryWindow);
    if (!request) return;

    store.setTopicsLoading(true);
    store.setProfileLoading(true);

    try {
      const topics = await withOverloadRetry(() =>
        fetchSemanticTopics(request, semanticDiagnostics()),
      );
      store.setTopics(topics);
    } catch (error) {
      store.setTopicsError(translateError(String(error)));
    }

    try {
      const profile = await withOverloadRetry(() =>
        fetchSemanticProfiles(request, semanticDiagnostics()),
      );
      store.setProfile(profile);
    } catch (error) {
      store.setProfileError(translateError(String(error)));
    }
  }, [currentChat, store]);

  const loadPreview = useCallback(async (overrides: {
    kind?: SemanticPreviewKind;
    limit?: number;
    offset?: number;
    talker?: string;
  } = {}) => {
    const aiStore = useAiStore.getState();
    const kind = overrides.kind ?? aiStore.previewKind;
    const limit = overrides.limit ?? aiStore.previewLimit;
    const offset = overrides.offset ?? aiStore.previewOffset;
    const talker = overrides.talker ?? aiStore.previewTalker;

    aiStore.setPreviewLoading();
    try {
      const preview = await fetchSemanticIndexPreview(
        buildSemanticPreviewRequest({ kind, limit, offset, talker }),
        semanticDiagnostics(),
      );
      useAiStore.getState().setPreview(preview);
    } catch (error) {
      useAiStore.getState().setPreviewError(
        error instanceof Error ? error.message : "加载语义索引预览失败",
      );
    }
  }, []);

  const setPreviewKind = useCallback((kind: SemanticPreviewKind) => {
    useAiStore.getState().setPreviewKind(kind);
    void loadPreview({ kind, offset: 0 });
  }, [loadPreview]);

  const setPreviewLimit = useCallback((limit: number) => {
    useAiStore.getState().setPreviewLimit(limit);
    void loadPreview({ limit, offset: 0 });
  }, [loadPreview]);

  const setPreviewTalker = useCallback((talker: string) => {
    useAiStore.getState().setPreviewTalker(talker);
    void loadPreview({ talker, offset: 0 });
  }, [loadPreview]);

  const loadPreviousPreviewPage = useCallback(() => {
    const aiStore = useAiStore.getState();
    const offset = Math.max(0, aiStore.previewOffset - aiStore.previewLimit);
    aiStore.setPreviewOffset(offset);
    void loadPreview({ offset });
  }, [loadPreview]);

  const loadNextPreviewPage = useCallback(() => {
    const aiStore = useAiStore.getState();
    const offset = aiStore.previewOffset + aiStore.previewLimit;
    aiStore.setPreviewOffset(offset);
    void loadPreview({ offset });
  }, [loadPreview]);

  const setSearchScope = useCallback((scope: SemanticSearchScope) => {
    useAiStore.getState().setSearchScope(scope);
  }, []);

  const setSelectedSearchChats = useCallback((chats: string[]) => {
    useAiStore.getState().setSelectedSearchChats(chats);
  }, []);

  const setDiscoveryWindow = useCallback((window: SemanticDiscoveryWindow) => {
    useAiStore.getState().setDiscoveryWindow(window);
  }, []);

  const setSearchDepth = useCallback((depth: SemanticSearchDepth) => {
    useAiStore.getState().setSearchDepth(depth);
  }, []);

  const setSearchSourceLimit = useCallback((limit: number) => {
    useAiStore.getState().setSearchSourceLimit(limit);
  }, []);

  const setSearchRerank = useCallback((rerank: boolean) => {
    useAiStore.getState().setSearchRerank(rerank);
  }, []);

  const resolveSearchResult = useCallback((result: Parameters<typeof resolveSemanticSearchTarget>[0]) => {
    const target = resolveSemanticSearchTarget(result, conversations, privacyOn);
    store.setSearchNavigationNote(target.message);
    return target;
  }, [conversations, privacyOn, store]);

  const previousChatRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!currentChat || previousChatRef.current === currentChat) return;
    previousChatRef.current = currentChat;

    const aiStore = useAiStore.getState();
    aiStore.setSearchResults(null);
    aiStore.setSearchQuery("");
    aiStore.setTopics(null);
    aiStore.setProfile(null);
  }, [currentChat]);

  const latestAssistantAnswer =
    [...store.qaMessages].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const moduleView = deriveSemanticModuleView({
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    qaStatus: store.qaStatus,
  });
  const qaView = deriveSemanticQaView({
    status: store.qaStatus,
    answer: latestAssistantAnswer,
    error: store.qaError,
  });
  const compactStatus = deriveCompactSemanticStatus({
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    qaStatus: store.qaStatus,
  });
  const semanticPreviewView = buildSemanticPreviewView({
    status: store.previewStatus,
    preview: store.preview,
    error: store.previewError,
  }, privacyOn);
  const discoveryView = buildSemanticDiscoveryView({
    conversations,
    currentChat,
    currentContactName: currentConv?.displayName,
    privacyOn,
    window: store.discoveryWindow,
    scope: store.searchScope,
    selectedChats: store.selectedSearchChats,
    depth: store.searchDepth,
    sourceLimit: store.searchSourceLimit,
    rerank: store.searchRerank,
    topics: store.topics,
    profile: store.profile,
  });

  return {
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    moduleView,
    qaView,
    compactStatus,
    qaMessages: store.qaMessages,
    qaLoading: store.qaLoading,
    qaStreaming: store.qaStreaming,
    qaStatus: store.qaStatus,
    qaError: store.qaError,
    searchQuery: store.searchQuery,
    searchScope: store.searchScope,
    selectedSearchChats: store.selectedSearchChats,
    discoveryWindow: store.discoveryWindow,
    searchDepth: store.searchDepth,
    searchSourceLimit: store.searchSourceLimit,
    searchRerank: store.searchRerank,
    searchNavigationNote: store.searchNavigationNote,
    searchResults: store.searchResults,
    searchLoading: store.searchLoading,
    searchError: store.searchError,
    topics: store.topics,
    topicsLoading: store.topicsLoading,
    topicsError: store.topicsError,
    profile: store.profile,
    profileLoading: store.profileLoading,
    profileError: store.profileError,
    previewStatus: store.previewStatus,
    preview: store.preview,
    previewKind: store.previewKind,
    previewTalker: store.previewTalker,
    previewLimit: store.previewLimit,
    previewOffset: store.previewOffset,
    previewError: store.previewError,
    semanticPreviewView,
    discoveryView,
    error: store.error,
    initialize,
    saveConfig,
    testConnection,
    doIndexAction,
    askQuestion,
    askAboutSender,
    stopQAStream,
    debouncedSearch,
    semanticSearch,
    resolveSearchResult,
    setSearchQuery: store.setSearchQuery,
    loadAnalysis,
    loadPreview,
    setPreviewKind,
    setPreviewLimit,
    setPreviewTalker,
    loadPreviousPreviewPage,
    loadNextPreviewPage,
    setSearchScope,
    setSelectedSearchChats,
    setDiscoveryWindow,
    setSearchDepth,
    setSearchSourceLimit,
    setSearchRerank,
    clearError: () => store.setError(null),
    clearQAMessages: store.clearQAMessages,
    reset: store.reset,
  };
}
