import { describe, expect, it } from "vitest";
import { resolveSetupPortInspectionPort, resolveSetupReadinessBaseUrl } from "./setupServiceTarget";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";

describe("setupServiceTarget", () => {
  it("uses the external draft URL for readiness and port inspection before it is saved", () => {
    const state = {
      mode: "external" as const,
      externalBaseUrlDraft: "http://127.0.0.1:6041",
      profile: profileSummary({ httpAddr: "http://127.0.0.1:5030", port: 5030 }),
    };

    expect(resolveSetupReadinessBaseUrl(state)).toMatchObject({
      ok: true,
      baseUrl: "http://127.0.0.1:6041",
      port: 6041,
    });
    expect(resolveSetupPortInspectionPort(state)).toBe(6041);
  });

  it("falls back to the active managed profile when managed mode is selected", () => {
    const state = {
      mode: "managed" as const,
      externalBaseUrlDraft: "http://127.0.0.1:6041",
      profile: profileSummary({
        mode: "managed",
        source: "manual-advanced",
        httpAddr: "127.0.0.1:5030",
        port: 5030,
      }),
    };

    expect(resolveSetupReadinessBaseUrl(state)).toMatchObject({
      ok: true,
      baseUrl: "http://127.0.0.1:5030",
      port: 5030,
    });
    expect(resolveSetupPortInspectionPort(state)).toBe(5030);
  });

  it("does not reuse a saved external profile after managed mode is selected", () => {
    const state = {
      mode: "managed" as const,
      externalBaseUrlDraft: "http://127.0.0.1:6041",
      profile: profileSummary({ httpAddr: "http://127.0.0.1:6042", port: 6042 }),
    };

    expect(resolveSetupReadinessBaseUrl(state)).toMatchObject({
      ok: true,
      baseUrl: "http://127.0.0.1:5030",
      port: 5030,
    });
    expect(resolveSetupPortInspectionPort(state)).toBe(5030);
  });
});

function profileSummary(overrides: Partial<SetupProfileSummary> = {}): SetupProfileSummary {
  return {
    mode: "external",
    source: "external-service",
    configDir: null,
    dataDir: null,
    workDir: null,
    httpAddr: "http://127.0.0.1:5030",
    port: 5030,
    platform: null,
    version: null,
    fullVersion: null,
    hasDataKey: false,
    hasImgKey: false,
    lastValidatedAt: null,
    ...overrides,
  };
}
