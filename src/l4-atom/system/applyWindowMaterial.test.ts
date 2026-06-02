import { afterEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());
const canInvokeTauriCommandMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

vi.mock("./tauriRuntime", () => ({
  canInvokeTauriCommand: canInvokeTauriCommandMock,
}));

import { applyWindowMaterial } from "./applyWindowMaterial";

afterEach(() => {
  invokeMock.mockReset();
  canInvokeTauriCommandMock.mockReset();
  vi.restoreAllMocks();
});

describe("applyWindowMaterial", () => {
  it("reports failures through a callback without logging raw errors", async () => {
    const failures: unknown[] = [];
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error("C:\\Users\\Alice\\raw-material-failure");

    canInvokeTauriCommandMock.mockReturnValue(true);
    invokeMock.mockRejectedValue(error);

    await applyWindowMaterial("mica", {
      onFailure: (failure) => failures.push(failure),
    });

    expect(failures).toEqual([{ material: "mica", error }]);
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
