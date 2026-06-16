import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChatStore } from "@l2/data-clerk/stores/useChatStore";
import {
  useMediaStore,
  type MediaAttachment,
  type MediaEndpointState,
  type MediaEndpointStatus,
  type MediaResourceLoadStatus,
} from "@l2/data-clerk/stores/useMediaStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  buildMediaResourceUrl,
  fetchFavorites,
  fetchMembers,
  fetchNewMessages,
  fetchUnread,
} from "@l4/network";
import { copyTextToClipboard, openExternalUrl } from "@l4/system";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";
import { createMediaManifestExportArtifact } from "./businessExportModel";
import { useBusinessExportCommander } from "./useBusinessExportCommander";
import {
  buildMediaActionModel,
  createMediaCopySummary,
  createMediaOpenPrompt,
  mediaActionResult,
} from "./mediaActionModel";
import {
  filterMediaAttachments,
  formatMediaFilterSummary,
} from "./mediaFilterModel";

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
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
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
    () => collectUniqueMediaAttachments({
      historyAttachments: messages.flatMap((message) => message.attachments ?? []),
      favorites: store.favorites,
      newMessages: store.newMessages,
    }),
    [messages, store.favorites, store.newMessages],
  );
  const filterResult = useMemo(
    () => filterMediaAttachments(attachments, store.filters, store.selectedAttachmentIds),
    [attachments, store.filters, store.selectedAttachmentIds],
  );
  const actionModelsByAttachmentId = useMemo(
    () => Object.fromEntries(attachments.map((attachment) => [
      attachment.id,
      buildMediaActionModel({
        attachment,
        resourceUrl: buildMediaResourceUrl(attachment, activeService.serviceBaseUrl),
        privacyOn,
        resourceStatus: store.resourceStatusByAttachmentId[attachment.id] ?? inferInitialResourceStatus(attachment),
      }),
    ])),
    [activeService.serviceBaseUrl, attachments, privacyOn, store.resourceStatusByAttachmentId],
  );

  useEffect(() => {
    useMediaStore.getState().reconcileVisibleAttachments(
      filterResult.visibleAttachments.map((attachment) => attachment.id),
    );
  }, [filterResult.visibleAttachments]);

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
        filterSummary: formatMediaFilterSummary(store.filters),
        loadedCount: attachments.length,
        visibleCount: filterResult.visibleAttachments.length,
        selectedCount: store.selectedAttachmentIds.length,
        endpointStatusSummary: mediaEndpointWarnings(store.endpointStatus),
        attachments: collectMediaManifestRows({
          attachments: store.selectedAttachmentIds.length
            ? attachments.filter((attachment) => store.selectedAttachmentIds.includes(attachment.id))
            : filterResult.visibleAttachments,
          favorites: store.selectedAttachmentIds.length ? [] : store.favorites,
          newMessages: store.selectedAttachmentIds.length ? [] : store.newMessages,
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
  const previewResourceStatus = store.selectedAttachment
    ? store.resourceStatusByAttachmentId[store.selectedAttachment.id] ?? inferInitialResourceStatus(store.selectedAttachment)
    : "idle";

  const previewAttachment = useCallback((attachment: MediaAttachment) => {
    useMediaStore.getState().selectAttachment(attachment);
    useMediaStore.getState().setResourceStatus(attachment.id, inferInitialResourceStatus(attachment));
  }, []);

  const copyAttachmentSummary = useCallback(async (attachment: MediaAttachment) => {
    try {
      const copied = await copyTextToClipboard(createMediaCopySummary(attachment, privacyOn));
      useMediaStore.getState().setLastActionResult(mediaActionResult(
        copied ? "success" : "error",
        copied ? "已复制媒体摘要。" : "复制失败，请重试。",
      ));
    } catch {
      useMediaStore.getState().setLastActionResult(mediaActionResult("error", "复制失败，请重试。"));
    }
  }, [privacyOn]);

  const requestOpenOriginal = useCallback((attachment: MediaAttachment) => {
    const prompt = createMediaOpenPrompt({
      attachment,
      privacyOn,
      resourceUrl: buildMediaResourceUrl(attachment, activeService.serviceBaseUrl),
    });
    if (!prompt.ok) {
      useMediaStore.getState().setLastActionResult(mediaActionResult("error", prompt.reason));
      return;
    }
    useMediaStore.getState().setActionPrompt(prompt.prompt);
  }, [activeService.serviceBaseUrl, privacyOn]);

  const confirmOpenOriginal = useCallback(async () => {
    const prompt = useMediaStore.getState().actionPrompt;
    if (!prompt) return;
    const result = await openExternalUrl(prompt.url);
    useMediaStore.getState().setActionPrompt(null);
    useMediaStore.getState().setLastActionResult(mediaActionResult(
      result.ok ? "success" : "error",
      result.message,
    ));
  }, []);

  const locateAttachment = useCallback((attachment: MediaAttachment) => {
    if (!attachment.messageId && typeof attachment.localId !== "number") {
      useMediaStore.getState().setLastActionResult(mediaActionResult("error", "缺少可定位消息锚点。"));
      return;
    }
    useMediaStore.getState().selectAttachment(attachment);
    useMediaStore.getState().setLastActionResult(mediaActionResult("success", "已标记来源消息，可从工作台继续查看上下文。"));
  }, []);

  const retryResource = useCallback((attachment: MediaAttachment) => {
    useMediaStore.getState().setResourceStatus(attachment.id, inferInitialResourceStatus(attachment));
    useMediaStore.getState().setLastActionResult(mediaActionResult("success", "已重新尝试加载媒体资源。"));
  }, []);

  const markResourceError = useCallback((attachment: MediaAttachment) => {
    useMediaStore.getState().setResourceStatus(attachment.id, "error");
    useMediaStore.getState().setLastActionResult(mediaActionResult("error", "预览资源加载失败，可重试。"));
  }, []);

  return {
    ...store,
    attachments,
    filteredAttachments: filterResult.visibleAttachments,
    filterChips: filterResult.activeChips,
    mediaFilterResult: filterResult,
    actionModelsByAttachmentId,
    businessExport,
    currentConversation,
    serviceLabel: activeService.serviceLabel,
    previewResourceUrl,
    previewResourceStatus,
    loadMediaModule,
    retry: () => loadMediaModule(currentConversation?.username, currentConversation?.isGroup ?? false),
    previewAttachment,
    closePreview: () => useMediaStore.getState().selectAttachment(null),
    copyAttachmentSummary,
    requestOpenOriginal,
    confirmOpenOriginal,
    cancelOpenOriginal: () => useMediaStore.getState().setActionPrompt(null),
    locateAttachment,
    retryResource,
    markResourceError,
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
    ...attachments.map((attachment) => mediaAttachmentRow(attachment, attachment.time ?? "")),
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
    source: attachment.sourceLabel ?? attachment.source,
    sizeBytes: attachment.knownSizeBytes ?? 0,
    time,
    available: Boolean(attachment.resourceKey || attachment.directUrl),
  };
}

function collectUniqueMediaAttachments({
  historyAttachments,
  favorites,
  newMessages,
}: {
  historyAttachments: MediaAttachment[];
  favorites: ReturnType<typeof useMediaStore.getState>["favorites"];
  newMessages: ReturnType<typeof useMediaStore.getState>["newMessages"];
}): MediaAttachment[] {
  const rows = [
    ...historyAttachments,
    ...favorites.flatMap((favorite) => favorite.attachments.map((attachment) => ({
      ...attachment,
      time: attachment.time || favorite.time,
    }))),
    ...newMessages.flatMap((message) => message.attachments.map((attachment) => ({
      ...attachment,
      time: attachment.time || message.time,
    }))),
  ];
  const seen = new Set<string>();
  return rows.filter((attachment) => {
    if (seen.has(attachment.id)) return false;
    seen.add(attachment.id);
    return true;
  });
}

function inferInitialResourceStatus(attachment: Pick<MediaAttachment, "resourceKey" | "directUrl">): MediaResourceLoadStatus {
  return attachment.resourceKey || attachment.directUrl ? "ready" : "missing";
}

function mediaEndpointWarnings(endpointStatus: MediaEndpointStatus): string[] {
  const labels: Array<[keyof MediaEndpointStatus, string]> = [
    ["favorites", "收藏"],
    ["members", "成员"],
    ["unread", "未读"],
    ["newMessages", "增量消息"],
  ];
  return labels
    .filter(([key]) => endpointStatus[key].status === "error")
    .map(([, label]) => `${label}端点加载失败，导出只包含已加载数据。`);
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
