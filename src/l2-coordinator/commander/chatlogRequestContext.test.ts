import { describe, expect, it } from "vitest";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import {
  createChatlogRequestContext,
  getActiveChatlogServiceSummary,
} from "./chatlogRequestContext";

describe("chatlogRequestContext", () => {
  it("falls back to the default managed local service when profile is missing", () => {
    expect(createChatlogRequestContext(null)).toMatchObject({
      serviceBaseUrl: "http://127.0.0.1:5030",
    });
    expect(getActiveChatlogServiceSummary(null)).toEqual({
      serviceBaseUrl: "http://127.0.0.1:5030",
      serviceLabel: "本机服务 127.0.0.1:5030",
      mode: "managed",
    });
  });

  it("normalizes external and managed profile addresses into the same request shape", () => {
    const external = profile({
      mode: "external",
      source: "external-service",
      httpAddr: "127.0.0.1:6041",
      port: 6041,
    });
    const managed = profile({
      mode: "managed",
      source: "app-managed-server-config",
      httpAddr: "http://localhost:5031/",
      port: 5031,
    });

    expect(createChatlogRequestContext(external)).toMatchObject({
      serviceBaseUrl: "http://127.0.0.1:6041",
    });
    expect(createChatlogRequestContext(managed)).toMatchObject({
      serviceBaseUrl: "http://localhost:5031",
    });
  });

  it("preserves diagnostics while adding the active service base URL", () => {
    expect(
      createChatlogRequestContext(profile({ httpAddr: "127.0.0.1:6041", port: 6041 }), {
        diagnostics: {
          endpointFamily: "sessions",
          correlationId: "synthetic-correlation",
          recoveryHint: "retry",
        },
      }),
    ).toMatchObject({
      serviceBaseUrl: "http://127.0.0.1:6041",
      diagnostics: {
        endpointFamily: "sessions",
        correlationId: "synthetic-correlation",
        recoveryHint: "retry",
      },
    });
  });
});

function profile(overrides: Partial<SetupProfileSummary>): SetupProfileSummary {
  return {
    mode: "managed",
    source: "app-managed-server-config",
    configDir: null,
    dataDir: null,
    workDir: null,
    httpAddr: "127.0.0.1:5030",
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
