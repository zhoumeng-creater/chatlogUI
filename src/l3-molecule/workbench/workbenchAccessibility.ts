export {
  isRestorableFocusTarget,
  restoreFocusTarget,
  type FocusTarget,
} from "@l3/common/focusManagement";

export function getWorkbenchDrawerDialogProps(titleId: string) {
  return {
    role: "dialog",
    "aria-modal": true,
    "aria-labelledby": titleId,
    tabIndex: -1,
  } as const;
}

export function shouldCloseWorkbenchDrawerOnKey(key: string): boolean {
  return key === "Escape";
}

const DRAWER_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface DrawerFocusEvent {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
}

export function trapWorkbenchDrawerFocus(
  container: HTMLElement | null,
  activeElement: Element | null,
  event: DrawerFocusEvent,
): boolean {
  if (event.key !== "Tab" || !container) return false;

  const focusable = Array.from(
    container.querySelectorAll<HTMLElement>(DRAWER_FOCUSABLE_SELECTOR),
  );

  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!activeElement || !container.contains(activeElement)) {
    event.preventDefault();
    first.focus();
    return true;
  }

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
    return true;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}

export function getWorkbenchRailButtonLabel(label: string): string {
  return `打开${label}模块`;
}
