import { describe, expect, it } from "vitest";
import { buildSemanticQARequestEnvelope } from "./semanticQaRequestModel";
import type { QAMessage } from "@/l2-coordinator/api-docs/semantic";

describe("buildSemanticQARequestEnvelope", () => {
  it("normalizes current-contact QA drafts into sidecar requests and retry snapshots", () => {
    const envelope = buildSemanticQARequestEnvelope(
      {
        query: " What changed? ",
        scope: "contact",
        window: "7d",
        retrievalDepth: "deep",
        sourceLimit: 50,
        includeHistory: true,
      },
      {
        currentChat: "wxid_synthetic_current",
        now: 123,
        messages: qaHistory(),
      },
    );

    expect(envelope.request).toEqual({
      query: "What changed?",
      chat: "wxid_synthetic_current",
      scope: "contact",
      window: "7d",
      retrievalDepth: "deep",
      sourceLimit: 50,
      topN: 16,
      history: [
        { role: "user", content: "Previous question" },
        { role: "assistant", content: "Previous answer" },
      ],
    });
    expect(envelope.snapshot).toEqual({
      query: "What changed?",
      chat: "wxid_synthetic_current",
      scope: "contact",
      window: "7d",
      retrievalDepth: "deep",
      sourceLimit: 50,
      topN: 16,
      includeHistory: true,
      createdAt: 123,
    });
  });

  it("supports all-source QA and candidate entity override without requiring a selected chat", () => {
    const envelope = buildSemanticQARequestEnvelope(
      {
        query: "Who mentioned the release?",
        scope: "all",
        window: "30d",
        retrievalDepth: "wide",
        sourceLimit: 80,
        entityOverride: "wxid_synthetic_alice",
      },
      {
        currentChat: undefined,
        now: 456,
        messages: [],
      },
    );

    expect(envelope.request).toMatchObject({
      query: "Who mentioned the release?",
      scope: "all",
      window: "30d",
      retrievalDepth: "wide",
      sourceLimit: 80,
      topN: 30,
      entityOverride: "wxid_synthetic_alice",
    });
    expect(envelope.request.chat).toBeUndefined();
    expect(envelope.snapshot.chat).toBeUndefined();
    expect(envelope.snapshot.entityOverride).toBe("wxid_synthetic_alice");
  });

  it("supports selected recent conversations without also sending the current chat", () => {
    const envelope = buildSemanticQARequestEnvelope(
      {
        query: "Compare selected rooms",
        scope: "selected",
        chats: [" session_synthetic_001 ", "room_synthetic@chatroom"],
        window: "30d",
      },
      {
        currentChat: "wxid_synthetic_current",
        now: 789,
        messages: [],
      },
    );

    expect(envelope.request).toMatchObject({
      query: "Compare selected rooms",
      scope: "selected",
      chats: ["session_synthetic_001", "room_synthetic@chatroom"],
      window: "30d",
    });
    expect(envelope.request.chat).toBeUndefined();
    expect(envelope.snapshot.chats).toEqual(["session_synthetic_001", "room_synthetic@chatroom"]);
  });

  it("only includes bounded successful QA history when the draft explicitly enables history", () => {
    const envelopeWithoutHistory = buildSemanticQARequestEnvelope(
      {
        query: "No history",
        scope: "all",
      },
      {
        now: 111,
        messages: qaHistoryWithFailedAndStopped(),
      },
    );

    expect(envelopeWithoutHistory.request.history).toBeUndefined();

    const envelopeWithHistory = buildSemanticQARequestEnvelope(
      {
        query: "Use history",
        scope: "all",
        includeHistory: true,
      },
      {
        now: 112,
        messages: qaHistoryWithFailedAndStopped(),
      },
    );

    expect(envelopeWithHistory.request.history).toEqual([
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer" },
    ]);
    expect(envelopeWithHistory.snapshot.includeHistory).toBe(true);
  });
});

function qaHistory(): QAMessage[] {
  return [
    {
      id: "user-old",
      role: "user",
      content: "Previous question",
      timestamp: 1,
    },
    {
      id: "assistant-old",
      role: "assistant",
      content: "Previous answer",
      timestamp: 2,
      completionStatus: "completed",
    },
    {
      id: "assistant-streaming",
      role: "assistant",
      content: "Streaming answer should not be history",
      timestamp: 3,
      isStreaming: true,
      completionStatus: "streaming",
    },
  ];
}

function qaHistoryWithFailedAndStopped(): QAMessage[] {
  return [
    {
      id: "user-old",
      role: "user",
      content: "Previous question",
      timestamp: 1,
    },
    {
      id: "assistant-old",
      role: "assistant",
      content: "Previous answer",
      timestamp: 2,
      completionStatus: "completed",
    },
    {
      id: "assistant-failed",
      role: "assistant",
      content: "Provider failed with partial private text",
      timestamp: 3,
      completionStatus: "failed",
    },
    {
      id: "assistant-stopped",
      role: "assistant",
      content: "Stopped partial private text",
      timestamp: 4,
      completionStatus: "stopped",
    },
    {
      id: "assistant-empty",
      role: "assistant",
      content: "",
      timestamp: 5,
      completionStatus: "empty",
    },
  ];
}
