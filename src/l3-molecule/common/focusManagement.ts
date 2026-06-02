export interface FocusTarget {
  isConnected: boolean;
  focus: () => void;
}

export function isRestorableFocusTarget(target: unknown): target is FocusTarget {
  return Boolean(
    target &&
      typeof target === "object" &&
      "isConnected" in target &&
      "focus" in target &&
      (target as { isConnected: unknown }).isConnected === true &&
      typeof (target as { focus: unknown }).focus === "function",
  );
}

export function restoreFocusTarget(target: unknown): boolean {
  if (!isRestorableFocusTarget(target)) return false;
  target.focus();
  return true;
}
