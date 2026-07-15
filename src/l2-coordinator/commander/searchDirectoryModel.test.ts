import { describe, expect, it } from "vitest";
import {
  applySearchDirectoryPage,
  beginSearchDirectoryContinuation,
  beginSearchDirectoryQuery,
  createSearchDirectoryModel,
  getSearchDirectoryContinuation,
  rejectSearchDirectoryRequest,
  toSenderDirectoryOptionPage,
  toConversationDirectoryOptionPage,
  toggleSearchDirectorySelection,
} from "./searchDirectoryModel";

describe("searchDirectoryModel query lifecycle", () => {
  it("replaces the catalog with a complete page while preserving prior selections", () => {
    const selected = {
      kind: "conversation" as const,
      id: "selected-private-chat",
      displayName: "Selected Synthetic Chat",
      disambiguator: "",
      conversationKind: "direct" as const,
    };
    const initial = createSearchDirectoryModel("conversation", [selected]);
    const loading = beginSearchDirectoryQuery(initial, "request-1", "synthetic");
    const resolved = applySearchDirectoryPage(
      loading,
      "request-1",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 1,
        count: 1,
        hasMore: false,
        nextCursor: "",
        items: [
          {
            conversationId: "private-chat-a",
            displayName: "Synthetic Project",
            kind: "group",
            disambiguator: "群聊 · 同名 1/2",
          },
        ],
      }),
    );

    expect(resolved).toMatchObject({
      kind: "conversation",
      query: "synthetic",
      status: "ready",
      loadingMode: null,
      pendingRequestToken: null,
      dataRevision: "revision-1",
      totalCount: 1,
      hasMore: false,
      nextCursor: "",
      error: null,
    });
    expect(resolved.items).toEqual([
      {
        kind: "conversation",
        id: "private-chat-a",
        displayName: "Synthetic Project",
        disambiguator: "群聊 · 同名 1/2",
        conversationKind: "group",
      },
    ]);
    expect(resolved.selected).toEqual([selected]);
  });

  it("replays the exact revision and cursor while appending a continuation", () => {
    const first = applySearchDirectoryPage(
      beginSearchDirectoryQuery(
        createSearchDirectoryModel("conversation"),
        "request-1",
        "synthetic",
        1,
      ),
      "request-1",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        items: [
          {
            conversationId: "private-chat-a",
            displayName: "Synthetic A",
            kind: "direct",
            disambiguator: "",
          },
        ],
      }),
    );

    expect(getSearchDirectoryContinuation(first)).toEqual({
      query: "synthetic",
      limit: 1,
      cursor: "cursor-1",
      dataRevision: "revision-1",
    });
    const loading = beginSearchDirectoryContinuation(first, "request-2");
    expect(loading).toMatchObject({
      status: "loading",
      loadingMode: "append",
      pendingRequestToken: "request-2",
    });
    expect(loading.items).toEqual(first.items);

    const resolved = applySearchDirectoryPage(
      loading,
      "request-2",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 1,
        hasMore: false,
        nextCursor: "",
        items: [
          {
            conversationId: "private-chat-b",
            displayName: "Synthetic B",
            kind: "group",
            disambiguator: "",
          },
        ],
      }),
    );

    expect(resolved.items.map((item) => item.id)).toEqual(["private-chat-a", "private-chat-b"]);
    expect(resolved).toMatchObject({
      status: "ready",
      totalCount: 2,
      hasMore: false,
      nextCursor: "",
      dataRevision: "revision-1",
    });
    expect(getSearchDirectoryContinuation(resolved)).toBeNull();
  });

  it("fails closed without mixing a continuation from another revision", () => {
    const stable = applySearchDirectoryPage(
      beginSearchDirectoryQuery(createSearchDirectoryModel("conversation"), "request-1", "", 1),
      "request-1",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        items: [
          {
            conversationId: "private-chat-a",
            displayName: "Synthetic A",
            kind: "direct",
            disambiguator: "",
          },
        ],
      }),
    );
    const loading = beginSearchDirectoryContinuation(stable, "request-2");
    const rejected = applySearchDirectoryPage(
      loading,
      "request-2",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-2",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 1,
        hasMore: false,
        nextCursor: "",
        items: [
          {
            conversationId: "private-chat-b",
            displayName: "Synthetic B",
            kind: "group",
            disambiguator: "",
          },
        ],
      }),
    );

    expect(rejected.items).toEqual(stable.items);
    expect(rejected).toMatchObject({
      status: "ready",
      loadingMode: null,
      pendingRequestToken: null,
      dataRevision: "revision-1",
      totalCount: 2,
      hasMore: true,
      nextCursor: "cursor-1",
      error: "invalid_response",
    });
    expect(getSearchDirectoryContinuation(rejected)).toEqual({
      query: "",
      limit: 1,
      cursor: "cursor-1",
      dataRevision: "revision-1",
    });
  });

  it("keeps a stable page and continuation available after a retryable append failure", () => {
    const stable = applySearchDirectoryPage(
      beginSearchDirectoryQuery(createSearchDirectoryModel("conversation"), "request-1", "", 1),
      "request-1",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 2,
        count: 1,
        hasMore: true,
        nextCursor: "cursor-1",
        items: [
          {
            conversationId: "private-chat-a",
            displayName: "Synthetic A",
            kind: "direct",
            disambiguator: "",
          },
        ],
      }),
    );
    const failed = rejectSearchDirectoryRequest(
      beginSearchDirectoryContinuation(stable, "request-2"),
      "request-2",
      "unavailable",
    );

    expect(failed.items).toEqual(stable.items);
    expect(failed).toMatchObject({
      status: "ready",
      loadingMode: null,
      pendingRequestToken: null,
      error: "unavailable",
      dataRevision: "revision-1",
      nextCursor: "cursor-1",
    });
    expect(getSearchDirectoryContinuation(failed)).toEqual({
      query: "",
      limit: 1,
      cursor: "cursor-1",
      dataRevision: "revision-1",
    });
    expect(beginSearchDirectoryContinuation(failed, "request-3")).toMatchObject({
      status: "loading",
      loadingMode: "append",
      pendingRequestToken: "request-3",
      error: null,
    });
  });

  it("ignores a late response after a newer query has replaced its request token", () => {
    const first = beginSearchDirectoryQuery(
      createSearchDirectoryModel("conversation"),
      "request-1",
      "first",
    );
    const current = beginSearchDirectoryQuery(first, "request-2", "second");
    const late = applySearchDirectoryPage(
      current,
      "request-1",
      toConversationDirectoryOptionPage({
        dataRevision: "revision-old",
        exactTotal: true,
        complete: true,
        totalCount: 0,
        count: 0,
        hasMore: false,
        nextCursor: "",
        items: [],
      }),
    );

    expect(late).toBe(current);
    expect(late).toMatchObject({ query: "second", pendingRequestToken: "request-2" });
  });

  it("represents an initial stale failure without retaining partial catalog data", () => {
    const failed = rejectSearchDirectoryRequest(
      beginSearchDirectoryQuery(createSearchDirectoryModel("sender"), "request-1", "private"),
      "request-1",
      "stale",
    );

    expect(failed).toMatchObject({
      status: "error",
      loadingMode: null,
      pendingRequestToken: null,
      items: [],
      dataRevision: "",
      hasMore: false,
      nextCursor: "",
      error: "stale",
    });
  });
});

describe("searchDirectoryModel selection", () => {
  it("deduplicates preselected identities by stable ID", () => {
    const first = {
      kind: "conversation" as const,
      id: "private-chat-a",
      displayName: "Synthetic A",
      disambiguator: "",
      conversationKind: "direct" as const,
    };
    const duplicate = { ...first, displayName: "Synthetic A updated" };

    expect(createSearchDirectoryModel("conversation", [first, duplicate]).selected).toEqual([
      first,
    ]);
  });

  it("selects duplicate display names by stable sender ID and preserves the self token", () => {
    const ready = applySearchDirectoryPage(
      beginSearchDirectoryQuery(createSearchDirectoryModel("sender"), "request-1", "synthetic"),
      "request-1",
      toSenderDirectoryOptionPage({
        dataRevision: "revision-1",
        exactTotal: true,
        complete: true,
        totalCount: 3,
        count: 3,
        hasMore: false,
        nextCursor: "",
        items: [
          {
            senderId: "sender-a",
            displayName: "Synthetic Sender",
            isSelf: false,
            conversationCount: 1,
            contextLabel: "Synthetic A",
            disambiguator: "Synthetic A · 1/2",
          },
          {
            senderId: "sender-b",
            displayName: "Synthetic Sender",
            isSelf: false,
            conversationCount: 2,
            contextLabel: "Synthetic B、Synthetic C",
            disambiguator: "Synthetic B · 2/2",
          },
          {
            senderId: "chatlog:sender:self:v1",
            displayName: "我",
            isSelf: true,
            conversationCount: 3,
            contextLabel: "3 个会话",
            disambiguator: "",
          },
        ],
      }),
    );

    const withFirst = toggleSearchDirectorySelection(ready, ready.items[0]);
    const withBoth = toggleSearchDirectorySelection(withFirst, ready.items[1]);
    const withSelf = toggleSearchDirectorySelection(withBoth, ready.items[2]);
    expect(withSelf.selected.map((item) => item.id)).toEqual([
      "sender-a",
      "sender-b",
      "chatlog:sender:self:v1",
    ]);
    expect(withSelf.selected[2]).toMatchObject({
      kind: "sender",
      isSelf: true,
      displayName: "我",
    });

    const withoutFirst = toggleSearchDirectorySelection(withSelf, ready.items[0]);
    expect(withoutFirst.selected.map((item) => item.id)).toEqual([
      "sender-b",
      "chatlog:sender:self:v1",
    ]);
    expect(beginSearchDirectoryQuery(withoutFirst, "request-2", "another").selected).toEqual(
      withoutFirst.selected,
    );
  });
});
