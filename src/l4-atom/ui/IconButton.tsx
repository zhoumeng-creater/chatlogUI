import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { Tooltip, type TooltipPlacement } from "./Tooltip";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: IconButtonSize;
  active?: boolean;
  tooltip?: string;
  tooltipPlacement?: TooltipPlacement;
}

export function IconButton({
  icon,
  label,
  size = "md",
  active = false,
  tooltip,
  tooltipPlacement = "top-end",
  className = "",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      className={classNames(
        "ui-icon-button",
        `ui-icon-button--${size}`,
        active && "ui-icon-button--active",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );

  return tooltip ? <Tooltip label={tooltip} placement={tooltipPlacement}>{button}</Tooltip> : button;
}
