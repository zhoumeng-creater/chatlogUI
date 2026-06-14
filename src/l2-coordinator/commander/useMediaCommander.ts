import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import {
  useMediaStore,
  type MediaAttachment,
  type MediaEndpointState,
  type MediaEndpointStatus,
} from "@l2/data-clerk/stores/useMediaStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import {
  buildMediaResourceUrl,
  fetchFavorites,
  fetchMembers,
  fetchNewMessages,
  fetchUnread,
} from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";
import { createMediaManifestExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";

let mediaLoadSequence = 0;

function nextMediaLoadRequestId(): string {
  mediaLoadSequence += 1;
  return `media-load-${mediaLoadSequence}`;
}

interface MediaLoadControllerRef {
  current: AbortController | null;
}

export function cancelActiveMediaLoad(activeLoadControllerRef: MediaLoadControllerRef): boolean {
  const controller = activeLoadControllerRef.current;
  if (!controller) return false;

  controller.abort();
  activeLoadControllerRef.current = null;
  useMediaStore.getState().cancelMediaLoadRequest();
  return true;
}

export function useMediaCommander() {
  const store = useMediaStore();
  const messages = useChatStore((state) => state.messages);
  const conversations = useChatStore((state) => state.conversations);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setupProfile = useSetupStore((state) => state.profile);
  const activeService = useMemo(
    () => getActiveChatlogServiceSummary(setupProfile),
    [setupProfile],
  );
  const activeLoadControllerRef = useRef<AbortController | null>(null);
  const currentConversation = conversations.find((item) => item.id === selectedConversationId);

  useEffect(() => {
    return () => {
      cancelActiveMediaLoad(activeLoadControllerRef);
    };
  }, []);

  const attachments = useMemo(
    () => messages.flatMap((message) => message.attachments ?? []),
    [messages],
  );
  const businessExport = useBusinessExportCommander({
    source: "media",
    formats: ["csv", "json", "markdown"],
    defaultFormat: "csv",
    disabledReason: getMediaExportDisabledReason(Boolean(currentConversation), store.status, attachments.length),
    buildArtifact: ({ format, privacyOn, requestedUnredacted, unredactedConfirmed, generatedAt }) =>
      createMediaManifestExportArtifact({
        format,
        privacyOn,
        requestedUnredacted,
        unredactedConfirmed,
        generatedAt,
        scopeSummary: "当前会话",
        attachments: collectMediaManifestRows({
          attachments,
          favorites: store.favorites,
          newMessages: store.newMessages,
        }),
      }),
  });

  const loadMediaModule = useCallback(async (chat?: string, isGroup = false) => {
    activeLoadControllerRef.current?.abort();
    const requestId = nextMediaLoadRequestId();
    const controller = new AbortController();
    activeLoadControllerRef.current = controller;
    useMediaStore.getState().startMediaLoadRequest(requestId, { chat: chat ?? "", isGroup });

    try {
      const diagnostics = {
        correlationId: "p4b-media",
        recoveryHint: "retry" as const,
      };
      const [favoritesResult, unreadResult, membersResult, newMessagesResult] = await Promise.allSettled([
        fetchFavorites(
          { chat, limit: 50 },
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "favorites",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
        fetchUnread(
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "unread",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
        isGroup && chat
          ? fetchMembers(
              { chat },
              withMediaAbortSignal(
                createDiagnosticHttpOptions({
                  ...diagnostics,
                  endpointFamily: "members",
                  method: "GET",
                }),
                controller.signal,
              ),
            )
          : Promise.resolve({ count: 0, members: [] }),
        fetchNewMessages(
          { chat, limit: 50 },
          withMediaAbortSignal(
            createDiagnosticHttpOptions({
              ...diagnostics,
              endpointFamily: "new_messages",
              method: "GET",
            }),
            controller.signal,
          ),
        ),
      ]);

      const favorites = favoritesResult.status === "fulfilled" ? favoritesResult.value.items : [];
      const unread = unreadResult.status === "fulfilled" ? unreadResult.value : { total: 0, chats: [] };
      const members = membersResult.status === "fulfilled" ? membersResult.value.members : [];
      const memberTotal = membersResult.status === "fulfilled" ? membersResult.value.count : 0;
      const newMessages = newMessagesResult.status === "fulfilled" ? newMessagesResult.value.messages : [];
      const endpointStatus: MediaEndpointStatus = {
        favorites: endpointState(favoritesResult, favorites.length, "收藏加载失败"),
        members: endpointState(membersResult, members.length, "成员加载失败"),
        unread: endpointState(unreadResult, unread.total, "未读加载失败"),
        newMessages: endpointState(newMessagesResult, newMessages.length, "增量消息加载失败"),
      };

      useMediaStore.getState().completeMediaLoadRequest(requestId, {
        favorites,
        members,
        memberTotal,
        unread,
        newMessages,
      }, endpointStatus);
    } catch {
      useMediaStore.getState().failMediaLoadRequest(requestId, "加载媒体与扩展信息失败");
    } finally {
      if (activeLoadControllerRef.current === controller) {
        activeLoadControllerRef.current = null;
      }
    }
  }, []);

  const previewResourceUrl = store.selectedAttachment
    ? buildMediaResourceUrl(store.selectedAttachment, activeService.serviceBaseUrl)
    : "";

  return {
    ...store,
    attachments,
    businessExport,
    currentConversation,
    serviceLabel: activeService.serviceLabel,
    previewResourceUrl,
    loadMediaModule,
    retry: () => loadMediaModule(currentConversation?.username, currentConversation?.isGroup ?? false),
    previewAttachment: (attachment: MediaAttachment) => useMediaStore.getState().selectAttachment(attachment),
    closePreview: () => useMediaStore.getState().selectAttachment(null),
  };
}

function getMediaExportDisabledReason(
  hasConversation: boolean,
  status: string,
  attachmentCount: number,
): string | null {
  if (!hasConversation) return "先选择一个会话。";
  if (status === "loading") return "媒体扩展加载中，完成后可导出。";
  if (status === "idle" && attachmentCount === 0) return "媒体扩展加载完成后可导出。";
  if (status === "error" && attachmentCount === 0) return "媒体扩展加载失败，请重试后再导出。";
  return null;
}

function collectMediaManifestRows({
  attachments,
  favorites,
  newMessages,
}: {
  attachments: MediaAttachment[];
  favorites: ReturnType<typeof useMediaStore.getState>["favorites"];
  newMessages: ReturnType<typeof useMediaStore.getState>["newMessages"];
}) {
  const rows = [
    ...attachments.map((attachment) => mediaAttachmentRow(attachment, "")),
    ...favorites.flatMap((favorite) =>
      favorite.attachments.map((attachment) => mediaAttachmentRow(attachment, favorite.time))),
    ...newMessages.flatMap((message) =>
      message.attachments.map((attachment) => mediaAttachmentRow(attachment, message.time))),
  ];
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function mediaAttachmentRow(attachment: MediaAttachment, time: string) {
  return {
    id: attachment.id,
    kind: attachment.kind,
    fileName: attachment.fileName || attachment.label,
    sizeBytes: 0,
    time,
    available: Boolean(attachment.resourceKey || attachment.directUrl),
  };
}

function endpointState<T>(
  result: PromiseSettledResult<T>,
  itemCount: number,
  error: string,
): MediaEndpointState {
  if (result.status === "rejected") return { status: "error", error };
  return { status: itemCount > 0 ? "ready" : "empty", error: null };
}

function withMediaAbortSignal<T extends object>(
  options: T,
  signal: AbortSignal,
): T & { signal: AbortSignal } {
  return { ...options, signal };
}
