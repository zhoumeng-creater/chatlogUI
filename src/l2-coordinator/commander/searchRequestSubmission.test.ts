import { describe, expect, it } from "vitest";
import type { SearchCapabilities } from "@/l2-coordinator/api-docs/search";
import { createDefaultSearchDraft } from "./searchDraftModel";
import { prepareSearchSubmission, SearchSubmissionError } from "./searchRequestSubmission";

describe("prepareSearchSubmission", () => {
  it("freezes canonical scope, taxonomy, sender IDs, local-day epochs, and timezone facts", () => {
    const startedAt = new Date(2026, 6, 14, 12).getTime();
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "  ＰＲＯＪＥＣＴ   发票  ",
      scope: { kind: "selected" as const, chatIds: ["chat-b", "chat-a", "chat-b"] },
      categories: ["file" as const, "text" as const, "file" as const],
      senderIds: ["sender-b", "sender-a", "sender-b"],
      dateRange: { start: "2026-07-14", end: "2026-07-14" },
    };
    const result = prepareSearchSubmission({
      draft,
      capabilities: v2Capabilities(),
      requestId: "request-1",
      kind: "initial",
      startedAt,
    });

    expect(result.request).toEqual({
      keyword: "PROJECT 发票",
      chats: ["chat-a", "chat-b"],
      categories: ["file", "text"],
      senderIds: ["sender-a", "sender-b"],
      since: Math.floor(new Date(2026, 6, 14, 0).getTime() / 1000),
      until: Math.floor(new Date(2026, 6, 15, 0).getTime() / 1000) - 1,
      limit: 50,
    });
    expect(result.dateContext).toEqual({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      utcOffsetMinutes: -new Date(startedAt).getTimezoneOffset(),
      since: result.request.since,
      until: result.request.until,
    });
    expect(Object.isFrozen(result)).toBe(true);

    draft.senderIds[0] = "mutated-private-sender";
    expect(result.draft.senderIds).toEqual(["sender-a", "sender-b"]);
  });

  it("fails closed for unresolved current/selected scopes and unavailable sender capability", () => {
    expectSubmissionError(
      {
        ...createDefaultSearchDraft(),
        keyword: "needle",
        scope: { kind: "current", chatId: null },
      },
      v2Capabilities(),
      "invalid_request",
    );
    expectSubmissionError(
      {
        ...createDefaultSearchDraft(),
        keyword: "needle",
        scope: { kind: "selected", chatIds: [] },
      },
      v2Capabilities(),
      "invalid_request",
    );
    expectSubmissionError(
      { ...createDefaultSearchDraft(), keyword: "needle", senderIds: ["private-sender"] },
      { ...v2Capabilities(), senderFilter: false },
      "capability_unavailable",
    );
  });

  it("fails safely when the enhanced contract or selected taxonomy is unavailable", () => {
    expectSubmissionError(
      { ...createDefaultSearchDraft(), keyword: "PRIVATE KEYWORD" },
      { ...v2Capabilities(), mode: "legacy", contractVersion: "legacy" },
      "capability_unavailable",
    );
    expectSubmissionError(
      { ...createDefaultSearchDraft(), keyword: "PRIVATE KEYWORD", categories: ["file"] },
      { ...v2Capabilities(), taxonomy: ["text"] },
      "capability_unavailable",
    );

    for (const missing of ["exactTotal", "completeScope", "snapshotCursor"] as const) {
      expectSubmissionError(
        { ...createDefaultSearchDraft(), keyword: "PRIVATE KEYWORD" },
        { ...v2Capabilities(), [missing]: false },
        "capability_unavailable",
      );
    }
  });
});

function expectSubmissionError(
  draft: ReturnType<typeof createDefaultSearchDraft>,
  capabilities: SearchCapabilities,
  code: SearchSubmissionError["code"],
): void {
  try {
    prepareSearchSubmission({
      draft,
      capabilities,
      requestId: "request-private",
      kind: "initial",
      startedAt: 1,
    });
    throw new Error("expected submission to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(SearchSubmissionError);
    expect(error).toMatchObject({ code });
    expect(String(error)).not.toContain("PRIVATE");
    expect(String(error)).not.toContain("private-sender");
  }
}

function v2Capabilities(): SearchCapabilities {
  return {
    mode: "v2",
    contractVersion: "search.v2",
    exactTotal: true,
    completeScope: true,
    senderFilter: true,
    taxonomy: [
      "text",
      "image_emoji",
      "video",
      "voice",
      "file",
      "link_card",
      "quote_forward",
      "location",
      "system_other",
    ],
    snapshotCursor: true,
    inclusiveTimeBoundaries: true,
    defaultPageSize: 50,
    maxPageSize: 50,
    maxKeywordGraphemes: 200,
    maxKeywordTerms: 20,
    directoryVersion: "search.directory.v1",
    conversationDirectory: true,
    senderDirectory: true,
    directorySelfSenderId: "chatlog:sender:self:v1",
    directoryDefaultPageSize: 50,
    directoryMaxPageSize: 100,
    directoryMaxQueryGraphemes: 200,
  };
}
