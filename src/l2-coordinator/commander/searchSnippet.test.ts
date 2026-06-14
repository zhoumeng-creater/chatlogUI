import { describe, expect, it } from "vitest";
import { createSearchSnippet } from "./searchSnippet";

describe("searchSnippet", () => {
  it("returns structured highlight segments around the matched query", () => {
    const snippet = createSearchSnippet({
      content: "前文包含项目背景，然后出现 Synthetic Keyword，后面还有 URL https://example.invalid/path",
      query: "synthetic keyword",
      maxChars: 48,
      privacyOn: false,
    });

    expect(snippet.matchCount).toBe(1);
    expect(snippet.truncated).toBe(true);
    expect(snippet.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Synthetic Keyword", highlight: true }),
      ]),
    );
    expect(snippet.text).toContain("Synthetic Keyword");
  });

  it("masks content before returning segments in privacy mode", () => {
    const snippet = createSearchSnippet({
      content: "private message body",
      query: "private",
      privacyOn: true,
    });

    expect(snippet.text).toBe("******* ******* ****");
    expect(snippet.segments).toEqual([{ text: "******* ******* ****", highlight: false }]);
    expect(snippet.text).not.toContain("private");
  });
});
