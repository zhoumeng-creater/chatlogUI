import { getCurrentWindow } from "@tauri-apps/api/window";
import { canUseTauriWindow } from "./tauriRuntime";

export type WindowControlAction = "minimize" | "toggleMaximize" | "close";
export type WindowControlFailureReason = "unavailable" | "tauri-error";

export interface WindowControlResult {
  action: WindowControlAction;
  ok: boolean;
  reason?: WindowControlFailureReason;
}

export interface WindowMaximizedResult {
  ok: boolean;
  isMaximized: boolean;
  reason?: WindowControlFailureReason;
}

export type WindowStateChangeUnlisten = () => void;

function unavailableResult(action: WindowControlAction): WindowControlResult {
  return {
    action,
    ok: false,
    reason: "unavailable",
  };
}

function tauriErrorResult(action: WindowControlAction): WindowControlResult {
  return {
    action,
    ok: false,
    reason: "tauri-error",
  };
}

async function runWindowAction(
  action: WindowControlAction,
  dispatch: () => Promise<void>,
): Promise<WindowControlResult> {
  if (!canUseTauriWindow()) return unavailableResult(action);

  try {
    await dispatch();
    return { action, ok: true };
  } catch {
    return tauriErrorResult(action);
  }
}

export function minimizeCurrentWindow(): Promise<WindowControlResult> {
  return runWindowAction("minimize", () => getCurrentWindow().minimize());
}

export function toggleMaximizeCurrentWindow(): Promise<WindowControlResult> {
  return runWindowAction("toggleMaximize", () => getCurrentWindow().toggleMaximize());
}

export function closeCurrentWindow(): Promise<WindowControlResult> {
  return runWindowAction("close", () => getCurrentWindow().close());
}

export async function readCurrentWindowMaximized(): Promise<WindowMaximizedResult> {
  if (!canUseTauriWindow()) {
    return {
      ok: false,
      isMaximized: false,
      reason: "unavailable",
    };
  }

  try {
    return {
      ok: true,
      isMaximized: await getCurrentWindow().isMaximized(),
    };
  } catch {
    return {
      ok: false,
      isMaximized: false,
      reason: "tauri-error",
    };
  }
}

export async function listenCurrentWindowStateChange(
  onChange: () => void,
): Promise<WindowStateChangeUnlisten | null> {
  if (!canUseTauriWindow()) return null;

  const unlisteners: WindowStateChangeUnlisten[] = [];

  try {
    const currentWindow = getCurrentWindow();
    unlisteners.push(await currentWindow.onResized(onChange));
    unlisteners.push(await currentWindow.onFocusChanged(onChange));
    return () => {
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  } catch {
    for (const unlisten of unlisteners) {
      unlisten();
    }
    return null;
  }
}
