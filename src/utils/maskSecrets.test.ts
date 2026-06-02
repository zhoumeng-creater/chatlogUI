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
});
