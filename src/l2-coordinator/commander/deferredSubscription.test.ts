import { describe, expect, it, vi } from "vitest";
import { createDeferredSubscription } from "./deferredSubscription";

describe("createDeferredSubscription", () => {
  it("runs a late unlisten callback when cleanup happens before subscription resolves", async () => {
    let resolveSubscription: ((unlisten: () => void) => void) | undefined;
    let unlistenCount = 0;

    const cleanup = createDeferredSubscription(
      () =>
        new Promise((resolve) => {
          resolveSubscription = resolve;
        }),
    );

    cleanup();
    resolveSubscription?.(() => {
      unlistenCount += 1;
    });
    await Promise.resolve();

    expect(unlistenCount).toBe(1);
  });

  it("runs an active unlisten callback when cleanup happens after subscription resolves", async () => {
    let unlistenCount = 0;
    const cleanup = createDeferredSubscription(async () => () => {
      unlistenCount += 1;
    });

    await Promise.resolve();
    cleanup();

    expect(unlistenCount).toBe(1);
  });

  it("reports setup failures without writing raw errors to the console", async () => {
    const errors: unknown[] = [];
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    createDeferredSubscription(
      async () => {
        throw new Error("token=raw-subscription-token");
      },
      (error) => errors.push(error),
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
