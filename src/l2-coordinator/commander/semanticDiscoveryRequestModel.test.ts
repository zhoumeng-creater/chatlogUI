import { describe, expect, it } from "vitest";
import {
  buildSemanticAnalysisRequest,
  buildSemanticPreviewRequest,
  buildSemanticSearchRequest,
} from "./semanticDiscoveryRequestModel";

describe("semanticDiscoveryRequestModel", () => {
  it("builds contact-scoped search requests with sidecar discovery params", () => {
    const request = buildSemanticSearchRequest({
      query: "  deployment schedule  ",
      scope: "contact",
      currentChat: "wxid_synthetic_backend_chat",
      window: "30d",
      depth: "deep",
      limit: 12,
      sourceLimit: 25,
      rerank: false,
    });

    expect(request).toEqual({
      query: "deployment schedule",
      scope: "contact",
      chat: "wxid_synthetic_backend_chat",
      window: "30d",
      depth: "deep",
      limit: 12,
      sourceLimit: 25,
      rerank: false,
    });
  });

  it("builds selected and all-chat search requests without display labels", () => {
    const selected = buildSemanticSearchRequest({
      query: "budget",
      scope: "selected",
      selectedChats: [
        { chat: "room_a@chatroom", label: "Project Room" },
        { chat: "wxid_synthetic_b", label: "Alice" },
      ],
      currentChat: "wxid_synthetic_current",
      window: "7d",
      depth: "standard",
    });
    const all = buildSemanticSearchRequest({
      query: "budget",
      scope: "all",
      currentChat: "wxid_synthetic_current",
      window: "all",
      depth: "wide",
    });

    expect(selected).toMatchObject({
      query: "budget",
      scope: "selected",
      chats: ["room_a@chatroom", "wxid_synthetic_b"],
      window: "7d",
      depth: "standard",
    });
    expect(selected).not.toHaveProperty("chat");
    expect(JSON.stringify(selected)).not.toContain("Project Room");
    expect(JSON.stringify(selected)).not.toContain("Alice");

    expect(all).toMatchObject({
      query: "budget",
      scope: "all",
      window: "all",
      depth: "wide",
    });
    expect(all).not.toHaveProperty("chat");
    expect(all).not.toHaveProperty("chats");
  });

  it("builds analysis and preview requests with clamped preview pagination", () => {
    expect(buildSemanticAnalysisRequest({ currentChat: "wxid_synthetic_backend_chat", window: "90d" })).toEqual({
      chat: "wxid_synthetic_backend_chat",
      window: "90d",
    });
    expect(buildSemanticAnalysisRequest({ currentChat: "", window: "90d" })).toBeNull();

    expect(buildSemanticPreviewRequest({
      kind: "entity",
      talker: "wxid_synthetic_backend_chat",
      limit: 250,
      offset: -12,
    })).toEqual({
      kind: "entity",
      talker: "wxid_synthetic_backend_chat",
      limit: 100,
      offset: 0,
    });
  });
});
