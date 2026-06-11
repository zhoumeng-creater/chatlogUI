import { describe, expect, it } from "vitest";
import { translateError } from "./errorTranslator";
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
