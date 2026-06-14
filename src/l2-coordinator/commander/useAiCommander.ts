import { useCallback, useMemo, useRef, useEffect, type MutableRefObject } from "react";
import { useAiStore } from "@/l2-coordinator/data-clerk/stores/useAiStore";
import { useChatCommander } from "@/l2-coordinator/commander/useChatCommander";
import { useChatStore } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import { translateError } from "@/l2-coordinator/diplomat/errorTranslator";
import { createTokenBuffer } from "@/l2-coordinator/diplomat/sseParser";
import { withOverloadRetry } from "@/l2-coordinator/diplomat/overloadInterceptor";
import { debounce } from "@/l2-coordinator/diplomat/debounce";
import { copyTextToClipboard } from "@l4/system";
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
import type { QARequest, SemanticSearchRequest } from "@/l2-coordinator/api-docs/semantic";
import {
  deriveCompactSemanticStatus,
  deriveSemanticModuleView,
  deriveSemanticQaView,
} from "./semanticViewModel";
import {
  buildConnectionTestPayload,
  createSemanticSetupDraft,
  deriveIndexActionIntent,
  deriveSemanticIndexCenterView,
  deriveSemanticSetupView,
  type SemanticIndexCommand,
  type SemanticSetupDraft,
} from "./semanticSetupViewModel";
import {
  runSemanticIndexActionWithRefetch,
  saveSemanticConfigWithRefetch,
} from "./semanticSetupActions";
import { buildSemanticPreviewView } from "./semanticPreviewViewModel";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import {
  buildSemanticQARequestEnvelope,
  type SemanticQADraft,
} from "./semanticQaRequestModel";
import { getSemanticQACopyText } from "./semanticQaActions";
import {
  buildSemanticAnalysisRequest,
  buildSemanticPreviewRequest,
  buildSemanticSearchRequest,
  type SemanticSearchControlOverrides,
  type SemanticDiscoveryScope,
} from "./semanticDiscoveryRequestModel";
import { buildSemanticDiscoveryView } from "./semanticDiscoveryViewModel";
import {
  resolveSemanticSearchNavigation,
} from "./semanticDiscoveryNavigation";
import { createAiExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";

type LegacyIndexAction = "rebuild" | "pause" | "resume" | "clear";
type IndexAction = SemanticIndexCommand | LegacyIndexAction;

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
  const { selectedConversationId, selectAndLoad, selectAndLoadAtAnchor } = useChatCommander();
  const conversations = useChatStore((s) => s.conversations);
  const sseAbortRef = useRef<AbortController | null>(null);
  const activeQARef = useRef<{ streamId: string; aiMsgId: string } | null>(null);
  const indexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const semanticSearchRequestCounterRef = useRef(0);
  const semanticAnalysisRequestCounterRef = useRef(0);
  const semanticPreviewRequestCounterRef = useRef(0);
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
          clearIndexPolling(indexPollRef);
          store.setPhase("index_ready");
        } else if (status.status === "error") {
          clearIndexPolling(indexPollRef);
          store.setPhase("index_error");
          store.setError(status.error || "索引构建失败");
        } else if (Date.now() - startTime > INDEX_BUILD_TIMEOUT_MS) {
          clearIndexPolling(indexPollRef);
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

  const saveConfig = useCallback(async (draft: SemanticSetupDraft) => {
    try {
      const result = await saveSemanticConfigWithRefetch(draft, {
        saveConfig: (payload) => setSemanticConfig(payload, semanticDiagnostics("POST")),
        fetchConfig: () => fetchSemanticConfig(semanticDiagnostics()),
      });
      store.setConfig(result.config);
      store.setPhase("index_not_built");
    } catch (error) {
      store.setError(translateError(String(error)));
      throw error;
    }
  }, [store]);

  const testConnection = useCallback(async (
    draftOrProvider: SemanticSetupDraft | string,
    cfg: Record<string, string> = {},
  ) => {
    try {
      if (typeof draftOrProvider === "string") {
        return await testLLMConnection(draftOrProvider, cfg, semanticDiagnostics("POST"));
      }
      const payload = buildConnectionTestPayload(draftOrProvider);
      return await testLLMConnection(payload.provider, payload.config, semanticDiagnostics("POST"));
    } catch (error) {
      return { ok: false, success: false, message: String(error) };
    }
  }, []);

  const doIndexAction = useCallback(async (action: IndexAction) => {
    try {
      const intent = deriveIndexActionIntent(normalizeIndexCommand(action), store.indexStatus);
      const result = await runSemanticIndexActionWithRefetch(intent, {
        manageIndex: (sidecarAction) => manageIndex(sidecarAction, semanticDiagnostics("POST")),
        fetchIndexStatus: () => fetchIndexStatus(semanticDiagnostics()),
      });
      store.setIndexStatus(result.status);
      if (result.polling === "start") {
        store.setPhase("index_building");
        startIndexPolling();
      } else {
        clearIndexPolling(indexPollRef);
        applyIndexStatusPhase(result.status, store);
      }
    } catch (error) {
      store.setError(translateError(String(error)));
      throw error;
    }
  }, [store, startIndexPolling]);

  useEffect(() => {
    return () => {
      clearIndexPolling(indexPollRef);
      if (sseAbortRef.current) {
        sseAbortRef.current.abort();
        const activeQA = activeQARef.current;
        if (activeQA) {
          useAiStore.getState().stopQAStream(activeQA.streamId, activeQA.aiMsgId);
          activeQARef.current = null;
        }
      }
    };
  }, []);

  const stopQAStream = useCallback(() => {
    const activeQA = activeQARef.current;
    if (activeQA) {
      useAiStore.getState().stopQAStream(activeQA.streamId, activeQA.aiMsgId);
      activeQARef.current = null;
    }
    sseAbortRef.current?.abort();
    sseAbortRef.current = null;
  }, []);

  const askQuestion = useCallback((
    draftOrQuery: string | SemanticQADraft,
    scope?: "contact" | "selected" | "all",
  ) => {
    const draft: SemanticQADraft = typeof draftOrQuery === "string"
      ? { query: draftOrQuery, scope }
      : draftOrQuery;
    const createdAt = Date.now();
    const envelope = buildSemanticQARequestEnvelope(draft, {
      currentChat,
      messages: useAiStore.getState().qaMessages,
      now: createdAt,
    });
    if (!envelope.request.query.trim()) return;

    const previousQA = activeQARef.current;
    if (previousQA) {
      useAiStore.getState().stopQAStream(previousQA.streamId, previousQA.aiMsgId);
      activeQARef.current = null;
    }
    sseAbortRef.current?.abort();
    const abortController = new AbortController();
    sseAbortRef.current = abortController;
    const streamId = createQAStreamId();

    const query = envelope.request.query;
    const userMsgId = `user-${createdAt}`;
    store.addQAMessage({
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: createdAt,
    });

    const aiMsgId = `ai-${createdAt}`;
    store.addQAMessage({
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: createdAt,
      isStreaming: true,
      completionStatus: "streaming",
      requestSnapshot: envelope.snapshot,
    });
    activeQARef.current = { streamId, aiMsgId };

    store.setQAError(null);
    store.setQAStatus("connecting");
    store.setActiveQAStream(streamId);

    const params: QARequest = envelope.request;

    const tokenBuffer = createTokenBuffer(50);

    streamQA(
      params,
      (event) => {
        if (!useAiStore.getState().isActiveQAStream(streamId)) return;
        if (event.type === "delta") {
          if (useAiStore.getState().qaStatus === "connecting") {
            store.setQAStatus("streaming");
          }
          tokenBuffer.feed(event.text, (text) => {
            useAiStore.getState().appendQATokenForStream(streamId, aiMsgId, text);
          });
        } else if (event.type === "done") {
          tokenBuffer.flush((text) => {
            if (text) useAiStore.getState().appendQATokenForStream(streamId, aiMsgId, text);
          });
          const aiStore = useAiStore.getState();
          if (!aiStore.isActiveQAStream(streamId)) return;
          const msgs = aiStore.qaMessages;
          const currentAnswer = msgs.find((m) => m.id === aiMsgId)?.content ?? "";
          const answer = currentAnswer || event.payload.answer;
          aiStore.completeQAMessageForStream(streamId, aiMsgId, {
            content: answer,
            evidence: event.payload.evidence,
            reason: event.payload.reason,
            sourceCount: sourceCountFromDonePayload(event.payload),
            metadata: event.payload.metadata,
          });
          activeQARef.current = null;
          if (sseAbortRef.current === abortController) sseAbortRef.current = null;
        } else if (event.type === "error") {
          tokenBuffer.flush((text) => {
            if (text) useAiStore.getState().appendQATokenForStream(streamId, aiMsgId, text);
          });
          if (!useAiStore.getState().isActiveQAStream(streamId)) return;
          const message = translateError(event.error || "ESEMANTIC_SSE_ERROR");
          useAiStore.getState().failQAStream(streamId, aiMsgId, message);
          activeQARef.current = null;
          if (sseAbortRef.current === abortController) sseAbortRef.current = null;
        }
      },
      (error) => {
        if (!useAiStore.getState().isActiveQAStream(streamId)) return;
        if (error.name === "AbortError") return;
        const message = translateError(error.message || "ESEMANTIC_SSE_ERROR");
        useAiStore.getState().failQAStream(streamId, aiMsgId, message);
        activeQARef.current = null;
        if (sseAbortRef.current === abortController) sseAbortRef.current = null;
      },
      abortController.signal,
      semanticDiagnostics("POST"),
    );
  }, [currentChat, store]);

  const retryQAMessage = useCallback((messageId: string) => {
    const message = useAiStore.getState().qaMessages.find((item) => item.id === messageId);
    const snapshot = message?.requestSnapshot;
    if (!snapshot) return;
    askQuestion({
      query: snapshot.query,
      scope: snapshot.scope,
      chat: snapshot.chat,
      chats: snapshot.chats,
      window: snapshot.window,
      entityOverride: snapshot.entityOverride,
      retrievalDepth: snapshot.retrievalDepth,
      sourceLimit: snapshot.sourceLimit,
      topN: snapshot.topN,
      includeHistory: snapshot.includeHistory,
    });
  }, [askQuestion]);

  const copyQAMessageAnswer = useCallback(async (messageId: string): Promise<boolean> => {
    const message = useAiStore.getState().qaMessages.find((item) => item.id === messageId);
    const text = getSemanticQACopyText(message, privacyOn);
    if (!text) return false;
    try {
      return await copyTextToClipboard(text);
    } catch {
      return false;
    }
  }, [privacyOn]);

  const openSemanticSearchResult = useCallback((result: {
    chat: string;
    chatLabel?: string;
    localId?: number;
  }) => {
    const target = resolveSemanticSearchNavigation({
      result,
      conversations,
      privacyOn,
    });
    if (target.status !== "ready") return target;
    if (target.localId && target.localId > 0) {
      void selectAndLoadAtAnchor({
        conversationId: target.conversationId,
        chat: target.chat,
        anchor: {
          source: "ai",
          chat: target.chat,
          messageId: "",
          localId: target.localId,
          timestamp: null,
          time: null,
        },
        returnToSearch: {
          returnRoute: "/ai",
          activeResultId: `semantic-${target.localId}`,
          querySnapshot: {
            query: store.searchQuery,
            filter: "all",
            scope: "current",
            scopeChat: target.chat,
          },
          sourceConversationId: target.conversationId,
        },
      });
      return target;
    }

    void selectAndLoad(target.conversationId, target.chat);
    return target;
  }, [conversations, privacyOn, selectAndLoad, selectAndLoadAtAnchor, store.searchQuery]);

  const recentDiscoveryChats = useMemo(() => conversations
    .filter((conversation) => conversation.username)
    .slice(0, 8)
    .map((conversation) => ({
      chat: conversation.username,
      label: privacyOn
        ? "已隐藏会话"
        : conversation.displayName || conversation.username,
    })), [conversations, privacyOn]);
  const discoverySearchContextRef = useRef({ currentChat, recentDiscoveryChats });

  useEffect(() => {
    discoverySearchContextRef.current = { currentChat, recentDiscoveryChats };
  }, [currentChat, recentDiscoveryChats]);

  const semanticSearch = useCallback(async (
    query: string,
    scope?: SemanticDiscoveryScope,
    overrides: SemanticSearchControlOverrides = {},
  ) => {
    const aiStore = useAiStore.getState();
    const context = discoverySearchContextRef.current;
    const searchScope = scope ?? aiStore.discoverySearchScope;
    aiStore.setSearchQuery(query);
    if (!query.trim()) {
      aiStore.setSearchResults(null);
      aiStore.setSearchError(null);
      return;
    }
    const requestId = nextSemanticRequestId("semantic-search", semanticSearchRequestCounterRef);
    aiStore.startSemanticSearchRequest(requestId);
    aiStore.setSearchError(null);
    try {
      const params: SemanticSearchRequest = buildSemanticSearchRequest({
        query,
        scope: searchScope,
        currentChat: context.currentChat,
        selectedChats: context.recentDiscoveryChats,
        window: overrides.window ?? aiStore.discoveryWindow,
        depth: overrides.depth ?? aiStore.discoveryDepth,
        sourceLimit: overrides.sourceLimit ?? aiStore.discoverySourceLimit,
        rerank: overrides.rerank ?? aiStore.discoveryRerank,
      });
      const results = await withOverloadRetry(() =>
        fetchSemanticSearch(params, semanticDiagnostics()),
      );
      useAiStore.getState().completeSemanticSearchRequest(requestId, results);
    } catch (error) {
      useAiStore.getState().failSemanticSearchRequest(requestId, translateError(String(error)));
    }
  }, []);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();
  useEffect(() => {
    debouncedSearchRef.current = debounce(semanticSearch, SEMANTIC_SEARCH_DEBOUNCE_MS);
    return () => { debouncedSearchRef.current?.cancel(); };
  }, [semanticSearch]);

  const debouncedSearch = useCallback((query: string, scope?: SemanticDiscoveryScope) => {
    debouncedSearchRef.current?.(query, scope);
  }, []);

  const loadAnalysis = useCallback(async () => {
    const request = buildSemanticAnalysisRequest({
      currentChat,
      window: store.discoveryWindow,
    });
    if (!request) return;

    const requestId = nextSemanticRequestId("semantic-analysis", semanticAnalysisRequestCounterRef);
    useAiStore.getState().startSemanticAnalysisRequest(requestId);

    try {
      const topics = await withOverloadRetry(() =>
        fetchSemanticTopics(request, semanticDiagnostics()),
      );
      useAiStore.getState().completeSemanticTopicsRequest(requestId, topics);
    } catch (error) {
      useAiStore.getState().failSemanticTopicsRequest(requestId, translateError(String(error)));
    }

    try {
      const profile = await withOverloadRetry(() =>
        fetchSemanticProfiles(request, semanticDiagnostics()),
      );
      useAiStore.getState().completeSemanticProfileRequest(requestId, profile);
    } catch (error) {
      useAiStore.getState().failSemanticProfileRequest(requestId, translateError(String(error)));
    }
  }, [currentChat, store]);

  const loadPreview = useCallback(async (overrides: {
    kind?: SemanticPreviewKind;
    limit?: number;
    offset?: number;
  } = {}) => {
    const aiStore = useAiStore.getState();
    const kind = overrides.kind ?? aiStore.previewKind;
    const limit = overrides.limit ?? aiStore.previewLimit;
    const offset = overrides.offset ?? aiStore.previewOffset;

    const requestId = nextSemanticRequestId("semantic-preview", semanticPreviewRequestCounterRef);
    aiStore.startSemanticPreviewRequest(requestId);
    try {
      const preview = await fetchSemanticIndexPreview(
        buildSemanticPreviewRequest({
          kind: kind === "all" ? undefined : kind,
          talker: aiStore.previewTalker || undefined,
          limit,
          offset,
        }),
        semanticDiagnostics(),
      );
      useAiStore.getState().completeSemanticPreviewRequest(requestId, preview);
    } catch (error) {
      useAiStore.getState().failSemanticPreviewRequest(
        requestId,
        translateError(error instanceof Error ? error.message : "加载语义索引预览失败"),
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
    void loadPreview({ offset: 0 });
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

  const previousChatRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const aiStore = useAiStore.getState();

    if (!currentChat) {
      previousChatRef.current = undefined;
      aiStore.setSearchResults(null);
      aiStore.setSearchQuery("");
      aiStore.cancelSemanticAnalysisRequest();
      return;
    }

    if (previousChatRef.current === currentChat) return;
    previousChatRef.current = currentChat;

    aiStore.setSearchResults(null);
    aiStore.setSearchQuery("");
    aiStore.cancelSemanticAnalysisRequest();
  }, [currentChat]);

  const latestAssistantMessage =
    [...store.qaMessages].reverse().find((message) => message.role === "assistant");
  const latestAssistantAnswer = latestAssistantMessage?.content ?? "";
  const latestUserQuestion = latestAssistantMessage
    ? [...store.qaMessages]
        .filter((message) => message.role === "user" && message.timestamp <= latestAssistantMessage.timestamp)
        .reverse()[0]?.content ?? ""
    : "";
  const businessExport = useBusinessExportCommander({
    source: "ai",
    formats: ["markdown"],
    defaultFormat: "markdown",
    disabledReason: getAiExportDisabledReason(latestAssistantMessage, store.qaStatus),
    buildArtifact: ({ privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createAiExportArtifact({
        format: "markdown",
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: currentChat ? "当前会话" : "AI 工作区",
        question: latestUserQuestion,
        answer: latestAssistantMessage?.content ?? "",
        evidence: (latestAssistantMessage?.evidence ?? []).map((item) => ({
          chat: evidenceText(item, ["talker_name", "chat_name", "chat", "source"], "证据来源"),
          time: evidenceText(item, ["time", "created_at", "timestamp"], ""),
          text: evidenceText(item, ["content", "text", "context", "summary"], ""),
          score: evidenceNumber(item, ["rerank_score", "score"]),
        })),
      }),
  });
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
    message: latestAssistantMessage,
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
  const semanticDiscoveryView = buildSemanticDiscoveryView({
    privacyOn,
    currentChatLabel: currentConv?.displayName || currentConv?.username,
    window: store.discoveryWindow,
    moduleReady: moduleView.kind === "ready",
    search: {
      query: store.searchQuery,
      loading: store.searchLoading,
      error: store.searchError,
      results: store.searchResults,
    },
    topics: {
      loading: store.topicsLoading,
      error: store.topicsError,
      data: store.topics,
    },
    profile: {
      loading: store.profileLoading,
      error: store.profileError,
      data: store.profile,
    },
  });
  const setupDraft = createSemanticSetupDraft(store.config);
  const setupView = deriveSemanticSetupView(setupDraft, store.config, privacyOn, store.indexStatus);
  const indexCenterView = deriveSemanticIndexCenterView(store.indexStatus);
  const qaRecentChats = useMemo(() => conversations
    .filter((conversation) => conversation.username)
    .slice(0, 8)
    .map((conversation, index) => ({
      chat: conversation.username,
      label: privacyOn
        ? `已隐藏会话 ${index + 1}`
        : conversation.displayName || conversation.username,
    })), [conversations, privacyOn]);

  return {
    phase: store.phase,
    config: store.config,
    indexStatus: store.indexStatus,
    moduleView,
    qaView,
    compactStatus,
    qaMessages: store.qaMessages,
    businessExport,
    qaRecentChats,
    qaLoading: store.qaLoading,
    qaStreaming: store.qaStreaming,
    qaStatus: store.qaStatus,
    qaError: store.qaError,
    searchQuery: store.searchQuery,
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
    previewLimit: store.previewLimit,
    previewOffset: store.previewOffset,
    previewTalker: store.previewTalker,
    previewTalkerOptions: recentDiscoveryChats,
    previewError: store.previewError,
    discoveryWindow: store.discoveryWindow,
    discoverySearchScope: store.discoverySearchScope,
    discoveryDepth: store.discoveryDepth,
    discoverySourceLimit: store.discoverySourceLimit,
    discoveryRerank: store.discoveryRerank,
    semanticPreviewView,
    semanticDiscoveryView,
    setupDraft,
    setupView,
    getSetupView: (draft: SemanticSetupDraft) =>
      deriveSemanticSetupView(draft, store.config, privacyOn, store.indexStatus),
    indexCenterView,
    getIndexActionIntent: (command: SemanticIndexCommand) =>
      deriveIndexActionIntent(command, store.indexStatus),
    error: store.error,
    initialize,
    saveConfig,
    testConnection,
    doIndexAction,
    askQuestion,
    retryQAMessage,
    copyQAMessageAnswer,
    openSemanticSearchResult,
    stopQAStream,
    debouncedSearch,
    semanticSearch,
    loadAnalysis,
    loadPreview,
    setPreviewKind,
    setPreviewLimit,
    setPreviewTalker,
    loadPreviousPreviewPage,
    loadNextPreviewPage,
    setDiscoveryWindow: store.setDiscoveryWindow,
    setDiscoverySearchScope: store.setDiscoverySearchScope,
    setDiscoveryDepth: store.setDiscoveryDepth,
    setDiscoverySourceLimit: store.setDiscoverySourceLimit,
    setDiscoveryRerank: store.setDiscoveryRerank,
    clearError: () => store.setError(null),
    clearQAMessages: store.clearQAMessages,
    reset: store.reset,
  };
}

function getAiExportDisabledReason(
  message: ReturnType<typeof useAiStore.getState>["qaMessages"][number] | undefined,
  qaStatus: string,
): string | null {
  if (qaStatus === "connecting" || qaStatus === "streaming" || message?.isStreaming) {
    return "AI 正在生成，完成后可导出。";
  }
  if (!message || (!message.content.trim() && (message.evidence?.length ?? 0) === 0)) {
    return "生成回答后可导出问答和证据。";
  }
  if (message.completionStatus === "failed") return "当前回答失败，请重试后再导出。";
  return null;
}

function evidenceText(
  item: Record<string, unknown>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function evidenceNumber(item: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function normalizeIndexCommand(action: IndexAction): SemanticIndexCommand {
  switch (action) {
    case "rebuild":
      return "build";
    case "clear":
      return "clearIndex";
    case "pause":
    case "resume":
    case "build":
    case "rebuildFromScratch":
    case "clearIndex":
      return action;
    default:
      return "build";
  }
}

function applyIndexStatusPhase(
  status: { status: string; state?: string; error?: string; lastError?: string },
  store: ReturnType<typeof useAiStore.getState>,
): void {
  const state = status.state ?? status.status;
  if (state === "ready") {
    store.setPhase("index_ready");
    return;
  }
  if (state === "error") {
    store.setPhase("index_error");
    store.setError(status.lastError || status.error || "语义索引不可用");
    return;
  }
  store.setPhase("index_not_built");
}

function clearIndexPolling(ref: MutableRefObject<ReturnType<typeof setInterval> | null>): void {
  if (!ref.current) return;
  clearInterval(ref.current);
  ref.current = null;
}

function createQAStreamId(): string {
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nextSemanticRequestId(prefix: string, ref: MutableRefObject<number>): string {
  ref.current += 1;
  return `${prefix}-${ref.current}`;
}

function sourceCountFromDonePayload(payload: { evidence: Array<Record<string, unknown>>; metadata: Record<string, unknown> }): number {
  const metadataSourceCount = numberMetadata(payload.metadata, "sourceCount")
    ?? numberMetadata(payload.metadata, "source_count");
  return metadataSourceCount ?? payload.evidence.length;
}

function numberMetadata(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
