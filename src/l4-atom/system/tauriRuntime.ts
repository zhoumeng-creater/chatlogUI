interface TauriInternals {
  invoke?: unknown;
  metadata?: {
    currentWindow?: unknown;
  };
  transformCallback?: unknown;
}

export function getTauriInternals(): TauriInternals | null {
  if (typeof window === "undefined") return null;
  return ((window as Window & { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__ ?? null);
}

export function canInvokeTauriCommand(): boolean {
  return typeof getTauriInternals()?.invoke === "function";
}

export function canListenToTauriEvents(): boolean {
  return typeof getTauriInternals()?.transformCallback === "function";
}

export function canUseTauriWindow(): boolean {
  return Boolean(getTauriInternals()?.metadata?.currentWindow);
}
