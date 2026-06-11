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
});
