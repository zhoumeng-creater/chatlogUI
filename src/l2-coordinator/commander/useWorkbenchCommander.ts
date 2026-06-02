import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useAiCommander } from "./useAiCommander";
import { useChatCommander } from "./useChatCommander";
import { useGraphCommander } from "./useGraphCommander";
import { useSearchCommander } from "./useSearchCommander";
import { useStatsCommander } from "./useStatsCommander";
import { getWorkbenchLayout } from "./workbenchLayout";
import {
  getInspectorTitle,
  isInspectorModule,
  resolveSinglePaneView,
  shouldRenderConversationListAsMain,
  buildWorkbenchModuleBadges,
  buildWorkbenchRailItems,
  formatWorkbenchConversationTitle,
  type SinglePaneView,
  type WorkbenchModule,
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
  const appPhase = useAppStore((state) => state.appPhase);
  const sidecarStatus = useAppStore((state) => state.sidecarStatus);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);

  const chat = useChatCommander();
  const search = useSearchCommander();
  const stats = useStatsCommander();
  const ai = useAiCommander();
  const graph = useGraphCommander();
  const {
    conversations,
    loadConversations,
    selectedConversationId,
    selectAndLoad,
  } = chat;
  const { loadAll } = stats;
  const {
    data: graphData,
    focusOnChat,
    focusOnGraphFromSearch,
    openGraph,
    selectNode,
    selectedNodeId,
  } = graph;

  const [activeModule, setActiveModule] = useState<WorkbenchModule>("chat");
  const [singlePaneView, setSinglePaneView] = useState<SinglePaneView>("detail");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const viewportWidth = useViewportWidth();
  const layout = getWorkbenchLayout(viewportWidth);

  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const currentChat = currentConversation?.username ?? "";
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
  const inspectorModule = activeModule === "chat" || activeModule === "settings"
    ? "stats"
    : activeModule;

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

  useEffect(() => {
    if (!selectedNodeId || !graphData) return;
    const node = graphData.nodes.find((item) => item.id === selectedNodeId);
    if (!node) return;

    const matchedConversation = useChatStore.getState().conversations.find(
      (conversation) =>
        conversation.displayName === node.name || conversation.username === node.name,
    );

    if (matchedConversation) {
      selectAndLoad(matchedConversation.id, matchedConversation.username);
      setSinglePaneView("detail");
      setActiveModule("chat");
    }

    selectNode(null);
  }, [selectedNodeId, graphData, selectNode, selectAndLoad]);

  useEffect(() => {
    if (currentConversation?.displayName) {
      focusOnChat(currentConversation.displayName);
    }
  }, [currentConversation?.displayName, focusOnChat]);

  const searchQuery = useSearchStore((state) => state.query);
  useEffect(() => {
    if (searchQuery) {
      focusOnGraphFromSearch(searchQuery);
    }
  }, [searchQuery, focusOnGraphFromSearch]);

  const openConversationList = useCallback(() => {
    setSinglePaneView("list");
    setActiveModule("chat");
    setInspectorOpen(false);
  }, []);

  const handleConversationOpened = useCallback(() => {
    setSinglePaneView("detail");
    setActiveModule("chat");
  }, []);

  const selectModule = useCallback(
    (module: WorkbenchModule) => {
      if (module !== "ai") {
        ai.stopQAStream();
      }
      if (module !== "graph" && graph.loading) {
        graph.cancelGraphLoad();
      }

      setActiveModule(module);

      if (module === "settings") {
        navigate("/settings");
        return;
      }

      if (module === "chat") {
        setInspectorOpen(false);
        return;
      }

      if (module === "graph") {
        void openGraph();
      }

      if (isInspectorModule(module)) {
        setInspectorOpen(true);
      }
    },
    [ai, graph, openGraph, navigate],
  );

  const moduleBadges = buildWorkbenchModuleBadges({
    semanticStatus: ai.compactStatus,
    graphView: graph.moduleView,
  });
  const railItems = buildWorkbenchRailItems(activeModule, moduleBadges);

  const retryStats = useCallback(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  return {
    appPhase,
    sidecarStatus,
    errorMessage,
    chat,
    search,
    stats,
    ai,
    graph,
    layout,
    activeModule,
    inspectorModule,
    singlePaneView: resolvedSinglePaneView,
    conversationListAsMain,
    currentConversation,
    toolbarConversationTitle: formatWorkbenchConversationTitle(currentConversation, privacyOn),
    privacyOn,
    currentChat,
    inspectorOpen,
    inspectorTitle: getInspectorTitle(inspectorModule),
    moduleBadges,
    railItems,
    openConversationList,
    handleConversationOpened,
    selectModule,
    retryStats,
    closeInspector: () => {
      if (activeModule === "ai") {
        ai.stopQAStream();
      }
      if (activeModule === "graph" && graph.loading) {
        graph.cancelGraphLoad();
      }
      setInspectorOpen(false);
    },
    goSetup: () => navigate("/"),
  };
}
