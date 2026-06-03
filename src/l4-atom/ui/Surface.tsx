import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/utils/classNames";

type SurfaceVariant = "base" | "subtle" | "raised";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  children: ReactNode;
}

export function Surface({
  variant = "base",
  className = "",
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={classNames(
        "ui-surface",
        variant !== "base" && `ui-surface--${variant}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
