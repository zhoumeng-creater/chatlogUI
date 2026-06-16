import { describe, expect, it } from "vitest";
import {
  buildWorkspaceReturnContext,
  getWorkspaceReturnSourceForChatAnchor,
} from "./workspaceReturnContextModel";

describe("workspaceReturnContextModel", () => {
  it("maps known workspace sources to ordinary user labels", () => {
    expect(buildWorkspaceReturnContext({ source: "search", returnRoute: "/search" })).toMatchObject({
      label: "来自搜索结果",
      actionLabel: "返回搜索结果",
      returnRoute: "/search",
    });
    expect(buildWorkspaceReturnContext({ source: "graph", returnRoute: "/graph" })?.label).toBe("来自图谱实体");
    expect(buildWorkspaceReturnContext({ source: "ai-evidence", returnRoute: "/ai" })?.label).toBe("来自 AI 证据");
    expect(buildWorkspaceReturnContext({ source: "media", returnRoute: "/media" })?.label).toBe("来自媒体库");
    expect(buildWorkspaceReturnContext({ source: "sns", returnRoute: "/sns" })?.label).toBe("来自朋友圈");
  });

  it("does not create a broken return action when returnRoute is missing", () => {
    expect(buildWorkspaceReturnContext({ source: "graph" })).toEqual({
      label: "来自图谱实体",
      actionLabel: null,
      returnRoute: null,
    });
  });

  it("ignores unknown private source labels", () => {
    expect(buildWorkspaceReturnContext({
      source: "Synthetic private query",
      returnRoute: "E:/private/path",
    })).toBeNull();
  });

  it("maps chat anchor sources to the matching workspace return source", () => {
    expect(getWorkspaceReturnSourceForChatAnchor("search")).toBe("search");
    expect(getWorkspaceReturnSourceForChatAnchor("ai")).toBe("ai-evidence");
    expect(getWorkspaceReturnSourceForChatAnchor("graph")).toBe("graph");
    expect(getWorkspaceReturnSourceForChatAnchor(null)).toBe("search");
  });
});
