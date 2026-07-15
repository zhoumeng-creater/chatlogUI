import { describe, expect, it } from "vitest";
import type { SearchHit } from "@/l2-coordinator/api-docs/search";
import { buildSearchResultPresentation } from "./searchResultPresentation";

const hits: SearchHit[] = [
  hit({ sourceIndex: 0, timestamp: 1_700_000_100, conversationId: "b", conversationName: "Beta" }),
  hit({ sourceIndex: 1, timestamp: 1_700_000_300, conversationId: "a", conversationName: "Alpha" }),
  hit({ sourceIndex: 2, timestamp: 1_700_000_200, conversationId: "b", conversationName: "Beta" }),
];

describe("searchResultPresentation", () => {
  it("uses backend sourceIndex order and match segments without reparsing private content", () => {
    const presentation = buildSearchResultPresentation(hits, {
      sortMode: "baseline",
      groupingMode: "none",
      locale: "zh-CN",
      timeZone: "Asia/Shanghai",
    });
    expect(presentation.groups).toHaveLength(1);
    expect(presentation.groups[0].rows.map((row) => row.hit.sourceIndex)).toEqual([0, 1, 2]);
    expect(presentation.groups[0].rows[0]).toMatchObject({
      categoryLabel: "文字",
      matchFieldLabel: "正文",
      snippetSegments: [{ text: "before ", matched: false }, { text: "needle", matched: true }],
    });
    expect(presentation.groups[0].rows[0].id).toMatch(/^search-hit-[a-f0-9]{32}$/);
    expect(presentation.groups[0].rows[0].snippetSegments).not.toBe(hits[0].matchSegments);
    expect(hits.map((item) => item.sourceIndex)).toEqual([0, 1, 2]);
  });

  it("supports exactly newest and oldest local time organizations without relevance sorting", () => {
    expect(buildSearchResultPresentation(hits, {
      sortMode: "newest",
      groupingMode: "none",
    }).groups[0].rows.map((row) => row.hit.sourceIndex)).toEqual([1, 2, 0]);
    expect(buildSearchResultPresentation(hits, {
      sortMode: "oldest",
      groupingMode: "none",
    }).groups[0].rows.map((row) => row.hit.sourceIndex)).toEqual([0, 2, 1]);
  });

  it("groups by conversation or local date using stable factual labels", () => {
    const conversations = buildSearchResultPresentation(hits, {
      sortMode: "baseline",
      groupingMode: "conversation",
    });
    expect(conversations.groups.map((group) => [group.key, group.label, group.rows.length])).toEqual([
      ["conversation:b", "Beta", 2],
      ["conversation:a", "Alpha", 1],
    ]);

    const dates = buildSearchResultPresentation(hits, {
      sortMode: "baseline",
      groupingMode: "date",
      locale: "en-CA",
      timeZone: "UTC",
    });
    expect(dates.groups.every((group) => group.key.startsWith("date:"))).toBe(true);
    expect(dates.groups.flatMap((group) => group.rows)).toHaveLength(3);
  });

  it("uses a safe factual fallback for timestamps outside the Date range", () => {
    const invalid = hit({ timestamp: Number.MAX_SAFE_INTEGER });
    const row = buildSearchResultPresentation([invalid], {
      sortMode: "baseline",
      groupingMode: "none",
    }).groups[0].rows[0];
    expect(row.timeLabel).toBe("未知时间");
  });

  it("preserves row structure while removing private labels and snippets", () => {
    const presentation = buildSearchResultPresentation(
      [
        hit({
          conversationName: "PRIVATE conversation",
          senderName: "PRIVATE sender",
          snippet: "PRIVATE needle",
          matchSegments: [
            { text: "PRIVATE ", matched: false },
            { text: "needle", matched: true },
          ],
        }),
      ],
      { sortMode: "baseline", groupingMode: "conversation", privacyOn: true },
    );
    const row = presentation.groups[0].rows[0];
    expect(row.conversationLabel).toBe("已隐藏会话");
    expect(row.senderLabel).toBe("已隐藏发送者");
    expect(row.snippetSegments).toHaveLength(2);
    expect(row.snippetSegments[1].matched).toBe(true);
    expect(JSON.stringify(row.snippetSegments)).not.toContain("PRIVATE");
    expect(presentation.groups[0].label).toBe("已隐藏会话");
  });

  it("assigns opaque distinct row identities when message ids repeat across conversations", () => {
    const rawMessageId = "PRIVATE-shared-message";
    const rawConversationA = "PRIVATE-conversation-a";
    const rows = buildSearchResultPresentation(
      [
        hit({
          messageId: rawMessageId,
          conversationId: rawConversationA,
          seq: 41,
          sourceIndex: 0,
        }),
        hit({
          messageId: rawMessageId,
          conversationId: "PRIVATE-conversation-b",
          seq: 41,
          sourceIndex: 1,
        }),
      ],
      { sortMode: "baseline", groupingMode: "none" },
    ).groups[0].rows;

    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
    for (const row of rows) {
      expect(row.id).not.toContain(rawMessageId);
      expect(row.id).not.toContain(rawConversationA);
    }
  });
});

function hit(overrides: Partial<SearchHit>): SearchHit {
  const sourceIndex = overrides.sourceIndex ?? 0;
  return {
    messageId: `message-${sourceIndex}`,
    seq: sourceIndex,
    sourceIndex,
    conversationId: "chat",
    conversationName: "Chat",
    senderId: "sender",
    senderName: "Sender",
    timestamp: 1_700_000_000,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: "before needle",
    matchSegments: [{ text: "before ", matched: false }, { text: "needle", matched: true }],
    ...overrides,
  };
}
