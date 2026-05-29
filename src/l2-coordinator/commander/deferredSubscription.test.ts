import { describe, expect, it } from "vitest";
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
});
