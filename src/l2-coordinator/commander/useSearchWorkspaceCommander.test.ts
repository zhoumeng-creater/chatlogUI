import { beforeEach, describe, expect, it } from "vitest";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { createDefaultSearchDraft } from "./searchDraftModel";
import {
  buildSearchEmptyStateReadiness,
  buildSearchReturnRoute,
  createSearchResultNavigationTarget,
} from "./useSearchWorkspaceCommander";

beforeEach(() => {
  useSearchStore.getState().reset();
  useSearchPreferenceStore.getState().reset();
});

describe("buildSearchEmptyStateReadiness", () => {
  it("uses real HTTP and database readiness instead of a hard-coded ready state", () => {
    expect(buildSearchEmptyStateReadiness(true, { httpReady: false, dbReady: true })).toEqual({
      serviceConfigured: true,
      httpReady: false,
      dbReady: true,
      hasCurrentConversation: true,
    });
    expect(buildSearchEmptyStateReadiness(false, { httpReady: true, dbReady: false })).toEqual({
      serviceConfigured: true,
      httpReady: true,
      dbReady: false,
      hasCurrentConversation: false,
    });
  });
});

describe("search result navigation integration", () => {
  it("keeps only non-secret route context and never serializes draft or snapshot data", () => {
    expect(
      buildSearchReturnRoute(
        new URLSearchParams(
          "scope=currentChat&chat=private-chat&source=workbench&query=PRIVATE&snapshot_id=secret&codex-smoke=workbench-ready",
        ),
      ),
    ).toBe(
      "/search?scope=currentChat&chat=private-chat&source=workbench&codex-smoke=workbench-ready",
    );
  });

  it("captures the complete current-scope workspace before navigating by stable ids", () => {
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "PRIVATE needle",
      scope: { kind: "current" as const, chatId: "private-chat" },
    };
    useSearchStore.getState().setDraft(draft);
    useSearchStore.getState().beginPending({
      requestId: "request",
      kind: "initial",
      draft,
      request: { keyword: draft.keyword, chats: ["private-chat"], limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    useSearchStore.getState().commitPending("request", page(), 2, "manual");
    useSearchPreferenceStore.getState().setSortMode("oldest");
    useSearchPreferenceStore.getState().setGroupingMode("conversation");

    const target = createSearchResultNavigationTarget({
      message: {
        id: "message-1",
        messageId: "message-1",
        seq: 42,
        sourceIndex: 0,
        conversationId: "private-chat",
        timestamp: 1_700_000_000,
        content: "needle",
        sender: "Private Sender",
        username: "private-chat",
        chat: "Private Chat",
      },
      conversations: [] as Conversation[],
      returnRoute: "/search?scope=currentChat&chat=private-chat",
      scrollAnchor: "message-1",
    });

    expect(target).toMatchObject({
      ok: true,
      conversationId: "private-chat",
      requiresConversationLoad: true,
      anchor: { messageId: "message-1", seq: 42 },
      returnToSearch: {
        returnRoute: "/search?scope=currentChat&chat=private-chat",
        searchSnapshot: {
          draft: { keyword: "PRIVATE needle", scope: { kind: "current", chatId: "private-chat" } },
          pending: null,
          applied: { request: { chats: ["private-chat"] } },
          resultWindow: { snapshotId: "snapshot-1", browseMode: "manual" },
          activeSourceIndex: 0,
          scrollAnchor: "message-1",
          sortMode: "oldest",
          groupingMode: "conversation",
        },
      },
    });
  });
});

function page() {
  return {
    snapshotId: "snapshot-1",
    dataRevision: "revision-1",
    exactTotal: true,
    completeScope: true,
    totalCount: 1,
    count: 1,
    windowStart: 0,
    previousCursor: "",
    nextCursor: "",
    hasPrevious: false,
    hasNext: false,
    messages: [
      {
        messageId: "message-1",
        seq: 42,
        sourceIndex: 0,
        conversationId: "private-chat",
        conversationName: "Private Chat",
        senderId: "private-sender",
        senderName: "Private Sender",
        timestamp: 1_700_000_000,
        type: 1,
        subType: 0,
        category: "text" as const,
        matchField: "content" as const,
        snippet: "needle",
        matchSegments: [{ text: "needle", matched: true }],
      },
    ],
  };
}
