import { describe, expect, it } from "vitest";
import { createDefaultSearchDraft } from "./searchDraftModel";
import {
  applySearchZeroResultSuggestion,
  buildSearchZeroResultSuggestions,
} from "./searchZeroResultModel";

describe("searchZeroResultModel", () => {
  it("offers only factual applied restrictions and caps the list at three", () => {
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "PRIVATE needle",
      scope: { kind: "selected" as const, chatIds: ["PRIVATE chat"] },
      categories: ["file" as const],
      senderIds: ["PRIVATE sender"],
      dateRange: { start: "2026-07-01", end: "2026-07-14" },
    };
    const suggestions = buildSearchZeroResultSuggestions(draft);
    expect(suggestions).toEqual([
      { id: "clear-dates", label: "移除日期限制" },
      { id: "all-categories", label: "改为全部消息类型" },
      { id: "clear-senders", label: "移除发送者限制" },
    ]);
    expect(JSON.stringify(suggestions)).not.toContain("PRIVATE");
  });

  it("changes only the draft and never removes the keyword", () => {
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "needle",
      scope: { kind: "current" as const, chatId: "chat-1" },
    };
    const next = applySearchZeroResultSuggestion(draft, "all-conversations");
    expect(next).toEqual({ ...draft, scope: { kind: "all" } });
    expect(next).not.toBe(draft);
  });

  it("offers keyword editing only when no filter can be relaxed", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "needle" };
    expect(buildSearchZeroResultSuggestions(draft)).toEqual([
      { id: "edit-keyword", label: "修改关键词" },
    ]);
  });
});
