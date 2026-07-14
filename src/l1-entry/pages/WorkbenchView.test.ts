import { describe, expect, it } from "vitest";
import { getReturnContextStatusText } from "./WorkbenchView";

describe("WorkbenchView return context status copy", () => {
  it("keeps conversation-only AI evidence recoverable with a manual-check note", () => {
    expect(getReturnContextStatusText("来自 AI 证据", "missing")).toBe(
      "已打开会话，证据未提供消息锚点，需手动核对",
    );
    expect(getReturnContextStatusText("来自 AI 证据", "loading")).toBe("正在定位 AI 证据");
    expect(getReturnContextStatusText("来自 AI 证据", "hit")).toBe("已定位 AI 证据");
  });

  it("preserves the existing search result status language", () => {
    expect(getReturnContextStatusText("来自搜索结果", "missing")).toBe(
      "已打开会话，但未能精确定位命中消息",
    );
    expect(getReturnContextStatusText("来自搜索结果", "nearby")).toBe(
      "已按明确选择打开命中附近时间，未声称精确定位",
    );
  });
});
