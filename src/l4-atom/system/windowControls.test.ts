import { afterEach, describe, expect, it, vi } from "vitest";

const getCurrentWindowMock = vi.hoisted(() => vi.fn());
const canUseTauriWindowMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: getCurrentWindowMock,
}));

vi.mock("./tauriRuntime", () => ({
  canUseTauriWindow: canUseTauriWindowMock,
}));

type WindowControlAction = "minimize" | "toggleMaximize" | "close";

interface WindowControlResult {
  action: WindowControlAction;
  ok: boolean;
  reason?: "unavailable" | "tauri-error";
}

interface WindowControlsModule {
  minimizeCurrentWindow: () => Promise<WindowControlResult>;
  toggleMaximizeCurrentWindow: () => Promise<WindowControlResult>;
  closeCurrentWindow: () => Promise<WindowControlResult>;
  listenCurrentWindowStateChange: (onChange: () => void) => Promise<(() => void) | null>;
}

const modulePath = "./windowControls";

async function loadWindowControls(): Promise<WindowControlsModule> {
  return await import(modulePath) as WindowControlsModule;
}

afterEach(() => {
  getCurrentWindowMock.mockReset();
  canUseTauriWindowMock.mockReset();
  vi.restoreAllMocks();
});

describe("windowControls", () => {
  it("returns safe unavailable results in browser mode", async () => {
    canUseTauriWindowMock.mockReturnValue(false);
    const controls = await loadWindowControls();

    await expect(controls.minimizeCurrentWindow()).resolves.toEqual({
      action: "minimize",
      ok: false,
      reason: "unavailable",
    });
    await expect(controls.toggleMaximizeCurrentWindow()).resolves.toEqual({
      action: "toggleMaximize",
      ok: false,
      reason: "unavailable",
    });
    await expect(controls.closeCurrentWindow()).resolves.toEqual({
      action: "close",
      ok: false,
      reason: "unavailable",
    });
    expect(getCurrentWindowMock).not.toHaveBeenCalled();
  });

  it("dispatches minimize, toggle maximize, and close through the current Tauri window", async () => {
    const currentWindow = {
      minimize: vi.fn().mockResolvedValue(undefined),
      toggleMaximize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    canUseTauriWindowMock.mockReturnValue(true);
    getCurrentWindowMock.mockReturnValue(currentWindow);

    const controls = await loadWindowControls();

    await expect(controls.minimizeCurrentWindow()).resolves.toEqual({
      action: "minimize",
      ok: true,
    });
    await expect(controls.toggleMaximizeCurrentWindow()).resolves.toEqual({
      action: "toggleMaximize",
      ok: true,
    });
    await expect(controls.closeCurrentWindow()).resolves.toEqual({
      action: "close",
      ok: true,
    });
    expect(currentWindow.minimize).toHaveBeenCalledTimes(1);
    expect(currentWindow.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(currentWindow.close).toHaveBeenCalledTimes(1);
  });

  it("converts rejected Tauri calls to safe failures without logging raw errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const currentWindow = {
      minimize: vi.fn().mockRejectedValue(new Error("C:\\Users\\Synthetic\\raw-window-error")),
      toggleMaximize: vi.fn(),
      close: vi.fn(),
    };
    canUseTauriWindowMock.mockReturnValue(true);
    getCurrentWindowMock.mockReturnValue(currentWindow);

    const controls = await loadWindowControls();

    await expect(controls.minimizeCurrentWindow()).resolves.toEqual({
      action: "minimize",
      ok: false,
      reason: "tauri-error",
    });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("subscribes to window state changes through current-window events and cleans up listeners", async () => {
    const unlistenResize = vi.fn();
    const unlistenFocus = vi.fn();
    const currentWindow = {
      onResized: vi.fn().mockResolvedValue(unlistenResize),
      onFocusChanged: vi.fn().mockResolvedValue(unlistenFocus),
    };
    canUseTauriWindowMock.mockReturnValue(true);
    getCurrentWindowMock.mockReturnValue(currentWindow);
    const onChange = vi.fn();

    const controls = await loadWindowControls();
    const cleanup = await controls.listenCurrentWindowStateChange(onChange);

    expect(currentWindow.onResized).toHaveBeenCalledTimes(1);
    expect(currentWindow.onFocusChanged).toHaveBeenCalledTimes(1);
    currentWindow.onResized.mock.calls[0][0]();
    currentWindow.onFocusChanged.mock.calls[0][0]();
    expect(onChange).toHaveBeenCalledTimes(2);

    cleanup?.();
    expect(unlistenResize).toHaveBeenCalledTimes(1);
    expect(unlistenFocus).toHaveBeenCalledTimes(1);
  });
});
