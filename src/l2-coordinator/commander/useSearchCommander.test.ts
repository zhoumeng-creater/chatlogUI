import { describe, expect, it } from "vitest";
import { createDefaultSearchDraft, type SearchDraft } from "./searchDraftModel";
import * as searchCommanderModule from "./useSearchCommander";

const { shouldSynchronizeScopedChat } = searchCommanderModule;

describe("search commander canonical scope synchronization", () => {
  it("does not overwrite a restored current scope before route restoration is consumed", () => {
    expect(shouldSynchronizeScopedChat(true, "current", "restored-chat", null)).toBe(false);
    expect(shouldSynchronizeScopedChat(false, "current", "restored-chat", null)).toBe(true);
    expect(shouldSynchronizeScopedChat(false, "all", null, "route-chat")).toBe(false);
    expect(shouldSynchronizeScopedChat(false, "current", "route-chat", "route-chat")).toBe(
      false,
    );
  });

  it("invalidates scoped senders only when all/current route scope materially changes", () => {
    const applyRouteScope = (
      searchCommanderModule as unknown as {
        applySearchRouteScopeDraft?: (
          draft: SearchDraft,
          scope: "all" | "current",
          scopedChat?: string | null,
        ) => SearchDraft;
      }
    ).applySearchRouteScopeDraft;
    expect(applyRouteScope).toBeTypeOf("function");

    const allDraft: SearchDraft = {
      ...createDefaultSearchDraft(),
      senderIds: ["sender-a"],
    };
    expect(applyRouteScope?.(allDraft, "all", null).senderIds).toEqual(["sender-a"]);
    expect(applyRouteScope?.(allDraft, "current", " chat-a ")).toMatchObject({
      scope: { kind: "current", chatId: "chat-a" },
      senderIds: [],
    });

    const currentDraft: SearchDraft = {
      ...allDraft,
      scope: { kind: "current", chatId: "chat-a" },
    };
    expect(applyRouteScope?.(currentDraft, "current", "chat-a").senderIds).toEqual(["sender-a"]);
    expect(applyRouteScope?.(currentDraft, "current", "chat-b").senderIds).toEqual([]);
    expect(applyRouteScope?.(currentDraft, "all", null).senderIds).toEqual([]);
  });
});
