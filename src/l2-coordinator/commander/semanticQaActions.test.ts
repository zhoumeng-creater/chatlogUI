import { describe, expect, it } from "vitest";
import { getSemanticQACopyText } from "./semanticQaActions";
import type { QAMessage } from "@/l2-coordinator/api-docs/semantic";

describe("semantic QA actions", () => {
  it("returns raw assistant answer for copy only when privacy mode is off", () => {
    const message: QAMessage = {
      id: "assistant-1",
      role: "assistant",
      content: "Synthetic private answer",
      timestamp: 1,
      completionStatus: "completed",
    };

    expect(getSemanticQACopyText(message, false)).toBe("Synthetic private answer");
    expect(getSemanticQACopyText(message, true)).toBeNull();
  });

  it("does not build copy text for user messages or empty assistant answers", () => {
    expect(getSemanticQACopyText({
      id: "user-1",
      role: "user",
      content: "Question",
      timestamp: 1,
    }, false)).toBeNull();

    expect(getSemanticQACopyText({
      id: "assistant-2",
      role: "assistant",
      content: "   ",
      timestamp: 2,
    }, false)).toBeNull();
  });
});
