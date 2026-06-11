import { afterEach, describe, expect, it } from "vitest";
import { useAiStore } from "./useAiStore";

afterEach(() => {
  useAiStore.getState().reset();
});

describe("useAiStore phase safety", () => {
  it("does not write an invalid phase when clearing an error", () => {
    useAiStore.getState().setPhase("index_ready");

    useAiStore.getState().setError(null);

    expect(useAiStore.getState().phase).toBe("index_ready");
  });

  it("restores the previous stable phase when clearing an error phase", () => {
    useAiStore.getState().setPhase("index_ready");
    useAiStore.getState().setError("semantic index failed");

    expect(useAiStore.getState().phase).toBe("error");

    useAiStore.getState().setError(null);

    expect(useAiStore.getState().phase).toBe("index_ready");
  });
});

describe("useAiStore QA stream identity", () => {
  it("tracks the active stream and rejects stale stream ids", () => {
    const store = useAiStore.getState() as typeof useAiStore extends {
      getState: () => infer T;
    }
      ? T & {
          setActiveQAStream?: (streamId: string) => void;
          clearActiveQAStream?: (streamId?: string) => void;
          isActiveQAStream?: (streamId: string) => boolean;
          activeQAStreamId?: string | null;
        }
      : never;

    expect(typeof store.setActiveQAStream).toBe("function");
    expect(typeof store.clearActiveQAStream).toBe("function");
    expect(typeof store.isActiveQAStream).toBe("function");

    store.setActiveQAStream?.("stream-a");
    expect(useAiStore.getState().activeQAStreamId).toBe("stream-a");
    expect(useAiStore.getState().isActiveQAStream("stream-a")).toBe(true);
    expect(useAiStore.getState().isActiveQAStream("stream-b")).toBe(false);

    useAiStore.getState().clearActiveQAStream("stream-b");
    expect(useAiStore.getState().activeQAStreamId).toBe("stream-a");

    useAiStore.getState().clearActiveQAStream("stream-a");
    expect(useAiStore.getState().activeQAStreamId).toBeNull();
  });

  it("ignores stale token and completion updates from superseded streams", () => {
    useAiStore.getState().addQAMessage({
      id: "assistant-1",
      role: "assistant",
      content: "",
      timestamp: 1,
      isStreaming: true,
    });
    useAiStore.getState().setActiveQAStream("stream-current");

    const store = useAiStore.getState() as typeof useAiStore extends {
      getState: () => infer T;
    }
      ? T & {
          appendQATokenForStream?: (streamId: string, msgId: string, token: string) => void;
          completeQAMessageForStream?: (
            streamId: string,
            msgId: string,
            completion: {
              content: string;
              evidence?: Array<Record<string, unknown>>;
              reason?: string;
              sourceCount?: number;
              metadata?: Record<string, unknown>;
            },
          ) => void;
        }
      : never;

    expect(typeof store.appendQATokenForStream).toBe("function");
    expect(typeof store.completeQAMessageForStream).toBe("function");

    store.appendQATokenForStream?.("stream-old", "assistant-1", "stale");
    store.completeQAMessageForStream?.("stream-old", "assistant-1", {
      content: "stale final",
      reason: "stale",
    });

    expect(useAiStore.getState().qaMessages[0].content).toBe("");
    expect(useAiStore.getState().activeQAStreamId).toBe("stream-current");

    store.appendQATokenForStream?.("stream-current", "assistant-1", "fresh");
    store.completeQAMessageForStream?.("stream-current", "assistant-1", {
      content: "fresh final",
      reason: "done",
      sourceCount: 0,
    });

    expect(useAiStore.getState().qaMessages[0]).toMatchObject({
      content: "fresh final",
      completionStatus: "completed",
      reason: "done",
    });
    expect(useAiStore.getState().activeQAStreamId).toBeNull();
  });

  it("marks user-stopped active streams without setting semantic error", () => {
    useAiStore.getState().addQAMessage({
      id: "assistant-1",
      role: "assistant",
      content: "partial answer",
      timestamp: 1,
      isStreaming: true,
    });
    useAiStore.getState().setActiveQAStream("stream-current");
    useAiStore.getState().setQAStatus("streaming");

    const store = useAiStore.getState() as typeof useAiStore extends {
      getState: () => infer T;
    }
      ? T & {
          stopQAStream?: (streamId: string, msgId: string) => void;
        }
      : never;

    expect(typeof store.stopQAStream).toBe("function");

    store.stopQAStream?.("stream-current", "assistant-1");

    expect(useAiStore.getState()).toMatchObject({
      qaStatus: "stopped",
      qaError: null,
      error: null,
      activeQAStreamId: null,
    });
    expect(useAiStore.getState().qaMessages[0]).toMatchObject({
      content: "partial answer",
      isStreaming: false,
      completionStatus: "stopped",
    });
  });

  it("marks backend stream errors as QA failures with safe error text", () => {
    useAiStore.getState().addQAMessage({
      id: "assistant-1",
      role: "assistant",
      content: "partial answer",
      timestamp: 1,
      isStreaming: true,
    });
    useAiStore.getState().setActiveQAStream("stream-current");
    useAiStore.getState().setQAStatus("streaming");

    const store = useAiStore.getState() as typeof useAiStore extends {
      getState: () => infer T;
    }
      ? T & {
          failQAStream?: (streamId: string, msgId: string, error: string) => void;
        }
      : never;

    expect(typeof store.failQAStream).toBe("function");

    store.failQAStream?.("stream-current", "assistant-1", "AI stream error");

    expect(useAiStore.getState()).toMatchObject({
      qaStatus: "failed",
      qaError: "AI stream error",
      activeQAStreamId: null,
    });
    expect(useAiStore.getState().qaMessages[0]).toMatchObject({
      content: "partial answer",
      isStreaming: false,
      completionStatus: "failed",
      reason: "AI stream error",
    });
  });

  it("clears QA history and resets active stream flags together", () => {
    useAiStore.getState().addQAMessage({
      id: "assistant-1",
      role: "assistant",
      content: "partial answer",
      timestamp: 1,
      isStreaming: true,
    });
    useAiStore.getState().setActiveQAStream("stream-current");
    useAiStore.getState().setQAStatus("streaming");
    useAiStore.getState().setQALoading(true);

    useAiStore.getState().clearQAMessages();

    expect(useAiStore.getState()).toMatchObject({
      qaMessages: [],
      qaStatus: "idle",
      qaError: null,
      activeQAStreamId: null,
      qaStreaming: false,
      qaLoading: false,
    });
  });
});

describe("useAiStore QA message completion", () => {
  it("preserves final evidence, reason, and safe metadata on assistant messages", () => {
    useAiStore.getState().addQAMessage({
      id: "assistant-1",
      role: "assistant",
      content: "partial",
      timestamp: 1,
      isStreaming: true,
      requestSnapshot: {
        query: "What changed?",
        scope: "all",
        window: "7d",
        retrievalDepth: "deep",
        sourceLimit: 50,
        topN: 16,
        createdAt: 1,
      },
    });

    const store = useAiStore.getState() as typeof useAiStore extends {
      getState: () => infer T;
    }
      ? T & {
          completeQAMessage?: (
            msgId: string,
            completion: {
              content: string;
              evidence: Array<Record<string, unknown>>;
              reason: string;
              sourceCount: number;
              metadata: Record<string, unknown>;
            },
          ) => void;
        }
      : never;

    expect(typeof store.completeQAMessage).toBe("function");

    store.completeQAMessage?.("assistant-1", {
      content: "final answer",
      evidence: [{ source: "synthetic-source", score: 0.92 }],
      reason: "completed",
      sourceCount: 1,
      metadata: {
        window: "30d",
        depth: "deep",
        rerankTried: true,
        rerankApplied: true,
      },
    });

    expect(useAiStore.getState().qaMessages[0]).toMatchObject({
      id: "assistant-1",
      content: "final answer",
      isStreaming: false,
      completionStatus: "completed",
      evidence: [{ source: "synthetic-source", score: 0.92 }],
      reason: "completed",
      sourceCount: 1,
      metadata: {
        window: "30d",
        depth: "deep",
        rerankTried: true,
        rerankApplied: true,
      },
      requestSnapshot: {
        query: "What changed?",
        scope: "all",
        window: "7d",
        retrievalDepth: "deep",
        sourceLimit: 50,
        topN: 16,
        createdAt: 1,
      },
    });
  });
});

describe("useAiStore semantic discovery controls", () => {
  it("stores discovery filters and clamps source limit plus preview talker state", () => {
    const store = useAiStore.getState();

    store.setDiscoveryWindow("30d");
    store.setDiscoverySearchScope("selected");
    store.setDiscoveryDepth("deep");
    store.setDiscoverySourceLimit(250);
    store.setDiscoveryRerank(false);
    store.setPreviewTalker("wxid_synthetic_backend_chat");

    expect(useAiStore.getState()).toMatchObject({
      discoveryWindow: "30d",
      discoverySearchScope: "selected",
      discoveryDepth: "deep",
      discoverySourceLimit: 100,
      discoveryRerank: false,
      previewTalker: "wxid_synthetic_backend_chat",
      previewOffset: 0,
    });

    store.setDiscoverySourceLimit(-1);
    expect(useAiStore.getState().discoverySourceLimit).toBe(1);
  });
});

describe("useAiStore semantic discovery request lifecycle", () => {
  it("drops stale semantic search completions after a newer request starts", () => {
    const store = useAiStore.getState() as ReturnType<typeof useAiStore.getState> & {
      startSemanticSearchRequest: (requestId: string) => void;
      completeSemanticSearchRequest: (
        requestId: string,
        results: NonNullable<ReturnType<typeof useAiStore.getState>["searchResults"]>,
      ) => void;
      failSemanticSearchRequest: (requestId: string, error: string) => void;
    };

    store.startSemanticSearchRequest("search-1");
    store.startSemanticSearchRequest("search-2");
    store.completeSemanticSearchRequest("search-1", {
      query: "old",
      results: [
        {
          chat: "synthetic-old-chat",
          chatName: "Old chat",
          sender: "Old sender",
          senderId: "old-sender",
          time: "2026-01-01 09:00",
          content: "stale result",
          relevanceScore: 0.5,
          localId: 1,
        },
      ],
    });

    expect(useAiStore.getState()).toMatchObject({
      searchResults: null,
      searchLoading: true,
      searchError: null,
    });

    store.failSemanticSearchRequest("search-1", "stale failure");
    expect(useAiStore.getState().searchError).toBeNull();

    store.completeSemanticSearchRequest("search-2", {
      query: "fresh",
      results: [],
    });

    expect(useAiStore.getState()).toMatchObject({
      searchResults: { query: "fresh", results: [] },
      searchLoading: false,
      searchError: null,
    });
  });

  it("drops stale semantic analysis topic and profile writes", () => {
    const store = useAiStore.getState() as ReturnType<typeof useAiStore.getState> & {
      startSemanticAnalysisRequest: (requestId: string) => void;
      completeSemanticTopicsRequest: (
        requestId: string,
        topics: NonNullable<ReturnType<typeof useAiStore.getState>["topics"]>,
      ) => void;
      completeSemanticProfileRequest: (
        requestId: string,
        profile: NonNullable<ReturnType<typeof useAiStore.getState>["profile"]>,
      ) => void;
      failSemanticTopicsRequest: (requestId: string, error: string) => void;
      failSemanticProfileRequest: (requestId: string, error: string) => void;
    };

    store.startSemanticAnalysisRequest("analysis-1");
    store.startSemanticAnalysisRequest("analysis-2");
    store.completeSemanticTopicsRequest("analysis-1", {
      chat: "synthetic-old-chat",
      topics: [{ topic: "stale", count: 1 }],
    });
    store.failSemanticProfileRequest("analysis-1", "stale failure");

    expect(useAiStore.getState()).toMatchObject({
      topics: null,
      profile: null,
      topicsLoading: true,
      profileLoading: true,
      topicsError: null,
      profileError: null,
    });

    store.completeSemanticTopicsRequest("analysis-2", {
      chat: "synthetic-new-chat",
      topics: [{ topic: "fresh", count: 2 }],
    });
    store.completeSemanticProfileRequest("analysis-2", {
      chat: "synthetic-new-chat",
      profiles: [],
    });

    expect(useAiStore.getState()).toMatchObject({
      topics: { chat: "synthetic-new-chat" },
      profile: { chat: "synthetic-new-chat" },
      topicsLoading: false,
      profileLoading: false,
      topicsError: null,
      profileError: null,
    });
  });

  it("drops stale semantic preview completions after pagination changes", () => {
    const store = useAiStore.getState() as ReturnType<typeof useAiStore.getState> & {
      startSemanticPreviewRequest: (requestId: string) => void;
      completeSemanticPreviewRequest: (
        requestId: string,
        preview: NonNullable<ReturnType<typeof useAiStore.getState>["preview"]>,
      ) => void;
      failSemanticPreviewRequest: (requestId: string, error: string) => void;
    };

    store.startSemanticPreviewRequest("preview-1");
    store.startSemanticPreviewRequest("preview-2");
    store.completeSemanticPreviewRequest("preview-1", {
      model: "synthetic-preview-model",
      dim: 3,
      kind: "all",
      limit: 20,
      offset: 0,
      total: 1,
      sampleDims: 3,
      rows: [
        {
          id: "stale-row",
          kind: "message",
          identityLabel: "Stale identity",
          contentPreview: "stale",
          vectorNorm: 0,
          sampleDimensions: 0,
          coordinates: { x: 0, y: 0, z: 0 },
          outlierScore: 0,
          isOutlier: false,
          updatedAt: 0,
        },
      ],
      groups: [],
      outliers: [],
    });

    expect(useAiStore.getState()).toMatchObject({
      preview: null,
      previewStatus: "loading",
      previewError: null,
    });

    store.failSemanticPreviewRequest("preview-1", "stale failure");
    expect(useAiStore.getState().previewError).toBeNull();

    store.completeSemanticPreviewRequest("preview-2", {
      model: "synthetic-preview-model",
      dim: 3,
      kind: "all",
      limit: 20,
      offset: 20,
      total: 0,
      sampleDims: 3,
      rows: [],
      groups: [],
      outliers: [],
    });

    expect(useAiStore.getState()).toMatchObject({
      preview: { offset: 20, rows: [] },
      previewStatus: "empty",
      previewError: null,
    });
  });
});
