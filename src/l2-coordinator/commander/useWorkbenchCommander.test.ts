import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchSnapshotPage } from "@/l2-coordinator/api-docs/search";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { createDefaultSearchDraft } from "./searchDraftModel";
import { createSearchResultWindow } from "./searchResultWindowModel";
import { createSearchReturnSnapshot } from "./searchReturnSnapshot";
import { restoreSearchWorkspaceFromChatReturn } from "./useWorkbenchCommander";
import commanderSource from "./useWorkbenchCommander.ts?raw";

beforeEach(() => {
  useSearchStore.getState().reset();
  useSearchPreferenceStore.getState().reset();
});

describe("useWorkbenchCommander", () => {
  it("builds selected-fragment exports with the selected-fragment source", () => {
    const selectedExportBlock = commanderSource.slice(
      commanderSource.indexOf("const selectedFragmentExport"),
      commanderSource.indexOf("const commandBar"),
    );

    expect(selectedExportBlock).toMatch(/source:\s*"conversation_selection",\s*formats/);
    expect(selectedExportBlock).toMatch(
      /createConversationExportArtifact\(\{\s*source:\s*"conversation_selection"/,
    );
    expect(selectedExportBlock).toContain("createConversationExportArtifact");
  });

  it("implements message time jump by highlighting and scrolling to the clicked row", () => {
    const jumpBlock = commanderSource.slice(
      commanderSource.indexOf('if (actionId === "jump-to-time")'),
      commanderSource.indexOf('if (actionId === "find-similar")'),
    );

    expect(jumpBlock).toContain("chat.setAnchorHit(message.id)");
    expect(jumpBlock).toContain("已定位到");
  });

  it("restores the exact search workspace in memory before returning without a new request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "private current query",
      scope: { kind: "current" as const, chatId: "private-chat" },
    };
    const snapshot = createSearchReturnSnapshot({
      draft,
      applied: {
        draft,
        request: { keyword: draft.keyword, chats: ["private-chat"], limit: 50 },
        dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
        succeededAt: 10,
      },
      resultWindow: createSearchResultWindow(page(), "infinite"),
      stale: false,
      activeSourceIndex: 0,
      scrollAnchor: "message-return",
      sortMode: "oldest",
      groupingMode: "date",
      capturedAt: 20,
    });

    expect(
      restoreSearchWorkspaceFromChatReturn({
        returnRoute: "/search?scope=currentChat&chat=private-chat",
        activeResultId: "message-return",
        querySnapshot: {
          query: draft.keyword,
          filter: "all",
          scope: "current",
          scopeChat: "private-chat",
        },
        sourceConversationId: "private-chat",
        searchSnapshot: snapshot,
      }),
    ).toBe(true);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useSearchStore.getState()).toMatchObject({
      draft: {
        keyword: "private current query",
        scope: { kind: "current", chatId: "private-chat" },
      },
      pending: null,
      resultWindow: {
        snapshotId: "snapshot-return",
        browseMode: "infinite",
        restoreScrollAnchor: "message-return",
      },
      scope: "current",
    });
    expect(useSearchPreferenceStore.getState()).toMatchObject({
      browseMode: "infinite",
      sortMode: "oldest",
      groupingMode: "date",
    });
    fetchSpy.mockRestore();
  });
});

function page(): SearchSnapshotPage {
  return {
    snapshotId: "snapshot-return",
    dataRevision: "revision-return",
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
        messageId: "message-return",
        seq: 42,
        sourceIndex: 0,
        conversationId: "private-chat",
        conversationName: "Private Chat",
        senderId: "private-sender",
        senderName: "Private Sender",
        timestamp: 1_700_000_000,
        type: 1,
        subType: 0,
        category: "text",
        matchField: "content",
        snippet: "needle",
        matchSegments: [{ text: "needle", matched: true }],
      },
    ],
  };
}
