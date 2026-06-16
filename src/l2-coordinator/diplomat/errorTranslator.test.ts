import { describe, expect, it } from "vitest";
import { translateError, toApiErrorModel } from "./errorTranslator";
import { ChatlogHttpError } from "@/l4-atom/network/httpClient";
import { containsSensitiveDiagnosticText } from "@/utils/maskSecrets";

describe("translateError", () => {
  it("keeps known semantic error messages stable", () => {
    expect(translateError("ESEMANTIC_SSE_ERROR: stream closed")).toBe("AI 回答中断，请重新提问");
  });

  it("redacts private diagnostic details from unknown errors", () => {
    const message = translateError(
      "provider failed at C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_real with api_key=sk-synthetic-redaction-token",
    );

    expect(message).toContain("未知错误:");
    expect(message).not.toContain("Alice");
    expect(message).not.toContain("wxid_synthetic_real");
    expect(message).not.toContain("sk-synthetic-redaction-token");
    expect(message).toContain("[redacted-path]");
    expect(containsSensitiveDiagnosticText(message)).toBe(false);
  });

  it("redacts private message-like fields from unknown semantic errors", () => {
    const message = translateError(
      "semantic failed token=raw-token message: synthetic-private-message query=private-chat-text",
    );

    expect(message).not.toContain("raw-token");
    expect(message).not.toContain("synthetic-private-message");
    expect(message).not.toContain("private-chat-text");
    expect(containsSensitiveDiagnosticText(message)).toBe(false);
  });
});

describe("toApiErrorModel", () => {
  it("classifies caller cancellation separately from ordinary failures", () => {
    const error = new ChatlogHttpError("请求已取消", {
      status: null,
      body: null,
      url: "http://127.0.0.1:5030/api/v1/search?keyword=synthetic",
    });

    expect(toApiErrorModel(error)).toMatchObject({
      category: "abort",
      reason: "请求已取消",
      status: "cancelled",
      retryable: false,
      cancelled: true,
      diagnosticFamily: "network",
      recoveryActions: expect.arrayContaining(["重新发起请求"]),
    });
  });

  it("classifies timeout and keeps the UI message plain-language", () => {
    const error = new ChatlogHttpError("请求超时", {
      status: null,
      body: null,
      url: "http://127.0.0.1:5030/api/v1/history",
    });

    const model = toApiErrorModel(error);

    expect(model).toMatchObject({
      category: "timeout",
      status: "timeout",
      retryable: true,
      cancelled: false,
    });
    expect(model.message).not.toContain("HTTP");
    expect(model.message).not.toContain("/api/v1/history");
  });

  it("classifies HTTP DB readiness errors without exposing raw body, status, or endpoint", () => {
    const error = new ChatlogHttpError("HTTP 503", {
      status: 503,
      body: JSON.stringify({
        error: "database not ready",
        path: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_real",
        dataKey: "synthetic-data-key-redaction-target",
      }),
      url: "http://127.0.0.1:5030/api/v1/db?format=json",
    });

    const model = toApiErrorModel(error);

    expect(model).toMatchObject({
      category: "db-not-ready",
      status: "error",
      retryable: true,
      cancelled: false,
      diagnosticFamily: "db",
      recoveryActions: expect.arrayContaining(["检查数据库状态", "返回设置中心"]),
    });
    expect(model.reason).not.toContain("HTTP 503");
    expect(model.message).not.toContain("/api/v1/db");
    expect(model.safeDiagnosticSummary).not.toContain("wxid_synthetic_real");
    expect(model.safeDiagnosticSummary).not.toContain("synthetic-data-key-redaction-target");
    expect(containsSensitiveDiagnosticText(model.safeDiagnosticSummary)).toBe(false);
  });

  it("classifies malformed, permission, unsupported, semantic, graph, and unknown errors", () => {
    expect(toApiErrorModel(new SyntaxError("Unexpected token < in JSON"))).toMatchObject({
      category: "malformed-response",
      diagnosticFamily: "api-contract",
      retryable: true,
    });
    expect(toApiErrorModel(new TypeError("Failed to fetch"))).toMatchObject({
      category: "network",
      diagnosticFamily: "network",
      retryable: true,
      cancelled: false,
    });
    expect(toApiErrorModel("permission denied")).toMatchObject({
      category: "permission",
      diagnosticFamily: "security",
    });
    expect(toApiErrorModel("unsupported endpoint")).toMatchObject({
      category: "unsupported-endpoint",
      diagnosticFamily: "api-contract",
    });
    expect(
      toApiErrorModel(new ChatlogHttpError("HTTP 404", {
        status: 404,
        body: "not found",
        url: "http://127.0.0.1:5030/api/v1/synthetic-missing?format=json",
      })),
    ).toMatchObject({
      category: "unsupported-endpoint",
      diagnosticFamily: "api-contract",
      retryable: false,
    });
    expect(
      toApiErrorModel(new ChatlogHttpError("HTTP 403", {
        status: 403,
        body: "forbidden",
        url: "http://127.0.0.1:5030/api/v1/history?format=json",
      })),
    ).toMatchObject({
      category: "permission",
      diagnosticFamily: "security",
      retryable: false,
    });
    expect(toApiErrorModel("ESEMANTIC_INDEX_BUILDING")).toMatchObject({
      category: "semantic-index-building",
      diagnosticFamily: "semantic",
      status: "blocked",
    });
    expect(toApiErrorModel("graph unavailable")).toMatchObject({
      category: "graph-unavailable",
      diagnosticFamily: "graph",
    });
    expect(toApiErrorModel("synthetic unknown failure")).toMatchObject({
      category: "unknown",
      diagnosticFamily: "unknown",
    });
  });
});
