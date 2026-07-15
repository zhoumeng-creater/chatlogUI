import { describe, expect, it } from "vitest";
import { shouldProbeSearchCapabilities } from "./useSearchRequest";

describe("shouldProbeSearchCapabilities", () => {
  it("preserves a zero-network in-memory return while probing missing capabilities normally", () => {
    expect(
      shouldProbeSearchCapabilities({
        restoredFromNavigation: true,
        capabilitiesStatus: "idle",
      }),
    ).toBe(false);
    expect(
      shouldProbeSearchCapabilities({
        restoredFromNavigation: false,
        capabilitiesStatus: "ready",
      }),
    ).toBe(false);
    expect(
      shouldProbeSearchCapabilities({
        restoredFromNavigation: false,
        capabilitiesStatus: "loading",
      }),
    ).toBe(false);
    expect(
      shouldProbeSearchCapabilities({
        restoredFromNavigation: false,
        capabilitiesStatus: "error",
      }),
    ).toBe(true);
  });
});
