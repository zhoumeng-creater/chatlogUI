import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useWorkspacePreferenceStore } from "@l2/data-clerk/stores/useWorkspacePreferenceStore";
import { useChatCommander } from "./useChatCommander";
import { useStatsCommander } from "./useStatsCommander";
import { getWorkbenchLayout, type WorkbenchPanel } from "./workbenchLayout";
import {
  buildScopedWorkspaceRoute,
  getConversationInspectorTitle,
} from "./workbenchInformationArchitecture";
import {
  formatWorkbenchConversationTitle,
  resolveSinglePaneView,
  shouldRenderConversationListAsMain,
  type SinglePaneView,
} from "./workbenchViewModel";
import { buildChatReadingState } from "./chatReadingState";
import {
  buildWorkspaceCommandBar,
  type WorkspaceCommandId,
} from "./workspaceCommandBarModel";
import { createConversationExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import { copyTextToClipboard } from "@/l4-atom/system";
import {
  deriveSelectedMessages,
  getSelectionPrivacySummary,
} from "./chatSelectionModel";
import {
  buildConversationInlineSearchModel,
  getNextConversationSearchIndex,
} from "./conversationInlineSearchModel";
import {
  DEFAULT_MESSAGE_SELECTION_FILTERS,
  buildMessageSelectionFilterModel,
  selectMessageIdsByFilter,
  validateMessageSelectionFilter,
  type MessageSelectionFilterState,
} from "./conversationSelectionFilterModel";
import { validateDateJumpInput } from "./conversationDateJumpModel";
import {
  buildMessageActionModel,
  getSafeRawFieldRows,
  serializeMessageAction,
  type MessageActionId,
} from "./messageActionModel";
import type { ChatMessage } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { deriveTranscriptPositionModel } from "./transcriptPositionModel";
import {
  getEffectiveRailMode,
  getWorkspaceRailWidth,
} from "./workspacePreferenceModel";
import {
  buildWorkspaceReturnContext,
  getWorkspaceReturnSourceForChatAnchor,
} from "./workspaceReturnContextModel";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
} from "./actionableEmptyStateModel";

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1080 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

export function useWorkbenchCommander() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const preferences = useWorkspacePreferenceStore((state) => state.preferences);
  const preferencesLoaded = useWorkspacePreferenceStore((state) => state.loaded);
  const loadWorkspacePreferences = useWorkspacePreferenceStore((state) => state.loadFromStorage);
  const setPanelWidths = useWorkspacePreferenceStore((state) => state.setPanelWidths);
  const setStoredInspectorOpen = useWorkspacePreferenceStore((state) => state.setInspectorOpen);
  const chat = useChatCommander();
  const stats = useStatsCommander();
  const { conversations, loadConversations, selectedConversationId } = chat;
  const { loadAll } = stats;
  const selectedMessages = useMemo(() => deriveSelectedMessages({
    state: {
      mode: chat.selectionMode,
      selectedMessageIds: chat.selectedMessageIds,
      lastSelectedMessageId: chat.lastSelectedMessageId,
      status: chat.selectionStatus,
    },
    messages: chat.messages,
  }), [
    chat.lastSelectedMessageId,
    chat.messages,
    chat.selectedMessageIds,
    chat.selectionMode,
    chat.selectionStatus,
  ]);
  const selectionSummary = useMemo(() => getSelectionPrivacySummary({
    state: {
      mode: chat.selectionMode,
      selectedMessageIds: chat.selectedMessageIds,
      lastSelectedMessageId: chat.lastSelectedMessageId,
      status: chat.selectionStatus,
    },
    messages: chat.messages,
    privacyOn,
  }), [
    chat.lastSelectedMessageId,
    chat.messages,
    chat.selectedMessageIds,
    chat.selectionMode,
    chat.selectionStatus,
    privacyOn,
  ]);
  const [conversationSearchOpen, setConversationSearchOpen] = useState(false);
  const [conversationSearchQuery, setConversationSearchQuery] = useState("");
  const [conversationSearchActiveIndex, setConversationSearchActiveIndex] = useState(0);
  const conversationSearch = useMemo(() => buildConversationInlineSearchModel({
    query: conversationSearchQuery,
    messages: chat.messages,
    activeIndex: conversationSearchActiveIndex,
  }), [chat.messages, conversationSearchActiveIndex, conversationSearchQuery]);
  const [dateJumpOpen, setDateJumpOpen] = useState(false);
  const [dateJumpValue, setDateJumpValue] = useState("");
  const [dateJumpError, setDateJumpError] = useState<string | null>(null);
  const [selectionFilters, setSelectionFilters] = useState<MessageSelectionFilterState>(
    DEFAULT_MESSAGE_SELECTION_FILTERS,
  );
  const selectionFilterModel = useMemo(() => buildMessageSelectionFilterModel({
    messages: chat.messages,
    privacyOn,
  }), [chat.messages, privacyOn]);
  const selectionFilterError = useMemo(
    () => validateMessageSelectionFilter(selectionFilters),
    [selectionFilters],
  );
  const [singlePaneView, setSinglePaneView] = useState<SinglePaneView>("detail");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const viewportWidth = useViewportWidth();
  const effectiveRailMode = getEffectiveRailMode(preferences.railMode, viewportWidth);
  const availableWorkbenchWidth = Math.max(
    0,
    viewportWidth - getWorkspaceRailWidth(effectiveRailMode),
  );
  const layout = getWorkbenchLayout(viewportWidth, {
    panelWidths: preferences.panelWidths,
    availableWidth: availableWorkbenchWidth,
  });

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );
  const currentChat = currentConversation?.username ?? "";
  const conversationExportDisabledReason = getConversationExportDisabledReason({
    hasConversation: Boolean(currentConversation),
    messagesStatus: chat.messagesStatus,
  });
  const conversationExport = useBusinessExportCommander({
    source: "conversation",
    formats: ["markdown", "json"],
    defaultFormat: "markdown",
    disabledReason: conversationExportDisabledReason,
    buildArtifact: ({ format, privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createConversationExportArtifact({
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: "当前会话",
        totalCount: chat.messagesTotalCount,
        loadedCount: chat.messages.length,
        messages: chat.messages.map((message) => ({
          id: message.id,
          sender: message.senderName || message.sender || message.talkerName || message.talker || "",
          content: message.content || "",
          time: message.time,
          type: message.type,
        })),
      }),
  });
  const selectedFragmentExport = useBusinessExportCommander({
    source: "conversation_selection",
    formats: ["markdown", "json"],
    defaultFormat: "markdown",
    disabledReason: selectedMessages.length === 0 ? "先选择要导出的消息。" : null,
    buildArtifact: ({ format, privacyOn: exportPrivacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createConversationExportArtifact({
        source: "conversation_selection",
        format,
        privacyOn: exportPrivacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: `当前会话 · 已选 ${selectedMessages.length.toLocaleString()} 条`,
        totalCount: selectedMessages.length,
        loadedCount: selectedMessages.length,
        messages: selectedMessages.map((message) => ({
          id: message.id,
          sender: message.senderName || message.sender || message.talkerName || message.talker || "",
          content: message.content || "",
          time: message.time,
          type: message.mediaType || message.type,
        })),
      }),
  });
  const chatReadingState = useMemo(() => buildChatReadingState({
    conversation: currentConversation,
    messagesStatus: chat.messagesStatus,
    messagesError: chat.messagesError,
    messagesHasMore: chat.messagesHasMore,
    messagesCount: chat.messages.length,
  }), [
    chat.messages.length,
    chat.messagesError,
    chat.messagesHasMore,
    chat.messagesStatus,
    currentConversation,
  ]);
  const returnToSearchRoute = chat.returnToSearch?.returnRoute ?? "";
  const returnContext = chat.returnToSearch
    ? buildWorkspaceReturnContext({
        source: getWorkspaceReturnSourceForChatAnchor(chat.activeAnchor?.source),
        returnRoute: returnToSearchRoute,
      })
    : buildWorkspaceReturnContext({
        source: params.get("source"),
        returnRoute: params.get("returnRoute"),
      });
  const conversationListEmptyState = useMemo(() => bindActionableEmptyStateActions(
    buildActionableEmptyState({
      variant: chat.conversationListQuery.trim() || chat.conversationListFilter !== "all"
        ? "filters-no-results"
        : "no-conversation-selected",
      readiness: readyWorkbenchEmptyStateReadiness(false),
      privacyOn,
    }),
    chat.conversationListQuery.trim() || chat.conversationListFilter !== "all"
      ? ["clear-filters", "refresh"]
      : ["refresh"],
  ), [chat.conversationListFilter, chat.conversationListQuery, privacyOn]);
  const messageListEmptyStates = useMemo(() => ({
    noConversation: {
      ...bindActionableEmptyStateActions(buildActionableEmptyState({
        variant: "no-conversation-selected",
        readiness: readyWorkbenchEmptyStateReadiness(false),
        privacyOn,
      }), ["choose-conversation"]),
      description: chatReadingState.description,
    },
    conversationEmpty: {
      ...bindActionableEmptyStateActions(buildActionableEmptyState({
        variant: "conversation-empty",
        readiness: readyWorkbenchEmptyStateReadiness(true),
        privacyOn,
      }), ["refresh", "choose-conversation"]),
      title: chatReadingState.title,
      reason: chatReadingState.description,
    },
  }), [chatReadingState.description, chatReadingState.title, privacyOn]);
  const resolvedSinglePaneView = resolveSinglePaneView(
    layout.mode,
    selectedConversationId,
    singlePaneView,
  );
  const conversationListAsMain = shouldRenderConversationListAsMain(
    layout,
    selectedConversationId,
    singlePaneView,
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!preferencesLoaded) loadWorkspacePreferences();
  }, [loadWorkspacePreferences, preferencesLoaded]);

  useEffect(() => {
    if (preferencesLoaded) {
      setInspectorOpen(preferences.inspectorOpen);
    }
  }, [preferences.inspectorOpen, preferencesLoaded]);

  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  useEffect(() => {
    if (layout.mode === "single" && !selectedConversationId) {
      setSinglePaneView("list");
    }
  }, [layout.mode, selectedConversationId]);

  const openConversationList = useCallback(() => {
    setSinglePaneView("list");
    setInspectorOpen(false);
    setStoredInspectorOpen(false);
  }, [setStoredInspectorOpen]);

  const handleConversationOpened = useCallback(() => {
    setSinglePaneView("detail");
  }, []);

  const retryStats = useCallback(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  const openScopedWorkspace = useCallback(
    (destination: "search" | "analytics" | "media" | "ai" | "graph") => {
      const graphFocus = destination === "graph"
        ? (currentConversation?.displayName ?? currentChat) || undefined
        : undefined;
      const route = buildScopedWorkspaceRoute(destination, {
        scope: currentChat ? "currentChat" : "all",
        chat: currentChat || undefined,
        focus: graphFocus,
        source: "workbench",
      });
      navigate(route);
    },
    [currentChat, currentConversation?.displayName, navigate],
  );

  const returnToSearchResults = useCallback(() => {
    if (!returnContext?.returnRoute) return;
    navigate(returnContext.returnRoute);
  }, [navigate, returnContext?.returnRoute]);

  const copySelectedMessagesAsMarkdown = useCallback(async () => {
    const fragments = selectedMessages
      .map((message) => serializeMessageAction({
        actionId: "copy-markdown-quote",
        message,
        privacyOn,
        unmaskedConfirmed: false,
      }))
      .filter((result) => result.ok)
      .map((result) => result.text);

    if (fragments.length === 0) {
      chat.setSelectionStatus("没有可复制的选中消息。");
      return;
    }

    const copied = await copyTextToClipboard(fragments.join("\n\n"));
    chat.setSelectionStatus(copied
      ? `已复制 ${fragments.length.toLocaleString()} 条选中消息。`
      : "复制失败，请检查剪贴板权限。");
  }, [chat, privacyOn, selectedMessages]);

  const handleMessageAction = useCallback(async (message: ChatMessage, actionId: MessageActionId) => {
    if (actionId === "jump-to-time") {
      chat.setSelectionStatus(message.time ? `已定位到 ${message.time} 附近。` : "这条消息没有可定位时间。");
      return;
    }
    if (actionId === "find-similar") {
      chat.setSelectionStatus("当前后端暂不支持同类消息搜索。");
      return;
    }
    if (actionId === "view-safe-raw-fields") return;

    const serialized = serializeMessageAction({
      actionId,
      message,
      privacyOn,
      unmaskedConfirmed: false,
    });
    if (!serialized.ok) {
      chat.setSelectionStatus(serialized.disabledReason ?? "当前消息操作不可用。");
      return;
    }

    const copied = await copyTextToClipboard(serialized.text);
    chat.setSelectionStatus(copied ? "已复制消息内容。" : "复制失败，请检查剪贴板权限。");
  }, [chat, privacyOn]);

  const getMessageActionModel = useCallback((message: ChatMessage) => buildMessageActionModel({
    message,
    privacyOn,
    similarSearchSupported: false,
  }), [privacyOn]);

  const getMessageSafeRawFieldRows = useCallback((message: ChatMessage) =>
    getSafeRawFieldRows(message), []);

  const commandBar = useMemo(() => buildWorkspaceCommandBar({
    hasConversation: Boolean(currentConversation),
    inspectorMode: layout.inspectorMode,
    exportDisabledReason: conversationExportDisabledReason,
  }), [conversationExportDisabledReason, currentConversation, layout.inspectorMode]);

  const resizePanel = useCallback((panel: WorkbenchPanel, value: number) => {
    setPanelWidths({ [panel]: value });
  }, [setPanelWidths]);

  const resetPanel = useCallback((panel: WorkbenchPanel) => {
    const splitter = layout.splitters.find((item) => item.panel === panel);
    if (splitter) {
      setPanelWidths({ [panel]: splitter.defaultValue });
    }
  }, [layout.splitters, setPanelWidths]);

  const openInspector = useCallback(() => {
    setInspectorOpen(true);
    setStoredInspectorOpen(true);
  }, [setStoredInspectorOpen]);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    setStoredInspectorOpen(false);
  }, [setStoredInspectorOpen]);

  const openSearch = useCallback(() => {
    setConversationSearchOpen(true);
    setConversationSearchActiveIndex(0);
  }, []);
  const closeConversationSearch = useCallback(() => {
    setConversationSearchOpen(false);
    setConversationSearchQuery("");
    setConversationSearchActiveIndex(0);
  }, []);
  const updateConversationSearchQuery = useCallback((query: string) => {
    setConversationSearchQuery(query);
    setConversationSearchActiveIndex(0);
  }, []);
  const moveConversationSearch = useCallback((direction: "previous" | "next") => {
    setConversationSearchActiveIndex((currentIndex) => getNextConversationSearchIndex({
      currentIndex,
      matchCount: conversationSearch.matchCount,
      direction,
    }));
  }, [conversationSearch.matchCount]);
  const openFullSearch = useCallback(() => openScopedWorkspace("search"), [openScopedWorkspace]);
  const updateSelectionFilters = useCallback((filters: Partial<MessageSelectionFilterState>) => {
    setSelectionFilters((current) => ({ ...current, ...filters }));
  }, []);
  const applySelectionFilters = useCallback(() => {
    const error = validateMessageSelectionFilter(selectionFilters);
    if (error) {
      chat.setSelectionStatus(error);
      return;
    }
    const ids = selectMessageIdsByFilter({
      messages: chat.messages,
      senderOptions: selectionFilterModel.senderOptions,
      filters: selectionFilters,
    });
    if (ids.length === 0) {
      chat.setSelectionStatus("当前已加载消息中没有符合范围的消息。");
      return;
    }
    chat.selectVisibleMessages(ids);
    chat.setSelectionStatus(`已按范围选择 ${ids.length.toLocaleString()} 条已加载消息。`);
  }, [chat, selectionFilterModel.senderOptions, selectionFilters]);
  const openDateJump = useCallback(() => {
    setDateJumpOpen(true);
    setDateJumpError(null);
  }, []);
  const closeDateJump = useCallback(() => {
    setDateJumpOpen(false);
    setDateJumpError(null);
  }, []);
  const confirmDateJump = useCallback(async () => {
    const error = validateDateJumpInput(dateJumpValue);
    if (error) {
      setDateJumpError(error);
      return;
    }
    if (!currentChat) {
      setDateJumpError("先选择一个会话。");
      return;
    }
    const count = await chat.loadHistoryAtDate(currentChat, dateJumpValue);
    if (count === null) {
      setDateJumpError("日期跳转失败，请稍后重试。");
      return;
    }
    setDateJumpOpen(false);
    setDateJumpError(null);
    chat.setSelectionStatus(count > 0
      ? `已跳转到 ${dateJumpValue}，加载 ${count.toLocaleString()} 条附近消息。`
      : `${dateJumpValue} 没有找到消息。`);
  }, [chat, currentChat, dateJumpValue]);
  const openAnalytics = useCallback(() => openScopedWorkspace("analytics"), [openScopedWorkspace]);
  const openMedia = useCallback(() => openScopedWorkspace("media"), [openScopedWorkspace]);
  const openAi = useCallback(() => openScopedWorkspace("ai"), [openScopedWorkspace]);
  const openGraph = useCallback(() => openScopedWorkspace("graph"), [openScopedWorkspace]);

  const handleCommandBarAction = useCallback((id: WorkspaceCommandId) => {
    if (id === "search-current") {
      openSearch();
      return;
    }
    if (id === "details") {
      openInspector();
      return;
    }
    if (id === "export-current") {
      conversationExport.action.onClick();
      return;
    }
    if (id === "jump-date") {
      openDateJump();
    }
  }, [conversationExport.action, openDateJump, openInspector, openSearch]);

  return {
    chat,
    stats,
    layout,
    singlePaneView: resolvedSinglePaneView,
    conversationListAsMain,
    currentConversation,
    chatReadingState,
    toolbarConversationTitle: formatWorkbenchConversationTitle(currentConversation, privacyOn),
    privacyOn,
    currentChat,
    inspectorOpen,
    inspectorTitle: getConversationInspectorTitle({ hasConversation: Boolean(currentConversation) }),
    commandBar,
    conversationListEmptyState,
    messageListEmptyStates,
    conversationExport,
    selectedFragmentExport,
    selectedMessages,
    selectionSummary,
    selectionFilters,
    selectionFilterModel,
    selectionFilterError,
    conversationSearch: {
      open: conversationSearchOpen,
      query: conversationSearchQuery,
      matchCount: conversationSearch.matchCount,
      activeIndex: conversationSearch.activeIndex,
      activeMessageId: conversationSearchOpen ? conversationSearch.activeMessageId : null,
      statusText: conversationSearch.statusText,
      onQueryChange: updateConversationSearchQuery,
      onPrevious: () => moveConversationSearch("previous"),
      onNext: () => moveConversationSearch("next"),
      onClose: closeConversationSearch,
      onOpenFullSearch: openFullSearch,
    },
    dateJump: {
      open: dateJumpOpen,
      value: dateJumpValue,
      error: dateJumpError,
      onValueChange: setDateJumpValue,
      onConfirm: confirmDateJump,
      onClose: closeDateJump,
    },
    returnContext,
    openConversationList,
    handleConversationOpened,
    retryStats,
    openInspector,
    closeInspector,
    openSearch,
    openAnalytics,
    openMedia,
    openAi,
    openGraph,
    handleCommandBarAction,
    resizePanel,
    resetPanel,
    returnToSearchResults,
    copySelectedMessagesAsMarkdown,
    updateSelectionFilters,
    applySelectionFilters,
    handleMessageAction,
    deriveTranscriptPositionModel,
    getMessageActionModel,
    getMessageSafeRawFieldRows,
  };
}

function readyWorkbenchEmptyStateReadiness(hasCurrentConversation: boolean) {
  return {
    serviceConfigured: true,
    httpReady: true,
    dbReady: true,
    hasCurrentConversation,
  };
}

function getConversationExportDisabledReason({
  hasConversation,
  messagesStatus,
}: {
  hasConversation: boolean;
  messagesStatus: string;
}): string | null {
  if (!hasConversation) return "先选择一个会话。";
  if (messagesStatus === "loading" || messagesStatus === "idle") {
    return "当前会话消息加载完成后可导出。";
  }
  if (messagesStatus === "error") {
    return "当前会话消息加载失败，请重试后再导出。";
  }
  return null;
}
