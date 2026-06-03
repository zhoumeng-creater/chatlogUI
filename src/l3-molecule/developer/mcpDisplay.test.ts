import { describe, expect, it } from "vitest";
import { describeMcpForbiddenControls, formatMcpRouteLabel } from "./mcpDisplay";

describe("mcpDisplay", () => {
  it("summarizes safe MCP route and forbidden controls", () => {
    expect(formatMcpRouteLabel("post", "/mcp")).toBe("POST /mcp");
    expect(describeMcpForbiddenControls(["remote host", "raw body"])).toBe("remote host · raw body");
  });
});
