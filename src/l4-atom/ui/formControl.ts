import { classNames } from "@/utils/classNames";

export type ControlKind = "input" | "select";
export type ControlSize = "sm" | "md";

export function getControlClassName(
  kind: ControlKind,
  size: ControlSize = "md",
  className = "",
): string {
  return classNames(
    "ui-control",
    `ui-control--${kind}`,
    `ui-control--${size}`,
    className,
  );
}

export function getSegmentedItemClassName(active: boolean): string {
  return classNames(
    "ui-segmented__item",
    active && "ui-segmented__item--active",
  );
}

export function getFieldDescriptionId(id: string | undefined, suffix: "hint" | "error"): string | undefined {
  return id ? `${id}-${suffix}` : undefined;
}
