export interface FocusTarget {
  isConnected: boolean;
  focus: (options?: FocusOptions) => void;
}

interface OverlayDialogPropsInput {
  titleId?: string;
  label?: string;
  modal?: boolean;
}

interface OverlayKeyOptions {
  dismissible: boolean;
}

interface OverlayFocusEvent {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
}

export const FOCUSABLE_OVERLAY_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getOverlayDialogProps({
  titleId,
  label,
  modal = true,
}: OverlayDialogPropsInput) {
  return {
    role: "dialog",
    "aria-modal": modal,
    ...(titleId ? { "aria-labelledby": titleId } : { "aria-label": label ?? "对话框" }),
    tabIndex: -1,
  } as const;
}

export function shouldCloseOverlayOnKey(
  key: string,
  { dismissible }: OverlayKeyOptions,
): boolean {
  return dismissible && key === "Escape";
}

export function getFocusableOverlayElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_OVERLAY_SELECTOR));
}

export function focusInitialOverlayTarget(container: HTMLElement | null): boolean {
  if (!container) return false;
  const [firstFocusable] = getFocusableOverlayElements(container);
  const focusTarget = firstFocusable ?? container;
  focusWithoutScrolling(focusTarget);
  return true;
}

export function trapOverlayFocus(
  container: HTMLElement | null,
  activeElement: Element | null,
  event: OverlayFocusEvent,
): boolean {
  if (event.key !== "Tab" || !container) return false;

  const focusable = getFocusableOverlayElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    focusWithoutScrolling(container);
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!activeElement || !container.contains(activeElement)) {
    event.preventDefault();
    focusWithoutScrolling(first);
    return true;
  }

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    focusWithoutScrolling(last);
    return true;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    focusWithoutScrolling(first);
    return true;
  }

  return false;
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
  focusWithoutScrolling(target);
  return true;
}

function focusWithoutScrolling(target: FocusTarget): void {
  target.focus({ preventScroll: true });
}
