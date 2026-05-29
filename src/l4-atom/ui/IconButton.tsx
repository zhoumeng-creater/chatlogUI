import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: IconButtonSize;
  active?: boolean;
  tooltip?: string;
}

export function IconButton({
  icon,
  label,
  size = "md",
  active = false,
  tooltip,
  className = "",
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      aria-label={label}
      title={tooltip ? undefined : label}
      className={[
        "ui-icon-button",
        `ui-icon-button--${size}`,
        active ? "ui-icon-button--active" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {icon}
    </button>
  );

  return tooltip ? <Tooltip label={tooltip}>{button}</Tooltip> : button;
}
