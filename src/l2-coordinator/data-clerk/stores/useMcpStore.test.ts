import { beforeEach, describe, expect, it } from "vitest";
import { useMcpStore } from "./useMcpStore";
import type { McpInventory } from "@l4/network";

describe("useMcpStore", () => {
  beforeEach(() => {
    useMcpStore.getState().reset();
  });

  it("tracks MCP inventory loading and safe smoke summaries", () => {
    useMcpStore.getState().setInventoryLoading();
    expect(useMcpStore.getState().status).toBe("loading");

    useMcpStore.getState().setInventory(inventory());
    useMcpStore.getState().setSmokeResult({
      route: "/mcp",
      status: "available",
      checkedAt: "2026-01-03T08:00:00Z",
    });

    expect(useMcpStore.getState()).toMatchObject({
      status: "ready",
      smokeStatus: "ready",
    });
    expect(JSON.stringify(useMcpStore.getState())).not.toContain("request_body");
  });
});

function inventory(): McpInventory {
  return {
    routes: [{ path: "/mcp", method: "POST", status: "available" }],
    tools: [{ name: "wx_sessions", description: "Sessions", argumentKeys: ["limit"] }],
    prompts: [{ name: "chat_summary_daily", description: "Daily", argumentKeys: ["date"] }],
  };
}
