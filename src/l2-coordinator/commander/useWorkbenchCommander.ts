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
import {
  getEffectiveRailMode,
  getWorkspaceRailWidth,
} from "./workspacePreferenceModel";
import {
  buildWorkspaceReturnContext,
  getWorkspaceReturnSourceForChatAnchor,
} from "./workspaceReturnContextModel";

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

  const openSearch = useCallback(() => openScopedWorkspace("search"), [openScopedWorkspace]);
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
    }
  }, [conversationExport.action, openInspector, openSearch]);

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
    conversationExport,
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
