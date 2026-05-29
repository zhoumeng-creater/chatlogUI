import { describe, expect, it } from "vitest";
import { deriveSetupStep, deriveWorkbenchAccess } from "./setupMachine";
import type { SetupStateSnapshot } from "@l2/data-clerk/types/setup";

const base: SetupStateSnapshot = {
  mode: "managed",
  source: "none",
  profileComplete: false,
  configValid: false,
  portState: "unknown",
  httpReady: false,
  dbReady: false,
};

describe("setupMachine", () => {
  it("starts at config import when no setup profile exists", () => {
    expect(deriveSetupStep(base)).toBe("config");
  });

  it("does not treat HTTP health as DB readiness", () => {
    expect(
      deriveSetupStep({
        ...base,
        source: "app-managed-server-config",
        profileComplete: true,
        configValid: true,
        portState: "owned",
        httpReady: true,
        dbReady: false,
      }),
    ).toBe("database");
  });

  it("allows opening an empty workbench before DB is ready", () => {
    expect(
      deriveWorkbenchAccess({ ...base, httpReady: false, dbReady: false }),
    ).toEqual({
      allowed: true,
      connected: false,
      reason: "setup-incomplete",
    });
  });

  it("reports ready workbench when DB is ready", () => {
    expect(
      deriveWorkbenchAccess({
        ...base,
        source: "app-managed-server-config",
        profileComplete: true,
        configValid: true,
        portState: "owned",
        httpReady: true,
        dbReady: true,
      }),
    ).toEqual({
      allowed: true,
      connected: true,
      reason: "ready",
    });
  });

  it("moves to service step when config is valid but HTTP not ready", () => {
    expect(
      deriveSetupStep({
        ...base,
        source: "manual-advanced",
        profileComplete: true,
        configValid: true,
        portState: "free",
        httpReady: false,
        dbReady: false,
      }),
    ).toBe("service");
  });

  it("moves to ready step when everything is complete", () => {
    expect(
      deriveSetupStep({
        ...base,
        source: "app-managed-server-config",
        profileComplete: true,
        configValid: true,
        portState: "owned",
        httpReady: true,
        dbReady: true,
      }),
    ).toBe("ready");
  });

  it("stays at config step when profile is complete but source is none", () => {
    expect(
      deriveSetupStep({
        ...base,
        source: "none",
        profileComplete: true,
        configValid: true,
        portState: "free",
        httpReady: true,
        dbReady: true,
      }),
    ).toBe("config");
  });
});
