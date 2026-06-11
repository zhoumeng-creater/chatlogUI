import { describe, expect, it } from "vitest";
import { buildDiagnosticsReport, serializeDiagnosticsReport } from "./diagnostics";
import { buildRuntimeDiagnosticsManifest } from "./diagnosticsManifest";

describe("diagnostics report model", () => {
  it("builds a redacted report and fails closed when redaction cannot be proven", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "Config dir", value: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_a" },
        { label: "Last error", value: "data_key=raw-secret failed" },
        { label: "HTTP ready", value: true },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).not.toContain("Alice");
    expect(text).not.toContain("wxid_synthetic_a");
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
        { label: "local path", value: "C:\\Users\\Synthetic\\Private\\Documents\\chatlog" },
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
        levels: "warn: 2",
        privacyStates: "safe: 3, redacted: 1",
        endpointFamilies: "db: 2, sidecar: 2",
        latestSummary: "GET db failed with HTTP 503",
      },
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).toContain("Diagnostic events: 4");
    expect(text).toContain("Diagnostic warnings/errors: 2");
    expect(text).toContain("Diagnostic redacted/blocked: 1");
    expect(text).toContain("Diagnostic sources: http, sidecar");
    expect(text).toContain("Diagnostic levels: warn: 2");
    expect(text).toContain("Diagnostic privacy states: safe: 3, redacted: 1");
    expect(text).toContain("Diagnostic endpoint families: db: 2, sidecar: 2");
    expect(text).toContain("Latest diagnostic event: GET db failed with HTTP 503");
  });

  it("fails closed or redacts advanced raw diagnostic payload labels", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "Request query", value: "keyword=synthetic-private-message-should-be-redacted&chat=wxid_synthetic_private" },
        { label: "SQL", value: "select * from message where content='synthetic-private-message-should-be-redacted'" },
        { label: "Raw response", value: "{\"content\":\"synthetic-private-message-should-be-redacted\"}" },
        { label: "SNS proxy URL", value: "http://127.0.0.1:5030/api/v1/sns/media/proxy?url=https://sns.example/private.jpg" },
        { label: "Media key", value: "synthetic-media-key" },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).not.toContain("synthetic-private-message");
    expect(text).not.toContain("wxid_synthetic_private");
    expect(text).not.toContain("select * from message");
    expect(text).not.toContain("sns.example/private.jpg");
    expect(text).not.toContain("synthetic-media-key");
  });

  it("redacts P3 semantic and graph question, answer, evidence, entity, and ingest labels", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      items: [
        { label: "Semantic question", value: "Synthetic semantic question for redaction tests only" },
        { label: "Semantic answer", value: "Synthetic semantic answer for redaction tests only" },
        { label: "Semantic evidence", value: "Synthetic semantic evidence for redaction tests only" },
        { label: "Graph question", value: "Synthetic graph question for redaction tests only" },
        { label: "Graph answer", value: "Synthetic graph answer for redaction tests only" },
        { label: "Graph entity", value: "Synthetic graph entity for redaction tests only" },
        { label: "Graph ingest content", value: "Synthetic graph ingest content for redaction tests only" },
        { label: "Diagnostic events", value: 3 },
      ],
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).toContain("Diagnostic events: 3");
    expect(text).not.toContain("Synthetic semantic question");
    expect(text).not.toContain("Synthetic semantic answer");
    expect(text).not.toContain("Synthetic semantic evidence");
    expect(text).not.toContain("Synthetic graph question");
    expect(text).not.toContain("Synthetic graph answer");
    expect(text).not.toContain("Synthetic graph entity");
    expect(text).not.toContain("Synthetic graph ingest content");
  });

  it("adds diagnostics manifest 2.0 fields and redacts manifest paths", () => {
    const report = buildDiagnosticsReport({
      privacyOn: true,
      manifest: {
        appVersion: "0.1.0",
        buildChannel: "dev",
        updaterEnabled: false,
        platform: "windows",
        architecture: "x64",
        packageReadiness: "not checked",
        backendBaseUrl: "http://127.0.0.1:5030",
        sidecarState: "running",
        portState: "available",
        httpReady: true,
        dbReady: false,
        setupMode: "managed",
        configSource: "C:\\Users\\Synthetic\\WeChat Files\\wxid_synthetic_private",
        updateStatus: "idle",
        releaseSmoke: "not run",
        redactionState: "passed",
      },
      items: [],
      diagnosticEventsSummary: {
        total: 2,
        warningsOrErrors: 1,
        redactedOrBlocked: 0,
        sources: "http, updater",
        levels: "info: 1, warn: 1",
        privacyStates: "safe: 2",
        endpointFamilies: "db: 1, updater: 1",
        latestSummary: "GET db failed with HTTP 503",
      },
    });

    const text = serializeDiagnosticsReport(report);

    expect(report.redactionOk).toBe(true);
    expect(text).toContain("Export manifest version: 2.0");
    expect(text).toContain("App version: 0.1.0");
    expect(text).toContain("Build channel: dev");
    expect(text).toContain("Updater enabled: false");
    expect(text).toContain("Backend base URL: http://127.0.0.1:5030");
    expect(text).toContain("Update status: idle");
    expect(text).toContain("Diagnostic endpoint families: db: 1, updater: 1");
    expect(text).not.toContain("Alice");
    expect(text).not.toContain("wxid_synthetic_private");
  });

  it("uses the active setup profile service URL in runtime diagnostics manifest", () => {
    const manifest = buildRuntimeDiagnosticsManifest({
      profile: {
        mode: "external",
        source: "external-service",
        configDir: null,
        dataDir: null,
        workDir: null,
        httpAddr: "http://127.0.0.1:6041",
        port: 6041,
        platform: null,
        version: null,
        fullVersion: null,
        hasDataKey: false,
        hasImgKey: false,
        lastValidatedAt: "2026-06-09T00:00:00.000Z",
      },
      mode: "external",
      portState: "external-chatlog",
      httpReady: true,
      dbReady: true,
      sidecarStatus: "running",
      updateStatus: "idle",
      privacyOn: false,
    });

    expect(manifest.backendBaseUrl).toBe("http://127.0.0.1:6041");
  });
});
