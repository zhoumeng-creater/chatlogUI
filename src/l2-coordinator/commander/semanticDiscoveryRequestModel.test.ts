import { describe, expect, it } from "vitest";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  buildSemanticAnalysisRequest,
  buildSemanticPreviewRequest,
  buildSemanticSearchRequest,
} from "./semanticDiscoveryRequestModel";

describe("semanticDiscoveryRequestModel", () => {
  it("builds search requests with P3-C window, depth, source limit, rerank, and selected chats", () => {
    const request = buildSemanticSearchRequest({
      query: "  release risk  ",
      scope: "selected",
      currentChat: "wxid_current",
      selectedChats: ["wxid_alpha", "room_beta", "wxid_alpha", "Display Alpha"],
      conversations: conversations(),
      window: "30d",
      depth: "deep",
      sourceLimit: 9,
      rerank: true,
      limit: 15,
    });

    expect(request).toEqual({
      query: "release risk",
      limit: 15,
      window: "30d",
      depth: "deep",
      sourceLimit: 9,
      rerank: true,
      chats: ["wxid_alpha", "room_beta"],
    });
  });

  it("keeps contact scope on the backend username and all scope unscoped", () => {
    expect(buildSemanticSearchRequest({
      query: "follow up",
      scope: "contact",
      currentChat: "wxid_current",
      selectedChats: [],
      conversations: conversations(),
      window: "7d",
      depth: "standard",
      sourceLimit: 6,
      rerank: false,
      limit: 20,
    })).toMatchObject({
      chat: "wxid_current",
      window: "7d",
      depth: "standard",
      sourceLimit: 6,
      rerank: false,
    });

    expect(buildSemanticSearchRequest({
      query: "follow up",
      scope: "all",
      currentChat: "wxid_current",
      selectedChats: ["wxid_alpha"],
      conversations: conversations(),
      window: "all",
      depth: "quick",
      sourceLimit: 4,
      rerank: true,
      limit: 20,
    })).not.toHaveProperty("chat");
  });

  it("builds analysis and preview requests with reachable window and talker filters", () => {
    expect(buildSemanticAnalysisRequest("wxid_current", "30d")).toEqual({
      chat: "wxid_current",
      window: "30d",
    });
    expect(buildSemanticAnalysisRequest("", "30d")).toBeNull();

    expect(buildSemanticPreviewRequest({
      kind: "message",
      limit: 40,
      offset: 20,
      talker: "wxid_current",
    })).toEqual({
      kind: "message",
      limit: 40,
      offset: 20,
      talker: "wxid_current",
    });

    expect(buildSemanticPreviewRequest({
      kind: "all",
      limit: 20,
      offset: 0,
      talker: "all",
    })).toEqual({
      limit: 20,
      offset: 0,
    });
  });
});

function conversations(): Conversation[] {
  return [
    conversation("conv-current", "wxid_current", "Current Contact"),
    conversation("conv-alpha", "wxid_alpha", "Display Alpha"),
    conversation("conv-beta", "room_beta", "Project Room"),
  ];
}

function conversation(id: string, username: string, displayName: string): Conversation {
  return {
    id,
    username,
    displayName,
    chatType: "friend",
    isGroup: false,
    summary: "",
    timestamp: 0,
    timeLabel: "",
    unread: 0,
    lastSender: "",
    source: "fixture",
  };
}
