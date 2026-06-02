import { describe, expect, it } from "vitest";
import {
  getSemanticAnswerSegments,
  getSemanticDisplayText,
  getSemanticProfileRows,
  getSemanticTypeDistributionRows,
} from "./semanticDisplay";

describe("getSemanticAnswerSegments", () => {
  it("segments headings, bullets, links-as-text, code blocks, and unsafe HTML as text", () => {
    expect(
      getSemanticAnswerSegments(
        [
          "## Release Notes",
          "- Shipped [alpha](https://example.test)",
          "Normal **bold** and `inline` text",
          "<script>alert(1)</script>",
          "```ts",
          "const value = 1;",
          "```",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "heading", text: "Release Notes" },
      { type: "bullet", text: "Shipped alpha (https://example.test)" },
      { type: "paragraph", text: "Normal bold and inline text" },
      { type: "paragraph", text: "<script>alert(1)</script>" },
      { type: "code", text: "const value = 1;", language: "ts" },
    ]);
  });

  it("returns an empty list for blank answers", () => {
    expect(getSemanticAnswerSegments(" \n ")).toEqual([]);
  });

  it("masks semantic labels and snippets when privacy mode is enabled", () => {
    expect(getSemanticDisplayText("Alice budget", true)).toBe("***** ******");
    expect(getSemanticDisplayText("", false, "Untitled")).toBe("Untitled");
  });

  it("formats profile rows from backend-shaped sender records", () => {
    expect(
      getSemanticProfileRows(
        [
          {
            sender: "wxid_sender",
            senderName: "Alice",
            messages: 42,
            topKeywords: [
              { topic: "release", count: 7 },
              { topic: "design", count: 3 },
            ],
          },
        ],
        false,
      ),
    ).toEqual([
      {
        sender: "Alice",
        messages: "42 条",
        keywords: ["release (7)", "design (3)"],
      },
    ]);
  });

  it("masks profile senders and keywords in privacy mode", () => {
    expect(
      getSemanticProfileRows(
        [
          {
            sender: "wxid_sender",
            senderName: "Alice",
            messages: 42,
            topKeywords: [{ topic: "release", count: 7 }],
          },
        ],
        true,
      )[0],
    ).toEqual({
      sender: "*****",
      messages: "42 条",
      keywords: ["******* (7)"],
    });
  });

  it("formats type distribution rows and preserves empty profile states", () => {
    expect(getSemanticProfileRows(undefined, false)).toEqual([]);
    expect(getSemanticTypeDistributionRows([{ type: "person", count: 1 }])).toEqual(["person: 1"]);
  });
});
