import { describe, expect, it, vi } from "vitest";
import { clearSearchSession } from "./searchSession";

describe("clearSearchSession", () => {
  it("cancels pending debounced searches before clearing search state", () => {
    const debounced = Object.assign(vi.fn(), { cancel: vi.fn() });
    const clear = vi.fn();

    clearSearchSession(debounced, clear);

    expect(debounced.cancel).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(debounced.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      clear.mock.invocationCallOrder[0],
    );
  });
});
