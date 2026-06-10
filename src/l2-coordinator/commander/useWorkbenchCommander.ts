import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useChatCommander } from "./useChatCommander";
import { useStatsCommander } from "./useStatsCommander";
import { getWorkbenchLayout } from "./workbenchLayout";
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
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const chat = useChatCommander();
  const stats = useStatsCommander();
  const { conversations, loadConversations, selectedConversationId } = chat;
  const { loadAll } = stats;
  const [singlePaneView, setSinglePaneView] = useState<SinglePaneView>("detail");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const layout = getWorkbenchLayout(useViewportWidth());

  const currentConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );
  const currentChat = currentConversation?.username ?? "";
  const returnToSearchRoute = chat.returnToSearch?.returnRoute ?? "";
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
  }, []);

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
    if (!returnToSearchRoute) return;
    navigate(returnToSearchRoute);
  }, [navigate, returnToSearchRoute]);

  return {
    chat,
    stats,
    layout,
    singlePaneView: resolvedSinglePaneView,
    conversationListAsMain,
    currentConversation,
    toolbarConversationTitle: formatWorkbenchConversationTitle(currentConversation, privacyOn),
    privacyOn,
    currentChat,
    inspectorOpen,
    inspectorTitle: getConversationInspectorTitle({ hasConversation: Boolean(currentConversation) }),
    openConversationList,
    handleConversationOpened,
    retryStats,
    openInspector: () => setInspectorOpen(true),
    closeInspector: () => setInspectorOpen(false),
    openSearch: () => openScopedWorkspace("search"),
    openAnalytics: () => openScopedWorkspace("analytics"),
    openMedia: () => openScopedWorkspace("media"),
    openAi: () => openScopedWorkspace("ai"),
    openGraph: () => openScopedWorkspace("graph"),
    returnToSearchResults,
  };
}
