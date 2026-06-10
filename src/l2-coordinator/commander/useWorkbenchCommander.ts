import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useAiCommander } from "./useAiCommander";
import { useChatCommander } from "./useChatCommander";
import { useGraphCommander } from "./useGraphCommander";
import { useMediaCommander } from "./useMediaCommander";
import { useDeveloperToolsCommander } from "./useDeveloperToolsCommander";
import { useSearchCommander } from "./useSearchCommander";
import { useSnsCommander } from "./useSnsCommander";
import { useStatsCommander } from "./useStatsCommander";
import { getWorkbenchLayout } from "./workbenchLayout";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";
import { deriveDeveloperEntryPolicy } from "./developerEntryViewModel";
import {
  getInspectorTitle,
  isInspectorModule,
  resolveSinglePaneView,
  resolveWorkbenchLayoutForModule,
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
  const developerMode = useSettingsStore((state) => state.settings.developerMode);
  const setupProfile = useSetupStore((state) => state.profile);
  const activeService = useMemo(
    () => getActiveChatlogServiceSummary(setupProfile),
    [setupProfile],
  );

  const chat = useChatCommander();
  const search = useSearchCommander();
  const stats = useStatsCommander();
  const media = useMediaCommander();
  const { loadMediaModule } = media;
  const sns = useSnsCommander();
  const { loadSnsModule } = sns;
  const developer = useDeveloperToolsCommander();
  const { loadDeveloperTools } = developer;
  const stopHookStream = developer.hook.stopStream;
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
  const baseLayout = getWorkbenchLayout(viewportWidth);
  const developerEntryPolicy = useMemo(
    () =>
      deriveDeveloperEntryPolicy({
        developerMode,
        developerEntryOverride: import.meta.env.VITE_ENABLE_DEVELOPER_ENTRY === "true",
        activeModule,
      }),
    [activeModule, developerMode],
  );
  const safeActiveModule = developerEntryPolicy.safeActiveModule;
  const layout = resolveWorkbenchLayoutForModule(baseLayout, safeActiveModule);

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
  const inspectorModule = safeActiveModule === "chat" || safeActiveModule === "settings" || safeActiveModule === "graph"
    ? "stats"
    : safeActiveModule;

  useEffect(() => {
    if (safeActiveModule !== activeModule) {
      stopHookStream();
      setInspectorOpen(false);
      setActiveModule(safeActiveModule);
    }
  }, [activeModule, safeActiveModule, stopHookStream]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  useEffect(() => {
    if (safeActiveModule === "media" && currentChat) {
      void loadMediaModule(currentChat, currentConversation?.isGroup ?? false);
    }
  }, [safeActiveModule, currentChat, currentConversation?.isGroup, loadMediaModule]);

  useEffect(() => {
    if (safeActiveModule === "sns") {
      void loadSnsModule();
    }
  }, [safeActiveModule, loadSnsModule]);

  useEffect(() => {
    if (developerEntryPolicy.renderDeveloperInspector) {
      void loadDeveloperTools();
    }
  }, [developerEntryPolicy.renderDeveloperInspector, loadDeveloperTools]);

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
      if (module !== "developer") {
        stopHookStream();
      }
      if (module === "developer" && !developerEntryPolicy.visible) {
        stopHookStream();
        setActiveModule("chat");
        setInspectorOpen(false);
        return;
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
        setInspectorOpen(false);
        return;
      }

      if (isInspectorModule(module)) {
        setInspectorOpen(true);
      }
    },
    [ai, developerEntryPolicy.visible, graph, openGraph, navigate, stopHookStream],
  );

  const moduleBadges = buildWorkbenchModuleBadges({
    semanticStatus: ai.compactStatus,
    graphView: graph.moduleView,
    media: {
      status: media.status,
      unreadTotal: media.unread.total,
      attachmentCount: media.attachments.length + media.favorites.length + media.newMessages.length,
    },
    sns: {
      status: sns.status,
      feedCount: sns.feed.length,
      notificationCount: sns.notifications.length,
    },
    developer: {
      status: developer.dbFilesStatus,
      dbFileCount: developer.dbFiles.length,
      runnerHistoryCount: developer.runnerHistory.length,
    },
  });
  const railItems = buildWorkbenchRailItems(safeActiveModule, moduleBadges, {
    includeDeveloperTools: developerEntryPolicy.includeRailModule,
  });

  const retryStats = useCallback(() => {
    if (currentChat) {
      loadAll(currentChat);
    }
  }, [currentChat, loadAll]);

  return {
    appPhase,
    sidecarStatus,
    errorMessage,
    serviceLabel: activeService.serviceLabel,
    chat,
    search,
    stats,
    media,
    sns,
    developer,
    ai,
    graph,
    layout,
    activeModule: safeActiveModule,
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
    developerEntryPolicy,
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
      if (activeModule === "developer") {
        stopHookStream();
      }
      setInspectorOpen(false);
    },
    goSetup: () => navigate("/"),
  };
}
