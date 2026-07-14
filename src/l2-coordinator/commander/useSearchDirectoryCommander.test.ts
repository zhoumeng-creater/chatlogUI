import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SearchConversationDirectoryPage,
  SearchSenderDirectoryPage,
} from "@l2/api-docs/search";
import { createSearchDirectoryCoordinator } from "./useSearchDirectoryCommander";

describe("createSearchDirectoryCoordinator", () => {
  const fetchConversation = vi.fn();
  const fetchSender = vi.fn();
  let sequence = 0;

  beforeEach(() => {
    fetchConversation.mockReset();
    fetchSender.mockReset();
    sequence = 0;
  });

  it("keeps query edits local until explicit search and sends private facts only in POST bodies", async () => {
    fetchConversation.mockResolvedValue(conversationPage());
    const coordinator = createSearchDirectoryCoordinator({
      fetchConversation,
      fetchSender,
      createToken: () => `request-${++sequence}`,
    });

    coordinator.setQuery("conversation", "PRIVATE team");
    expect(fetchConversation).not.toHaveBeenCalled();
    expect(coordinator.getState().conversation.query).toBe("PRIVATE team");

    await expect(coordinator.search("conversation")).resolves.toBe(true);
    expect(fetchConversation).toHaveBeenCalledWith(
      { query: "PRIVATE team", limit: 50 },
      expect.any(AbortSignal),
    );
    expect(coordinator.getState().conversation).toMatchObject({
      status: "ready",
      totalCount: 1,
      items: [{ id: "conversation-1", displayName: "Synthetic Team" }],
    });
  });

  it("replays the frozen continuation and fails late replaced queries closed", async () => {
    const first = deferred<SearchConversationDirectoryPage>();
    fetchConversation
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(conversationPage("revision-2", "", false));
    const coordinator = createSearchDirectoryCoordinator({
      fetchConversation,
      fetchSender,
      createToken: () => `request-${++sequence}`,
    });

    coordinator.setQuery("conversation", "old");
    const oldRequest = coordinator.search("conversation");
    coordinator.setQuery("conversation", "new");
    await expect(coordinator.search("conversation")).resolves.toBe(true);
    first.resolve(conversationPage("revision-old", "", false));
    await expect(oldRequest).resolves.toBe(false);
    expect(coordinator.getState().conversation.query).toBe("new");
    expect(coordinator.getState().conversation.dataRevision).toBe("revision-2");

    fetchConversation.mockResolvedValueOnce(conversationPage("revision-2", "cursor-2", true));
    coordinator.setQuery("conversation", "page-me");
    await coordinator.search("conversation");
    fetchConversation.mockResolvedValueOnce({
      ...conversationPage("revision-2", "", false),
      totalCount: 51,
      items: [
        {
          conversationId: "conversation-51",
          displayName: "Synthetic Team 51",
          kind: "direct",
          disambiguator: "",
        },
      ],
    });
    await coordinator.loadMore("conversation");
    expect(fetchConversation).toHaveBeenLastCalledWith(
      {
        query: "page-me",
        limit: 50,
        cursor: "cursor-2",
        dataRevision: "revision-2",
      },
      expect.any(AbortSignal),
    );
  });

  it("binds sender queries to the canonical scope and exposes stable selected ids", async () => {
    fetchSender.mockResolvedValue(senderPage());
    const coordinator = createSearchDirectoryCoordinator({
      fetchConversation,
      fetchSender,
      createToken: () => `request-${++sequence}`,
    });

    await expect(
      coordinator.search("sender", { scope: "selected", chats: ["conversation-1"] }),
    ).resolves.toBe(true);
    expect(fetchSender).toHaveBeenCalledWith(
      {
        query: "",
        limit: 50,
        scope: "selected",
        chats: ["conversation-1"],
      },
      expect.any(AbortSignal),
    );

    const option = coordinator.getState().sender.items[0];
    coordinator.toggleSelection("sender", option);
    expect(coordinator.getState().sender.selected.map((item) => item.id)).toEqual([
      "chatlog:sender:self:v1",
    ]);
  });

  it("maps stale and invalid responses to safe model errors without retaining payloads", async () => {
    fetchConversation.mockRejectedValue(Object.assign(new Error("PRIVATE"), { code: "directory_stale" }));
    const coordinator = createSearchDirectoryCoordinator({
      fetchConversation,
      fetchSender,
      createToken: () => `request-${++sequence}`,
    });

    await expect(coordinator.search("conversation")).resolves.toBe(false);
    expect(coordinator.getState().conversation).toMatchObject({
      status: "error",
      items: [],
      error: "stale",
    });
    expect(JSON.stringify(coordinator.getState())).not.toContain("PRIVATE");
  });
});

function conversationPage(
  dataRevision = "revision-1",
  nextCursor = "",
  hasMore = false,
): SearchConversationDirectoryPage {
  const items = hasMore
    ? Array.from({ length: 50 }, (_, index) => ({
        conversationId: `conversation-${index + 1}`,
        displayName: `Synthetic Team ${index + 1}`,
        kind: (index % 2 === 0 ? "group" : "direct") as "group" | "direct",
        disambiguator: index === 0 ? "群聊" : "",
      }))
    : [
        {
          conversationId: "conversation-1",
          displayName: "Synthetic Team",
          kind: "group" as const,
          disambiguator: "群聊",
        },
      ];
  return {
    dataRevision,
    exactTotal: true,
    complete: true,
    totalCount: hasMore ? 51 : 1,
    count: items.length,
    hasMore,
    nextCursor,
    items,
  };
}

function senderPage(): SearchSenderDirectoryPage {
  return {
    dataRevision: "revision-1",
    exactTotal: true,
    complete: true,
    totalCount: 1,
    count: 1,
    hasMore: false,
    nextCursor: "",
    items: [
      {
        senderId: "chatlog:sender:self:v1",
        displayName: "我",
        isSelf: true,
        conversationCount: 1,
        contextLabel: "1 个会话",
        disambiguator: "",
      },
    ],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
