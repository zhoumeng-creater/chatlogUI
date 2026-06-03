import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "./useGraphStore";

describe("useGraphStore", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("tracks a two-step confirmation gate for advanced graph mutations", () => {
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("business");
    expect(useGraphStore.getState().advancedConfirmationPending).toBe("business");
    expect(useGraphStore.getState().ingestStatus).toBe("idle");

    useGraphStore.getState().cancelAdvancedConfirmation();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("qa");
    useGraphStore.getState().setQALoading();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();
  });
});
