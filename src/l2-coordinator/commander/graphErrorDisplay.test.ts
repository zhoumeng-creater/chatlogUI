import { describe, expect, it } from "vitest";
import { ChatlogHttpError } from "@l4/network";
import { formatGraphFailureMessage } from "./graphErrorDisplay";

describe("formatGraphFailureMessage", () => {
  it("translates raw HTTP and network errors into user-facing graph recovery copy", () => {
    const httpError = new ChatlogHttpError("HTTP 500", {
      status: 500,
      body: "private stack",
      url: "http://127.0.0.1:5030/api/v1/graph/visualize?chat=private",
    });

    expect(formatGraphFailureMessage(httpError, "加载图谱数据失败")).toBe(
      "加载图谱数据失败，请检查本地服务状态后重试。",
    );
    expect(formatGraphFailureMessage(new Error("HTTP 503"), "图谱 QA 失败")).toBe(
      "图谱 QA 失败，请检查本地服务状态后重试。",
    );
    expect(formatGraphFailureMessage(new Error("failed to fetch"), "图谱状态查询失败")).toBe(
      "图谱状态查询失败，请确认本地服务可用后重试。",
    );
  });
});
