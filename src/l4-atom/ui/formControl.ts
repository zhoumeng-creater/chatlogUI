export type ControlKind = "input" | "select";
export type ControlSize = "sm" | "md";

export function getControlClassName(
  kind: ControlKind,
  size: ControlSize = "md",
  className = "",
): string {
  return [
    "ui-control",
    `ui-control--${kind}`,
    `ui-control--${size}`,
    className,
  ].filter(Boolean).join(" ");
}

export function getSegmentedItemClassName(active: boolean): string {
  return [
    "ui-segmented__item",
    active ? "ui-segmented__item--active" : "",
  ].filter(Boolean).join(" ");
}

export function getFieldDescriptionId(id: string | undefined, suffix: "hint" | "error"): string | undefined {
  return id ? `${id}-${suffix}` : undefined;
}
