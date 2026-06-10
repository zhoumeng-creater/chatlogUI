import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import type { SearchResults } from "@l2/data-clerk/stores/useSearchStore";
import { resolveSearchHitNavigation } from "./searchNavigation";
import { useScopedWorkspaceConversation } from "./useScopedWorkspaceConversation";
import { useSearchCommander } from "./useSearchCommander";

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}

export function useSearchWorkspaceCommander() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scopedChat = params.get("chat");
  const scopedScope = params.get("scope");
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const { chat, currentConversation, currentChat } = useScopedWorkspaceConversation(scopedChat);
  const search = useSearchCommander({ scopedChat: scopedChat ?? currentChat });
  const {
    activeFilter,
    changeScope,
    query,
    scope,
    setError,
  } = search;

  useEffect(() => {
    if (scopedScope === "currentChat") {
      changeScope("current");
    }
  }, [changeScope, scopedScope]);

  const openResult = useCallback(
    async (message: SearchResults["messages"][number]) => {
      const scopeChat = scope === "current"
        ? ((scopedChat ?? currentChat) || null)
        : null;
      const target = resolveSearchHitNavigation({
        message,
        conversations: chat.conversations,
        returnRoute: withSmokeQuery("/search"),
        querySnapshot: {
          query,
          filter: activeFilter,
          scope,
          scopeChat,
        },
      });
      if (!target.ok) {
        setError(target.message);
        return;
      }
      await chat.selectAndLoadAtAnchor(target);
      navigate(withSmokeQuery("/workbench"));
    },
    [
      chat,
      currentChat,
      navigate,
      activeFilter,
      query,
      scopedChat,
      scope,
      setError,
    ],
  );

  return {
    chat,
    currentConversation,
    openResult,
    privacyOn,
    search,
  };
}
