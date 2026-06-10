import { describe, expect, it } from "vitest";
import { deriveDeveloperEntryPolicy } from "./developerEntryViewModel";

describe("developerEntryViewModel", () => {
  it("hides all developer entry points by default", () => {
    const policy = deriveDeveloperEntryPolicy({
      developerMode: false,
      developerEntryOverride: false,
      activeModule: "chat",
    });

    expect(policy.visible).toBe(false);
    expect(policy.titlebarAction).toBeNull();
    expect(policy.includeRailModule).toBe(false);
    expect(policy.includeToolbarAction).toBe(false);
    expect(policy.renderDeveloperInspector).toBe(false);
  });

  it("enables developer entry points only after an explicit setting or override", () => {
    expect(
      deriveDeveloperEntryPolicy({
        developerMode: true,
        developerEntryOverride: false,
        activeModule: "chat",
      }).visible,
    ).toBe(true);
    expect(
      deriveDeveloperEntryPolicy({
        developerMode: false,
        developerEntryOverride: true,
        activeModule: "chat",
      }).visible,
    ).toBe(true);
  });

  it("falls back from a stale developer active module when the policy is disabled", () => {
    const policy = deriveDeveloperEntryPolicy({
      developerMode: false,
      developerEntryOverride: false,
      activeModule: "developer",
    });

    expect(policy.safeActiveModule).toBe("chat");
    expect(policy.renderDeveloperInspector).toBe(false);
  });
});
