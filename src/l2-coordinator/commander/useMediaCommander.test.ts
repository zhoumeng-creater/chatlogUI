import { beforeEach, describe, expect, it } from "vitest";
import { useMediaStore } from "@l2/data-clerk/stores/useMediaStore";
import { cancelActiveMediaLoad } from "./useMediaCommander";

describe("useMediaCommander media load lifecycle", () => {
  beforeEach(() => {
    useMediaStore.getState().clear();
  });

  it("aborts and cancels an active media load when the module owner unmounts", () => {
    const controller = new AbortController();
    const ref = { current: controller };

    useMediaStore.getState().startMediaLoadRequest("media-active", {
      chat: "room-active",
      isGroup: true,
    });

    expect(cancelActiveMediaLoad(ref)).toBe(true);

    expect(controller.signal.aborted).toBe(true);
    expect(ref.current).toBeNull();
    expect(useMediaStore.getState()).toMatchObject({
      status: "cancelled",
      activeLoadRequestId: null,
      activeLoadScope: null,
    });
    expect(useMediaStore.getState().completeMediaLoadRequest("media-active", {
      favorites: [],
      members: [{ username: "stale", displayName: "Stale" }],
      memberTotal: 1,
      unread: { total: 0, chats: [] },
      newMessages: [],
    })).toBe(false);
  });
});
