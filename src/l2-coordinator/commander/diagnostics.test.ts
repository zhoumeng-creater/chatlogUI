import { describe, expect, it } from "vitest";
import {
  buildDiagnosticsReport,
  formatDiagnosticsExportError,
  serializeDiagnosticsReport,
} from "./diagnostics";

describe("diagnostics report model", () => {
  it("builds a redacted report and fails closed when redaction cannot be proven", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "Config dir", value: "C:\\Users\\Alice\\WeChat Files\\wxid_a" },
        { label: "Last error", value: "data_key=raw-secret failed" },
        { label: "HTTP ready", value: true },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).not.toContain("Alice");
    expect(text).not.toContain("wxid_a");
    expect(text).not.toContain("raw-secret");
    expect(text).toContain("HTTP ready: true");
  });

  it("redacts synthetic release-audit secrets, private text, and local identity markers", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "dataKey", value: "synthetic-data-key-should-be-redacted" },
        { label: "apiKey", value: "sk-synthetic-should-be-redacted" },
        { label: "token", value: "synthetic-token-should-be-redacted" },
        { label: "private message", value: "synthetic-private-message-should-be-redacted" },
        { label: "local path", value: "C:\\Users\\PrivateName\\Documents\\chatlog" },
        { label: "HTTP ready", value: true },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).not.toContain("synthetic-data-key");
    expect(text).not.toContain("sk-synthetic");
    expect(text).not.toContain("synthetic-token");
    expect(text).not.toContain("synthetic-private-message");
    expect(text).not.toContain("PrivateName");
    expect(text).toContain("HTTP ready: true");
  });

  it("adds safe diagnostic event summary lines to reports", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "HTTP ready", value: true },
      ],
      diagnosticEventsSummary: {
        total: 4,
        warningsOrErrors: 2,
        redactedOrBlocked: 1,
        sources: "http, sidecar",
        latestSummary: "GET db failed with HTTP 503",
      },
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).toContain("Diagnostic events: 4");
    expect(text).toContain("Diagnostic warnings/errors: 2");
    expect(text).toContain("Diagnostic redacted/blocked: 1");
    expect(text).toContain("Diagnostic sources: http, sidecar");
    expect(text).toContain("Latest diagnostic event: GET db failed with HTTP 503");
  });

  it("allows key presence summaries without treating missing or present as raw secrets", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "Data key", value: "missing" },
        { label: "Image key", value: "present" },
        { label: "HTTP ready", value: false },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).toContain("Data key: missing");
    expect(text).toContain("Image key: present");
  });

  it("formats export failures with a specific safe reason", () => {
    expect(
      formatDiagnosticsExportError(
        new Error("诊断报告仍包含敏感信息，已阻止导出。"),
      ),
    ).toBe("诊断导出被隐私保护阻止：诊断报告仍包含敏感信息，已阻止导出。");

    const filesystemMessage = formatDiagnosticsExportError(
      new Error("failed to write C:\\Users\\Alice\\WeChat Files\\wxid_private\\diag.txt"),
    );

    expect(filesystemMessage).toContain("诊断导出写入失败");
    expect(filesystemMessage).toContain("[redacted-path]");
    expect(filesystemMessage).not.toContain("Alice");
    expect(filesystemMessage).not.toContain("wxid_private");
  });
});
