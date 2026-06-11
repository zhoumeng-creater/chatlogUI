import { describe, expect, it } from "vitest";
import {
  formatDbSearchInputValue,
  formatDbTableFilterValue,
  formatDbTableLabel,
  formatDeveloperStatus,
  formatEndpointParamInputValue,
  formatRunnerHistoryLabel,
  formatSqlGuardCopy,
} from "./developerDisplay";

describe("developerDisplay", () => {
  it("formats compact status copy", () => {
    expect(formatDeveloperStatus("loading")).toBe("加载中");
    expect(formatDeveloperStatus("ready")).toBe("就绪");
    expect(formatDeveloperStatus("empty")).toBe("无数据");
    expect(formatDeveloperStatus("error")).toBe("异常");
  });

  it("formats SQL guard copy without returning raw SQL", () => {
    expect(formatSqlGuardCopy({ allowed: true, kind: "select", message: "只读 SELECT 查询。" })).toBe("允许执行 · select");
    expect(
      formatSqlGuardCopy({
        allowed: false,
        kind: "blocked",
        reason: "mutation",
        message: "已阻止可能修改数据库的 SQL。",
      }),
    ).toBe("已阻止 · mutation");
  });

  it("formats runner history with safe metadata only", () => {
    expect(
      formatRunnerHistoryLabel({
        entryId: "db_query",
        endpointFamily: "db_query",
        method: "GET",
        status: 200,
        durationMs: 12,
        parameterKeys: ["group", "file", "sql"],
        redacted: true,
      }),
    ).toBe("GET db_query · HTTP 200 · 12ms · group,file,sql");
  });

  it("masks DB and endpoint draft values that would otherwise render private data", () => {
    expect(formatDbTableLabel("MSG", false)).toBe("MSG");
    expect(formatDbTableLabel("MSG", true)).toBe("已隐藏表");
    expect(formatDbTableFilterValue("private keyword", true)).toBe("");
    expect(formatDbSearchInputValue("private search", true)).toBe("");
    expect(formatEndpointParamInputValue({ kind: "text", label: "Chat" }, "wxid_synthetic_private", true)).toBe("");
    expect(formatEndpointParamInputValue({ kind: "number", label: "Limit" }, 50, true)).toBe("50");
    expect(formatEndpointParamInputValue({ kind: "select", label: "Mode" }, "quick", true)).toBe("quick");
  });
});
