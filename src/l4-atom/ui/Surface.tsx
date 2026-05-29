import type { HTMLAttributes, ReactNode } from "react";

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
      className={[
        "ui-surface",
        variant !== "base" ? `ui-surface--${variant}` : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
