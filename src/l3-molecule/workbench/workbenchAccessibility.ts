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
