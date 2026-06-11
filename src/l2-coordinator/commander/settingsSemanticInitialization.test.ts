import { describe, expect, it } from "vitest";
import { shouldInitializeSettingsSemanticSummary } from "./useSettingsPageCommander";

describe("settings semantic initialization", () => {
  it("requests semantic status once Settings has loaded and AI state is still idle", () => {
    expect(shouldInitializeSettingsSemanticSummary({
      settingsLoaded: true,
      aiPhase: "idle",
      alreadyRequested: false,
    })).toBe(true);
  });

  it("does not repeat semantic initialization after a request started", () => {
    expect(shouldInitializeSettingsSemanticSummary({
      settingsLoaded: true,
      aiPhase: "checking_config",
      alreadyRequested: true,
    })).toBe(false);
  });

  it("waits for Settings storage load before requesting semantic status", () => {
    expect(shouldInitializeSettingsSemanticSummary({
      settingsLoaded: false,
      aiPhase: "idle",
      alreadyRequested: false,
    })).toBe(false);
  });
});
