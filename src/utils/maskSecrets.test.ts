import { describe, expect, it } from "vitest";
import {
  containsSensitiveDiagnosticText,
  maskDiagnosticText,
  maskSecretText,
} from "./maskSecrets";

describe("diagnostic redaction", () => {
  it("masks data keys, API keys, bearer tokens, and credential-like values", () => {
    const input = [
      "\"data_key\":\"abc123\"",
      "api_key=sk-secret",
      "Authorization: Bearer live-token",
      "credential: password-value",
    ].join("\n");

    const redacted = maskSecretText(input);

    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("sk-secret");
    expect(redacted).not.toContain("live-token");
    expect(redacted).not.toContain("password-value");
    expect(redacted).toContain("******");
  });

  it("masks sensitive local paths and private identity fragments for diagnostics", () => {
    const redacted = maskDiagnosticText(
      "Data dir: C:\\Users\\Alice\\Documents\\WeChat Files\\wxid_private",
      { privacyMode: true },
    );

    expect(redacted).not.toContain("Alice");
    expect(redacted).not.toContain("WeChat Files");
    expect(redacted).not.toContain("wxid_private");
    expect(redacted).toContain("[redacted-path]");
  });

  it("detects diagnostic text that still contains unsafe private markers", () => {
    expect(containsSensitiveDiagnosticText("data_key=raw-secret")).toBe(true);
    expect(containsSensitiveDiagnosticText("C:\\Users\\Alice\\WeChat Files")).toBe(true);
    expect(containsSensitiveDiagnosticText("HTTP ready: true")).toBe(false);
  });

  it("masks media keys, SNS proxy queries, SQL, raw responses, and request queries", () => {
    const redacted = maskDiagnosticText(
      [
        "GET http://127.0.0.1:5030/image/synthetic-media-key?token=raw-token",
        "media_key=synthetic-media-key",
        "SNS http://127.0.0.1:5030/api/v1/sns/media/proxy?url=https://sns.example/private.jpg&token=raw-token",
        "SQL select * from message where content='synthetic-private-message-should-be-redacted'",
        "raw response {\"content\":\"synthetic-private-message-should-be-redacted\",\"sender\":\"wxid_private\"}",
        "query keyword=synthetic-private-message-should-be-redacted&chat=wxid_private",
      ].join("\n"),
      { privacyMode: true },
    );

    expect(redacted).not.toContain("synthetic-media-key");
    expect(redacted).not.toContain("sns.example/private.jpg");
    expect(redacted).not.toContain("select * from message");
    expect(redacted).not.toContain("synthetic-private-message");
    expect(redacted).not.toContain("wxid_private");
    expect(redacted).toContain("[redacted-query]");
    expect(redacted).toContain("[redacted-sql]");
  });

  it("detects unmasked advanced diagnostic payload markers", () => {
    expect(containsSensitiveDiagnosticText("/image/synthetic-media-key")).toBe(true);
    expect(containsSensitiveDiagnosticText("select * from message")).toBe(true);
    expect(containsSensitiveDiagnosticText("keyword=private chat text")).toBe(true);
    expect(containsSensitiveDiagnosticText("durationMs: 12")).toBe(false);
  });
});
