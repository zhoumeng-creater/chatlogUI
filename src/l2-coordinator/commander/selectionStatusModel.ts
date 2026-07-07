const TRANSIENT_SELECTION_STATUS_PREFIXES = [
  "已复制",
  "已定位到",
  "已按范围选择",
  "已跳转到",
];

export const SELECTION_STATUS_AUTO_CLEAR_MS = 3000;

export function isTransientSelectionStatus(status: string | null | undefined): boolean {
  const value = status?.trim();
  if (!value) return false;
  return TRANSIENT_SELECTION_STATUS_PREFIXES.some((prefix) => value.startsWith(prefix));
}
