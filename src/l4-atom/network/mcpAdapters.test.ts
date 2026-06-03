import { describe, expect, it } from "vitest";
import { adaptMcpInventory, getStaticMcpInventory } from "./mcpAdapters";

describe("mcpAdapters", () => {
  it("builds a display-safe MCP tool and prompt inventory", () => {
    const inventory = getStaticMcpInventory();

    expect(inventory.routes.map((route) => route.path)).toEqual(["/mcp", "/sse", "/message"]);
    expect(inventory.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["wx_sessions", "wx_history", "wx_search"]));
    expect(inventory.prompts.map((prompt) => prompt.name)).toEqual(expect.arrayContaining(["chat_summary_daily"]));
    expect(JSON.stringify(inventory)).not.toContain("talker ID");
    expect(JSON.stringify(inventory)).not.toContain("message body");
  });

  it("adapts fixture inventory without private arguments or raw bodies", () => {
    const inventory = adaptMcpInventory({
      routes: [{ path: "/message", method: "POST", status: "available" }],
      tools: [{
        name: "wx_history",
        description: "History lookup",
        argument_keys: ["chat", "limit", "private_body"],
        request_body: "Synthetic private body",
      }],
      prompts: [{
        name: "relationship_milestones",
        description: "Milestones",
        argument_keys: ["talker"],
      }],
    });

    expect(inventory.tools[0]).toMatchObject({
      name: "wx_history",
      argumentKeys: ["chat", "limit"],
    });
    expect(JSON.stringify(inventory)).not.toContain("private_body");
    expect(JSON.stringify(inventory)).not.toContain("Synthetic private body");
  });
});
