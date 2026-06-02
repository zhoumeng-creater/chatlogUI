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
    expect(containsSensitiveDiagnosticText("Data key: missing")).toBe(false);
    expect(containsSensitiveDiagnosticText("Image key: present")).toBe(false);
    expect(containsSensitiveDiagnosticText("HTTP ready: true")).toBe(false);
  });

  it("masks SNS proxy query values and media resource keys", () => {
    const input = [
      "/api/v1/sns/media/proxy?url=https%3A%2F%2Fprivate.example%2Fa.jpg&key=raw-media-key",
      "GET /image/raw-image-key failed",
      "GET /video/raw-video-key failed",
      "GET /file/raw-file-key failed",
      "GET /voice/raw-voice-key failed",
      "GET /data/C:/Users/Alice/WeChat Files/wxid_private/file.dat failed",
    ].join("\n");

    const redacted = maskDiagnosticText(input, { privacyMode: true });

    expect(redacted).not.toContain("private.example");
    expect(redacted).not.toContain("raw-media-key");
    expect(redacted).not.toContain("raw-image-key");
    expect(redacted).not.toContain("raw-video-key");
    expect(redacted).not.toContain("raw-file-key");
    expect(redacted).not.toContain("raw-voice-key");
    expect(redacted).not.toContain("Alice");
    expect(redacted).not.toContain("wxid_private");
    expect(containsSensitiveDiagnosticText(redacted)).toBe(false);
  });

  it("detects unredacted media and SNS diagnostic values as unsafe", () => {
    expect(containsSensitiveDiagnosticText("/image/raw-image-key")).toBe(true);
    expect(containsSensitiveDiagnosticText("/api/v1/sns/media/proxy?url=https://private.example/a.jpg")).toBe(true);
    expect(containsSensitiveDiagnosticText("key=raw-media-key")).toBe(true);
  });

  it("masks generic remote URLs while preserving local service status text", () => {
    const redacted = maskDiagnosticText(
      "Remote target https://private.example.com/api/messages?token=raw-token local http://127.0.0.1:5030/health",
      { privacyMode: true },
    );

    expect(redacted).not.toContain("private.example.com");
    expect(redacted).not.toContain("raw-token");
    expect(redacted).toContain("[redacted-url]");
    expect(redacted).toContain("http://127.0.0.1:5030/health");
    expect(containsSensitiveDiagnosticText(redacted)).toBe(false);
    expect(containsSensitiveDiagnosticText("Remote target https://private.example.com/api")).toBe(true);
  });
});
