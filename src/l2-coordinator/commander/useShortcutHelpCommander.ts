import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAiStore } from "@l2/data-clerk/stores/useAiStore";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import { useGraphStore } from "@l2/data-clerk/stores/useGraphStore";
import { useSearchStore } from "@l2/data-clerk/stores/useSearchStore";
import {
  buildShortcutHelpCatalog,
  getShortcutContextId,
  isEditableShortcutTarget,
  shouldHandleShortcutHelpKey,
  type ShortcutHelpCatalog,
  type ShortcutHelpKeyEventLike,
} from "./shortcutCatalog";

interface UseShortcutHelpCommanderInput {
  privacyOn: boolean;
  canReturn?: boolean;
  onTogglePrivacy?: () => void;
}

export interface ShortcutHelpCommanderView {
  open: boolean;
  catalog: ShortcutHelpCatalog;
}

export function useShortcutHelpCommander({
  privacyOn,
  canReturn = false,
  onTogglePrivacy,
}: UseShortcutHelpCommanderInput) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const route = `${location.pathname}${location.search}`;
  const contextId = getShortcutContextId(route);
  const searchResults = useSearchStore((state) => state.results);
  const chatSelectedConversationId = useChatStore((state) => state.selectedConversationId);
  const chatActiveAnchor = useChatStore((state) => state.activeAnchor);
  const chatSelectionMode = useChatStore((state) => state.selectionMode);
  const chatSelectedMessageIds = useChatStore((state) => state.selectedMessageIds);
  const aiPhase = useAiStore((state) => state.phase);
  const aiIndexStatus = useAiStore((state) => state.indexStatus);
  const aiStreaming = useAiStore((state) => state.qaStreaming);
  const graphData = useGraphStore((state) => state.data);
  const graphLoadStatus = useGraphStore((state) => state.loadStatus);
  const hasSearchResults = Boolean(searchResults?.messages.length);
  const canLoadMoreSearchResults = Boolean(
    searchResults && searchResults.offset + searchResults.count < searchResults.totalCount,
  );
  const hasCurrentConversation = Boolean(chatSelectedConversationId);
  const aiReady = aiPhase === "index_ready" || aiIndexStatus?.state === "ready" || aiIndexStatus?.status === "ready" || aiIndexStatus?.ready === true;
  const graphReady = Boolean(graphData?.nodes.length || graphData?.edges.length) || graphLoadStatus === "loaded";
  const handledShortcutIds = useMemo(() => deriveHandledShortcutIds({
    contextId,
    hasSearchResults,
    onTogglePrivacy: Boolean(onTogglePrivacy),
  }), [contextId, hasSearchResults, onTogglePrivacy]);
  const catalog = useMemo(() => buildShortcutHelpCatalog({
    route,
    privacyOn,
    hasCurrentConversation,
    hasSearchResults,
    canLoadMoreSearchResults,
    hasSearchAnchor: Boolean(chatActiveAnchor),
    selectionModeAvailable: chatSelectionMode && chatSelectedMessageIds.length > 0,
    aiStreaming,
    aiReady,
    graphReady,
    canReturn,
    handledShortcutIds,
  }), [
    aiReady,
    aiStreaming,
    canLoadMoreSearchResults,
    canReturn,
    chatActiveAnchor,
    chatSelectedMessageIds.length,
    chatSelectionMode,
    graphReady,
    handledShortcutIds,
    hasCurrentConversation,
    hasSearchResults,
    privacyOn,
    route,
  ]);

  const openHelp = useCallback(() => setOpen(true), []);
  const closeHelp = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const shortcutEvent = toShortcutEvent(event, target);
      if (shouldHandlePrivacyShortcutKey(shortcutEvent) && onTogglePrivacy) {
        event.preventDefault();
        onTogglePrivacy();
        return;
      }

      if (!shouldHandleShortcutHelpKey(shortcutEvent)) {
        return;
      }

      event.preventDefault();
      setOpen(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePrivacy]);

  return {
    view: {
      open,
      catalog,
    },
    actions: {
      openHelp,
      closeHelp,
    },
  };
}

function deriveHandledShortcutIds({
  contextId,
  hasSearchResults,
  onTogglePrivacy,
}: {
  contextId: string;
  hasSearchResults: boolean;
  onTogglePrivacy: boolean;
}): string[] {
  const ids = ["help", "close-overlay"];
  if (onTogglePrivacy) ids.push("toggle-privacy");
  if (contextId === "search") {
    ids.push("search-execute", "search-clear");
    if (hasSearchResults) ids.push("search-next-result", "search-previous-result");
  }
  return ids;
}

function shouldHandlePrivacyShortcutKey(event: ShortcutHelpKeyEventLike): boolean {
  if (isEditableShortcutTarget(event)) return false;
  return event.key.toLowerCase() === "p" && event.shiftKey && (event.ctrlKey || event.metaKey);
}

function toShortcutEvent(event: KeyboardEvent, target: HTMLElement | null): ShortcutHelpKeyEventLike {
  return {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        targetTagName: target?.tagName ?? null,
        targetRole: target?.getAttribute("role") ?? null,
        isContentEditable: target?.isContentEditable ?? false,
  };
}
