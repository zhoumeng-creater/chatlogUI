import { beforeEach, describe, expect, it } from "vitest";
import { useMediaStore } from "./useMediaStore";

describe("useMediaStore", () => {
  beforeEach(() => {
    useMediaStore.getState().clear();
  });

  it("tracks endpoint status so one media extension failure does not erase the whole page", () => {
    useMediaStore.getState().setLoading();
    expect(useMediaStore.getState().endpointStatus.favorites.status).toBe("loading");

    useMediaStore.getState().setData(
      {
        favorites: [],
        members: [],
        unread: { total: 3, chats: [{ chat: "room_001", count: 3 }] },
        newMessages: [],
      },
      {
        favorites: { status: "error", error: "收藏加载失败" },
        members: { status: "empty", error: null },
        unread: { status: "ready", error: null },
        newMessages: { status: "empty", error: null },
      },
    );

    expect(useMediaStore.getState()).toMatchObject({
      status: "partial",
      error: "部分媒体扩展加载失败",
      unread: { total: 3 },
      endpointStatus: {
        favorites: { status: "error", error: "收藏加载失败" },
        unread: { status: "ready", error: null },
      },
    });
  });

  it("drops stale media load completions and failures after a newer request or cancel", () => {
    const store = useMediaStore.getState();

    store.startMediaLoadRequest("media-a", { chat: "room-a", isGroup: false });
    store.startMediaLoadRequest("media-b", { chat: "room-b", isGroup: true });

    expect(store.completeMediaLoadRequest("media-a", mediaData("stale"))).toBe(false);
    expect(useMediaStore.getState()).toMatchObject({
      activeLoadRequestId: "media-b",
      activeLoadScope: { chat: "room-b", isGroup: true },
      favorites: [],
      status: "loading",
    });

    expect(store.failMediaLoadRequest("media-a", "old media error")).toBe(false);
    expect(useMediaStore.getState().error).toBeNull();

    expect(store.completeMediaLoadRequest("media-b", mediaData("fresh"))).toBe(true);
    expect(useMediaStore.getState()).toMatchObject({
      activeLoadRequestId: null,
      activeLoadScope: null,
      status: "ready",
      favorites: [{ content: "fresh favorite" }],
      unread: { total: 1 },
    });

    store.startMediaLoadRequest("media-c", { chat: "room-c", isGroup: false });
    store.cancelMediaLoadRequest();

    expect(store.completeMediaLoadRequest("media-c", mediaData("cancelled"))).toBe(false);
    expect(store.failMediaLoadRequest("media-c", "cancelled error")).toBe(false);
    expect(useMediaStore.getState()).toMatchObject({
      activeLoadRequestId: null,
      activeLoadScope: null,
      status: "cancelled",
      favorites: [{ content: "fresh favorite" }],
    });
  });

  it("preserves backend member total separately from the loaded member window", () => {
    const store = useMediaStore.getState();

    store.startMediaLoadRequest("media-members", { chat: "room-members", isGroup: true });
    expect(store.completeMediaLoadRequest("media-members", {
      favorites: [],
      members: Array.from({ length: 50 }, (_, index) => ({
        username: `member-${index}`,
        displayName: `Member ${index}`,
      })),
      memberTotal: 80,
      unread: { total: 0, chats: [] },
      newMessages: [],
    })).toBe(true);

    expect(useMediaStore.getState()).toMatchObject({
      members: expect.arrayContaining([expect.objectContaining({ username: "member-49" })]),
      memberTotal: 80,
      status: "ready",
    });
  });

  it("tracks media filters, selected rows, prompts, and resource status", () => {
    const store = useMediaStore.getState();

    store.setFilters({
      type: "image",
      source: "history",
      availability: "available",
      dateRange: { start: "2026-06-01", end: "2026-06-30" },
    });
    store.toggleSelectedAttachment("media-a");
    store.toggleSelectedAttachment("media-b");
    store.reconcileVisibleAttachments(["media-a"]);
    store.setResourceStatus("media-a", "error");
    store.setActionPrompt({
      attachmentId: "media-a",
      title: "打开原始资源",
      message: "本机媒体资源",
      confirmLabel: "打开",
      cancelLabel: "取消",
      url: "http://127.0.0.1:5030/image/media-a",
      redactedUrlLabel: "本机媒体资源",
    });
    store.setLastActionResult({ status: "success", message: "已复制媒体摘要。" });

    expect(useMediaStore.getState()).toMatchObject({
      filters: {
        type: "image",
        source: "history",
        availability: "available",
        dateRange: { start: "2026-06-01", end: "2026-06-30" },
      },
      selectedAttachmentIds: ["media-a"],
      resourceStatusByAttachmentId: { "media-a": "error" },
      actionPrompt: { attachmentId: "media-a", redactedUrlLabel: "本机媒体资源" },
      lastActionResult: { status: "success", message: "已复制媒体摘要。" },
    });

    store.clearFilter("dateRange");
    expect(useMediaStore.getState().filters.dateRange).toEqual({ start: "", end: "" });
  });

  it("does not rewrite media selection state when visible attachment reconciliation is unchanged", () => {
    const store = useMediaStore.getState();

    store.toggleSelectedAttachment("media-a");
    const before = useMediaStore.getState();
    store.reconcileVisibleAttachments(["media-a", "media-b"]);

    expect(useMediaStore.getState()).toBe(before);
  });
});

function mediaData(label: "stale" | "fresh" | "cancelled") {
  return {
    favorites: [
      {
        id: `${label}-favorite`,
        chat: "room",
        sender: "sender",
        time: "2026-01-02 09:00",
        type: "text",
        content: `${label} favorite`,
        attachments: [],
      },
    ],
    members: [],
    unread: { total: 1, chats: [{ chat: "room", count: 1 }] },
    newMessages: [],
  };
}
