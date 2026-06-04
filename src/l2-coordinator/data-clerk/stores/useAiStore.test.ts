import { beforeEach, describe, expect, it } from "vitest";
import { useAiStore } from "./useAiStore";

describe("useAiStore", () => {
  beforeEach(() => {
    useAiStore.getState().reset();
  });

  it("clears global errors without writing an invalid phase", () => {
    const store = useAiStore.getState();

    store.setPhase("index_ready");
    store.setError("synthetic semantic failure");
    expect(useAiStore.getState().phase).toBe("error");

    useAiStore.getState().setError(null);

    expect(useAiStore.getState().error).toBeNull();
    expect(useAiStore.getState().phase).toBe("index_ready");
  });

  it("preserves a valid non-error phase when clearing an already empty error", () => {
    const store = useAiStore.getState();

    store.setPhase("configured");
    store.setError(null);

    expect(useAiStore.getState().phase).toBe("configured");
  });

  it("ignores stale QA stream token, completion, and error updates", () => {
    const store = useAiStore.getState();

    store.startQAStream("stream-current");
    store.addQAMessage({
      id: "assistant-current",
      role: "assistant",
      content: "",
      timestamp: 1,
      streamId: "stream-current",
      isStreaming: true,
    });

    store.appendQAToken("stream-old", "assistant-current", "late");
    store.completeQAStream("stream-old", "assistant-current", {
      answer: "late final",
      evidence: [],
      reason: "late",
      metadata: {},
    });
    store.failQAStream("stream-old", "late error");

    expect(useAiStore.getState().qaMessages[0]).toMatchObject({
      content: "",
      isStreaming: true,
      completionStatus: "streaming",
    });
    expect(useAiStore.getState().qaStatus).toBe("connecting");
    expect(useAiStore.getState().qaError).toBeNull();

    useAiStore.getState().appendQAToken("stream-current", "assistant-current", "fresh");
    expect(useAiStore.getState().qaMessages[0].content).toBe("fresh");
  });

  it("stores final QA answer metadata as safe message-level completion state", () => {
    const store = useAiStore.getState();

    store.startQAStream("stream-current");
    store.addQAMessage({
      id: "assistant-current",
      role: "assistant",
      content: "partial",
      timestamp: 1,
      streamId: "stream-current",
      isStreaming: true,
    });

    store.completeQAStream("stream-current", "assistant-current", {
      answer: "final answer",
      evidence: [
        { content: "Synthetic private message body", score: 0.91, type: "message" },
        { snippet: "Another private body", score: 0.7, type: "entity" },
      ],
      reason: "complete",
      metadata: {
        source_count: 2,
        window: "30d",
        depth: "deep",
        rerank_tried: true,
        rerank_applied: false,
        rerank_error: "synthetic rerank unavailable",
      },
    });

    const message = useAiStore.getState().qaMessages[0];
    expect(message).toMatchObject({
      content: "partial",
      isStreaming: false,
      completionStatus: "completed",
      reason: "complete",
      sourceCount: 2,
      window: "30d",
      depth: "deep",
      rerankTried: true,
      rerankApplied: false,
      rerankError: "synthetic rerank unavailable",
    });
    expect(message.evidence).toEqual([
      { label: "Evidence 1", kind: "message", score: 0.91 },
      { label: "Evidence 2", kind: "entity", score: 0.7 },
    ]);
    expect(JSON.stringify(message)).not.toContain("Synthetic private message body");
    expect(JSON.stringify(message)).not.toContain("Another private body");
  });
});
