import { describe, expect, it } from "vitest";
import { buildMcpView } from "./mcpViewModel";
import type { McpStoreSnapshot } from "@l2/data-clerk/stores/useMcpStore";

describe("mcpViewModel", () => {
  it("builds MCP route and inventory summaries without unsafe controls", () => {
    const view = buildMcpView({
      status: "ready",
      inventory: {
        routes: [{ path: "/mcp", method: "POST", status: "available" }],
        tools: [{ name: "wx_history", description: "History", argumentKeys: ["chat", "limit"] }],
        prompts: [{ name: "chat_summary_daily", description: "Daily", argumentKeys: ["date"] }],
      },
      smokeStatus: "idle",
      smokeResult: null,
      error: null,
    } satisfies McpStoreSnapshot, true);

    expect(view.summary).toContain("1 tools");
    expect(view.smokeActionCopy).toBe("契约检查");
    expect(view.smokeResultCopy).toBeNull();
    expect(view.forbiddenControls).toEqual(["remote host", "raw path", "raw headers", "raw body", "tool invocation"]);
    expect(JSON.stringify(view)).not.toContain("private");
    expect(JSON.stringify(view)).not.toContain("request body");
  });

  it("labels static route validation as a local contract check", () => {
    const view = buildMcpView({
      status: "ready",
      inventory: {
        routes: [{ path: "/mcp", method: "POST", status: "available" }],
        tools: [],
        prompts: [],
      },
      smokeStatus: "ready",
      smokeResult: { route: "/mcp", status: "available", checkedAt: "2026-01-03T08:00:00Z" },
      error: null,
    } satisfies McpStoreSnapshot, true);

    expect(view.smokeResultCopy).toBe("本地契约 /mcp · available · 2026-01-03T08:00:00Z");
  });
});
